import { type } from "arktype";
import { err, ok, type Result } from "neverthrow";
import type { AudioFile } from "@/features/audio-file";
import { AudioFile as AudioFileSchema } from "@/features/audio-file";

export const parseAudioFile = (raw: unknown): Result<AudioFile, string[]> => {
  const out = AudioFileSchema(raw);
  if (out instanceof type.errors) {
    return err(out.map((e) => e.message));
  }
  return ok(out);
};
