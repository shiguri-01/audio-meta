import { TextField } from "@kobalte/core/text-field";
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

export type EditableCellProps<TValue> = {
  value: Accessor<TValue>;
  onCommit: (value: TValue) => void;
  /**
   * valueを表示用の文字列に変換する
   */
  formatValue?: (value: TValue) => string;
  /**
   * 入力された文字列をvalueに変換する
   */
  parseValue?: (value: string) => TValue;
};

function EditableCell<TValue>(props: EditableCellProps<TValue>) {
  const formatValue = props.formatValue || ((value: TValue) => String(value));
  const parseValue =
    props.parseValue || ((value: string) => value as unknown as TValue);

  const [inputValue, setInputValue] = createSignal<string>(
    formatValue(props.value()),
  );
  const [isEditing, setIsEditing] = createSignal(false);

  // TODO: バリデーションを組み込むタイミングで、inputValueそのままと（必要に応じて）エラーメッセージを表示する
  const displayValue = createMemo(() => formatValue(props.value()));

  createEffect(() => {
    if (!isEditing()) {
      setInputValue(formatValue(props.value()));
    }
  });

  let cellRef: HTMLTableCellElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  const beginEditing = () => {
    if (isEditing()) return;

    setIsEditing(true);
    setTimeout(() => {
      inputRef?.focus();
    }, 0);
  };

  const commitEdit = () => {
    const newValue = parseValue(inputValue());
    setIsEditing(false);
    props.onCommit(newValue);
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
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // 変更を確定し、セルにフォーカスを戻す
                e.preventDefault();
                e.stopPropagation();

                commitEdit();

                requestAnimationFrame(() => {
                  cellRef?.focus();
                });
              }
              if (e.key === "Escape") {
                // 変更をキャンセルし、セルにフォーカスを戻す
                resetEditing();
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

  return <EditableCell value={path} onCommit={setPath} />;
};

export const TitleCell = () => {
  const { title, setTitle } = useAudioFileEditor();

  return (
    <EditableCell
      value={title}
      onCommit={setTitle}
      formatValue={(value) => value ?? ""}
      parseValue={(value) => value.trim() || null}
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
      parseValue={(value) => {
        const artists = value
          .trim()
          .split(",")
          .map((artist) => artist.trim())
          .filter((artist) => artist !== "");
        return artists.length > 0 ? artists : null;
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
      parseValue={(value) => value.trim() || null}
    />
  );
};
