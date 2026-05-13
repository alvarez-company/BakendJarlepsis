import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class MovimientosListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo de movimiento' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'string' ? value.trim().toLowerCase() : value;
  })
  @IsString()
  @IsIn(['entrada', 'salida', 'devolucion'])
  movimientoTipo?: string;

  @ApiPropertyOptional({ description: 'Código de movimiento, número de orden o identificador (búsqueda insensible a mayúsculas; en orden se ignoran espacios al comparar)' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = typeof value === 'string' ? value.trim() : '';
    return s === '' ? undefined : s;
  })
  @IsString()
  @MaxLength(120)
  search?: string;
}
