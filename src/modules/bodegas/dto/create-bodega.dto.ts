import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateBodegaDto {
  @ApiProperty({ example: 'Bodega Principal' })
  @IsString()
  bodegaNombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodegaDescripcion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodegaUbicacion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodegaTelefono?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodegaCorreo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bodegaFoto?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sedeId: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  bodegaEstado?: boolean;

  @ApiProperty({
    required: true,
    enum: ['internas', 'redes'],
    description: 'Tipo de bodega: internas o redes. Obligatorio al crear.',
  })
  @IsString()
  @IsIn(['internas', 'redes'], { message: 'bodegaTipo debe ser "internas" o "redes"' })
  bodegaTipo: 'internas' | 'redes';
}
