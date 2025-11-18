import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialTrasladoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  trasladoCantidad: number;
}

export class CreateTrasladoDto {
  @ApiProperty({ type: [MaterialTrasladoDto], description: 'Array de materiales' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialTrasladoDto)
  materiales: MaterialTrasladoDto[];

  @ApiProperty({ example: 1, description: 'ID de la bodega origen' })
  @IsNumber()
  bodegaOrigenId: number;

  @ApiProperty({ example: 2, description: 'ID de la bodega destino' })
  @IsNumber()
  bodegaDestinoId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trasladoObservaciones?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trasladoCodigo?: string; // Código para agrupar múltiples traslados
}

