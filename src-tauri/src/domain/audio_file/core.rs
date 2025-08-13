use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::id3::{Album, Artists, Id3Tag, Id3TagPatch, Title};
use crate::utils::error::{AudioFileError, ValidationError};

// 同じモジュール内のため、相対パスで参照
use super::audio_file_path::{AudioFileExtension, AudioFilePath};

/// 音声ファイル
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AudioFile {
    id: Uuid,
    path: AudioFilePath,
    id3_tag: Id3Tag,
}

impl AudioFile {
    /// 新しいAudioFileエンティティを作成する
    ///
    /// # Arguments
    /// * `path` - 音声ファイルのパス
    /// * `id3_tag` - ID3タグ情報
    ///
    /// # Returns
    /// 新しいAudioFileインスタンス
    pub fn new(path: AudioFilePath, id3_tag: Id3Tag) -> Self {
        Self {
            id: Uuid::new_v4(),
            path,
            id3_tag,
        }
    }

    /// 既存のIDでAudioFileエンティティを復元する
    ///
    /// データベースなどから復元する場合に使用
    ///
    /// # Arguments
    /// * `id` - エンティティのID
    /// * `path` - 音声ファイルのパス
    /// * `id3_tag` - ID3タグ情報
    ///
    /// # Returns
    /// 既存のIDを持つAudioFileインスタンス
    #[allow(dead_code)]
    pub fn restore(id: Uuid, path: AudioFilePath, id3_tag: Id3Tag) -> Self {
        Self { id, path, id3_tag }
    }

    pub fn id(&self) -> Uuid {
        self.id
    }

    pub fn path(&self) -> &AudioFilePath {
        &self.path
    }

    #[allow(dead_code)]
    fn with_path(&self, new_path: AudioFilePath) -> Self {
        Self {
            id: self.id,
            path: new_path,
            id3_tag: self.id3_tag.clone(),
        }
    }

    /// ファイル名（拡張子なし）
    #[allow(dead_code)]
    pub fn file_stem(&self) -> &str {
        self.path.file_stem()
    }

    /// ファイル名（拡張子あり）
    #[allow(dead_code)]
    pub fn file_name(&self) -> &str {
        self.path.file_name()
    }

    /// ファイルの拡張子を取得する
    #[allow(dead_code)]
    pub fn extension(&self) -> &str {
        self.path.extension().as_str()
    }

    /// ファイル移動のためのパスを更新する
    #[allow(dead_code)]
    pub fn move_to(&self, new_path: AudioFilePath) -> Self {
        self.with_path(new_path)
    }

    /// 新しいファイル名でリネーム
    ///
    /// 同じディレクトリ内でのファイル名変更
    #[allow(dead_code)]
    pub fn rename_file(&self, new_file_stem: &str) -> Result<Self, ValidationError> {
        let file_name = format!("{}.{}", new_file_stem, self.path.extension().as_str());
        let new_path = self.path.with_file_name(file_name);

        let new_audio_path = AudioFilePath::new(new_path)?;
        Ok(self.with_path(new_audio_path))
    }

    /// ディレクトリを移動
    ///
    /// ファイル名は保持してディレクトリのみ変更
    #[allow(dead_code)]
    pub fn move_to_directory(
        &self,
        new_directory: &std::path::Path,
    ) -> Result<Self, AudioFileError> {
        let new_path = new_directory.join(self.path.file_name());
        let new_audio_path = AudioFilePath::new(new_path)?;
        Ok(self.with_path(new_audio_path))
    }

    /// サポートされている音声ファイル形式かどうかを判定する
    pub fn is_supported_audio_format(path: &std::path::Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(AudioFileExtension::is_valid)
            .unwrap_or(false)
    }

    /// ID3タグを更新した新しいインスタンスを返す
    fn with_id3_tag(&self, new_id3_tag: Id3Tag) -> Self {
        Self {
            id: self.id,
            path: self.path.clone(),
            id3_tag: new_id3_tag,
        }
    }

    /// ID3タグが変更されたかどうかを判定する
    pub fn has_id3_tag_changed(&self, other: &Self) -> bool {
        self.id3_tag != other.id3_tag
    }

    pub fn title(&self) -> Option<&Title> {
        self.id3_tag.title()
    }
    #[allow(dead_code)]
    pub fn with_title(&self, new_title: Option<Title>) -> Self {
        let new_id3_tag = self.id3_tag.with_title(new_title);
        self.with_id3_tag(new_id3_tag)
    }

    pub fn artists(&self) -> Option<&Artists> {
        self.id3_tag.artists()
    }
    #[allow(dead_code)]
    pub fn with_artists(&self, new_artists: Option<Artists>) -> Self {
        let new_id3_tag = self.id3_tag.with_artists(new_artists);
        self.with_id3_tag(new_id3_tag)
    }

