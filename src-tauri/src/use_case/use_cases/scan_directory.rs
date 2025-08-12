use std::path::Path;

use crate::{
    domain::audio_file::{AudioFile, AudioFileRepository},
    use_case::error::ApplicationError,
};

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
