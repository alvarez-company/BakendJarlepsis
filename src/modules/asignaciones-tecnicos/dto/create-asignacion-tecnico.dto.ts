import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialAsignacionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 10.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class CreateAsignacionTecnicoDto {
  @ApiProperty({ required: false, example: 'ASIG-1', description: 'Código de asignación. Si no se proporciona, se generará automáticamente' })
  @IsString()
  @IsOptional()
  asignacionCodigo?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  inventarioId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioAsignadorId: number;

  @ApiProperty({ type: [MaterialAsignacionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialAsignacionDto)
  materiales: MaterialAsignacionDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

