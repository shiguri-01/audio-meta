import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { fromPromise, Result } from "neverthrow";
import { type AudioFileDTO, audioFileFromDTO } from "../dto";
import type {
  Commands,
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
} from "./types";

const selectDirectory: SelectDirectory = () => {
  return fromPromise(open({ multiple: false, directory: true }), (e) =>
    e instanceof Error ? e.message : String(e),
  );
};

const scanDirectory: ScanDirectory = ({ dir }) => {
  return fromPromise(invoke<AudioFileDTO[]>("scan_directory", { dir }), (e) =>
    e instanceof Error ? e.message : String(e),
  ).andThen((dtos) =>
    Result.combineWithAllErrors(dtos.map(audioFileFromDTO)).mapErr((errs) => {
      const messages = errs.flat();
      return messages.length > 0 ? messages.join("; ") : "Unknown error";
    }),
  );
};

const updateAudioFile: UpdateAudioFile = ({ patch }) => {
  return fromPromise(
    invoke<AudioFileDTO>("update_audio_file", { patch }),
    (e) => (e instanceof Error ? e.message : String(e)),
  )
    .andThen(audioFileFromDTO)
    .mapErr((e) => {
      if (typeof e === "string") return e;
      return e.length > 0 ? e.join("; ") : "Unknown error";
    });
};

export const commands: Commands = {
  selectDirectory,
  scanDirectory,
  updateAudioFile,
};
