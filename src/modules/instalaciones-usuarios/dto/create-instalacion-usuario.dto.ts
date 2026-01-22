import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateInstalacionUsuarioDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  instalacionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ example: 'tecnico', enum: ['tecnico', 'empleado', 'supervisor'] })
  @IsString()
  rolEnInstalacion: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
