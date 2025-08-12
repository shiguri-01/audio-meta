use thiserror::Error;

#[derive(Error, Debug)]
pub enum AudioFileError {
    #[error("Validation error: {0}")]
    Validation(#[from] ValidationError),

    #[error("File not found: {path}")]
    FileNotFound { path: String },

    #[error("ID3 tag error: {0}")]
    Id3Error(#[from] id3::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("value must not be empty")]
    EmptyValue,

    #[error("vector must not be empty")]
    EmptyVector,

    #[error("path must not be empty")]
    EmptyPath,

    #[error("file extension is invalid")]
    InvalidExtension,

    #[error("file path is not valid UTF-8")]
    InvalidUtf8Path,

    #[error("file name is missing")]
    MissingFileName,

    #[error("file stem is missing")]
    MissingFileStem,
}
