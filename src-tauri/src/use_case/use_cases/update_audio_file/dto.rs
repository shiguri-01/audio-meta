use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{audio_file::AudioFileChanges, audio_file::AudioFilePath, id3},
    utils::error::ValidationError,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Id3TagChangesDTO {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<Option<String>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artists: Option<Option<Vec<String>>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub album: Option<Option<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFileChangesDTO {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub id3_tag: Option<Id3TagChangesDTO>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFilePatchDTO {
    pub id: Uuid,
    pub changes: AudioFileChangesDTO,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "success", rename_all = "camelCase")]
pub enum AudioFileSaveResultDTO {
    #[serde(rename = "true")]
    Ok {
        id: Uuid,
        file: crate::use_case::dto::AudioFileDTO,
    },
    #[serde(rename = "false")]
    Err { id: Uuid, error: String },
}

impl TryFrom<AudioFileChangesDTO> for AudioFileChanges {
    type Error = ValidationError;

    fn try_from(dto: AudioFileChangesDTO) -> Result<Self, Self::Error> {
        let path = dto
            .path
            .map(|p| AudioFilePath::new(PathBuf::from(p)))
            .transpose()?;
        let id3_tag = dto.id3_tag.map(id3::Id3TagChanges::try_from).transpose()?;

        Ok(AudioFileChanges { path, id3_tag })
    }
}

impl TryFrom<Id3TagChangesDTO> for id3::Id3TagChanges {
    type Error = ValidationError;

    fn try_from(dto: Id3TagChangesDTO) -> Result<Self, Self::Error> {
        let title = match dto.title {
            None => None,
            Some(None) => Some(None),
            Some(Some(title_string)) => Some(Some(id3::Title::new(&title_string)?)),
        };

        let artists = match dto.artists {
            None => None,
            Some(None) => Some(None),
            Some(Some(artist_vec)) => {
                let str_refs: Vec<&str> = artist_vec.iter().map(|s| s.as_str()).collect();
                Some(Some(id3::Artists::from_str_vec(&str_refs)?))
            }
        };

        let album = match dto.album {
            None => None,
            Some(None) => Some(None),
            Some(Some(album_string)) => Some(Some(id3::Album::new(&album_string)?)),
        };

        Ok(id3::Id3TagChanges {
            title,
            artists,
            album,
        })
    }
}
