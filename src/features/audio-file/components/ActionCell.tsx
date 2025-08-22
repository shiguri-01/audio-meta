import { Button } from "@kobalte/core/button";
import { cn } from "@/utils/style";
import { useAudioFileEditor } from "../providers/audio-file-editor";
import { useAudioFilesManager } from "../providers/audio-files-manager-provider";

export const SaveButton = () => {
  const { getPatch } = useAudioFileEditor();
  const { updateAudioFile, isUpdating } = useAudioFilesManager();

  const handleSave = () => {
    if (isUpdating()) return;

    const patch = getPatch();
    if (!patch) return;
    updateAudioFile(patch);
  };

  return (
    <Button
      onClick={handleSave}
      disabled={isUpdating()}
      class={cn(isUpdating() && "text-fg-muted")}
    >
      Save
    </Button>
  );
};
