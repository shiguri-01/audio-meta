import { isEqual } from "lodash";
import { type Accessor, createMemo, createSignal, type Setter } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type {
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
} from "@/tauri/commands";
import type { AudioFileDTO, AudioFilePatchDTO } from "@/tauri/dto";

export interface DirectoryScanner {
  selectedDirectory: Accessor<string | null>;
  audioFiles: Accessor<AudioFileDTO[]>;
  isLoading: Accessor<boolean>;
  error: Accessor<string | null>;

  /**
   * ディレクトリ選択ダイアログを開き、選択されたディレクトリの音声ファイルを走査する
   */
  selectAndScanDirectory: () => Promise<void>;
}

export const createDirectoryScanner = ({
  selectDirectoryCommand,
  scanDirectoryCommand,
}: {
  selectDirectoryCommand: SelectDirectory;
  scanDirectoryCommand: ScanDirectory;
}): DirectoryScanner => {
  const [audioFiles, setAudioFiles] = createSignal<AudioFileDTO[]>([]);
  const [selectedDirectory, setSelectedDirectory] = createSignal<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<string | null>(null);

  const selectAndScanDirectory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const newDir = await selectDirectoryCommand();

      if (newDir.isErr()) {
        setError(newDir.error);
        return;
      }
      if (newDir.value === null) {
        // ディレクトリ選択がキャンセルされた場合
        // 状態は変更しない
        return;
      }

      const scannedFiles = await scanDirectoryCommand({ dir: newDir.value });

      if (scannedFiles.isErr()) {
        setError(scannedFiles.error);
        return;
      }

      // 選択とスキャンが成功した場合、状態を更新
      setSelectedDirectory(newDir.value);
      setAudioFiles(scannedFiles.value);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    audioFiles,
    selectedDirectory,
    isLoading,
    error,
    selectAndScanDirectory,
  };
};

export interface AudioFilesManager {
  audioFiles: AudioFileDTO[];
  isUpdating: Accessor<boolean>;
  error: Accessor<string | null>;

  /** 音声ファイルを更新する
   *
   * 更新を永続化する
   */
  updateAudioFile: (patch: AudioFilePatchDTO) => Promise<boolean>;
  /**
   * オーディオファイルリストを新しいリストに置き換える
   *
   * 現在管理しているファイルをすべてクリアし、新しいファイルリストで置き換える
   */
  replaceAllAudioFiles: (audioFiles: AudioFileDTO[]) => void;
}

export const createAudioFilesManager = (
  initialAudioFiles: AudioFileDTO[],
  { updateAudioFileCommand }: { updateAudioFileCommand: UpdateAudioFile },
): AudioFilesManager => {
  const [audioFiles, setAudioFiles] = createStore(initialAudioFiles);
  const [error, setError] = createSignal<string | null>(null);
  const [isUpdating, setIsUpdating] = createSignal<boolean>(false);

  const updateAudioFile = async (patch: AudioFilePatchDTO) => {
    setIsUpdating(true);
    setError(null);

    try {
      return await updateAudioFileCommand({ patch }).match(
        (newFile) => {
          const fileIndex = audioFiles.findIndex(
            (file) => file.id === newFile.id,
          );
          if (fileIndex === -1) {
            setError("File not found");
            return false;
          }

          setAudioFiles(fileIndex, reconcile(newFile));

          return true;
        },
        (error) => {
          setError(error);
          return false;
        },
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const replaceAllAudioFiles = (audioFiles: AudioFileDTO[]) => {
    setAudioFiles(audioFiles);
  };

  return {
    audioFiles,
    isUpdating,
    error,
    updateAudioFile,
    replaceAllAudioFiles,
  };
};

export interface EditableAudioFile {
  path: Accessor<string>;
  setPath: Setter<string>;

  title: Accessor<string | null>;
  setTitle: Setter<string | null>;

  artists: Accessor<string[] | null>;
  setArtists: Setter<string[] | null>;

  album: Accessor<string | null>;
  setAlbum: Setter<string | null>;

  isDirty: Accessor<boolean>;
  reset: () => void;
  /**
   * 変更内容のパッチを取得する
   * @returns 変更があった場合はパッチオブジェクト、なければ null
   */
  getPatch: () => AudioFilePatchDTO | null;
}

export const createEditableAudioFile = (
  originalAudioFile: Accessor<AudioFileDTO>,
): EditableAudioFile => {
  const [path, setPath] = createSignal<string>(originalAudioFile().path);
  const [title, setTitle] = createSignal<string | null>(
    originalAudioFile().id3_tag.title,
  );
  const [artists, setArtists] = createSignal<string[] | null>(
    originalAudioFile().id3_tag.artists,
  );
  const [album, setAlbum] = createSignal<string | null>(
    originalAudioFile().id3_tag.album,
  );

  const isDirty = createMemo(() => {
    return (
      !isEqual(path(), originalAudioFile().path) ||
      !isEqual(title(), originalAudioFile().id3_tag.title) ||
      !isEqual(artists(), originalAudioFile().id3_tag.artists) ||
      !isEqual(album(), originalAudioFile().id3_tag.album)
    );
  });

  const reset = () => {
    setPath(originalAudioFile().path);
    setTitle(originalAudioFile().id3_tag.title);
    setArtists(originalAudioFile().id3_tag.artists);
    setAlbum(originalAudioFile().id3_tag.album);
  };

  const getPatch = (): AudioFilePatchDTO | null => {
    if (!isDirty()) return null;

    const patch: AudioFilePatchDTO = { id: originalAudioFile().id };

    patch.path = !isEqual(path(), originalAudioFile().path)
      ? path()
      : undefined;
    patch.title = !isEqual(title(), originalAudioFile().id3_tag.title)
      ? title()
      : undefined;
    patch.artists = !isEqual(artists(), originalAudioFile().id3_tag.artists)
      ? artists()
      : undefined;
    patch.album = !isEqual(album(), originalAudioFile().id3_tag.album)
      ? album()
      : undefined;

    return patch;
  };

  return {
    path,
    setPath,
    title,
    setTitle,
    artists,
    setArtists,
    album,
    setAlbum,

    isDirty,
    reset,
    getPatch,
  };
};
