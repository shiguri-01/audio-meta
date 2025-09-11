/** @vitest-environment jsdom */

import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Album, Artists, AudioFile, Path, Title } from "../schemas";
import { createAudioFileStore } from "./audio-file-store";

const buildAudioFile = (
  id: string,
  title: string = "Title",
  album: string = "Album",
  artists: string[] = ["Artist"],
): AudioFile =>
  ({
    id,
    path: `/music/${id}.mp3` as Path,
    id3Tag: {
      title: title as Title,
      album: album as Album,
      artists: artists as unknown as Artists,
    },
  }) as unknown as AudioFile;

const createMockUpdateCommand = () => vi.fn();
const createMockUpdateMultipleCommand = () => vi.fn();

describe("createAudioFileStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期化時に空の状態で作成される", () => {
      const store = createAudioFileStore([], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      expect(store.originalFiles()).toEqual([]);
      expect(store.isDirty()).toBe(false);
      expect(store.pending()).toBe(false);
    });
  });

  describe("updateFile: オブジェクト指定", () => {
    it("同一値をupdateFileしても差分として保持される", () => {
      const f1 = buildAudioFile("1", "Old Title", "Old Album");
      const store = createAudioFileStore([f1], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });

      store.updateFile("1", {
        id3Tag: { title: f1.id3Tag.title, album: f1.id3Tag.album },
      });
      // NOTE: ここでは同値なので本来は差分消去ロジックTODOが効けば登録されない想定。現在はそのまま格納される。挙動をそのままテスト。
      expect(store.changes()["1"].id3Tag?.title).toBe(f1.id3Tag.title);
      expect(store.isDirty()).toBe(true);
    });

    it("既存差分がある状態でartistsを更新すると配列が上書きされる", () => {
      const f1 = buildAudioFile("1", "T", "A");
      const store = createAudioFileStore([f1], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });

      store.updateFile("1", { id3Tag: { title: null } });
      store.updateFile("1", {
        id3Tag: { artists: ["New Artist"] as unknown as Artists },
      });

      const c = store.changes()["1"];
      expect(c.id3Tag?.title).toBeNull();
      expect(c.id3Tag?.artists).toEqual(["New Artist"]);
    });
  });

  describe("updateFile", () => {
    it("関数指定のupdateFileで差分を設定できる", () => {
      const f = buildAudioFile("1");
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      store.updateFile("1", () => ({ id3Tag: { title: null } }));
      expect(store.changes()["1"].id3Tag?.title).toBeNull();
    });

    it("関数指定のupdateFileで既存差分を置き換えられる", () => {
      const f = buildAudioFile("1");
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      store.updateFile("1", { id3Tag: { title: null, album: null } });
      store.updateFile("1", (prev) => {
        expect(prev.id3Tag?.album).toBeNull(); // 前状態参照可能
        return { id3Tag: { artists: ["X"] as unknown as Artists } };
      });
      const c = store.changes()["1"];
      expect(c.id3Tag?.title).toBeUndefined();
      expect(c.id3Tag?.artists).toEqual(["X"]);
    });
  });

  describe("isDirty/isFileDirty", () => {
    it("差分追加前後でisDirtyとisFileDirtyのフラグが変化する", () => {
      const f = buildAudioFile("1");
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      expect(store.isDirty()).toBe(false);
      expect(store.isFileDirty("1")).toBe(false);
      store.updateFile("1", { id3Tag: { title: null } });
      expect(store.isDirty()).toBe(true);
      expect(store.isFileDirty("1")).toBe(true);
      expect(store.isFileDirty("unknown")).toBe(false);
    });
  });

  describe("saveFile", () => {
    it("差分ありのsaveFileでファイルが更新されchangesがクリアされる", async () => {
      const f = buildAudioFile("1", "Old", "Alb");
      const updatedFile = buildAudioFile("1", "New", "Alb", ["Artist"]);
      const updateFn = vi.fn().mockReturnValue(okAsync(updatedFile));
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: updateFn,
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });

      store.updateFile("1", { id3Tag: { title: "New" as unknown as Title } });

      const result = await store.saveFile("1");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value.id3Tag.title).toBe("New");
      expect(updateFn).toHaveBeenCalledWith({
        patch: { id: "1", changes: { id3Tag: { title: "New" } } },
      });
      expect(store.changes()["1"]).toBeUndefined();
      expect(store.isDirty()).toBe(false);
    });

    it("差分なしのsaveFileではコマンドを呼び出さない", async () => {
      const f = buildAudioFile("1");
      const updateFn = vi.fn();
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: updateFn,
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      const result = await store.saveFile("1");
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toEqual(f);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it("存在しないIDをsaveFileするとエラーを返す", async () => {
      const store = createAudioFileStore([], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      const result = await store.saveFile("x");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBe("File not found");
    });

    it("saveFileでコマンドが失敗した場合エラーを返しchangesが保持される", async () => {
      const f = buildAudioFile("1");
      const updateFn = vi.fn().mockReturnValue(errAsync("API Error"));
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: updateFn,
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      store.updateFile("1", { id3Tag: { title: null } });
      const result = await store.saveFile("1");
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error).toBe("API Error");
      expect(store.changes()["1"].id3Tag?.title).toBeNull();
    });

    it("saveFileを並行実行しようとすると二重実行が防止される", async () => {
      const f = buildAudioFile("1");
      // 1回目の実行が手動で解決するまで保留状態になるようにする
      let resolveFn: (v: unknown) => void = () => {};
      const p: Promise<unknown> = new Promise((res) => {
        resolveFn = res;
      });
      const updateFn = vi.fn().mockReturnValue(okAsync(p as unknown));
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: updateFn,
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      store.updateFile("1", { id3Tag: { title: null } });
      store.saveFile("1");
      const second = store.saveFile("1");
      const secondResult = await second;
      expect(secondResult.isErr()).toBe(true);
      if (secondResult.isErr())
        expect(secondResult.error).toBe("Another operation is in progress");
      // 解放
      resolveFn(f);
    });
  });

  describe("resetWithFiles", () => {
    it("resetWithFilesでファイルが差し替えられchangesがクリアされる", () => {
      const f = buildAudioFile("1");
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: createMockUpdateMultipleCommand(),
      });
      store.updateFile("1", { id3Tag: { title: null } });
      expect(store.isDirty()).toBe(true);
      const newF = buildAudioFile("2");
      store.resetWithFiles([newF]);
      expect(store.originalFiles().map((f) => f.id)).toEqual(["2"]);
      expect(store.isDirty()).toBe(false);
      expect(store.changes()).toEqual({});
    });
  });
});
