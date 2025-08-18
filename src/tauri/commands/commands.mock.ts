import { okAsync } from "neverthrow";
import type { AudioFileDTO } from "../dto";
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
    return okAsync(mockAudioFiles);
  },

  updateAudioFile: ({ patch }) => {
    console.log(`Mock: Updating audio file ${patch.id}`, patch);
    const existingFile = mockAudioFiles.find((f) => f.id === patch.id);
    if (!existingFile) {
      return okAsync({
        id: patch.id,
        path: patch.path || "unknown.mp3",
        id3_tag: {
          title: patch.title || null,
          artists: patch.artists || null,
          album: patch.album || null,
        },
      });
    }

    const updatedFile: AudioFileDTO = {
      ...existingFile,
      path: patch.path ?? existingFile.path,
      id3_tag: {
        title: patch.title ?? existingFile.id3_tag.title,
        artists: patch.artists ?? existingFile.id3_tag.artists,
        album: patch.album ?? existingFile.id3_tag.album,
      },
    };

    return okAsync(updatedFile);
  },
};
