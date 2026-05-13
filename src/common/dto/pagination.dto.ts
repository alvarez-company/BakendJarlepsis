import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

/** Máximo de filas por petición (listas grandes deben paginar en el cliente o en lotes). */
export const PAGINATION_MAX_LIMIT = 50;

export class PaginationDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50, minimum: 1, maximum: PAGINATION_MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return PAGINATION_MAX_LIMIT;
    const n = Number(value);
    if (!Number.isFinite(n)) return PAGINATION_MAX_LIMIT;
    return Math.min(PAGINATION_MAX_LIMIT, Math.max(1, Math.floor(n)));
  })
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number = PAGINATION_MAX_LIMIT;
}
