import { isEqual } from "lodash";
import { type Accessor, createMemo, createSignal, type Setter } from "solid-js";
import type { AudioFileDTO, AudioFilePatchDTO } from "@/tauri/dto";

export interface EditableAudioFile {
  path: Accessor<string>;
  setPath: Setter<string>;

  title: Accessor<string | null>;
  setTitle: Setter<string | null>;

  artists: Accessor<string[] | null>;
  setArtists: Setter<string[] | null>;

  album: Accessor<string | null>;
  setAlbum: Setter<string | null>;

  isDirty: Accessor<boolean>;
  reset: () => void;
  /**
   * 変更内容のパッチを取得する
   * @returns 変更があった場合はパッチオブジェクト、なければ null
   */
  getPatch: () => AudioFilePatchDTO | null;
}

export const createEditableAudioFile = (
  originalAudioFile: Accessor<AudioFileDTO>,
): EditableAudioFile => {
  const [path, setPath] = createSignal<string>(originalAudioFile().path);
  const [title, setTitle] = createSignal<string | null>(
    originalAudioFile().id3_tag.title,
  );
  const [artists, setArtists] = createSignal<string[] | null>(
    originalAudioFile().id3_tag.artists,
  );
  const [album, setAlbum] = createSignal<string | null>(
    originalAudioFile().id3_tag.album,
  );

  const isDirty = createMemo(() => {
    return (
      !isEqual(path(), originalAudioFile().path) ||
      !isEqual(title(), originalAudioFile().id3_tag.title) ||
      !isEqual(artists(), originalAudioFile().id3_tag.artists) ||
      !isEqual(album(), originalAudioFile().id3_tag.album)
    );
  });

  const reset = () => {
    setPath(originalAudioFile().path);
    setTitle(originalAudioFile().id3_tag.title);
    setArtists(originalAudioFile().id3_tag.artists);
    setAlbum(originalAudioFile().id3_tag.album);
  };

  const getPatch = (): AudioFilePatchDTO | null => {
    if (!isDirty()) return null;

    const patch: AudioFilePatchDTO = { id: originalAudioFile().id };

    patch.path = !isEqual(path(), originalAudioFile().path)
      ? path()
      : undefined;
    patch.title = !isEqual(title(), originalAudioFile().id3_tag.title)
      ? title()
      : undefined;
    patch.artists = !isEqual(artists(), originalAudioFile().id3_tag.artists)
      ? artists()
      : undefined;
    patch.album = !isEqual(album(), originalAudioFile().id3_tag.album)
      ? album()
      : undefined;

    return patch;
  };

  return {
    path,
    setPath,
    title,
    setTitle,
    artists,
    setArtists,
    album,
    setAlbum,

    isDirty,
    reset,
    getPatch,
  };
};
