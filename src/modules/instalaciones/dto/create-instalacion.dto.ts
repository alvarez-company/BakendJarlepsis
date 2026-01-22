import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsArray } from 'class-validator';

export class CreateInstalacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  tipoInstalacionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  clienteId: number;

  @ApiProperty({
    example: 'INST-001',
    description: 'Código de instalación (obligatorio, único por instalación)',
  })
  @IsString()
  instalacionCodigo: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instalacionMedidorNumero?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instalacionSelloNumero?: string;

  @ApiProperty({ required: false, description: 'Sello del regulador' })
  @IsString()
  @IsOptional()
  instalacionSelloRegulador?: string;

  @ApiProperty({ required: false, description: 'Fecha de instalación (opcional)' })
  @IsDateString()
  @IsOptional()
  instalacionFecha?: string;

  @ApiProperty({ description: 'Fecha de asignación Metrogas (obligatorio)' })
  @IsDateString()
  fechaAsignacionMetrogas: string;

  @ApiProperty({ required: false, description: 'JSON con materiales instalados' })
  @IsOptional()
  materialesInstalados?: any;

  @ApiProperty({ required: false, description: 'JSON con proyectos e items seleccionados' })
  @IsOptional()
  instalacionProyectos?: any;

  @ApiProperty({ required: false, description: 'Observaciones generales de la instalación' })
  @IsString()
  @IsOptional()
  instalacionObservaciones?: string;

  @ApiProperty({ required: false, description: 'Observaciones específicas del técnico' })
  @IsString()
  @IsOptional()
  observacionesTecnico?: string;

  @ApiProperty({
    required: false,
    description: 'Array de IDs de usuarios asignados',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  usuariosAsignados?: number[];

  @ApiProperty({ required: false, description: 'ID de la bodega de origen de materiales' })
  @IsNumber()
  @IsOptional()
  bodegaId?: number;
}
