import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsString,
  IsOptional,
  Min,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
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

  @ApiProperty({
    required: false,
    description: 'Números de medidor específicos para materiales de categoría medidor',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  numerosMedidor?: string[]; // Números de medidor específicos para este material
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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  movimientoCodigo?: string; // Código para agrupar múltiples movimientos

  @ApiProperty({
    required: false,
    description: 'Asignar materiales directamente a técnicos (solo para entradas)',
  })
  @IsArray()
  @IsOptional()
  asignacionesTecnicos?: Array<{
    usuarioId: number;
    materiales: Array<{
      materialId: number;
      cantidad: number;
    }>;
  }>;

  @ApiProperty({
    required: false,
    example: 1,
    description: 'ID del técnico cuando el origen es técnico (para salidas/devoluciones)',
  })
  @IsNumber()
  @IsOptional()
  tecnicoOrigenId?: number;

  @ApiProperty({
    required: false,
    enum: ['bodega', 'tecnico'],
    description: 'Tipo de origen del movimiento (para salidas/devoluciones)',
  })
  @IsOptional()
  @IsString()
  @IsIn(['bodega', 'tecnico'])
  origenTipo?: 'bodega' | 'tecnico';
}
