import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { UnidadMedida } from '../material.entity';

export class CreateMaterialDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  categoriaId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  proveedorId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  inventarioId: number;

  @ApiProperty({ example: 'MAT-001' })
  @IsString()
  materialCodigo: string;

  @ApiProperty({ example: 'Cable UTP Cat 6' })
  @IsString()
  materialNombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialDescripcion?: string;

  @ApiProperty({ example: 100, default: 0 })
  @IsNumber()
  @Min(0)
  materialStock: number;

  @ApiProperty({ example: 10, default: 0 })
  @IsNumber()
  @Min(0)
  materialStockMinimo: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  materialStockMaximo?: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  materialPrecio: number;

  @ApiProperty({ enum: UnidadMedida, default: UnidadMedida.UNIDAD })
  @IsEnum(UnidadMedida)
  @IsOptional()
  materialUnidadMedida?: UnidadMedida;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialMarca?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialModelo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialSerial?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialCodigoBarras?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  materialFoto?: string;
}

