use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{audio_file::AudioFilePatch, audio_file::AudioFilePath, id3},
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

impl AudioFilePatch {
    pub fn from(dto: AudioFileChangesDTO) -> Result<AudioFilePatch, ValidationError> {
        let path = dto
            .path
            .map(|p| AudioFilePath::new(PathBuf::from(p)))
            .transpose()?;
        let id3_tag = dto.id3_tag.map(id3::Id3TagChanges::from).transpose()?;

        Ok(AudioFilePatch { path, id3_tag })
    }
}

impl id3::Id3TagChanges {
    fn from(dto: Id3TagChangesDTO) -> Result<id3::Id3TagChanges, ValidationError> {
        let title = dto
            .title
            .map(|nullable| nullable.map(|t| id3::Title::new(t.as_str())).transpose())
            .transpose()?;
        let artists = dto
            .artists
            .map(|nullable| {
                nullable
                    .map(|a| {
                        let str_refs: Vec<&str> = a.iter().map(|s| s.as_str()).collect();
                        id3::Artists::from_str_vec(&str_refs)
                    })
                    .transpose()
            })
            .transpose()?;
        let album = dto
            .album
            .map(|nullable| nullable.map(|a| id3::Album::new(a.as_str())).transpose())
            .transpose()?;

        Ok(id3::Id3TagChanges {
            title,
            artists,
            album,
        })
    }
}
