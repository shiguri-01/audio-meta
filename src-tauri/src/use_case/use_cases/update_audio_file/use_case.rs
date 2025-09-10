use crate::{
    domain::audio_file::{AudioFile, AudioFileChanges, AudioFileRepository},
    use_case::error::ApplicationError,
    utils::error::AudioFileError,
};

use super::dto::AudioFilePatchDTO;

pub struct UpdateAudioFileUseCase<'a> {
    repository: &'a mut Box<dyn AudioFileRepository>,
}

impl<'a> UpdateAudioFileUseCase<'a> {
    pub fn new(repository: &'a mut Box<dyn AudioFileRepository>) -> Self {
        UpdateAudioFileUseCase { repository }
    }

    /// 音声ファイルの更新を実行し、結果を返す
    pub async fn execute(
        &mut self,
        patch_dto: AudioFilePatchDTO,
    ) -> Result<AudioFile, ApplicationError> {
        let audio_file = self.repository.find_by_id(&patch_dto.id).await?.ok_or(
            AudioFileError::FileNotFound {
                id: Some(patch_dto.id.to_string()),
                path: None,
            },
        )?;

        let patch = AudioFileChanges::from(patch_dto.changes)?;
        let updated_audio_file = audio_file.apply_changes(&patch);

        self.repository.save(&updated_audio_file).await?;

        Ok(updated_audio_file)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        domain::audio_file::create_test_audio_file,
        infra::audio_file_mock_repository::AudioFileMockRepository,
    };
    use uuid::Uuid;

    #[tokio::test]
    async fn test_update_non_existent_file() {
        let mock_repo = AudioFileMockRepository::new();
        let mut repo: Box<dyn AudioFileRepository> = Box::new(mock_repo);
        let mut use_case = UpdateAudioFileUseCase::new(&mut repo);

        // 存在しないIDのパッチDTO
        let non_existent_id = Uuid::new_v4();
        let patch_dto_json = serde_json::json!({
            "id": non_existent_id,
            "changes": {
                "id3Tag": {
                    "title": "New Title"
                }
            }
        });
        let patch_dto: AudioFilePatchDTO =
            serde_json::from_value(patch_dto_json).expect("failed to build patch dto json");

        let result = use_case.execute(patch_dto).await;

        assert!(result.is_err());
        match result {
            Err(ApplicationError::AudioFileError(AudioFileError::FileNotFound { id, path })) => {
                assert_eq!(id, Some(non_existent_id.to_string()));
                assert_eq!(path, None);
            }
            _ => panic!("Expected ApplicationError::AudioFileError(AudioFileError::FileNotFound)"),
        }
    }

    #[tokio::test]
    async fn test_update_existing_file_success() {
        let mut mock_repo = AudioFileMockRepository::new();
        let original_file = create_test_audio_file("original");
        let file_id = original_file.id();

        mock_repo.add_file(original_file.clone());
        let mut repo: Box<dyn AudioFileRepository> = Box::new(mock_repo);
        let mut use_case = UpdateAudioFileUseCase::new(&mut repo);

        // 更新用のパッチDTO
        let patch_dto_json = serde_json::json!({
            "id": file_id,
            "changes": {
                "id3Tag": {
                    "title": "Updated Title",
                    "artists": ["Updated Artist"],
                    "album": "Updated Album"
                }
            }
        });
        let patch_dto: AudioFilePatchDTO =
            serde_json::from_value(patch_dto_json).expect("failed to build patch dto json");

        let result = use_case.execute(patch_dto).await;

        assert!(result.is_ok());
        let updated_file = result.unwrap();

        // 更新内容を検証
        assert_eq!(updated_file.id(), file_id);
        assert_eq!(updated_file.title().unwrap().as_str(), "Updated Title");
        assert_eq!(
            updated_file
                .artists()
                .unwrap()
                .iter()
                .next()
                .unwrap()
                .as_str(),
            "Updated Artist"
        );
        assert_eq!(updated_file.album().unwrap().as_str(), "Updated Album");

        // 元のパスは変更されていないことを確認
        assert_eq!(updated_file.path(), original_file.path());
    }
}
