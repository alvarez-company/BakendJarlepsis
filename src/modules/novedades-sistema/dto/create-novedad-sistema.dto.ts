import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsNumber,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { TipoNovedad } from '../novedad-sistema.entity';

export class CreateNovedadSistemaDto {
  @ApiProperty({ description: 'Título de la novedad', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @ApiProperty({ description: 'Descripción de la novedad' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({
    enum: TipoNovedad,
    description: 'Tipo de novedad',
    default: TipoNovedad.ACTUALIZACION,
  })
  @IsEnum(TipoNovedad)
  @IsOptional()
  tipo?: TipoNovedad;

  @ApiPropertyOptional({ description: 'ID del requerimiento relacionado' })
  @IsNumber()
  @IsOptional()
  requerimientoId?: number;

  @ApiPropertyOptional({ description: 'Lista de cambios detallados' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cambiosDetallados?: string[];

  @ApiPropertyOptional({ description: 'Versión del sistema', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({ description: 'Si la novedad está destacada' })
  @IsBoolean()
  @IsOptional()
  destacada?: boolean;
}
