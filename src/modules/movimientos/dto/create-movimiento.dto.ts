import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsString, IsOptional, Min } from 'class-validator';
import { TipoMovimiento } from '../movimiento-inventario.entity';

export class CreateMovimientoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ enum: TipoMovimiento, example: TipoMovimiento.SALIDA })
  @IsEnum(TipoMovimiento)
  movimientoTipo: TipoMovimiento;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  movimientoCantidad: number;

  @ApiProperty({ required: false, example: 15000 })
  @IsNumber()
  @IsOptional()
  movimientoPrecioUnitario?: number;

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
}

