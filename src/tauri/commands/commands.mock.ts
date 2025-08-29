import { errAsync, okAsync } from "neverthrow";
import { type AudioFileDTO, audioFileFromDTO } from "../dto";
import type { Commands } from "./types";

const mockAudioFiles: AudioFileDTO[] = [
  {
    id: "1",
    path: "C:\\Mock\\Music\\song1.mp3",
    id3_tag: {
      title: "Test Song 1",
      artists: ["Test Artist"],
      album: "Test Album",
    },
  },
  {
    id: "2",
    path: "C:\\Mock\\Music\\song2.mp3",
    id3_tag: {
      title: "Test Song 2",
      artists: ["Another Artist"],
      album: "Another Album",
    },
  },
];

export const mockCommands: Commands = {
  selectDirectory: () => {
    console.log("Mock: Selecting directory");
    return okAsync("C:\\Mock\\Music");
  },

  scanDirectory: ({ dir }) => {
    console.log(`Mock: Scanning directory ${dir}`);
    return okAsync(
      mockAudioFiles
        .map(audioFileFromDTO)
        .filter((file) => file.isOk())
        .map((file) => file.value),
    );
  },

  updateAudioFile: ({ patch }) => {
    console.log(`Mock: Updating audio file ${patch.id}`, patch);
    const existingFile = mockAudioFiles.find((f) => f.id === patch.id);
    if (!existingFile) {
      return errAsync("File not found");
    }

    const result = audioFileFromDTO({
      ...existingFile,
      path: patch.path ?? existingFile.path,
      id3_tag: {
        title: patch.title ?? existingFile.id3_tag.title,
        artists: patch.artists ?? existingFile.id3_tag.artists,
        album: patch.album ?? existingFile.id3_tag.album,
      },
    });

    if (result.isErr()) {
      const firstError =
        result.error.length > 0 ? result.error[0] : "Unknown error";
      return errAsync(firstError);
    }
    return okAsync(result.value);
  },
};
