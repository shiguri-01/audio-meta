import type { Result } from "neverthrow";
import { type Accessor, batch, createEffect, createSignal, on } from "solid-js";

export interface EditSessionControl {
  isEditing: Accessor<boolean>;
  begin: () => void;
  commit: () => void;
  cancel: () => void;
}

export interface CreateEditSessionControlOptions {
  onBegin?: () => void;
  onCommit?: () => void;
  onCancel?: () => void;
}

export type CreateFormattedInputOptions<TValue> = {
  onCommit: (value: TValue) => void;
  /**
   * 実際の値(TValue)を表示用の文字列に変換する
   */
  formatValue: (value: TValue) => string;
  /**
   * 入力値を実際の値(TValue)に変換する
   *
   * 入力値のバリデーションもここでおこなう
   */
  transformValue: (input: string) => Result<TValue, string[]>;
};

export const createEditSessionConrol = (
  options: CreateEditSessionControlOptions = {},
): EditSessionControl => {
  const [isEditing, setIsEditing] = createSignal(false);

  const begin = () => {
    if (isEditing()) return;
    options.onBegin?.();
    setIsEditing(true);
  };

  const commit = () => {
    if (!isEditing()) return;
    batch(() => {
      options.onCommit?.();
      setIsEditing(false);
    });
  };

  const cancel = () => {
    if (!isEditing()) return;
    batch(() => {
      options.onCancel?.();
      setIsEditing(false);
    });
  };

  return { isEditing, begin, commit, cancel };
};

export interface FormattedInput {
  inputValue: Accessor<string>;
  changeInputValue: (value: string) => void;
  validationErrors: Accessor<string[]>;

  commit: () => void;
  reset: () => void;
}

export const createFormattedInput = <TValue>(
  value: Accessor<TValue>,
  options: CreateFormattedInputOptions<TValue>,
): FormattedInput => {
  const [inputValue, setInputValue] = createSignal<string>(
    options.formatValue(value()),
  );
  const [validationErrors, setValidationErrors] = createSignal<string[]>([]);

  const changeInputValue = (newValue: string) => {
    batch(() => {
      setInputValue(newValue);

      const transformed = options.transformValue(newValue);
      setValidationErrors(transformed.isOk() ? [] : transformed.error);
    });
  };

  const commit = () => {
    batch(() => {
      options.transformValue(inputValue()).match(
        (newValue) => {
          options.onCommit(newValue);
          setValidationErrors([]);
        },
        (errors) => {
          setValidationErrors(errors);
        },
      );
    });
  };

  const reset = () => {
    batch(() => {
      setInputValue(options.formatValue(value()));
      setValidationErrors([]);
    });
  };

  // 外部でvalueが変更されたら入力値をリセットする
  createEffect(on(value, () => reset(), { defer: true }));

  return {
    inputValue,
    changeInputValue,
    validationErrors,
    commit,
    reset,
  };
};

export interface EditableField {
  isEditing: Accessor<boolean>;
  beginEditing: () => void;
  commitEdit: () => void;
  resetEditing: () => void;

  inputValue: Accessor<string>;
  changeInputValue: (value: string) => void;
  validationErrors: Accessor<string[]>;
}

export type CreateEditableFieldOptions<TValue> =
  CreateFormattedInputOptions<TValue>;

export const createEditableField = <TValue>(
  value: Accessor<TValue>,
  options: CreateEditableFieldOptions<TValue>,
): EditableField => {
  const inputField = createFormattedInput(value, options);
  const editingState = createEditSessionConrol({
    onCancel: inputField.reset, // 編集キャンセル時に入力値をリセットする
    onCommit: inputField.commit,
  });

  return {
    isEditing: editingState.isEditing,
    beginEditing: editingState.begin,
    resetEditing: editingState.cancel,
    commitEdit: editingState.commit,
    inputValue: inputField.inputValue,
    changeInputValue: inputField.changeInputValue,
    validationErrors: inputField.validationErrors,
  };
};
