import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { type } from "arktype";
import { err, fromPromise, ok, Result } from "neverthrow";
import type { AudioFile } from "@/features/audio-file";
import { AudioFile as AudioFileSchema } from "@/features/audio-file";
import type {
  Commands,
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
} from "./types";

const parseAudioFile = (raw: unknown): Result<AudioFile, string[]> => {
  const out = AudioFileSchema(raw);
  if (out instanceof type.errors) {
    return err(out.map((e) => e.message));
  }
  return ok(out);
};

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

export const commands: Commands = {
  selectDirectory,
  scanDirectory,
  updateAudioFile,
};
