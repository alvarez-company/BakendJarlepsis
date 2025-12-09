import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventarioTecnicoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 10.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class UpdateInventarioTecnicoDto {
  @ApiProperty({ required: false, example: 10.5, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cantidad?: number;
}

export class MaterialAsignacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 10.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class AssignMaterialesToTecnicoDto {
  @ApiProperty({ description: 'Array de materiales con cantidades', type: [MaterialAsignacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialAsignacionDto)
  materiales: MaterialAsignacionDto[];

  @ApiProperty({ required: false, description: 'ID del inventario de origen (para crear movimiento de salida)' })
  @IsNumber()
  @IsOptional()
  inventarioId?: number;

  // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

  @ApiProperty({ required: false, description: 'ID del usuario que realiza la asignación' })
  @IsNumber()
  @IsOptional()
  usuarioAsignadorId?: number;

  @ApiProperty({ required: false, description: 'Observaciones para el movimiento de salida' })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

