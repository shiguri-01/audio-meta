import { Show } from "solid-js";
import { Button } from "@/components/button";
import { useCommands } from "@/tauri/commands";
import { useAudioFileStore } from "../primitives/audio-file-store";
import { createDirectoryScanner } from "../primitives/directory-scanner";

export const DirectorySelector = () => {
  const commands = useCommands();
  const scanner = createDirectoryScanner({
    selectDirectoryCommand: commands.selectDirectory,
    scanDirectoryCommand: commands.scanDirectory,
  });
  const { resetWithFiles } = useAudioFileStore();

  const loadDirectory = () => {
    if (scanner.isLoading()) return;

    scanner
      .selectAndScanDirectory()
      .map((files) => {
        resetWithFiles(files);
      })
      .mapErr((error) => {
        console.error("Error loading directory:", error);
      });
  };

  return (
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant={scanner.selectedDirectory() ? "secondary" : "primary"}
        onClick={loadDirectory}
        disabled={scanner.isLoading()}
      >
        ディレクトリを選択
      </Button>

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
