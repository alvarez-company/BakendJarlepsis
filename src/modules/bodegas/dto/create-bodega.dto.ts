import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

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

  @ApiProperty({ example: 1 })
  @IsNumber()
  oficinaId: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  bodegaEstado?: boolean;
}

