import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import {
  TipoRequerimiento,
  PrioridadRequerimiento,
  CategoriaRequerimiento,
} from '../requerimiento.entity';

export class CreateRequerimientoDto {
  @ApiProperty({ description: 'Título del requerimiento', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @ApiProperty({ description: 'Descripción detallada del requerimiento' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    enum: TipoRequerimiento,
    description: 'Tipo de requerimiento',
  })
  @IsEnum(TipoRequerimiento)
  tipo: TipoRequerimiento;

  @ApiPropertyOptional({
    enum: PrioridadRequerimiento,
    description: 'Prioridad del requerimiento',
    default: PrioridadRequerimiento.MEDIA,
  })
  @IsEnum(PrioridadRequerimiento)
  @IsOptional()
  prioridad?: PrioridadRequerimiento;

  @ApiPropertyOptional({
    enum: CategoriaRequerimiento,
    description: 'Categoría del requerimiento',
    default: CategoriaRequerimiento.GENERAL,
  })
  @IsEnum(CategoriaRequerimiento)
  @IsOptional()
  categoria?: CategoriaRequerimiento;

  @ApiPropertyOptional({ description: 'ID de la sede relacionada' })
  @IsNumber()
  @IsOptional()
  sedeId?: number;

  @ApiPropertyOptional({ description: 'URLs de archivos adjuntos' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  archivosAdjuntos?: string[];

  @ApiPropertyOptional({ description: 'Fecha estimada de resolución' })
  @IsDateString()
  @IsOptional()
  fechaEstimada?: string;
}
