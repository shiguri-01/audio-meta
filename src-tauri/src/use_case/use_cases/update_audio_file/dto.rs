use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{audio_file::AudioFilePatch, audio_file::AudioFilePath, id3},
    utils::error::ValidationError,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AudioFilePatchDTO {
    pub id: Uuid,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub title: Option<Option<String>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artists: Option<Option<Vec<String>>>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub album: Option<Option<String>>,
}

impl AudioFilePatch {
    pub fn from(dto: AudioFilePatchDTO) -> Result<AudioFilePatch, ValidationError> {
        let path = dto
            .path
            .map(|p| AudioFilePath::new(PathBuf::from(p)))
            .transpose()?;
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

        Ok(AudioFilePatch {
            path,
            id3_tag: Some(id3::Id3TagPatch {
                title,
                artists,
                album,
            }),
        })
    }
}
