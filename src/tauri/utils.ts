import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Result } from "neverthrow";

export type toDTO<T, DTO> = (input: T) => DTO;
export type fromDTO<T, DTO> = (
  dto: DTO,
) => Result<T, readonly StandardSchemaV1.Issue[]>;
