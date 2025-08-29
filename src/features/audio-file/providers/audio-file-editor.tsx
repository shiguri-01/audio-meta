import {
  type Accessor,
  createContext,
  type ParentComponent,
  useContext,
} from "solid-js";
import {
  createEditableAudioFile,
  type EditableAudioFile,
} from "../primitives/editable-audio-file";
import type { AudioFile } from "../schemas";

const AudioFileEditorContext = createContext<
  EditableAudioFile & { original: Accessor<AudioFile> }
>();

export const AudioFileEditorProvider: ParentComponent<{
  original: Accessor<AudioFile>;
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
  original: Accessor<AudioFile>;
} => {
  const context = useContext(AudioFileEditorContext);
  if (!context) {
    throw new Error(
      "useAudioFileEditor must be used within an AudioFileEditorProvider",
    );
  }
  return context;
};
