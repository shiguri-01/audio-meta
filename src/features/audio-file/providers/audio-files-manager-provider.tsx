import { createContext, type ParentComponent, useContext } from "solid-js";
import { useCommands } from "@/tauri/commands/provider";
import {
  type AudioFilesManager,
  createAudioFilesManager,
} from "../primitives/audio-files-manager";

const AudioFilesManagerContext = createContext<AudioFilesManager>();

export const AudioFilesManagerProvider: ParentComponent = (props) => {
  const { updateAudioFile } = useCommands();
  const audioFilesManager = createAudioFilesManager([], {
    updateAudioFileCommand: updateAudioFile,
  });

  return (
    <AudioFilesManagerContext.Provider value={audioFilesManager}>
      {props.children}
    </AudioFilesManagerContext.Provider>
  );
};

export const useAudioFilesManager = (): AudioFilesManager => {
  const context = useContext(AudioFilesManagerContext);
  if (!context) {
    throw new Error("useAudioFiles must be used within an AudioFilesProvider");
  }
  return context;
};
