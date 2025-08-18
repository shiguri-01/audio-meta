import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { fromPromise } from "neverthrow";
import type {
  Commands,
  ScanDirectory,
  SelectDirectory,
  UpdateAudioFile,
} from "./types";

const selectDirectory: SelectDirectory = () => {
  return fromPromise(open({ multiple: false, directory: true }), (e) =>
    String(e),
  );
};

const scanDirectory: ScanDirectory = ({ dir }) => {
  return fromPromise(invoke("scan_directory", { dir }), (e) => String(e));
};

const updateAudioFile: UpdateAudioFile = ({ patch }) => {
  return fromPromise(invoke("update_audio_file", { patch }), (e) => String(e));
};

export const commands: Commands = {
  selectDirectory,
  scanDirectory,
  updateAudioFile,
};
