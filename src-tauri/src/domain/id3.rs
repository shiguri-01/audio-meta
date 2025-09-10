use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, ops::Deref};

use crate::utils::error::ValidationError;

/// ID3タグ
///
/// タイトル、アーティスト（複数可）、アルバムの情報を保持する
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Id3Tag {
    title: Option<Title>,
    artists: Option<Artists>,
    album: Option<Album>,
}

impl Id3Tag {
    /// 新しいID3タグを作成する
    ///
    /// # Arguments
    /// * `title` - タイトル
    /// * `artists` - アーティスト
    /// * `album` - アルバム
    pub fn new(title: Option<Title>, artists: Option<Artists>, album: Option<Album>) -> Self {
        Id3Tag {
            title,
            artists,
            album,
        }
    }

    pub fn title(&self) -> Option<&Title> {
        self.title.as_ref()
    }
    pub fn with_title(&self, title: Option<Title>) -> Self {
        let mut new_tag = self.clone();
        new_tag.title = title;
        new_tag
    }

    pub fn artists(&self) -> Option<&Artists> {
        self.artists.as_ref()
    }
    pub fn with_artists(&self, artists: Option<Artists>) -> Self {
        let mut new_tag = self.clone();
        new_tag.artists = artists;
        new_tag
    }

    pub fn album(&self) -> Option<&Album> {
        self.album.as_ref()
    }
    pub fn with_album(&self, album: Option<Album>) -> Self {
        let mut new_tag = self.clone();
        new_tag.album = album;
        new_tag
    }

    /// パッチを適用する
    pub fn apply_patch(&self, patch: &Id3TagChanges) -> Self {
        Id3Tag {
            title: patch.title.clone().unwrap_or(self.title.clone()),
            artists: patch.artists.clone().unwrap_or(self.artists.clone()),
            album: patch.album.clone().unwrap_or(self.album.clone()),
        }
    }
}

/// ID3タグの変更点
///
/// * `Some(Some(value))` - 値を更新
/// * `Some(None)` - 値を削除
/// * `None` - 変更なし
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Id3TagChanges {
    pub title: Option<Option<Title>>,
    pub artists: Option<Option<Artists>>,
    pub album: Option<Option<Album>>,
}

/// タイトル
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Title(String);

impl Title {
    /// タイトルを作成する
    ///
    /// * 空文字列は使用不可
    pub fn new(value: &str) -> Result<Self, ValidationError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            Err(ValidationError::EmptyValue)
        } else {
            Ok(Title(trimmed.to_string()))
        }
    }
}

impl Deref for Title {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

/// アーティスト
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Artist(String);

impl Artist {
    /// アーティスト名を作成する
    ///
    /// * 空文字列は使用不可
    pub fn new(value: &str) -> Result<Self, ValidationError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            Err(ValidationError::EmptyValue)
        } else {
            Ok(Artist(trimmed.to_string()))
        }
    }
}

impl Deref for Artist {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
/// アーティストのリスト
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Artists(Vec<Artist>);

impl Artists {
    /// アーティストのリストを作成する
    ///
    /// * 重複を排除される
    /// * 1人以上のアーティストが必要
    pub fn new(artists: Vec<Artist>) -> Result<Self, ValidationError> {
        // 重複を排除
        let unique_artists: BTreeSet<_> = artists.into_iter().collect();

        if unique_artists.is_empty() {
            Err(ValidationError::EmptyVector)
        } else {
            let artists_vec: Vec<_> = unique_artists.into_iter().collect();
            Ok(Artists(artists_vec))
        }
    }

    pub fn from_str_vec(input: &[&str]) -> Result<Self, ValidationError> {
        let artist_vec = input
            .iter()
            .map(|&s| Artist::new(s))
            .collect::<Result<Vec<_>, _>>()?;
        Artists::new(artist_vec)
    }
}

impl Deref for Artists {
    type Target = Vec<Artist>;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

/// アルバム
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Album(String);

impl Album {
    /// アルバムを作成する
    ///
    /// * 空文字列は使用不可
    pub fn new(value: &str) -> Result<Self, ValidationError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            Err(ValidationError::EmptyValue)
        } else {
            Ok(Album(trimmed.to_string()))
        }
    }
}

impl Deref for Album {
    type Target = String;
    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_patch() {
        let original = Id3Tag {
            title: Some(Title::new("Original Title").unwrap()),
            artists: Some(Artists::new(vec![Artist::new("Original Artist").unwrap()]).unwrap()),
            album: Some(Album::new("Original Album").unwrap()),
        };

        let patch = Id3TagChanges {
            title: Some(Some(Title::new("Updated Title").unwrap())),
            artists: Some(Some(
                Artists::new(vec![Artist::new("Updated Artist").unwrap()]).unwrap(),
            )),
            album: Some(Some(Album::new("Updated Album").unwrap())),
        };

        let updated = original.apply_patch(&patch);

        assert_eq!(updated.title(), Some(&Title::new("Updated Title").unwrap()));
        assert_eq!(
            updated.artists(),
            Some(&Artists::new(vec![Artist::new("Updated Artist").unwrap()]).unwrap())
        );
        assert_eq!(updated.album(), Some(&Album::new("Updated Album").unwrap()));
    }

    #[test]
    fn test_apply_patch_deletion() {
        let original = Id3Tag {
            title: Some(Title::new("Original Title").unwrap()),
            artists: Some(Artists::new(vec![Artist::new("Original Artist").unwrap()]).unwrap()),
            album: Some(Album::new("Original Album").unwrap()),
        };

        let patch = Id3TagChanges {
            title: Some(None),
            artists: Some(None),
            album: Some(None),
        };

        let updated = original.apply_patch(&patch);

        assert_eq!(updated.title(), None);
        assert_eq!(updated.artists(), None);
        assert_eq!(updated.album(), None);
    }

    #[test]
    fn test_apply_patch_no_changes() {
        let original = Id3Tag {
            title: Some(Title::new("Original Title").unwrap()),
            artists: Some(Artists::new(vec![Artist::new("Original Artist").unwrap()]).unwrap()),
            album: Some(Album::new("Original Album").unwrap()),
        };

        let patch = Id3TagChanges {
            title: None,
            artists: None,
            album: None,
        };

        let updated = original.apply_patch(&patch);

        assert_eq!(
            updated.title(),
            Some(&Title::new("Original Title").unwrap())
        );
        assert_eq!(
            updated.artists(),
            Some(&Artists::new(vec![Artist::new("Original Artist").unwrap()]).unwrap())
        );
        assert_eq!(
            updated.album(),
            Some(&Album::new("Original Album").unwrap())
        );
    }
}
