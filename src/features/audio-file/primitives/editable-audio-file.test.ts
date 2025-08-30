import { createSignal } from "solid-js";
import { beforeEach, describe, expect, it } from "vitest";
import { createEditableAudioFile } from "@/features/audio-file/primitives/editable-audio-file";
import type { AudioFile } from "@/features/audio-file/schemas";
import type { AudioFilePatchDTO } from "@/tauri/dto";
import { audioFileFromDTO } from "@/tauri/dto";

describe("createEditableAudioFile", () => {
  const createMockAudioFile = (): AudioFile => {
    const dto = {
      id: "test-id-123",
      path: "/path/to/test.mp3",
      id3_tag: {
        title: "Original Title",
        artists: ["Original Artist"],
        album: "Original Album",
      },
    };

    const result = audioFileFromDTO(dto);
    if (result.isErr())
      throw new Error(`Mock creation failed: ${result.error}`);
    return result.value;
  };

  beforeEach(() => {
    // テスト間のクリーンアップ
  });

  describe("初期状態", () => {
    it("オリジナルのオーディオファイルの値で初期化される", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);

      // When
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // Then
      expect(editableAudioFile.path()).toBe(mockAudioFile.path);
      expect(editableAudioFile.title()).toBe(mockAudioFile.id3Tag.title);
      expect(editableAudioFile.artists()).toBe(mockAudioFile.id3Tag.artists);
      expect(editableAudioFile.album()).toBe(mockAudioFile.id3Tag.album);
    });

    it("初期状態ではdirtyフラグがfalseになる", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);

      // When
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // Then
      expect(editableAudioFile.isDirty()).toBe(false);
    });

    it("初期状態ではgetPatchがnullを返す", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);

      // When
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // Then
      expect(editableAudioFile.getPatch()).toBeNull();
    });
  });

  describe("値の変更とdirtyフラグ", () => {
    it("タイトルを変更するとdirtyフラグがtrueになる", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      const newTitleDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: { title: "New Title", artists: ["Test"], album: "Test" },
      };
      const newTitleResult = audioFileFromDTO(newTitleDto);
      if (newTitleResult.isErr())
        throw new Error(`Failed to create title: ${newTitleResult.error}`);
      const newTitle = newTitleResult.value.id3Tag.title;
      editableAudioFile.setTitle(newTitle);

      // Then
      expect(editableAudioFile.isDirty()).toBe(true);
    });

    it("アーティストを変更するとdirtyフラグがtrueになる", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      const newArtistsDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: { title: "Test", artists: ["New Artist"], album: "Test" },
      };
      const newArtistsResult = audioFileFromDTO(newArtistsDto);
      if (newArtistsResult.isErr())
        throw new Error(`Failed to create artists: ${newArtistsResult.error}`);
      const newArtists = newArtistsResult.value.id3Tag.artists;
      editableAudioFile.setArtists(newArtists);

      // Then
      expect(editableAudioFile.isDirty()).toBe(true);
    });

    it("nullに変更するとdirtyフラグがtrueになる", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      editableAudioFile.setTitle(null);

      // Then
      expect(editableAudioFile.isDirty()).toBe(true);
    });

    it("同じ値に変更してもdirtyフラグはfalseのまま", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      editableAudioFile.setTitle(mockAudioFile.id3Tag.title);

      // Then
      expect(editableAudioFile.isDirty()).toBe(false);
    });
  });

  describe("パッチ生成", () => {
    it("タイトルのみ変更した場合、タイトルのみを含むパッチを生成する", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);
      const newTitleDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: { title: "New Title", artists: ["Test"], album: "Test" },
      };
      const newTitleResult = audioFileFromDTO(newTitleDto);
      if (newTitleResult.isErr())
        throw new Error(`Failed to create title: ${newTitleResult.error}`);
      const newTitle = newTitleResult.value.id3Tag.title;

      // When
      editableAudioFile.setTitle(newTitle);
      const patch = editableAudioFile.getPatch();

      // Then
      const expectedPatch: AudioFilePatchDTO = {
        id: mockAudioFile.id,
        title: newTitle,
      };
      expect(patch).toEqual(expectedPatch);
    });

    it("複数のフィールドを変更した場合、すべての変更を含むパッチを生成する", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      const titleDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: { title: "New Title", artists: ["Test"], album: "Test" },
      };
      const titleResult = audioFileFromDTO(titleDto);
      if (titleResult.isErr())
        throw new Error(`Failed to create title: ${titleResult.error}`);
      const newTitle = titleResult.value.id3Tag.title;

      const artistsDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: {
          title: "Test",
          artists: ["New Artist 1", "New Artist 2"],
          album: "Test",
        },
      };
      const artistsResult = audioFileFromDTO(artistsDto);
      if (artistsResult.isErr())
        throw new Error(`Failed to create artists: ${artistsResult.error}`);
      const newArtists = artistsResult.value.id3Tag.artists;

      const pathDto = {
        id: "test",
        path: "/new/path/test.mp3",
        id3_tag: { title: "Test", artists: ["Test"], album: "Test" },
      };
      const pathResult = audioFileFromDTO(pathDto);
      if (pathResult.isErr())
        throw new Error(`Failed to create path: ${pathResult.error}`);
      const newPath = pathResult.value.path;

      // When
      editableAudioFile.setTitle(newTitle);
      editableAudioFile.setArtists(newArtists);
      editableAudioFile.setPath(newPath);
      const patch = editableAudioFile.getPatch();

      // Then
      const expectedPatch: AudioFilePatchDTO = {
        id: mockAudioFile.id,
        title: newTitle,
        artists: newArtists,
        path: newPath,
      };
      expect(patch).toEqual(expectedPatch);
    });

    it("nullに変更した場合、nullを含むパッチを生成する", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      editableAudioFile.setTitle(null);
      editableAudioFile.setAlbum(null);
      const patch = editableAudioFile.getPatch();

      // Then
      const expectedPatch: AudioFilePatchDTO = {
        id: mockAudioFile.id,
        title: null,
        album: null,
      };
      expect(patch).toEqual(expectedPatch);
    });

    it("変更がない場合、getPatchはnullを返す", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      // When
      const patch = editableAudioFile.getPatch();

      // Then
      expect(patch).toBeNull();
    });
  });

  describe("リセット機能", () => {
    it("変更後にresetを呼ぶと元の値に戻る", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);

      const changedTitleDto = {
        id: "test",
        path: "/test.mp3",
        id3_tag: { title: "Changed Title", artists: ["Test"], album: "Test" },
      };
      const changedTitleResult = audioFileFromDTO(changedTitleDto);
      if (changedTitleResult.isErr())
        throw new Error(
          `Failed to create changed title: ${changedTitleResult.error}`,
        );
      const changedTitle = changedTitleResult.value.id3Tag.title;
      editableAudioFile.setTitle(changedTitle);

      // When
      editableAudioFile.reset();

      // Then
      expect(editableAudioFile.path()).toBe(mockAudioFile.path);
      expect(editableAudioFile.title()).toBe(mockAudioFile.id3Tag.title);
      expect(editableAudioFile.artists()).toBe(mockAudioFile.id3Tag.artists);
      expect(editableAudioFile.album()).toBe(mockAudioFile.id3Tag.album);
    });

    it("resetを呼ぶとdirtyフラグがfalseになる", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);
      editableAudioFile.setTitle(null);
      expect(editableAudioFile.isDirty()).toBe(true);

      // When
      editableAudioFile.reset();

      // Then
      expect(editableAudioFile.isDirty()).toBe(false);
    });

    it("resetを呼ぶとgetPatchがnullを返す", () => {
      // Given
      const mockAudioFile = createMockAudioFile();
      const [originalAudioFile] = createSignal(mockAudioFile);
      const editableAudioFile = createEditableAudioFile(originalAudioFile);
      editableAudioFile.setTitle(null);

      // When
      editableAudioFile.reset();

      // Then
      expect(editableAudioFile.getPatch()).toBeNull();
    });
  });
});
