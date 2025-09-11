/** @vitest-environment jsdom */

import {
  err,
  errAsync,
  ok,
  okAsync,
  type Result,
  ResultAsync,
} from "neverthrow";
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
      type ResolveAudio = (value: AudioFile | PromiseLike<AudioFile>) => void;
      let resolveFn: ResolveAudio = () => {};
      const p: Promise<AudioFile> = new Promise((res) => {
        resolveFn = res as ResolveAudio;
      });
      const updateFn = vi
        .fn()
        .mockReturnValue(ResultAsync.fromPromise(p, () => "API Error"));
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

  describe("saveAllFiles", () => {
    it("差分なしのsaveAllFilesではコマンドを呼び出さず空配列を返す", async () => {
      const f = buildAudioFile("1");
      const updateMultipleFn = vi.fn();
      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: updateMultipleFn,
      });

      const result = await store.saveAllFiles();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toEqual([]);
      expect(updateMultipleFn).not.toHaveBeenCalled();
    });

    it("全件成功時はファイルが更新されchangesがクリアされる", async () => {
      const f1 = buildAudioFile("1", "Old1", "Alb1", ["A1"]);
      const f2 = buildAudioFile("2", "Old2", "Alb2", ["A2"]);
      const updated1 = buildAudioFile("1", "New1", "Alb1", ["A1"]);
      const updated2 = buildAudioFile("2", "New2", "Alb2", ["A2"]);
      const updateMultipleFn = vi
        .fn()
        .mockReturnValue(okAsync([ok(updated1), ok(updated2)]));

      const store = createAudioFileStore([f1, f2], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: updateMultipleFn,
      });

      store.updateFile("1", { id3Tag: { title: "New1" as unknown as Title } });
      store.updateFile("2", { id3Tag: { title: "New2" as unknown as Title } });

      const result = await store.saveAllFiles();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const values = result.value;
        expect(values.every((r) => r.isOk())).toBe(true);
      }

      // 呼び出し引数（patches）を検証
      expect(updateMultipleFn).toHaveBeenCalledTimes(1);
      const callArg = updateMultipleFn.mock.calls[0][0];
      expect(callArg.patches).toEqual(
        expect.arrayContaining([
          { id: "1", changes: { id3Tag: { title: "New1" } } },
          { id: "2", changes: { id3Tag: { title: "New2" } } },
        ]),
      );

      // state 更新とchangesクリア
      const files = store.originalFiles();
      const byId = Object.fromEntries(files.map((f) => [f.id, f]));
      expect(byId["1"].id3Tag.title).toBe("New1");
      expect(byId["2"].id3Tag.title).toBe("New2");
      expect(store.changes()).toEqual({});
      expect(store.isDirty()).toBe(false);
    });

    it("一部失敗時は成功分のみstate更新され、失敗分のchangesは残る", async () => {
      const f1 = buildAudioFile("1", "Old1", "Alb1", ["A1"]);
      const f2 = buildAudioFile("2", "Old2", "Alb2", ["A2"]);
      const updated1 = buildAudioFile("1", "New1", "Alb1", ["A1"]);
      const updateMultipleFn = vi
        .fn()
        .mockReturnValue(
          okAsync([ok(updated1), err({ id: "2", error: "API Error" })]),
        );

      const store = createAudioFileStore([f1, f2], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: updateMultipleFn,
      });

      store.updateFile("1", { id3Tag: { title: "New1" as unknown as Title } });
      store.updateFile("2", { id3Tag: { title: "New2" as unknown as Title } });

      const result = await store.saveAllFiles();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const [r1, r2] = result.value;
        expect(r1.isOk()).toBe(true);
        expect(r2.isErr()).toBe(true);
        if (r2.isErr())
          expect(r2.error).toEqual({ id: "2", error: "API Error" });
      }

      const files = store.originalFiles();
      const byId = Object.fromEntries(files.map((f) => [f.id, f]));
      // 1のみ更新・2は元のまま
      expect(byId["1"].id3Tag.title).toBe("New1");
      expect(byId["2"].id3Tag.title).toBe("Old2");
      // 2のchangesは残る
      expect(store.changes()["2"]).toEqual({ id3Tag: { title: "New2" } });
      expect(store.isDirty()).toBe(true);
    });

    it("saveAllFilesの並行実行は防止される", async () => {
      const f = buildAudioFile("1");
      type SaveMany = Result<AudioFile, { id: string; error: string }>[];
      type ResolveMany = (value: SaveMany | PromiseLike<SaveMany>) => void;
      let resolveFn: ResolveMany = () => {};
      const p: Promise<SaveMany> = new Promise((res) => {
        resolveFn = res as ResolveMany;
      });
      const updateMultipleFn = vi
        .fn()
        .mockReturnValue(ResultAsync.fromPromise(p, () => "API Error"));

      const store = createAudioFileStore([f], {
        updateAudioFileCommand: createMockUpdateCommand(),
        updateAudioFilesCommand: updateMultipleFn,
      });
      store.updateFile("1", { id3Tag: { title: null } });

      store.saveAllFiles();
      const second = await store.saveAllFiles();
      expect(second.isErr()).toBe(true);
      if (second.isErr())
        expect(second.error).toBe("Another operation is in progress");

      // 解放
      resolveFn([]);
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
