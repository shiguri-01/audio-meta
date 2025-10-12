import { TextField } from "@kobalte/core/text-field";
import { type } from "arktype";
import { err, ok, type Result } from "neverthrow";
import { type Accessor, createMemo, createSignal, For, Show } from "solid-js";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import { cn } from "@/utils/style";
import { useAudioFileStore } from "../primitives/audio-file-store";
import { createEditableField } from "../primitives/editable-field";
import {
  Album,
  Artists,
  type AudioFile,
  applyChanges,
  type Path,
  Path as pathSchema,
  Title,
} from "../schemas";

export type EditableCellProps<TValue> = {
  value: Accessor<TValue>;
  onCommit: (value: TValue) => void;
  /**
   * 実際の値(TValue)を表示用の文字列に変換する
   */
  formatValue: (value: TValue) => string;
  /**
   * 入力値を実際の値(TValue)に変換する
   */
  transformValue: (input: string) => Result<TValue, string[]>;
};

function EditableCell<TValue>(props: EditableCellProps<TValue>) {
  const {
    isEditing,
    inputValue,
    changeInputValue,
    validationErrors,
    beginEditing,
    resetEditing,
    commitEdit,
  } = createEditableField<TValue>(props.value, {
    formatValue: props.formatValue,
    transformValue: props.transformValue,
    onCommit: props.onCommit,
  });
  const hasValidationError = createMemo(() => validationErrors().length > 0);

  let cellRef!: HTMLTableCellElement;
  let inputRef: HTMLInputElement | undefined;

  const enterInputEl = () => {
    requestAnimationFrame(() => {
      inputRef?.focus();
    });
  };
  const leaveInputEl = () => {
    requestAnimationFrame(() => {
      cellRef.focus();
    });
  };

  const [suppressBlurCommit, setSuppressBlurCommit] = createSignal(false);

  const handleInputKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === "Enter") {
      // 変更を確定し、セルにフォーカスを戻す
      e.preventDefault();
      e.stopPropagation();

      commitEdit();

      setSuppressBlurCommit(true);
      leaveInputEl();
      return;
    }
    if (e.key === "Escape") {
      // 変更をキャンセルし、セルにフォーカスを戻す
      e.preventDefault();
      e.stopPropagation();

      resetEditing();

      setSuppressBlurCommit(true);
      leaveInputEl();
      return;
    }
  };

  const handleInputBlur = () => {
    if (suppressBlurCommit()) {
      setSuppressBlurCommit(false);
      return;
    }

    commitEdit();
  };

  const handleBeginEditing = () => {
    if (isEditing()) return;

    beginEditing();
    enterInputEl();
  };

  return (
    <>
      <Table.Cell
        ref={cellRef}
        tabIndex={0}
        onClick={handleBeginEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isEditing()) {
            handleBeginEditing();
          }
        }}
        class={cn(
          "cursor-pointer",
          isEditing() && "outline-2 outline-focus-ring ring-4 ring-blue-200",
          hasValidationError() && "bg-destructive-bg",
        )}
      >
        <Show
          when={isEditing()}
          fallback={
            <span class={cn("size-stretch overflow-hidden")}>
              {inputValue()}
            </span>
          }
        >
          <TextField value={inputValue()} onChange={changeInputValue}>
            <TextField.Input
              ref={inputRef}
              class="focus:outline-none size-stretch"
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
            />
          </TextField>
        </Show>
      </Table.Cell>

      <CellErrorTooltip
        trigger={cellRef}
        errors={validationErrors}
        isCellEditing={isEditing}
      />
    </>
  );
}

function CellErrorTooltip(props: {
  trigger: HTMLElement;
  errors: Accessor<string[]>;
  isCellEditing: Accessor<boolean>;
}) {
  return (
    <Show when={props.errors().length > 0}>
      <Tooltip
        trigger={props.trigger}
        visible={props.isCellEditing() ? "always" : "auto"}
        class="text-destructive-fg"
      >
        <For each={props.errors()}>{(message) => <p>{message}</p>}</For>
      </Tooltip>
    </Show>
  );
}

