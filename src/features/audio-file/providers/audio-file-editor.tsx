import {
  type Accessor,
  createContext,
  type ParentComponent,
  useContext,
} from "solid-js";
import type { AudioFileDTO } from "@/tauri/dto";
import {
  createEditableAudioFile,
  type EditableAudioFile,
} from "../primitives/editable-audio-file";

const AudioFileEditorContext = createContext<
  EditableAudioFile & { original: Accessor<AudioFileDTO> }
>();

export const AudioFileEditorProvider: ParentComponent<{
  original: Accessor<AudioFileDTO>;
}> = (props) => {
  const editableFile = createEditableAudioFile(props.original);

  return (
    <AudioFileEditorContext.Provider
      value={{ ...editableFile, original: props.original }}
    >
      {props.children}
    </AudioFileEditorContext.Provider>
  );
};

export const useAudioFileEditor = (): EditableAudioFile & {
  original: Accessor<AudioFileDTO>;
} => {
  const context = useContext(AudioFileEditorContext);
  if (!context) {
    throw new Error(
      "useAudioFileEditor must be used within an AudioFileEditorProvider",
    );
  }
  return context;
};
