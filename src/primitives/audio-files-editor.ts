import { isEqual } from "lodash";
import { err, ok, type ResultAsync } from "neverthrow";
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
  isLoading: Accessor<boolean>;

  /**
   * ディレクトリ選択ダイアログを開き、選択されたディレクトリの音声ファイルを走査する
   */
  selectAndScanDirectory: () => ResultAsync<AudioFileDTO[], string>;
}

export const createDirectoryScanner = ({
  selectDirectoryCommand,
  scanDirectoryCommand,
}: {
  selectDirectoryCommand: SelectDirectory;
  scanDirectoryCommand: ScanDirectory;
}): DirectoryScanner => {
  const [selectedDirectory, setSelectedDirectory] = createSignal<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = createSignal<boolean>(false);

  const selectAndScanDirectory = (): ResultAsync<AudioFileDTO[], string> => {
    setIsLoading(true);

    return selectDirectoryCommand()
      .andThen((dir) => (dir ? ok(dir) : err("No directory selected")))
      .andThen((dir) =>
        scanDirectoryCommand({ dir }).andThen((files) => ok({ dir, files })),
      )
      .andThen(({ dir, files }) => {
        setSelectedDirectory(dir);
        setIsLoading(false);
        return ok(files);
      })
      .orElse((e) => {
        setIsLoading(false);
        return err(e);
      });
  };

  return {
    selectedDirectory,
    isLoading,
    selectAndScanDirectory,
  };
};

export interface AudioFilesManager {
  audioFiles: AudioFileDTO[];
  isUpdating: Accessor<boolean>;

  /** 音声ファイルを更新する
   *
   * 更新を永続化する
   */
  updateAudioFile: (
    patch: AudioFilePatchDTO,
  ) => ResultAsync<AudioFileDTO, string>;
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
  const [isUpdating, setIsUpdating] = createSignal<boolean>(false);

  const updateAudioFile = (
    patch: AudioFilePatchDTO,
  ): ResultAsync<AudioFileDTO, string> => {
    setIsUpdating(true);

    return updateAudioFileCommand({ patch })
      .andThen((newFile) => {
        const fileIndex = audioFiles.findIndex(
          (file) => file.id === newFile.id,
        );
        if (fileIndex === -1) {
          return err("File not found");
        }

        setAudioFiles(fileIndex, reconcile(newFile));
        setIsUpdating(false);
        return ok(newFile);
      })
      .orElse((e) => {
        setIsUpdating(false);
        return err(e);
      });
  };

  const replaceAllAudioFiles = (audioFiles: AudioFileDTO[]) => {
    setAudioFiles(audioFiles);
  };

  return {
    audioFiles,
    isUpdating,
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
