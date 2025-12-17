import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Min,
  ValidateIf,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialBodegaInputDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  bodegaId: number;

  @ApiProperty({ example: 50, required: false, default: 0 })
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({ example: 12000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioPromedio?: number;
}

export class CreateMaterialDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  categoriaId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  proveedorId: number;

  @ApiProperty({ example: 1, required: false, nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.inventarioId !== null && o.inventarioId !== undefined)
  @IsNumber()
  inventarioId?: number | null;

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

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(0)
  materialPrecio: number;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  unidadMedidaId?: number;

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
  materialFoto?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  materialEstado?: boolean;

  @ApiProperty({ required: false, default: false, description: 'Indica si el material es un medidor que requiere números únicos' })
  @IsBoolean()
  @IsOptional()
  materialEsMedidor?: boolean;

  @ApiProperty({
    required: false,
    type: [MaterialBodegaInputDto],
    description: 'Distribución inicial de stock por bodega',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MaterialBodegaInputDto)
  bodegas?: MaterialBodegaInputDto[];
}

