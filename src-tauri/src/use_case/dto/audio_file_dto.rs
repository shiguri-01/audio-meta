use std::{ops::Deref, path::PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{
        audio_file::{AudioFile, AudioFilePath},
        id3::{self},
    },
    utils::error::ValidationError,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Id3TagDTO {
    pub title: Option<String>,
    pub artists: Option<Vec<String>>,
    pub album: Option<String>,
}

impl From<id3::Id3Tag> for Id3TagDTO {
    fn from(tag: id3::Id3Tag) -> Self {
        Id3TagDTO {
            title: tag.title().map(|t| t.to_string()),
            artists: tag
                .artists()
                .map(|a| a.iter().map(|s| s.to_string()).collect()),
            album: tag.album().map(|a| a.to_string()),
        }
    }
}

impl TryFrom<Id3TagDTO> for id3::Id3Tag {
    type Error = ValidationError;

    fn try_from(dto: Id3TagDTO) -> Result<Self, Self::Error> {
        let title = match dto.title {
            Some(t) => Some(id3::Title::new(&t)?),
            None => None,
        };
        let artists = match dto.artists {
            Some(artists) => {
                let artists_vec: Vec<id3::Artist> = artists
                    .iter()
                    .map(|a| id3::Artist::new(a))
                    .collect::<Result<Vec<_>, _>>()?;
                Some(id3::Artists::new(artists_vec)?)
            }
            None => None,
        };
        let album = match dto.album {
            Some(a) => Some(id3::Album::new(&a)?),
            None => None,
        };
        Ok(id3::Id3Tag::new(title, artists, album))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileDTO {
    pub id: Uuid,
    pub path: PathDTO,
    pub id3_tag: Id3TagDTO,
}

impl From<AudioFile> for AudioFileDTO {
    fn from(file: AudioFile) -> Self {
        let id3_tag = id3::Id3Tag::new(
            file.title().cloned(),
            file.artists().cloned(),
            file.album().cloned(),
        );

        AudioFileDTO {
            id: file.id(),
            path: PathDTO::from(file.path().clone()),
            id3_tag: Id3TagDTO::from(id3_tag),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PathDTO(pub String);

impl Deref for PathDTO {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl From<AudioFilePath> for PathDTO {
    fn from(path: AudioFilePath) -> Self {
        Self(
            path.as_ref()
                .to_string_lossy()
                .to_string()
                .replace("\\", "/"),
        )
    }
}

impl TryFrom<PathDTO> for AudioFilePath {
    type Error = ValidationError;

    fn try_from(dto: PathDTO) -> Result<Self, Self::Error> {
        let path_buf = PathBuf::from(dto.0);
        AudioFilePath::new(path_buf)
    }
}
