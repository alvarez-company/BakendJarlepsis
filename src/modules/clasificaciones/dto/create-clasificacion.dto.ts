import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateClasificacionDto {
  @ApiProperty({ example: 'Material Principal' })
  @IsString()
  clasificacionNombre: string;

  @ApiProperty({ required: false, example: 'Materiales principales de la instalación' })
  @IsString()
  @IsOptional()
  clasificacionDescripcion?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  clasificacionEstado?: boolean;
}
