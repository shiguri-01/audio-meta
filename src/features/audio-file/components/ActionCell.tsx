import { SaveIcon } from "lucide-solid";
import { createMemo } from "solid-js";
import { IconButton } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { useAudioFileStore } from "../primitives/audio-file-store";
import type { AudioFile } from "../schemas";

export const SaveButton = (props: { file: AudioFile }) => {
  const { isFileDirty, saveFile, pending } = useAudioFileStore();
  const isDirty = createMemo(() => isFileDirty(props.file.id));

  let buttonRef!: HTMLButtonElement;

  const handleSave = () => {
    if (pending() || !isDirty()) return;
    saveFile(props.file.id);
  };

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={handleSave}
        disabled={!isDirty() || pending()}
        icon={SaveIcon}
        aria-label="保存"
        variant={"tertiary"}
        class="text-sm p-1"
      />
      <Tooltip trigger={buttonRef}>保存</Tooltip>
    </>
  );
};
