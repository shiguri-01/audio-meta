import type { ResultAsync } from "neverthrow";
import type { AudioFile } from "@/features/audio-file/schemas";
import type { AudioFilePatchDTO } from "../dto";

type CommandArgs = Record<string, unknown> | undefined;
type CommandResult<T> = ResultAsync<T, string>;
type Command<Args extends CommandArgs, Result> = Args extends undefined
  ? () => CommandResult<Result>
  : (args: Args) => CommandResult<Result>;

export type SelectDirectory = Command<undefined, string | null>;

export type ScanDirectory = Command<{ dir: string }, AudioFile[]>;

export type UpdateAudioFile = Command<{ patch: AudioFilePatchDTO }, AudioFile>;

export interface Commands {
  selectDirectory: SelectDirectory;
  scanDirectory: ScanDirectory;
  updateAudioFile: UpdateAudioFile;
}
