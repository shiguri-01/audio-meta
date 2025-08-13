use std::{collections::HashMap, fs};

use crate::{
    domain::{
        audio_file::{AudioFile, AudioFilePath, AudioFileRepository},
        id3::{Album, Artist, Artists, Id3Tag, Title},
    },
    utils::error::AudioFileError,
};
use id3::{Tag, TagLike};
use uuid::Uuid;

pub struct AudioFileFileSystemRepository {
    cached_files: HashMap<Uuid, AudioFile>,
}

impl AudioFileFileSystemRepository {
    pub fn new() -> Self {
        AudioFileFileSystemRepository {
            cached_files: HashMap::new(),
        }
    }

    fn get_current_state(&self, id: Uuid) -> Option<&AudioFile> {
        self.cached_files.get(&id)
    }
}

impl Default for AudioFileFileSystemRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl AudioFileFileSystemRepository {
    fn update(existing_file: &AudioFile, audio_file: &AudioFile) -> Result<(), AudioFileError> {
        let path_changed = existing_file.path() != audio_file.path();
        let id3_tag_changed = audio_file.has_id3_tag_changed(existing_file);

        if !path_changed && !id3_tag_changed {
            return Ok(()); // 変更なし
        }

        // パスの更新
        if path_changed {
            // 移動前のパスが存在するか確認
            if !existing_file.path().exists() {
                return Err(AudioFileError::FileNotFound {
                    path: existing_file.path().to_string_lossy().to_string(),
                });
            }

            fs::rename(existing_file.path(), audio_file.path())?;
        }

        // ID3タグの更新
        if id3_tag_changed {
            if let Err(e) = audio_file.write_id3_tag_to_fs() {
                // ID3タグの書き込みに失敗した場合、パスを元に戻す
                if path_changed {
                    // ロールバックがエラーとなる可能性もあるが、
                    // 無視して、ID3タグ更新時のエラーを返す
                    let _ = fs::rename(audio_file.path(), existing_file.path());
                }
                return Err(e);
            }
        }

        Ok(())
    }
}

#[async_trait::async_trait]
impl AudioFileRepository for AudioFileFileSystemRepository {
    async fn save(&mut self, audio_file: &AudioFile) -> Result<(), AudioFileError> {
        if let Some(existing_file) = self.get_current_state(audio_file.id()) {
            // 既存のファイルが見つかった場合、更新を行う
            Self::update(existing_file, audio_file)?;
        } else {
            // TODO: 新規ファイルの作成
            // とりあえずエラー
            return Err(AudioFileError::FileNotFound {
                path: audio_file.path().to_string_lossy().to_string(),
            });
        };

        self.cached_files
            .insert(audio_file.id(), audio_file.clone());
        Ok(())
    }

    async fn scan_directory(
        &mut self,
        dir: &std::path::Path,
    ) -> Result<Vec<AudioFile>, AudioFileError> {
        // TODO: cacheをfsと同期させる

        let audio_files: Vec<AudioFile> = fs::read_dir(dir)?
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|path| AudioFile::is_supported_audio_format(path))
            .filter_map(|path| {
                AudioFilePath::new(path)
                    .ok()
                    .and_then(|audio_path| AudioFile::load_from_fs(&audio_path).ok())
            })
            .collect();

        self.cached_files
            .extend(audio_files.iter().cloned().map(|f| (f.id(), f)));

        Ok(audio_files)
    }

    async fn find_by_id(&mut self, id: &Uuid) -> Result<Option<AudioFile>, AudioFileError> {
        Ok(self.cached_files.get(id).cloned())
    }
}

impl Id3Tag {
    fn from_tag(tag: &Tag) -> Result<Self, AudioFileError> {
        let title = tag.title().map(Title::new).transpose()?;
        let artists = match tag.artists() {
            Some(artists) => {
                let artist_vec: Vec<Artist> =
                    artists.iter().filter_map(|a| Artist::new(a).ok()).collect();
                Some(Artists::new(artist_vec)?)
            }
            None => None,
        };
        let album = tag.album().map(Album::new).transpose()?;

        Ok(Id3Tag::new(title, artists, album))
    }
}

impl Artists {
    fn to_tag_string(&self) -> String {
        self.iter()
            .map(|a| a.to_string())
            .collect::<Vec<String>>()
            .join("\0")
    }
}

impl AudioFile {
    fn load_from_fs(path: &AudioFilePath) -> Result<Self, AudioFileError> {
        // ローカルストレージからファイルを読み込む
        if !path.exists() {
            return Err(AudioFileError::FileNotFound {
                path: path.to_string_lossy().to_string(),
            });
        }

        let tag = Tag::read_from_path(path)?;
        let id3_tag = Id3Tag::from_tag(&tag)?;

        Ok(AudioFile::new(path.clone(), id3_tag))
    }

    fn write_id3_tag_to_fs(&self) -> Result<(), AudioFileError> {
        let mut tag = Tag::read_from_path(self.path())?;

        match self.title() {
            Some(title) => tag.set_title(title.to_string()),
            None => tag.remove_title(),
        }
        match self.artists() {
            Some(artists) => tag.set_artist(artists.to_tag_string()),
            None => tag.remove_artist(),
        }
        match self.album() {
            Some(album) => tag.set_album(album.to_string()),
            None => tag.remove_album(),
        }

        tag.write_to_path(self.path(), id3::Version::Id3v24)?;
        Ok(())
    }
}
