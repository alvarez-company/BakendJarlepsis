import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** Query para GET /movimientos/grupos (paginación + filtros en un solo DTO válido para ValidationPipe). */
export class MovimientosGruposQueryDto extends PaginationDto {
  @ApiProperty({ enum: ['entrada', 'salida', 'devolucion'] })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @IsIn(['entrada', 'salida', 'devolucion'])
  movimientoTipo: string;

  @ApiPropertyOptional({ description: 'Código de movimiento, número de orden o identificador (mayúsculas/espacios en N° orden tolerados)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = typeof value === 'string' ? value.trim() : '';
    return s === '' ? undefined : s;
  })
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: 'Solo salidas: excluir salidas ligadas a traslado (true/1)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return value === true || value === 'true' || value === '1' || value === 1;
  })
  @IsBoolean()
  excludeTrasladoSalidas?: boolean;
}
