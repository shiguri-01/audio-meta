import { createFileRoute } from "@tanstack/solid-router";
import {
  AudioFileEditorTable,
  AudioFilesManagerProvider,
  DirectorySelector,
} from "@/features/audio-file";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <AudioFilesManagerProvider>
      <main class="w-full h-full p-3 *:mt-3 *:first:mt-0">
        <DirectorySelector />
        <AudioFileEditorTable />
      </main>
    </AudioFilesManagerProvider>
  );
}
