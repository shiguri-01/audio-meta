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
      <main>
        <DirectorySelector />
        <AudioFileEditorTable />
      </main>
    </AudioFilesManagerProvider>
  );
}
