import { createFileRoute } from "@tanstack/solid-router";
import {
  AudioFileEditorTable,
  AudioFileStoreProvider,
  DirectorySelector,
  SaveAllButton,
} from "@/features/audio-file";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <AudioFileStoreProvider>
      <main class="w-full h-full p-3 *:mt-3 *:first:mt-0">
        <div class="flex items-center justify-between gap-2">
          <DirectorySelector />
          <SaveAllButton />
        </div>
        <AudioFileEditorTable />
      </main>
    </AudioFileStoreProvider>
  );
}
