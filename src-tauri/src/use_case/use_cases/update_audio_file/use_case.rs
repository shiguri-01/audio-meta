use crate::{
    domain::audio_file::{AudioFile, AudioFilePatch, AudioFileRepository},
    use_case::error::ApplicationError,
};

use super::dto::AudioFilePatchDTO;

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
