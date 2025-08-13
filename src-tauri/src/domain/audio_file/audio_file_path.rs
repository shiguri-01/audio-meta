use serde::{Deserialize, Serialize};
use std::{
    ops::Deref,
    path::{Path, PathBuf},
};

use crate::utils::error::ValidationError;

/// 音声ファイルのパス
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AudioFilePath {
    path: PathBuf,
    file_name: String,
    file_stem: String,
    extension: AudioFileExtension,
}

impl AudioFilePath {
    /// 新しい音声ファイルのパスを作成する
    ///
    /// * 空のパスは使用不可
    /// * 音声ファイルの拡張子のみ使用可能
    pub fn new(path: PathBuf) -> Result<Self, ValidationError> {
        if path.as_os_str().is_empty() {
            return Err(ValidationError::EmptyPath);
        }

        // file_nameとfile_stemを取得して保存
        let file_name = path
            .file_name()
            .ok_or(ValidationError::MissingFileName)?
            .to_str()
            .ok_or(ValidationError::InvalidUtf8Path)?
            .to_string();

        let file_stem = path
            .file_stem()
            .ok_or(ValidationError::MissingFileStem)?
            .to_str()
            .ok_or(ValidationError::InvalidUtf8Path)?
            .to_string();

        let extension = path
            .extension()
            .and_then(|ext| ext.to_str())
            .and_then(|ext| AudioFileExtension::new(ext).ok())
            .ok_or(ValidationError::InvalidExtension)?;

        Ok(AudioFilePath {
            path,
            file_name,
            file_stem,
            extension,
        })
    }

    pub fn file_name(&self) -> &str {
        &self.file_name
    }

    pub fn file_stem(&self) -> &str {
        &self.file_stem
    }

    pub fn extension(&self) -> &AudioFileExtension {
        &self.extension
    }
}

impl Deref for AudioFilePath {
    type Target = PathBuf;
    fn deref(&self) -> &Self::Target {
        &self.path
    }
}

impl AsRef<Path> for AudioFilePath {
    fn as_ref(&self) -> &Path {
        self.path.as_ref()
    }
}

/// 音声ファイルの拡張子
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AudioFileExtension {
    Mp3,
    Wav,
}

impl AudioFileExtension {
    pub fn new(s: &str) -> Result<Self, ValidationError> {
        match s.to_lowercase().as_str() {
            "mp3" => Ok(AudioFileExtension::Mp3),
            "wav" => Ok(AudioFileExtension::Wav),
            _ => Err(ValidationError::InvalidExtension),
        }
    }

    /// 拡張子が有効かどうかをチェックする
    pub fn is_valid(extension: &str) -> bool {
        Self::new(extension).is_ok()
    }

    pub fn as_str(&self) -> &str {
        match self {
            AudioFileExtension::Mp3 => "mp3",
            AudioFileExtension::Wav => "wav",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audio_file_path_new() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3"));
        assert!(path.is_ok());
    }

    #[test]
    fn test_audio_file_path_invalid_extension() {
        let path = AudioFilePath::new(PathBuf::from("test.txt"));
        assert!(path.is_err());
    }
}
