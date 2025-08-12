use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    domain::{
        audio_file::{AudioFile, AudioFilePatch, AudioFilePath, AudioFileRepository},
        id3,
    },
    usecase::error::ApplicationError,
    utils::error::ValidationError,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Id3TagDTO {
    pub title: Option<String>,
    pub artists: Option<Vec<String>>,
    pub album: Option<String>,
}

impl Id3TagDTO {
    pub fn from(id3_tag: &id3::Id3Tag) -> Self {
        Id3TagDTO {
            title: id3_tag.title().map(|t| t.to_string()),
            artists: id3_tag
                .artists()
                .map(|a| a.iter().map(|s| s.to_string()).collect()),
            album: id3_tag.album().map(|a| a.to_string()),
        }
    }
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
            id3_tag: Id3TagDTO::from(audio_file.id3_tag()),
        }
    }
}

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
    fn from(dto: AudioFilePatchDTO) -> Result<AudioFilePatch, ValidationError> {
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

pub struct UpdateAudioFileUseCase<'a> {
    repository: &'a mut Box<dyn AudioFileRepository>,
}

impl<'a> UpdateAudioFileUseCase<'a> {
    pub fn new(repository: &'a mut Box<dyn AudioFileRepository>) -> Self {
        UpdateAudioFileUseCase { repository }
    }

    pub async fn execute(
        &mut self,
        patch_dto: AudioFilePatchDTO,
    ) -> Result<AudioFile, ApplicationError> {
        let audio_file = self
            .repository
            .find_by_id(&patch_dto.id)
            .await?
            .ok_or(ApplicationError::Unexpected)?;

        let patch = AudioFilePatch::from(patch_dto)?;
        let updated_audio_file = audio_file.apply_patch(&patch);

        self.repository.save(&updated_audio_file).await?;

        Ok(updated_audio_file)
    }
}

pub struct ScanDirectoryUseCase<'a> {
    repository: &'a mut Box<dyn AudioFileRepository>,
}

impl<'a> ScanDirectoryUseCase<'a> {
    pub fn new(repository: &'a mut Box<dyn AudioFileRepository>) -> Self {
        ScanDirectoryUseCase { repository }
    }

    pub async fn execute(&mut self, dir: &Path) -> Result<Vec<AudioFile>, ApplicationError> {
        let files = self.repository.scan_directory(dir).await?;
        Ok(files)
    }
}