export const PathCell = (props: { originalFile: AudioFile }) => {
  const { changes, updateFile } = useAudioFileStore();
  const modifiedFile: Accessor<AudioFile> = createMemo(() => {
    const change = changes()[props.originalFile.id];
    return applyChanges(props.originalFile, change ?? {});
  });

  const path: Accessor<Path> = createMemo(() => {
    return modifiedFile().path;
  });
  const setPath = (value: Path) => {
    updateFile(props.originalFile.id, { path: value });
  };

  return (
    <EditableCell
      value={path}
      onCommit={setPath}
      formatValue={(value) => value}
      transformValue={(input) => {
        const result = pathSchema(input.trim());
        if (result instanceof type.errors) {
          return err(result.issues.map((e) => e.message));
        }
        return ok(result);
      }}
    />
  );
};

export const TitleCell = (props: { originalFile: AudioFile }) => {
  const { changes, updateFile } = useAudioFileStore();
  const modifiedFile: Accessor<AudioFile> = createMemo(() => {
    const change = changes()[props.originalFile.id];
    return applyChanges(props.originalFile, change ?? {});
  });

  const title: Accessor<Title | null> = createMemo(() => {
    return modifiedFile().id3Tag.title;
  });
  const setTitle = (value: Title | null) => {
    updateFile(props.originalFile.id, { id3Tag: { title: value } });
  };

  return (
    <EditableCell
      value={title}
      onCommit={setTitle}
      formatValue={(value) => value ?? ""}
      transformValue={(input) => {
        const schema = Title.or(type("null"));
        const result = schema(input.trim().length > 0 ? input.trim() : null);
        if (result instanceof type.errors) {
          return err(result.issues.map((e) => e.message));
        }
        return ok(result);
      }}
    />
  );
};

export const ArtistsCell = (props: { originalFile: AudioFile }) => {
  const { changes, updateFile } = useAudioFileStore();
  const modifiedFile: Accessor<AudioFile> = createMemo(() => {
    const change = changes()[props.originalFile.id];
    return applyChanges(props.originalFile, change ?? {});
  });

  const artists: Accessor<Artists | null> = createMemo(() => {
    return modifiedFile().id3Tag.artists;
  });
  const setArtists = (value: Artists | null) => {
    updateFile(props.originalFile.id, { id3Tag: { artists: value } });
  };

  return (
    <EditableCell
      value={artists}
      onCommit={setArtists}
      formatValue={(value) => (value ? value.join(", ") : "")}
      transformValue={(input) => {
        const raw = input
          .trim()
          .split(",")
          .map((artist) => artist.trim())
          .filter((artist) => artist !== "");
        const schema = Artists.or(type("null"));
        const result = schema(raw.length > 0 ? raw : null);
        if (result instanceof type.errors) {
          return err(result.issues.map((e) => e.message));
        }
        return ok(result);
      }}
    />
  );
};

export const AlbumCell = (props: { originalFile: AudioFile }) => {
  const { changes, updateFile } = useAudioFileStore();
  const modifiedFile: Accessor<AudioFile> = createMemo(() => {
    const change = changes()[props.originalFile.id];
    return applyChanges(props.originalFile, change ?? {});
  });

  const album: Accessor<Album | null> = createMemo(() => {
    return modifiedFile().id3Tag.album;
  });
  const setAlbum = (value: Album | null) => {
    updateFile(props.originalFile.id, { id3Tag: { album: value } });
  };

  return (
    <EditableCell
      value={album}
      onCommit={setAlbum}
      formatValue={(value) => value ?? ""}
      transformValue={(input) => {
        const schema = Album.or(type("null"));
        const result = schema(input.trim().length > 0 ? input.trim() : null);
        if (result instanceof type.errors) {
          return err(result.issues.map((e) => e.message));
        }
        return ok(result);
      }}
    />
  );
};
