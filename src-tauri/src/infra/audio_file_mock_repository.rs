use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    domain::audio_file::{AudioFile, AudioFileRepository},
    utils::error::AudioFileError,
};

/// テスト用のインメモリリポジトリ
#[derive(Debug, Default)]
pub struct AudioFileMockRepository {
    files: HashMap<Uuid, AudioFile>,
    /// scan_directory呼び出し時に返すファイルのリスト（テスト用）
    scan_result: Vec<AudioFile>,
}

impl AudioFileMockRepository {
    pub fn new() -> Self {
        Self::default()
    }

    /// テスト用：リポジトリにファイルを事前に追加
    pub fn add_file(&mut self, audio_file: AudioFile) {
        self.files.insert(audio_file.id(), audio_file);
    }

    /// テスト用：scan_directory の結果を設定
    pub fn set_scan_result(&mut self, files: Vec<AudioFile>) {
        self.scan_result = files;
    }

    /// テスト用：保存されているファイル数を取得
    pub fn count(&self) -> usize {
        self.files.len()
    }

    /// テスト用：特定のIDのファイルが保存されているかチェック
    pub fn contains_id(&self, id: &Uuid) -> bool {
        self.files.contains_key(id)
    }

    /// テスト用：保存されているファイルを取得
    pub fn get_file(&self, id: &Uuid) -> Option<&AudioFile> {
        self.files.get(id)
    }

    /// テスト用：すべてのファイルをクリア
    pub fn clear(&mut self) {
        self.files.clear();
        self.scan_result.clear();
    }
}

#[async_trait::async_trait]
impl AudioFileRepository for AudioFileMockRepository {
    async fn save(&mut self, audio_file: &AudioFile) -> Result<(), AudioFileError> {
        self.files.insert(audio_file.id(), audio_file.clone());
        Ok(())
    }

    async fn scan_directory(
        &mut self,
        _dir: &std::path::Path,
    ) -> Result<Vec<AudioFile>, AudioFileError> {
        // scan_resultに設定されたファイルリストを返す
        let result = self.scan_result.clone();

        // スキャンしたファイルをリポジトリにも追加
        for file in &result {
            self.files.insert(file.id(), file.clone());
        }

        Ok(result)
    }

    async fn find_by_id(&mut self, id: &Uuid) -> Result<Option<AudioFile>, AudioFileError> {
        Ok(self.files.get(id).cloned())
    }
}
