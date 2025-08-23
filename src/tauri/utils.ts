import type { Result } from "neverthrow";

export type toDTO<T, DTO> = (input: T) => DTO;
export type fromDTO<T, DTO> = (dto: DTO) => Result<T, string[]>;
