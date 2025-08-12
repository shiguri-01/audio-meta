use super::AudioFile;
use crate::utils::error::AudioFileError;
use std::path::Path;

use uuid::Uuid;

#[async_trait::async_trait]
pub trait AudioFileRepository: Send + Sync {
    async fn save(&mut self, audio_file: &AudioFile) -> Result<(), AudioFileError>;

    /// ディレクトリ内の音声ファイルをスキャン
    async fn scan_directory(&mut self, dir: &Path) -> Result<Vec<AudioFile>, AudioFileError>;

    /// ID3タグをIDで検索
    async fn find_by_id(&mut self, id: &Uuid) -> Result<Option<AudioFile>, AudioFileError>;
}
