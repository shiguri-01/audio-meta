import { TextField } from "@kobalte/core/text-field";
import { type } from "arktype";
import { err, ok, type Result } from "neverthrow";
import {
  type Accessor,
  batch,
  createEffect,
  createSignal,
  For,
  Show,
} from "solid-js";
import { Table } from "@/components/table";
import { Tooltip } from "@/components/tooltip";
import { cn } from "@/utils/style";
import { useAudioFileEditor } from "../providers/audio-file-editor";
import { Album, Artists, Path, Title } from "../schemas";
export type EditableCellProps<TValue> = {
  value: Accessor<TValue>;
  onCommit: (value: TValue) => void;
  /**
   * 実際の値(TValue)を表示用の文字列に変換する
   */
  formatValue?: (value: TValue) => string;
  /**
   * 入力値を実際の値(TValue)に変換する
   */
  transformValue?: (input: string) => Result<TValue, string[]>;
};

function EditableCell<TValue>(props: EditableCellProps<TValue>) {
  const formatValue = props.formatValue || ((value: TValue) => String(value));

  const transformValue =
    props.transformValue || ((input: string) => ok(input as unknown as TValue));

  const [inputValue, setInputValue] = createSignal<string>(
    formatValue(props.value()),
  );
  const [isEditing, setIsEditing] = createSignal(false);
  const [errorMessages, setErrorMessages] = createSignal<string[]>([]);

  let cellRef!: HTMLTableCellElement;
  let inputRef: HTMLInputElement | undefined;

  const [suppressBlurCommit, setSuppressBlurCommit] = createSignal(false);

  const beginEditing = () => {
    if (isEditing()) return;

    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef?.focus();
    });
  };

  const commitEdit = () => {
    batch(() => {
      setIsEditing(false);
      const newValue = transformValue(inputValue());

      if (newValue.isOk()) {
        props.onCommit(newValue.value);
        setErrorMessages([]);
      } else {
        setErrorMessages(newValue.error);
      }
    });
  };

  const resetEditing = () => {
    batch(() => {
      setInputValue(formatValue(props.value()));
      setIsEditing(false);
    });
  };

  createEffect(() => {
    if (!isEditing()) {
      setInputValue(formatValue(props.value()));
    }
  });

  // 入力値が変わるたびにバリデーションを実行する
  createEffect(() => {
    if (!isEditing()) return;
    const newValue = transformValue(inputValue());
    setErrorMessages(newValue.isOk() ? [] : newValue.error);
  });

  return (
    <>
      <Table.Cell
        ref={cellRef}
        tabIndex={0}
        onClick={beginEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isEditing()) {
            beginEditing();
          }
        }}
        class={cn(
          "cursor-pointer",
          isEditing() && "outline-2 outline-focus-ring ring-4 ring-blue-200",
          errorMessages().length > 0 && "bg-destructive-bg",
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
          <TextField value={inputValue()} onChange={setInputValue}>
            <TextField.Input
              ref={inputRef}
              class="focus:outline-none size-stretch"
              onBlur={() => {
                if (suppressBlurCommit()) {
                  setSuppressBlurCommit(false);
                  return;
                }

                commitEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.isComposing) {
                  // 変更を確定し、セルにフォーカスを戻す
                  e.preventDefault();
                  e.stopPropagation();

                  commitEdit();

                  setSuppressBlurCommit(true);
                  requestAnimationFrame(() => {
                    cellRef.focus();
                  });
                }
                if (e.key === "Escape" && !e.isComposing) {
                  // 変更をキャンセルし、セルにフォーカスを戻す
                  e.preventDefault();
                  e.stopPropagation();

                  resetEditing();

                  setSuppressBlurCommit(true);
                  requestAnimationFrame(() => {
                    cellRef.focus();
                  });
                }
              }}
            />
          </TextField>
        </Show>
      </Table.Cell>

      {/* Tooltip */}
      <Show when={errorMessages().length > 0}>
        <Tooltip
          trigger={cellRef}
          visible={isEditing() ? "always" : "auto"}
          class="text-destructive-fg"
        >
          <For each={errorMessages()}>{(message) => <p>{message}</p>}</For>
        </Tooltip>
      </Show>
    </>
  );
}

export const PathCell = () => {
  const { path, setPath } = useAudioFileEditor();

  return (
    <EditableCell
      value={path}
      onCommit={setPath}
      transformValue={(input) => {
        const result = Path(input.trim());
        if (result instanceof type.errors) {
          return err(result.issues.map((e) => e.message));
        }
        return ok(result);
      }}
    />
  );
};

export const TitleCell = () => {
  const { title, setTitle } = useAudioFileEditor();

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

export const ArtistsCell = () => {
  const { artists, setArtists } = useAudioFileEditor();

  return (
    <EditableCell
      value={artists}
      onCommit={setArtists}
      formatValue={(value) => (value ? value.join(", ") : "")}
      transformValue={(input) => {
        const raw = input
          .trim()
          .split(",")
          // .map((artist) => artist.trim())
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

export const AlbumCell = () => {
  const { album, setAlbum } = useAudioFileEditor();

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
