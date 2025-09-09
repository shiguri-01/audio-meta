import { type } from "arktype";
import deepmerge from "deepmerge";

export const Title = type("string.trim.preformatted > 0").brand("Title");
export type Title = typeof Title.infer;

export const Album = type("string.trim.preformatted > 0").brand("Album");
export type Album = typeof Album.infer;

export const Artist = type("string.trim.preformatted > 0").brand("Artist");
export type Artist = typeof Artist.infer;

export const Artists = Artist.array()
  .moreThanLength(0)
  .narrow((data, ctx) => {
    if (new Set(data).size === data.length) {
      return true;
    }
    return ctx.reject({
      expected: "unique",
    });
  })
  .brand("Artists");
export type Artists = typeof Artists.infer;

export const Id3Tag = type({
  title: Title.or(type("null")),
  album: Album.or(type("null")),
  artists: Artists.or(type("null")),
});
export type Id3Tag = typeof Id3Tag.infer;

export const Path = type("string.trim.preformatted > 0").brand("Path");
export type Path = typeof Path.infer;

export const AudioFile = type({
  id: type("string"),
  path: Path,
  id3Tag: Id3Tag,
}).brand("AudioFile");
export type AudioFile = typeof AudioFile.infer;

export interface AudioFileChanges {
  path?: Path;
  id3Tag?: {
    title?: Title | null;
    album?: Album | null;
    artists?: Artists | null;
  };
}

export interface AudioFilePatch {
  id: string;
  changes: AudioFileChanges;
}

export const applyChanges = (
  original: AudioFile,
  changes: AudioFileChanges,
): AudioFile =>
  deepmerge<AudioFile, AudioFileChanges>(original, changes, {
    arrayMerge: (_destinationArray, sourceArray) => sourceArray,
  });

export const combineChanges = (
  ...changes: AudioFileChanges[]
): AudioFileChanges => {
  return changes.reduce(
    (acc, change) =>
      deepmerge<AudioFileChanges>(acc, change, {
        arrayMerge: (_destinationArray, sourceArray) => sourceArray,
      }),
    {},
  );
};
