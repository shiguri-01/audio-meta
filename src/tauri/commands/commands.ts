import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { fromPromise, okAsync } from "neverthrow";
import { type AudioFileDTO, audioFileFromDTO } from "../dto";
import type {
  Commands,
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
} from "./types";

const selectDirectory: SelectDirectory = () => {
  return fromPromise(open({ multiple: false, directory: true }), (e) =>
    String(e),
  );
};

const scanDirectory: ScanDirectory = ({ dir }) => {
  return fromPromise<AudioFileDTO[], string>(
    invoke("scan_directory", { dir }),
    (e) => String(e),
  ).andThen((dtos) => {
    return okAsync(
      dtos
        .map(audioFileFromDTO)
        .filter((file) => file.isOk())
        .map((file) => file.value),
    );
  });
};

const updateAudioFile: UpdateAudioFile = ({ patch }) => {
  return fromPromise<AudioFileDTO, string>(
    invoke("update_audio_file", { patch }),
    (e) => String(e),
  ).andThen((dto) =>
    audioFileFromDTO(dto).mapErr((e) => {
      const firstError = e.length > 0 ? e[0] : "Unknown error";
      return firstError;
    }),
  );
};

export const commands: Commands = {
  selectDirectory,
  scanDirectory,
  updateAudioFile,
};
