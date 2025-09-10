import { type } from "arktype";
import { err, ok } from "neverthrow";
import { AudioFile } from "@/features/audio-file";
import type { fromDTO, toDTO } from "./utils";

export interface Id3TagDTO {
  title: string | null;
  artists: string[] | null;
  album: string | null;
}

export interface AudioFileDTO {
  id: string;
  path: string;
  id3Tag: Id3TagDTO;
}

export const audioFileToDTO: toDTO<AudioFile, AudioFileDTO> = (audioFile) =>
  audioFile;

export const audioFileFromDTO: fromDTO<AudioFile, AudioFileDTO> = (dto) => {
  const out = AudioFile(dto);

  if (out instanceof type.errors) {
    return err(out.map((e) => e.message));
  } else {
    return ok(out);
  }
};
