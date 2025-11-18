import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimiento } from '../movimiento-inventario.entity';

export class MaterialMovimientoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  movimientoCantidad: number;

  @ApiProperty({ required: false, example: 15000 })
  @IsNumber()
  @IsOptional()
  movimientoPrecioUnitario?: number;
}

export class CreateMovimientoDto {
  @ApiProperty({ enum: TipoMovimiento, example: TipoMovimiento.SALIDA })
  @IsEnum(TipoMovimiento)
  movimientoTipo: TipoMovimiento;

  @ApiProperty({ type: [MaterialMovimientoDto], description: 'Array de materiales' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialMovimientoDto)
  materiales: MaterialMovimientoDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  movimientoObservaciones?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  instalacionId?: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  proveedorId?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  inventarioId?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  oficinaId?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  movimientoCodigo?: string; // Código para agrupar múltiples movimientos
}

