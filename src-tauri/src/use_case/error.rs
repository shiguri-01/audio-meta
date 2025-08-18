use thiserror::Error;

#[derive(Error, Debug)]
pub enum ApplicationError {
    #[allow(dead_code)]
    #[error("Unexpected error")]
    Unexpected,

    #[error("Audio file error: {0}")]
    AudioFileError(#[from] crate::utils::error::AudioFileError),

    #[error("Validation error: {0}")]
    ValidationError(#[from] crate::utils::error::ValidationError),
}

impl serde::Serialize for ApplicationError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
