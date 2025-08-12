mod domain;
mod infra;
mod use_case;
mod utils;

use std::path::Path;

use tauri::Manager;
use tokio::sync::Mutex;

use crate::{
    domain::audio_file::AudioFileRepository,
    infra::audio_file_file_system_repository::AudioFileFileSystemRepository,
    use_case::{
        dto::AudioFileDTO,
        error::ApplicationError,
        scan_directory::ScanDirectoryUseCase,
        update_audio_file::{AudioFilePatchDTO, UpdateAudioFileUseCase},
    },
};

struct AppState {
    audio_file_repository: Mutex<Box<dyn AudioFileRepository>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // デバッグ用のロギング
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(AppState {
                audio_file_repository: Mutex::new(Box::new(AudioFileFileSystemRepository::new())),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_audio_file, scan_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
async fn update_audio_file(
    state: tauri::State<'_, AppState>,
    patch: AudioFilePatchDTO,
) -> Result<AudioFileDTO, ApplicationError> {
    let mut repository = state.audio_file_repository.lock().await;
    let mut use_case = UpdateAudioFileUseCase::new(&mut repository);

    use_case
        .execute(patch)
        .await
        .map(|audio_file| AudioFileDTO::from(&audio_file))
}

#[tauri::command]
async fn scan_directory(
    state: tauri::State<'_, AppState>,
    dir: String,
) -> Result<Vec<AudioFileDTO>, ApplicationError> {
    let mut repository = state.audio_file_repository.lock().await;
    let mut use_case = ScanDirectoryUseCase::new(&mut repository);

    use_case.execute(Path::new(&dir)).await.map(|audio_files| {
        audio_files
            .into_iter()
            .map(|audio_file| AudioFileDTO::from(&audio_file))
            .collect()
    })
}
