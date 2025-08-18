import type { ResultAsync } from "neverthrow";

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

type CommandArgs = Record<string, unknown> | undefined;
type CommandResult<T> = ResultAsync<T, string>;
type Command<Args extends CommandArgs, Result> = Args extends undefined
  ? () => CommandResult<Result>
  : (args: Args) => CommandResult<Result>;

export type SelectDirectory = Command<undefined, string | null>;

export type ScanDirectory = Command<{ dir: string }, AudioFileDTO[]>;

export type UpdateAudioFile = Command<
  { patch: AudioFilePatchDTO },
  AudioFileDTO
>;

export interface Commands {
  selectDirectory: SelectDirectory;
  scanDirectory: ScanDirectory;
  updateAudioFile: UpdateAudioFile;
}
