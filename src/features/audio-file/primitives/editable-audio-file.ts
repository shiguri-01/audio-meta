import { isEqual } from "lodash";
import { type Accessor, createMemo, createSignal, type Setter } from "solid-js";
import type { AudioFilePatchDTO } from "@/tauri/dto";
import type { Album, Artists, AudioFile, Path, Title } from "../schemas";

export interface EditableAudioFile {
  path: Accessor<Path>;
  setPath: Setter<Path>;

  title: Accessor<Title | null>;
  setTitle: Setter<Title | null>;

  artists: Accessor<Artists | null>;
  setArtists: Setter<Artists | null>;

  album: Accessor<Album | null>;
  setAlbum: Setter<Album | null>;

  isDirty: Accessor<boolean>;
  reset: () => void;
  /**
   * 変更内容のパッチを取得する
   * @returns 変更があった場合はパッチオブジェクト、なければ null
   */
  getPatch: () => AudioFilePatchDTO | null;
}

export const createEditableAudioFile = (
  originalAudioFile: Accessor<AudioFile>,
): EditableAudioFile => {
  const [path, setPath] = createSignal<Path>(originalAudioFile().path);
  const [title, setTitle] = createSignal<Title | null>(
    originalAudioFile().id3Tag.title,
  );
  const [artists, setArtists] = createSignal<Artists | null>(
    originalAudioFile().id3Tag.artists,
  );
  const [album, setAlbum] = createSignal<Album | null>(
    originalAudioFile().id3Tag.album,
  );

  const isDirty = createMemo(() => {
    return (
      !isEqual(path(), originalAudioFile().path) ||
      !isEqual(title(), originalAudioFile().id3Tag.title) ||
      !isEqual(artists(), originalAudioFile().id3Tag.artists) ||
      !isEqual(album(), originalAudioFile().id3Tag.album)
    );
  });

  const reset = () => {
    setPath(originalAudioFile().path);
    setTitle(originalAudioFile().id3Tag.title);
    setArtists(originalAudioFile().id3Tag.artists);
    setAlbum(originalAudioFile().id3Tag.album);
  };

  const getPatch = (): AudioFilePatchDTO | null => {
    if (!isDirty()) return null;

    const patch: AudioFilePatchDTO = { id: originalAudioFile().id };

    if (!isEqual(path(), originalAudioFile().path)) {
      patch.path = path();
    }
    if (!isEqual(title(), originalAudioFile().id3Tag.title)) {
      patch.title = title();
    }
    if (!isEqual(artists(), originalAudioFile().id3Tag.artists)) {
      patch.artists = artists();
    }
    if (!isEqual(album(), originalAudioFile().id3Tag.album)) {
      patch.album = album();
    }

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
