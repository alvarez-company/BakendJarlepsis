import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsNumber,
  IsArray,
  IsDateString,
} from 'class-validator';
import {
  TipoRequerimiento,
  EstadoRequerimiento,
  PrioridadRequerimiento,
  CategoriaRequerimiento,
} from '../requerimiento.entity';

export class UpdateRequerimientoDto {
  @ApiPropertyOptional({ description: 'Título del requerimiento', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ description: 'Descripción detallada del requerimiento' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({
    enum: TipoRequerimiento,
    description: 'Tipo de requerimiento',
  })
  @IsEnum(TipoRequerimiento)
  @IsOptional()
  tipo?: TipoRequerimiento;

  @ApiPropertyOptional({
    enum: EstadoRequerimiento,
    description: 'Estado del requerimiento',
  })
  @IsEnum(EstadoRequerimiento)
  @IsOptional()
  estado?: EstadoRequerimiento;

  @ApiPropertyOptional({
    enum: PrioridadRequerimiento,
    description: 'Prioridad del requerimiento',
  })
  @IsEnum(PrioridadRequerimiento)
  @IsOptional()
  prioridad?: PrioridadRequerimiento;

  @ApiPropertyOptional({
    enum: CategoriaRequerimiento,
    description: 'Categoría del requerimiento',
  })
  @IsEnum(CategoriaRequerimiento)
  @IsOptional()
  categoria?: CategoriaRequerimiento;

  @ApiPropertyOptional({ description: 'ID del usuario asignado' })
  @IsNumber()
  @IsOptional()
  asignadoId?: number;

  @ApiPropertyOptional({ description: 'ID de la sede relacionada' })
  @IsNumber()
  @IsOptional()
  sedeId?: number;

  @ApiPropertyOptional({ description: 'Respuesta al requerimiento' })
  @IsString()
  @IsOptional()
  respuesta?: string;

  @ApiPropertyOptional({ description: 'Notas internas (solo visible para admins/desarrollo)' })
  @IsString()
  @IsOptional()
  notasInternas?: string;

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
