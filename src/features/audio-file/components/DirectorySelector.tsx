import { Show } from "solid-js";
import { useCommands } from "@/tauri/commands";
import { createDirectoryScanner } from "../primitives/directory-scanner";
import { useAudioFilesManager } from "../providers/audio-files-manager-provider";

export const DirectorySelector = () => {
  const commands = useCommands();
  const scanner = createDirectoryScanner({
    selectDirectoryCommand: commands.selectDirectory,
    scanDirectoryCommand: commands.scanDirectory,
  });
  const { replaceAllAudioFiles } = useAudioFilesManager();

  const loadDirectory = () => {
    if (scanner.isLoading()) return;

    scanner
      .selectAndScanDirectory()
      .map((files) => {
        replaceAllAudioFiles(files);
      })
      .mapErr((error) => {
        console.error("Error loading directory:", error);
      });
  };

  return (
    <div class="flex items-center gap-2">
      <button
        type="button"
        onClick={loadDirectory}
        disabled={scanner.isLoading()}
      >
        ディレクトリを選択
      </button>
      <div class="flex-1 border-b border-fg">
        <Show
          when={scanner.selectedDirectory()}
          fallback={
            <p class="text-fg-muted">ディレクトリが選択されていません</p>
          }
        >
          {scanner.selectedDirectory()}
        </Show>
      </div>
    </div>
  );
};
