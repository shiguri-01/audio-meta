import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAudioFilesManager } from "@/features/audio-file/primitives/audio-files-manager";
import type { AudioFile } from "@/features/audio-file/schemas";
import type { AudioFilePatchDTO } from "@/tauri/dto";
import { audioFileFromDTO } from "@/tauri/dto";

describe("createAudioFilesManager", () => {
  const createMockAudioFile = (id: string, title = "Test Title"): AudioFile => {
    const dto = {
      id,
      path: `/path/to/${id}.mp3`,
      id3_tag: {
        title,
        artists: ["Test Artist"],
        album: "Test Album",
      },
    };

    const result = audioFileFromDTO(dto);
    if (result.isErr())
      throw new Error(`Mock creation failed: ${result.error}`);
    return result.value;
  };

  const createMockUpdateCommand = () => {
    return vi.fn();
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期のオーディオファイルリストで初期化される", () => {
      // Given
      const initialFiles = [
        createMockAudioFile("1", "Song 1"),
        createMockAudioFile("2", "Song 2"),
      ];
      const mockUpdateCommand = createMockUpdateCommand();

      // When
      const manager = createAudioFilesManager(initialFiles, {
        updateAudioFileCommand: mockUpdateCommand,
      });

      // Then
      expect(manager.audioFiles).toEqual(initialFiles);
    });

    it("初期状態ではisUpdatingがfalseになる", () => {
      // Given
      const initialFiles = [createMockAudioFile("1")];
      const mockUpdateCommand = createMockUpdateCommand();

      // When
      const manager = createAudioFilesManager(initialFiles, {
        updateAudioFileCommand: mockUpdateCommand,
      });

      // Then
      expect(manager.isUpdating()).toBe(false);
    });
  });

  describe("ファイル更新", () => {
    it("更新が成功した場合、ストア内のファイルが更新される", async () => {
      // Given
      const originalFile = createMockAudioFile("test-id", "Original Title");

      const updatedFileDto = {
        id: "test-id",
        path: "/path/to/test-id.mp3",
        id3_tag: {
          title: "Updated Title",
          artists: ["Test Artist"],
          album: "Test Album",
        },
      };
      const updatedFileResult = audioFileFromDTO(updatedFileDto);
      if (updatedFileResult.isErr())
        throw new Error("Failed to create updated file");
      const updatedFile = updatedFileResult.value;

      const mockUpdateCommand = vi.fn().mockReturnValue(okAsync(updatedFile));

      const manager = createAudioFilesManager([originalFile], {
        updateAudioFileCommand: mockUpdateCommand,
      });

      const patch: AudioFilePatchDTO = {
        id: "test-id",
        title: updatedFile.id3Tag.title,
      };

      // When
      const result = await manager.updateAudioFile(patch);

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id3Tag.title).toBe("Updated Title");
      }
      expect(mockUpdateCommand).toHaveBeenCalledWith({ patch });
    });

    it("更新中のローディング状態管理（簡素版）", async () => {
      // Given
      const originalFile = createMockAudioFile("test-id");
      const mockUpdateCommand = vi.fn().mockReturnValue(okAsync(originalFile));

      const manager = createAudioFilesManager([originalFile], {
        updateAudioFileCommand: mockUpdateCommand,
      });

      const patch: AudioFilePatchDTO = {
        id: "test-id",
        title: "New Title",
      };

      // When & Then
      const result = await manager.updateAudioFile(patch);
      expect(result.isOk()).toBe(true);
      expect(manager.isUpdating()).toBe(false); // 完了後はfalse
    });

    it("存在しないファイルを更新しようとした場合、エラーを返す", async () => {
      // Given
      const mockUpdateCommand = vi
        .fn()
        .mockReturnValue(okAsync(createMockAudioFile("non-existent-id")));
      const manager = createAudioFilesManager(
        [createMockAudioFile("existing-id")],
        {
          updateAudioFileCommand: mockUpdateCommand,
        },
      );

      const patch: AudioFilePatchDTO = {
        id: "non-existent-id",
        title: "Some Title",
      };

      // When
      const result = await manager.updateAudioFile(patch);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("File not found");
      }
      // API呼び出しは行われる（戻り値をチェックしてからエラーになる）
      expect(mockUpdateCommand).toHaveBeenCalledWith({ patch });
    });

    it("API呼び出しが失敗した場合、エラーを返しisUpdatingをfalseに戻す", async () => {
      // Given
      const originalFile = createMockAudioFile("test-id");
      const mockUpdateCommand = vi.fn().mockReturnValue(errAsync("API Error"));

      const manager = createAudioFilesManager([originalFile], {
        updateAudioFileCommand: mockUpdateCommand,
      });

      const patch: AudioFilePatchDTO = {
        id: "test-id",
        title: "New Title",
      };

      // When
      const result = await manager.updateAudioFile(patch);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("API Error");
      }
      expect(manager.isUpdating()).toBe(false);
    });
  });

  describe("ファイルリスト置換", () => {
    it("新しいファイルリストでオーディオファイルを完全に置換する", () => {
      // Given
      const initialFiles = [
        createMockAudioFile("1", "Song 1"),
        createMockAudioFile("2", "Song 2"),
      ];
      const manager = createAudioFilesManager(initialFiles, {
        updateAudioFileCommand: createMockUpdateCommand(),
      });

      const newFiles = [
        createMockAudioFile("3", "New Song 1"),
        createMockAudioFile("4", "New Song 2"),
        createMockAudioFile("5", "New Song 3"),
      ];

      // When
      manager.replaceAllAudioFiles(newFiles);

      // Then
      expect(manager.audioFiles).toEqual(newFiles);
      expect(manager.audioFiles.length).toBe(3);
      expect(manager.audioFiles[0].id).toBe("3");
    });

    it("空の配列で置換できる", () => {
      // Given
      const initialFiles = [createMockAudioFile("1"), createMockAudioFile("2")];
      const manager = createAudioFilesManager(initialFiles, {
        updateAudioFileCommand: createMockUpdateCommand(),
      });

      // When
      manager.replaceAllAudioFiles([]);

      // Then
      expect(manager.audioFiles).toEqual([]);
      expect(manager.audioFiles.length).toBe(0);
    });
  });
});
