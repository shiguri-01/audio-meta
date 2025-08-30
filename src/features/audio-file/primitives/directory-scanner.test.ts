import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDirectoryScanner } from "@/features/audio-file/primitives/directory-scanner";
import type { AudioFile } from "@/features/audio-file/schemas";
import { audioFileFromDTO } from "@/tauri/dto";

describe("createDirectoryScanner", () => {
  const createMockAudioFile = (id: string): AudioFile => {
    const dto = {
      id,
      path: `/mock/path/${id}.mp3`,
      id3_tag: {
        title: `Mock Title ${id}`,
        artists: ["Mock Artist"],
        album: "Mock Album",
      },
    };

    const result = audioFileFromDTO(dto);
    if (result.isErr())
      throw new Error(`Mock creation failed: ${result.error}`);
    return result.value;
  };

  const createMockCommands = () => {
    return {
      selectDirectoryCommand: vi.fn(),
      scanDirectoryCommand: vi.fn(),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("選択されたディレクトリがnullになる", () => {
      // Given
      const mockCommands = createMockCommands();

      // When
      const scanner = createDirectoryScanner(mockCommands);

      // Then
      expect(scanner.selectedDirectory()).toBeNull();
    });

    it("初期状態ではローディング中でない", () => {
      // Given
      const mockCommands = createMockCommands();

      // When
      const scanner = createDirectoryScanner(mockCommands);

      // Then
      expect(scanner.isLoading()).toBe(false);
    });
  });

  describe("ディレクトリ選択とスキャン", () => {
    it("正常フロー: ディレクトリ選択とスキャンが成功する", async () => {
      // Given
      const mockFiles = [createMockAudioFile("1"), createMockAudioFile("2")];
      const mockDirectory = "C:\\Music\\Test";
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        okAsync(mockDirectory),
      );
      mockCommands.scanDirectoryCommand.mockReturnValue(okAsync(mockFiles));

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockFiles);
      }
      expect(scanner.selectedDirectory()).toBe(mockDirectory);
      expect(scanner.isLoading()).toBe(false);
      expect(mockCommands.selectDirectoryCommand).toHaveBeenCalledTimes(1);
      expect(mockCommands.scanDirectoryCommand).toHaveBeenCalledWith({
        dir: mockDirectory,
      });
    });

    it("ディレクトリ選択がキャンセルされた場合、エラーを返す", async () => {
      // Given
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(okAsync(null));

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("No directory selected");
      }
      expect(scanner.selectedDirectory()).toBeNull();
      expect(scanner.isLoading()).toBe(false);
      expect(mockCommands.scanDirectoryCommand).not.toHaveBeenCalled();
    });

    it("ディレクトリ選択が失敗した場合、エラーを返す", async () => {
      // Given
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        errAsync("Selection failed"),
      );

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Selection failed");
      }
      expect(scanner.selectedDirectory()).toBeNull();
      expect(scanner.isLoading()).toBe(false);
      expect(mockCommands.scanDirectoryCommand).not.toHaveBeenCalled();
    });

    it("スキャンが失敗した場合、エラーを返しisLoadingをfalseに戻す", async () => {
      // Given
      const mockDirectory = "C:\\Music\\Test";
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        okAsync(mockDirectory),
      );
      mockCommands.scanDirectoryCommand.mockReturnValue(
        errAsync("Scan failed"),
      );

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe("Scan failed");
      }
      expect(scanner.selectedDirectory()).toBeNull();
      expect(scanner.isLoading()).toBe(false);
    });

    it("ローディング状態管理（簡素版）", async () => {
      // Given
      const mockDirectory = "C:\\Music\\Test";
      const mockFiles = [createMockAudioFile("1")];
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        okAsync(mockDirectory),
      );
      mockCommands.scanDirectoryCommand.mockReturnValue(okAsync(mockFiles));

      const scanner = createDirectoryScanner(mockCommands);

      // When & Then
      const result = await scanner.selectAndScanDirectory();
      expect(result.isOk()).toBe(true);
      expect(scanner.isLoading()).toBe(false); // 完了後はfalse
    });

    it("空のディレクトリでもスキャンが成功する", async () => {
      // Given
      const mockDirectory = "C:\\Music\\Empty";
      const mockFiles: AudioFile[] = [];
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        okAsync(mockDirectory),
      );
      mockCommands.scanDirectoryCommand.mockReturnValue(okAsync(mockFiles));

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
        expect(result.value.length).toBe(0);
      }
      expect(scanner.selectedDirectory()).toBe(mockDirectory);
    });
  });

  describe("エラーハンドリング", () => {
    it("連続して実行してもローディング状態が正しく管理される", async () => {
      // Given
      const mockDirectory1 = "C:\\Music\\Test1";
      const mockDirectory2 = "C:\\Music\\Test2";
      const mockFiles = [createMockAudioFile("1")];
      const mockCommands = createMockCommands();

      const scanner = createDirectoryScanner(mockCommands);

      // When & Then - 1回目
      mockCommands.selectDirectoryCommand.mockReturnValueOnce(
        okAsync(mockDirectory1),
      );
      mockCommands.scanDirectoryCommand.mockReturnValueOnce(okAsync(mockFiles));

      const result1 = await scanner.selectAndScanDirectory();
      expect(result1.isOk()).toBe(true);
      expect(scanner.selectedDirectory()).toBe(mockDirectory1);
      expect(scanner.isLoading()).toBe(false);

      // When & Then - 2回目
      mockCommands.selectDirectoryCommand.mockReturnValueOnce(
        okAsync(mockDirectory2),
      );
      mockCommands.scanDirectoryCommand.mockReturnValueOnce(okAsync(mockFiles));

      const result2 = await scanner.selectAndScanDirectory();
      expect(result2.isOk()).toBe(true);
      expect(scanner.selectedDirectory()).toBe(mockDirectory2);
      expect(scanner.isLoading()).toBe(false);
    });

    it("選択が成功してスキャンが失敗した場合、selectedDirectoryは更新されない", async () => {
      // Given
      const mockDirectory = "C:\\Music\\Test";
      const mockCommands = createMockCommands();
      mockCommands.selectDirectoryCommand.mockReturnValue(
        okAsync(mockDirectory),
      );
      mockCommands.scanDirectoryCommand.mockReturnValue(errAsync("Scan error"));

      const scanner = createDirectoryScanner(mockCommands);

      // When
      const result = await scanner.selectAndScanDirectory();

      // Then
      expect(result.isErr()).toBe(true);
      expect(scanner.selectedDirectory()).toBeNull(); // 更新されない
    });
  });
});
