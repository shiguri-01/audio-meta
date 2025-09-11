import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { err, fromPromise, ok, Result } from "neverthrow";
import type { AudioFile } from "@/features/audio-file";
import type {
  Commands,
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
  UpdateAudioFiles,
} from "./types";
import { parseAudioFile } from "./utils";

const selectDirectory: SelectDirectory = () => {
  return fromPromise(open({ multiple: false, directory: true }), (e) =>
    e instanceof Error ? e.message : String(e),
  );
};

const scanDirectory: ScanDirectory = ({ dir }) => {
  return fromPromise(invoke<unknown[]>("scan_directory", { dir }), (e) =>
    e instanceof Error ? e.message : String(e),
  ).andThen((rawList) =>
    Result.combineWithAllErrors(rawList.map(parseAudioFile)).mapErr((errs) => {
      const messages = errs.flat();
      return messages.length > 0 ? messages.join("; ") : "Unknown error";
    }),
  );
};

const updateAudioFile: UpdateAudioFile = ({ patch }) => {
  return fromPromise(invoke<unknown>("update_audio_file", { patch }), (e) =>
    e instanceof Error ? e.message : String(e),
  )
    .andThen(parseAudioFile)
    .mapErr((e) => {
      if (typeof e === "string") return e;
      return e.length > 0 ? e.join("; ") : "Unknown error";
    });
};

type AudioFileSaveResultDTO =
  | {
      id: string;
      success: true;
      file: AudioFile;
    }
  | {
      id: string;
      success: false;
      error: string;
    };

const convertSaveResultDtoToResult = (
  dto: AudioFileSaveResultDTO,
): Result<AudioFile, { id: string; error: string }> => {
  if (dto.success) {
    return ok(dto.file);
  } else {
    return err({ id: dto.id, error: dto.error });
  }
};

const updateAudioFiles: UpdateAudioFiles = ({ patches }) =>
  fromPromise(
    invoke<AudioFileSaveResultDTO[]>("update_audio_files", { patches }),
    (e) => (e instanceof Error ? e.message : String(e)),
  ).map((results) => results.map(convertSaveResultDtoToResult));

export const commands: Commands = {
  selectDirectory,
  scanDirectory,
  updateAudioFile,
  updateAudioFiles,
};
