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
  id3_tag: Id3TagDTO;
}

export interface AudioFilePatchDTO {
  id: string;
  path?: string;
  title?: string | null;
  artists?: string[] | null;
  album?: string | null;
}

export const audioFileToDTO: toDTO<AudioFile, AudioFileDTO> = (audioFile) => {
  return {
    id: audioFile.id,
    path: audioFile.path,
    id3_tag: audioFile.id3Tag,
  };
};

export const audioFileFromDTO: fromDTO<AudioFile, AudioFileDTO> = (dto) => {
  const out = AudioFile({
    id: dto.id,
    path: dto.path,
    id3Tag: dto.id3_tag,
  });

  if (out instanceof type.errors) {
    return err(out.map((e) => e.message));
  } else {
    return ok(out);
  }
};
