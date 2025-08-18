export interface Id3TagDTO {
  title: string | null;
  artists: string[] | null;
  album: string | null;
}

export interface AudioFileDTO {
  id: string;
  path: string;
  id3_tag: Id3TagDTO;
}

export interface AudioFilePatchDTO {
  id: string;
  path?: string;
  title?: string | null;
  artists?: string[] | null;
  album?: string | null;
}
