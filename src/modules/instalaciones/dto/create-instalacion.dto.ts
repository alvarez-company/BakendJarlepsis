import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, IsArray, IsIn } from 'class-validator';

export class CreateInstalacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  tipoInstalacionId: number;

  @ApiProperty({
    enum: ['internas', 'redes'],
    description: 'Tipo de instalación: internas o redes. Obligatorio al crear. Admin elige; admin-internas solo internas; admin-redes solo redes.',
  })
  @IsIn(['internas', 'redes'], { message: 'instalacionTipo debe ser "internas" o "redes"' })
  instalacionTipo: 'internas' | 'redes';

  @ApiProperty({ example: 1 })
  @IsNumber()
  clienteId: number;

  @ApiProperty({
    example: 'INST-001',
    required: false,
    description: 'Código de instalación (opcional; en instalaciones de redes no siempre hay código). Si se envía, debe ser único.',
  })
  @IsString()
  @IsOptional()
  instalacionCodigo?: string;

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
