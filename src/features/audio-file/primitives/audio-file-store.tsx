import {
  errAsync,
  ok,
  okAsync,
  type Result,
  type ResultAsync,
} from "neverthrow";
import {
  type Accessor,
  createContext,
  createSignal,
  type ParentComponent,
  type Setter,
  useContext,
} from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import {
  type UpdateAudioFile,
  type UpdateAudioFiles,
  useCommands,
} from "@/tauri/commands";
import {
  type AudioFile,
  type AudioFileChanges,
  type AudioFilePatch,
  combineChanges,
} from "../schemas";

export interface AudioFileStore {
  // state
  /** 変更前の音声ファイルのリスト */
  originalFiles: Accessor<AudioFile[]>;

  /** 各ファイルの未保存の変更内容 */
  changes: Accessor<Record<string, AudioFileChanges>>;

  /** 何らかの音声ファイルに未保存の変更があるか否か */
  isDirty: Accessor<boolean>;

  /** 指定した音声ファイルに未保存の変更があるか否か */
  isFileDirty: (id: string) => boolean;

  /** 永続化処理が実行中かどうか */
  pending: Accessor<boolean>;

  // actions
  /**
   * 音声ファイルの変更内容を更新する（メモリ上のみ、永続化はしない）
   *
   * @param id ファイルID
   * @param updater 変更内容のオブジェクト、または既存の変更内容を受け取って新しい変更内容を返す関数
   * - 変更内容オブジェクトの場合、既存の変更内容とマージされる
   * - 関数の場合、既存の変更内容を受け取って新しい変更内容を計算し、置き換える
   */
  updateFile: (
    id: string,
    updater: AudioFileChanges | ((prev: AudioFileChanges) => AudioFileChanges),
  ) => void;

  /**
   * 指定した音声ファイルの変更を永続化する
   *
   * @param id ファイルID
   * @returns 更新後の音声ファイル、またはエラー
   */
  saveFile: (id: string) => ResultAsync<AudioFile, string>;

  /**
   * 変更されているすべての音声ファイルの変更を永続化する
   *
   * @returns 更新後の音声ファイル一覧、またはエラー
   */
  saveAllFiles: () => ResultAsync<
    Result<AudioFile, { id: string; error: string }>[],
    string
  >;

  /**
   * ストアの状態を新しい音声ファイル一覧でリセットする
   *
   * 未保存の変更はすべて破棄される
   *
   * @param audioFiles 新しい音声ファイル一覧
   */
  resetWithFiles: (audioFiles: AudioFile[]) => void;
}

interface AudioFileStoreConfig {
  updateAudioFileCommand: UpdateAudioFile;
  updateAudioFilesCommand: UpdateAudioFiles;
}

interface AudioFilesState {
  files: AudioFile[];
  changes: Record<string, AudioFileChanges>;
}

const hasEffectiveChanges = (
  changes: AudioFileChanges | undefined,
): boolean => {
  if (!changes) return false;
  if (typeof changes.path !== "undefined") return true;
  const tag = changes.id3Tag;
  return !!(
    tag &&
    (typeof tag.title !== "undefined" ||
      typeof tag.artists !== "undefined" ||
      typeof tag.album !== "undefined")
  );
};

/**
 * pending状態の管理を伴う非同期処理をおこなう関数を作成する
 */
export const withPendingState = <T,>(
  operation: () => ResultAsync<T, string>,
  pendingSignal: [Accessor<boolean>, Setter<boolean>],
): ResultAsync<T, string> => {
  const [pending, setPending] = pendingSignal;

  if (pending()) {
    return errAsync("Another operation is in progress");
  }

  setPending(true);

  return operation()
    .map((value) => {
      setPending(false);
      return value;
    })
    .mapErr((error) => {
      setPending(false);
      return error;
    });
};

const convertChangesToPatches = (
  changes: Record<string, AudioFileChanges>,
): Array<AudioFilePatch> =>
  Object.entries(changes).map(([id, changes]) => ({ id, changes }));

