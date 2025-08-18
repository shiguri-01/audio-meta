use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::audio_file::AudioFile;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Id3TagDTO {
    pub title: Option<String>,
    pub artists: Option<Vec<String>>,
    pub album: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AudioFileDTO {
    pub id: Uuid,
    pub path: String,
    pub id3_tag: Id3TagDTO,
}

impl AudioFileDTO {
    pub fn from(audio_file: &AudioFile) -> Self {
        AudioFileDTO {
            id: audio_file.id(),
            path: audio_file.path().as_ref().to_string_lossy().to_string(),
            id3_tag: Id3TagDTO {
                title: audio_file.title().map(|t| t.to_string()),
                artists: audio_file
                    .artists()
                    .map(|a| a.iter().map(|s| s.to_string()).collect()),
                album: audio_file.album().map(|a| a.to_string()),
            },
        }
    }
}
