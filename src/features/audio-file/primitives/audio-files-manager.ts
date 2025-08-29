import { err, ok, type ResultAsync } from "neverthrow";
import { type Accessor, createSignal } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { UpdateAudioFile } from "@/tauri/commands";
import type { AudioFilePatchDTO } from "@/tauri/dto";
import type { AudioFile } from "../schemas";

export interface AudioFilesManager {
  audioFiles: AudioFile[];
  isUpdating: Accessor<boolean>;

  /** 音声ファイルを更新する
   *
   * 更新を永続化する
   */
  updateAudioFile: (patch: AudioFilePatchDTO) => ResultAsync<AudioFile, string>;
  /**
   * オーディオファイルリストを新しいリストに置き換える
   *
   * 現在管理しているファイルをすべてクリアし、新しいファイルリストで置き換える
   */
  replaceAllAudioFiles: (audioFiles: AudioFile[]) => void;
}

export const createAudioFilesManager = (
  initialAudioFiles: AudioFile[],
  { updateAudioFileCommand }: { updateAudioFileCommand: UpdateAudioFile },
): AudioFilesManager => {
  const [audioFiles, setAudioFiles] = createStore(initialAudioFiles);
  const [isUpdating, setIsUpdating] = createSignal<boolean>(false);

  const updateAudioFile = (
    patch: AudioFilePatchDTO,
  ): ResultAsync<AudioFile, string> => {
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

  const replaceAllAudioFiles = (audioFiles: AudioFile[]) => {
    setAudioFiles(audioFiles);
  };

  return {
    audioFiles,
    isUpdating,
    updateAudioFile,
    replaceAllAudioFiles,
  };
};
