import { err, ok, type ResultAsync } from "neverthrow";
import { type Accessor, createSignal } from "solid-js";
import type { ScanDirectory, SelectDirectory } from "@/tauri/commands";
import type { AudioFileDTO } from "@/tauri/dto";

export interface DirectoryScanner {
  selectedDirectory: Accessor<string | null>;
  isLoading: Accessor<boolean>;

  /**
   * ディレクトリ選択ダイアログを開き、選択されたディレクトリの音声ファイルを走査する
   */
  selectAndScanDirectory: () => ResultAsync<AudioFileDTO[], string>;
}

export const createDirectoryScanner = ({
  selectDirectoryCommand,
  scanDirectoryCommand,
}: {
  selectDirectoryCommand: SelectDirectory;
  scanDirectoryCommand: ScanDirectory;
}): DirectoryScanner => {
  const [selectedDirectory, setSelectedDirectory] = createSignal<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = createSignal<boolean>(false);

  const selectAndScanDirectory = (): ResultAsync<AudioFileDTO[], string> => {
    setIsLoading(true);

    return selectDirectoryCommand()
      .andThen((dir) => (dir ? ok(dir) : err("No directory selected")))
      .andThen((dir) =>
        scanDirectoryCommand({ dir }).andThen((files) => ok({ dir, files })),
      )
      .andThen(({ dir, files }) => {
        setSelectedDirectory(dir);
        setIsLoading(false);
        return ok(files);
      })
      .orElse((e) => {
        setIsLoading(false);
        return err(e);
      });
  };

  return {
    selectedDirectory,
    isLoading,
    selectAndScanDirectory,
  };
};
