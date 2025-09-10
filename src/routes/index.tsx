import { createFileRoute } from "@tanstack/solid-router";
import {
  AudioFileEditorTable,
  AudioFileStoreProvider,
  DirectorySelector,
} from "@/features/audio-file";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <AudioFileStoreProvider>
      <main class="w-full h-full p-3 *:mt-3 *:first:mt-0">
        <DirectorySelector />
        <AudioFileEditorTable />
      </main>
    </AudioFileStoreProvider>
  );
}
