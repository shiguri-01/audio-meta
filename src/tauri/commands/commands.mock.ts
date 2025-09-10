import { errAsync, okAsync } from "neverthrow";
import type { AudioFile, AudioFilePatch } from "@/features/audio-file/schemas";
import { applyChanges } from "@/features/audio-file/schemas";
import type { Commands, UpdateAudioFile } from "./types";
import { parseAudioFile } from "./utils";

const seed = [
  {
    id: "1",
    path: "C:\\Mock\\Music\\song1.mp3",
    id3Tag: {
      title: "Test Song 1",
      artists: ["Test Artist"],
      album: "Test Album",
    },
  },
  {
    id: "2",
    path: "C:\\Mock\\Music\\song2.mp3",
    id3Tag: {
      title: "Test Song 2",
      artists: ["Another Artist"],
      album: "Another Album",
    },
  },
];

const mockAudioFiles: AudioFile[] = seed
  .map(parseAudioFile)
  .filter((result) => result.isOk())
  .map((result) => result._unsafeUnwrap());

const applyPatch = (patch: AudioFilePatch) => {
  const idx = mockAudioFiles.findIndex((file) => file.id === patch.id);
  if (idx === -1) return errAsync("File not found");
  const updatedCandidate = applyChanges(mockAudioFiles[idx], patch.changes);
  const validated = parseAudioFile(updatedCandidate);
  if (validated.isErr()) {
    const first = validated.error[0] ?? "Unknown error";
    return errAsync(first);
  }
  mockAudioFiles[idx] = validated.value;
  return okAsync(validated.value);
};

const updateAudioFile: UpdateAudioFile = ({ patch }) => applyPatch(patch);

export const mockCommands: Commands = {
  selectDirectory: () => {
    console.log("Mock: Selecting directory");
    return okAsync("C:\\Mock\\Music");
  },

  scanDirectory: ({ dir }) => {
    console.log(`Mock: Scanning directory ${dir}`);
    return okAsync([...mockAudioFiles]);
  },

  updateAudioFile,
};
