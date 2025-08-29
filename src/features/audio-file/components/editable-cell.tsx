import { TextField } from "@kobalte/core/text-field";
import { type } from "arktype";
import { err, ok, type Result } from "neverthrow";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  Show,
} from "solid-js";
import { Table } from "@/components/table";
import { cn } from "@/utils/style";
import { useAudioFileEditor } from "../providers/audio-file-editor";
import { Album, Artists, Title } from "../schemas";

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
  const [_errorMessages, setErrorMessages] = createSignal<string[]>([]);

  // TODO: バリデーションを組み込むタイミングで、inputValueそのままと（必要に応じて）エラーメッセージを表示する
  const displayValue = createMemo(() => formatValue(props.value()));

  createEffect(() => {
    if (!isEditing()) {
      setInputValue(formatValue(props.value()));
    }
  });

  let cellRef: HTMLTableCellElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  const [suppressBlurCommit, setSuppressBlurCommit] = createSignal(false);

  const beginEditing = () => {
    if (isEditing()) return;

    setIsEditing(true);
    setTimeout(() => {
      inputRef?.focus();
    }, 0);
  };

  const commitEdit = () => {
    setIsEditing(false);
    const newValue = transformValue(inputValue());

    if (newValue.isOk()) {
      props.onCommit(newValue.value);
      setErrorMessages([]);
    } else {
      setErrorMessages(newValue.error);
    }
  };

  const resetEditing = () => {
    setInputValue(formatValue(props.value()));
    setIsEditing(false);
  };

  return (
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
        isEditing() && "outline-2 outline-blue-500 ring-4 ring-blue-200",
      )}
    >
      <Show
        when={isEditing()}
        fallback={
          <span class={cn("size-stretch overflow-hidden")}>
            {displayValue()}
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
              if (e.key === "Enter") {
                // 変更を確定し、セルにフォーカスを戻す
                e.preventDefault();
                e.stopPropagation();

                commitEdit();

                setSuppressBlurCommit(true);
                requestAnimationFrame(() => {
                  cellRef?.focus();
                });
              }
              if (e.key === "Escape") {
                // 変更をキャンセルし、セルにフォーカスを戻す
                e.preventDefault();
                e.stopPropagation();

                resetEditing();

                setSuppressBlurCommit(true);
                requestAnimationFrame(() => {
                  cellRef?.focus();
                });
              }
            }}
          />
        </TextField>
      </Show>
    </Table.Cell>
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