export const createAudioFileStore = (
  initialAudioFiles: AudioFile[],
  { updateAudioFileCommand, updateAudioFilesCommand }: AudioFileStoreConfig,
): AudioFileStore => {
  const [state, setState] = createStore<AudioFilesState>({
    files: initialAudioFiles,
    changes: {},
  });

  const isDirty = () => Object.values(state.changes).some(hasEffectiveChanges);

  const isFileDirty = (id: string): boolean =>
    hasEffectiveChanges(state.changes[id]);

  const pendingSignal = createSignal<boolean>(false);
  const [pending, setPending] = pendingSignal;

  const updateFile = (
    id: string,
    updater: AudioFileChanges | ((prev: AudioFileChanges) => AudioFileChanges),
  ) => {
    // TODO: 実質的に変更がない場合、changesの項目を消去する（ファイル単位・1つのプロパティ単位）
    const prevChanges = state.changes[id] ?? {};
    const newChanges =
      typeof updater === "function"
        ? // 関数の場合：既存の変更内容を受け取って新しい変更内容を計算し、置き換える
          updater(prevChanges)
        : // オブジェクトの場合：既存の変更内容と新しい変更内容をマージする
          combineChanges(prevChanges, updater);

    if (hasEffectiveChanges(newChanges)) {
      setState("changes", id, reconcile(newChanges));
    } else {
      setState(
        "changes",
        produce((prev) => {
          delete prev[id];
        }),
      );
    }
  };

  const saveFile = (id: string): ResultAsync<AudioFile, string> =>
    withPendingState(() => {
      const originalFile = state.files.find((file) => file.id === id);
      if (!originalFile) {
        return errAsync("File not found");
      }

      const changes = state.changes[id];
      if (!changes || !hasEffectiveChanges(changes)) {
        return okAsync(originalFile);
      }

      return updateAudioFileCommand({
        patch: { id, changes },
      }).map((newFile) => {
        // オリジナルのファイルの状態を更新し、変更内容をクリア
        updateStateAfterSave(newFile);
        return newFile;
      });
    }, [pending, setPending]);

  /**
   * 保存が成功した音声ファイルのデータを更新し、変更内容をクリアする
   */
  const updateStateAfterSave = (newFile: AudioFile) => {
    setState("files", (file) => file.id === newFile.id, reconcile(newFile));
    setState(
      "changes",
      produce((prevChanges) => {
        delete prevChanges[newFile.id];
      }),
    );
  };

  const saveAllFiles = (): ResultAsync<
    Result<AudioFile, { id: string; error: string }>[],
    string
  > =>
    withPendingState(() => {
      if (!isDirty()) {
        return okAsync([]);
      }

      return ok(convertChangesToPatches(state.changes))
        .asyncAndThen((patches) => updateAudioFilesCommand({ patches }))
        .map((saveResults) => {
          // 保存成功したファイルについてのstateを更新
          const succeeded = saveResults
            .filter((r) => r.isOk())
            .map((r) => r.value);
          succeeded.forEach(updateStateAfterSave);

          return saveResults;
        });
    }, [pending, setPending]);

  const resetWithFiles = (audioFiles: AudioFile[]) => {
    setState({
      files: audioFiles,
      changes: {},
    });
  };

  return {
    originalFiles: () => state.files,
    changes: () => state.changes,
    isDirty,
    isFileDirty,
    pending,

    updateFile,
    saveFile,
    saveAllFiles,
    resetWithFiles,
  };
};

const AudioFileStoreContext = createContext<AudioFileStore>();

export const AudioFileStoreProvider: ParentComponent = (props) => {
  const { updateAudioFile, updateAudioFiles } = useCommands();
  const audioFileStore = createAudioFileStore([], {
    updateAudioFileCommand: updateAudioFile,
    updateAudioFilesCommand: updateAudioFiles,
  });

  return (
    <AudioFileStoreContext.Provider value={audioFileStore}>
      {props.children}
    </AudioFileStoreContext.Provider>
  );
};

export const useAudioFileStore = (): AudioFileStore => {
  const context = useContext(AudioFileStoreContext);
  if (!context) {
    throw new Error(
      "useAudioFileStore must be used within an AudioFileStoreProvider",
    );
  }
  return context;
};
