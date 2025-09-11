use super::*;
use crate::{
    domain::audio_file::{create_test_audio_file, AudioFileRepository},
    infra::audio_file_mock_repository::AudioFileMockRepository,
    use_case::dto::AudioFileDTO,
};
use uuid::Uuid;

#[tokio::test]
async fn test_update_audio_files_mixed_results() {
    let mut mock_repo = AudioFileMockRepository::new();
    let existing_file = create_test_audio_file("existing");
    let existing_id = existing_file.id();
    mock_repo.add_file(existing_file.clone());
    let mut repo: Box<dyn AudioFileRepository> = Box::new(mock_repo);

    let patches = vec![
        AudioFilePatchDTO {
            // 成功する
            id: existing_id,
            changes: AudioFileChangesDTO {
                path: None,
                id3_tag: Some(Id3TagChangesDTO {
                    title: Some(Some("Updated".into())),
                    artists: None,
                    album: None,
                }),
            },
        },
        AudioFilePatchDTO {
            // 失敗する（存在しないファイル）
            id: Uuid::new_v4(),
            changes: AudioFileChangesDTO {
                path: None,
                id3_tag: None,
            },
        },
    ];

    let mut results = Vec::new();
    for patch in patches.into_iter() {
        let id = patch.id;
        let mut use_case = UpdateAudioFileUseCase::new(&mut repo);
        match use_case.execute(patch).await {
            Ok(audio_file) => results.push(AudioFileSaveResultDTO::Ok {
                id,
                file: AudioFileDTO::from(&audio_file),
            }),
            Err(e) => results.push(AudioFileSaveResultDTO::Err {
                id,
                error: e.to_string(),
            }),
        }
    }

    assert_eq!(results.len(), 2);
    match &results[0] {
        AudioFileSaveResultDTO::Ok { id, file } => {
            assert_eq!(*id, existing_id);
            assert_eq!(file.id, existing_id);
            assert_eq!(file.id3_tag.title.as_deref(), Some("Updated"));
        }
        _ => panic!("First result should be Ok"),
    }
    match &results[1] {
        AudioFileSaveResultDTO::Err { id, error: _ } => {
            assert_ne!(*id, existing_id);
        }
        _ => panic!("Second result should be Err"),
    }
}
