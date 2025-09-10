import { describe, expect, it } from "vitest";
import type {
  Album,
  Artists,
  AudioFile,
  AudioFileChanges,
  Path,
  Title,
} from "./schemas";
import { applyChanges, combineChanges } from "./schemas";

const createMockAudioFile = (): AudioFile => {
  return {
    id: "test-id-123",
    path: "/path/to/test.mp3" as Path,
    id3Tag: {
      title: "Original Title" as Title,
      album: "Original Album" as Album,
      artists: ["Original Artist"] as Artists,
    },
  } as AudioFile;
};

const createTypedValues = (
  title: string,
  album: string,
  artists: string[],
  path: string,
) => {
  return {
    title: title as Title,
    album: album as Album,
    artists: artists as Artists,
    path: path as Path,
  };
};

describe("applyChanges", () => {
  it("オリジナルのAudioFileに変更をマージする", () => {
    const original = createMockAudioFile();
    const typedValues = createTypedValues(
      "New Title",
      "New Album",
      ["Test"],
      "/test.mp3",
    );

    const changes: AudioFileChanges = {
      id3Tag: {
        title: typedValues.title,
        album: typedValues.album,
      },
    };

    const result = applyChanges(original, changes);

    expect(result.id).toBe("test-id-123");
    expect(result.path).toBe("/path/to/test.mp3");
    expect(result.id3Tag.title).toBe("New Title");
    expect(result.id3Tag.album).toBe("New Album");
    expect(result.id3Tag.artists).toEqual(["Original Artist"]); // 変更されていない値は保持される
  });

  it("id3Tagフィールドのnull値を処理する", () => {
    const original = createMockAudioFile();
    const changes: AudioFileChanges = {
      id3Tag: {
        title: null,
        artists: null,
      },
    };

    const result = applyChanges(original, changes);

    expect(result.id3Tag.title).toBeNull();
    expect(result.id3Tag.artists).toBeNull();
    expect(result.id3Tag.album).toBe("Original Album"); // 変更されていない値は保持される
  });

  it("配列を完全に上書きする（マージしない）", () => {
    const original = createMockAudioFile();
    const typedValues = createTypedValues(
      "Test",
      "Test",
      ["New Artist 1", "New Artist 2"],
      "/test.mp3",
    );

    const changes: AudioFileChanges = {
      id3Tag: {
        artists: typedValues.artists,
      },
    };

    const result = applyChanges(original, changes);

    expect(result.id3Tag.artists).toEqual(["New Artist 1", "New Artist 2"]);
    // 元の配列["Original Artist"]と新しい配列がマージされていないことを確認
    expect(result.id3Tag.artists).not.toContain("Original Artist");
  });

  it("空のchangesオブジェクトを処理する", () => {
    const original = createMockAudioFile();
    const changes: AudioFileChanges = {};

    const result = applyChanges(original, changes);

    expect(result).toEqual(original);
  });

  it("pathの変更を処理する", () => {
    const original = createMockAudioFile();
    const typedValues = createTypedValues(
      "Test",
      "Test",
      ["Test"],
      "/new/path/to/file.mp3",
    );

    const changes: AudioFileChanges = {
      path: typedValues.path,
    };

    const result = applyChanges(original, changes);

    expect(result.path).toBe("/new/path/to/file.mp3");
    expect(result.id3Tag).toEqual(original.id3Tag); // id3Tagは変更されない
  });
});

describe("combineChanges", () => {
  it("競合する変更を処理する（後の変更が優先）", () => {
    const typedValues1 = createTypedValues(
      "First Title",
      "First Album",
      ["Test"],
      "/test.mp3",
    );
    const typedValues2 = createTypedValues(
      "Second Title",
      "Test",
      ["Second Artist"],
      "/test.mp3",
    );

    const changes1: AudioFileChanges = {
      id3Tag: {
        title: typedValues1.title,
        album: typedValues1.album,
      },
    };

    const changes2: AudioFileChanges = {
      id3Tag: {
        title: typedValues2.title, // これが優勝する
        artists: typedValues2.artists,
      },
    };

    const result = combineChanges(changes1, changes2);

    expect(result.id3Tag?.title).toBe("Second Title"); // 後の変更が適用される
    expect(result.id3Tag?.album).toBe("First Album"); // 競合しない値は保持される
    expect(result.id3Tag?.artists).toEqual(["Second Artist"]);
  });

  it("空のchanges配列を処理する", () => {
    const result = combineChanges();

    expect(result).toEqual({});
  });

  it("配列の上書き動作を保持する", () => {
    const typedValues1 = createTypedValues(
      "Test",
      "Test",
      ["Artist 1", "Artist 2"],
      "/test.mp3",
    );
    const typedValues2 = createTypedValues(
      "Test",
      "Test",
      ["Artist 3"],
      "/test.mp3",
    );

    const changes1: AudioFileChanges = {
      id3Tag: {
        artists: typedValues1.artists,
      },
    };

    const changes2: AudioFileChanges = {
      id3Tag: {
        artists: typedValues2.artists,
      },
    };

    const result = combineChanges(changes1, changes2);

    expect(result.id3Tag?.artists).toEqual(["Artist 3"]);
    // 配列がマージされていないことを確認
    expect(result.id3Tag?.artists).not.toContain("Artist 1");
    expect(result.id3Tag?.artists).not.toContain("Artist 2");
  });

  it("null値を含む変更を処理する", () => {
    const typedValues1 = createTypedValues(
      "Some Title",
      "Some Album",
      ["Test"],
      "/test.mp3",
    );
    const typedValues2 = createTypedValues(
      "Test",
      "Test",
      ["Some Artist"],
      "/test.mp3",
    );

    const changes1: AudioFileChanges = {
      id3Tag: {
        title: typedValues1.title,
        album: typedValues1.album,
      },
    };

    const changes2: AudioFileChanges = {
      id3Tag: {
        title: null, // null値で上書き
        artists: typedValues2.artists,
      },
    };

    const result = combineChanges(changes1, changes2);

    expect(result.id3Tag?.title).toBeNull();
    expect(result.id3Tag?.album).toBe("Some Album");
    expect(result.id3Tag?.artists).toEqual(["Some Artist"]);
  });
});
