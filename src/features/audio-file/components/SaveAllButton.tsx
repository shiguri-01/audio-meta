import { createMemo } from "solid-js";
import { Button } from "@/components/button";
import { useAudioFileStore } from "../primitives/audio-file-store";

export const SaveAllButton = () => {
  const { saveAllFiles, isDirty, pending } = useAudioFileStore();
  const handleSaveAll = () => {
    if (pending() || !isDirty()) return;
    saveAllFiles();
  };
  // 保存中か否かを分かりやすくするため、pending時のみ disabledにする
  // 変更がないときもボタン自体はクリックできるようにする
  const disabled = createMemo(() => pending());
  return (
    <Button onClick={handleSaveAll} variant="primary" disabled={disabled()}>
      すべて保存
    </Button>
  );
};
