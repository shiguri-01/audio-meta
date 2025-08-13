use super::AudioFile;
use crate::utils::error::AudioFileError;
use std::path::Path;

use uuid::Uuid;

#[async_trait::async_trait]
pub trait AudioFileRepository: Send + Sync {
    /// 音声ファイルを保存する
    async fn save(&mut self, audio_file: &AudioFile) -> Result<(), AudioFileError>;

    /// ディレクトリ内の音声ファイルを検索する
    ///
    /// ディレクトリ直下の音声ファイルのみを対象とし、サブディレクトリは無視される
    async fn scan_directory(&mut self, dir: &Path) -> Result<Vec<AudioFile>, AudioFileError>;

    /// 音声ファイルをIDで検索
    async fn find_by_id(&mut self, id: &Uuid) -> Result<Option<AudioFile>, AudioFileError>;
}
