import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateInstalacionDto {
  @ApiProperty({ example: 'INST-001' })
  @IsString()
  instalacionCodigo: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  tipoInstalacionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  clienteId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instalacionMedidorNumero?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instalacionSelloNumero?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  instalacionFechaHora?: string;

  @ApiProperty({ required: false, description: 'JSON con materiales instalados' })
  @IsOptional()
  materialesInstalados?: any;

  @ApiProperty({ required: false, description: 'JSON con proyectos e items seleccionados' })
  @IsOptional()
  instalacionProyectos?: any;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  instalacionObservaciones?: string;
}
