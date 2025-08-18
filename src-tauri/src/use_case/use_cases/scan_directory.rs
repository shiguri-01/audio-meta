use std::path::Path;

use crate::{
    domain::audio_file::{AudioFile, AudioFileRepository},
    use_case::error::ApplicationError,
};

/// 指定されたディレクトリをスキャンして音声ファイルを取得するユースケース
pub struct ScanDirectoryUseCase<'a> {
    repository: &'a mut Box<dyn AudioFileRepository>,
}

impl<'a> ScanDirectoryUseCase<'a> {
    pub fn new(repository: &'a mut Box<dyn AudioFileRepository>) -> Self {
        ScanDirectoryUseCase { repository }
    }

    /// 指定されたディレクトリをスキャンして音声ファイル一覧を返す
    pub async fn execute(&mut self, dir: &Path) -> Result<Vec<AudioFile>, ApplicationError> {
        let files = self.repository.scan_directory(dir).await?;
        Ok(files)
    }
}

#[cfg(test)]
mod tests {
    use crate::{
        domain::audio_file::create_test_audio_file,
        infra::audio_file_mock_repository::AudioFileMockRepository,
    };

    use super::*;

    #[tokio::test]
    async fn test_scan_directory_use_case() {
        let mut mock_repo = AudioFileMockRepository::new();
        mock_repo.set_scan_result(vec![
            create_test_audio_file("1"),
            create_test_audio_file("2"),
        ]);
        let mut repo: Box<dyn AudioFileRepository> = Box::new(mock_repo);
        let mut use_case = ScanDirectoryUseCase::new(&mut repo);

        let result = use_case.execute(Path::new("/test")).await;

        assert!(result.is_ok());
        let files = result.unwrap();
        assert_eq!(files.len(), 2);
    }
}
