import { describe, expect, it } from "vitest";
import type { AudioFileDTO } from "@/tauri/dto";
import { audioFileFromDTO, audioFileToDTO } from "@/tauri/dto";

describe("audioFileFromDTO", () => {
  describe("正常なDTOの変換", () => {
    it("完全なデータを持つDTOを正しく変換する", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id-123",
        path: "/path/to/music/song.mp3",
        id3Tag: {
          title: "Test Song",
          artists: ["Artist 1", "Artist 2"],
          album: "Test Album",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const audioFile = result.value;
        expect(audioFile.id).toBe("test-id-123");
        expect(audioFile.path).toBe("/path/to/music/song.mp3");
        expect(audioFile.id3Tag.title).toBe("Test Song");
        expect(audioFile.id3Tag.artists).toEqual(["Artist 1", "Artist 2"]);
        expect(audioFile.id3Tag.album).toBe("Test Album");
      }
    });

    it("nullフィールドを持つDTOを正しく変換する", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id-456",
        path: "/path/to/music/instrumental.mp3",
        id3Tag: {
          title: null,
          artists: null,
          album: null,
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const audioFile = result.value;
        expect(audioFile.id).toBe("test-id-456");
        expect(audioFile.path).toBe("/path/to/music/instrumental.mp3");
        expect(audioFile.id3Tag.title).toBeNull();
        expect(audioFile.id3Tag.artists).toBeNull();
        expect(audioFile.id3Tag.album).toBeNull();
      }
    });

    it("部分的にnullのフィールドを持つDTOを正しく変換する", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id-789",
        path: "/path/to/music/partial.mp3",
        id3Tag: {
          title: "Song with Missing Info",
          artists: ["Known Artist"],
          album: null,
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const audioFile = result.value;
        expect(audioFile.id3Tag.title).toBe("Song with Missing Info");
        expect(audioFile.id3Tag.artists).toEqual(["Known Artist"]);
        expect(audioFile.id3Tag.album).toBeNull();
      }
    });
  });

  describe("無効なDTOの処理", () => {
    it("空のパスを持つDTOはエラーを返す", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "",
        id3Tag: {
          title: "Test",
          artists: ["Artist"],
          album: "Album",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error[0]).toContain("path");
      }
    });

    it("空のタイトルを持つDTOはエラーを返す", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "/valid/path.mp3",
        id3Tag: {
          title: "",
          artists: ["Artist"],
          album: "Album",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error.some((err) => err.includes("title"))).toBe(true);
      }
    });

    it("空のアーティスト配列を持つDTOはエラーを返す", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "/valid/path.mp3",
        id3Tag: {
          title: "Valid Title",
          artists: [],
          album: "Album",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error.some((err) => err.includes("artists"))).toBe(true);
      }
    });

    it("重複するアーティストを持つDTOはエラーを返す", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "/valid/path.mp3",
        id3Tag: {
          title: "Valid Title",
          artists: ["Artist 1", "Artist 1"],
          album: "Album",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(
          result.error.some(
            (err) => err.includes("unique") || err.includes("artists"),
          ),
        ).toBe(true);
      }
    });

    it("空のアルバム名を持つDTOはエラーを返す", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "/valid/path.mp3",
        id3Tag: {
          title: "Valid Title",
          artists: ["Artist"],
          album: "",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.length).toBeGreaterThan(0);
        expect(result.error.some((err) => err.includes("album"))).toBe(true);
      }
    });
  });

  describe("エラーメッセージの品質", () => {
    it("複数のバリデーションエラーがある場合、全て報告する", () => {
      // Given
      const dto: AudioFileDTO = {
        id: "test-id",
        path: "",
        id3Tag: {
          title: "",
          artists: [],
          album: "",
        },
      };

      // When
      const result = audioFileFromDTO(dto);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        // 複数のエラーメッセージが含まれることを確認
        expect(result.error.length).toBeGreaterThan(1);

        const errorString = result.error.join(" ");
        expect(errorString).toContain("path");
        expect(errorString).toContain("title");
        expect(errorString).toContain("artists");
        expect(errorString).toContain("album");
      }
    });

    it("不明なエラーが発生した場合、適切にハンドリングする", () => {
      // Given
      const invalidDto: unknown = {
        id: null, // 無効な型
        path: "/valid/path.mp3",
        id3_tag: {
          title: "Valid Title",
          artists: ["Artist"],
          album: "Album",
        },
      };

      // When
      const result = audioFileFromDTO(invalidDto as AudioFileDTO);

      // Then
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(Array.isArray(result.error)).toBe(true);
        expect(result.error.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("audioFileToDTO", () => {
  it("AudioFileをDTOに正しく変換する", () => {
    // Given
    const validDto: AudioFileDTO = {
      id: "test-id",
      path: "/path/to/song.mp3",
      id3Tag: {
        title: "Test Song",
        artists: ["Test Artist"],
        album: "Test Album",
      },
    };

    const audioFileResult = audioFileFromDTO(validDto);
    if (audioFileResult.isErr())
      throw new Error("Failed to create test audio file");
    const audioFile = audioFileResult.value;

    // When
    const result = audioFileToDTO(audioFile);

    // Then
    expect(result).toEqual(validDto);
  });

  it("nullフィールドを持つAudioFileをDTOに正しく変換する", () => {
    // Given
    const validDto: AudioFileDTO = {
      id: "test-id",
      path: "/path/to/instrumental.mp3",
      id3Tag: {
        title: null,
        artists: null,
        album: null,
      },
    };

    const audioFileResult = audioFileFromDTO(validDto);
    if (audioFileResult.isErr())
      throw new Error("Failed to create test audio file");
    const audioFile = audioFileResult.value;

    // When
    const result = audioFileToDTO(audioFile);

    // Then
    expect(result).toEqual(validDto);
  });
});
