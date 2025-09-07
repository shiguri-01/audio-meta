import { SaveIcon } from "lucide-solid";
import { IconButton } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { useAudioFileEditor } from "../providers/audio-file-editor";
import { useAudioFilesManager } from "../providers/audio-files-manager-provider";

export const SaveButton = () => {
  const { getPatch } = useAudioFileEditor();
  const { updateAudioFile, isUpdating } = useAudioFilesManager();

  let buttonRef!: HTMLButtonElement;

  const handleSave = () => {
    if (isUpdating()) return;

    const patch = getPatch();
    if (!patch) return;
    updateAudioFile(patch);
  };

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={handleSave}
        disabled={getPatch() === null || isUpdating()}
        icon={SaveIcon}
        aria-label="保存"
        variant={"tertiary"}
        class="text-sm p-1"
      />
      <Tooltip trigger={buttonRef}>保存</Tooltip>
    </>
  );
};