    pub fn album(&self) -> Option<&Album> {
        self.id3_tag.album()
    }
    #[allow(dead_code)]
    pub fn with_album(&self, new_album: Option<Album>) -> Self {
        let new_id3_tag = self.id3_tag.with_album(new_album);
        self.with_id3_tag(new_id3_tag)
    }

    /// パッチを適用する
    pub fn apply_patch(&self, patch: &AudioFilePatch) -> Self {
        Self {
            id: self.id,
            path: patch.path.clone().unwrap_or(self.path.clone()),
            id3_tag: match patch.id3_tag {
                Some(ref id3_tag_patch) => self.id3_tag.apply_patch(id3_tag_patch),
                None => self.id3_tag.clone(),
            },
        }
    }
}

/// AudioFileの更新用パッチ
///
/// * Some(value) - 値を更新
/// * None - 変更なし
pub struct AudioFilePatch {
    pub path: Option<AudioFilePath>,
    pub id3_tag: Option<Id3TagPatch>,
}

#[cfg(test)]
pub fn create_test_audio_file(suffix: &str) -> AudioFile {
    use std::path::PathBuf;

    use crate::domain::id3::Artist;

    let path = AudioFilePath::new(PathBuf::from(&format!("/test/file{}.mp3", suffix))).unwrap();
    let tag = Id3Tag::new(
        Some(Title::new(&format!("Title {}", suffix)).unwrap()),
        Some(Artists::new(vec![Artist::new(&format!("Artist {}", suffix)).unwrap()]).unwrap()),
        Some(Album::new(&format!("Album {}", suffix)).unwrap()),
    );

    AudioFile::new(path, tag)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;

    #[test]
    fn test_has_id3_tag_changed() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3")).unwrap();
        let id3_tag = Id3Tag::new(None, None, None);
        let audio_file = AudioFile::new(path, id3_tag.clone());
        let same_audio_file = AudioFile::new(audio_file.path().clone(), audio_file.id3_tag.clone());

        assert!(!audio_file.has_id3_tag_changed(&same_audio_file));

        // ID3タグのタイトルを変更
        let new_title = Some(Title::new("New Title").unwrap());
        let modified_audio_file = audio_file.with_title(new_title);

        assert!(audio_file.has_id3_tag_changed(&modified_audio_file));
    }

    #[test]
    fn test_with_path() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3")).unwrap();
        let id3_tag = Id3Tag::new(None, None, None);
        let audio_file = AudioFile::new(path.clone(), id3_tag);

        let new_path = AudioFilePath::new(PathBuf::from("new_test.mp3")).unwrap();
        let modified_audio_file = audio_file.with_path(new_path.clone());

        assert_eq!(audio_file.path(), &path);
        assert_eq!(modified_audio_file.path(), &new_path);
    }

    #[test]
    fn test_with_id3_tag() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3")).unwrap();
        let id3_tag = Id3Tag::new(None, None, None);
        let audio_file = AudioFile::new(path, id3_tag.clone());

        let new_id3_tag = Id3Tag::new(Some(Title::new("New Title").unwrap()), None, None);
        let modified_audio_file = audio_file.with_id3_tag(new_id3_tag.clone());

        assert_eq!(audio_file.id3_tag, id3_tag);
        assert_eq!(modified_audio_file.id3_tag, new_id3_tag);
    }

    #[test]
    fn test_apply_patch() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3")).unwrap();
        let id3_tag = Id3Tag::new(None, None, None);
        let audio_file = AudioFile::new(path, id3_tag);

        let new_path = AudioFilePath::new(PathBuf::from("new_test.mp3")).unwrap();
        let new_title = Some(Title::new("New Title").unwrap());
        let patch = AudioFilePatch {
            path: Some(new_path.clone()),
            id3_tag: Some(Id3TagPatch {
                title: Some(new_title.clone()),
                artists: None,
                album: None,
            }),
        };
        let modified_audio_file = audio_file.apply_patch(&patch);

        assert_eq!(modified_audio_file.path(), &new_path);
        assert_eq!(modified_audio_file.title(), new_title.as_ref());
    }

    #[test]
    fn test_apply_patch_no_changes() {
        let path = AudioFilePath::new(PathBuf::from("test.mp3")).unwrap();
        let id3_tag = Id3Tag::new(None, None, None);
        let audio_file = AudioFile::new(path, id3_tag);

        let patch = AudioFilePatch {
            path: None,
            id3_tag: None,
        };
        let modified_audio_file = audio_file.apply_patch(&patch);

        assert_eq!(modified_audio_file.path(), audio_file.path());
        assert_eq!(modified_audio_file.id3_tag, audio_file.id3_tag);
    }
}
