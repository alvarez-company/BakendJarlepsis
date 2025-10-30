import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateTrasladoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 1, description: 'ID de la bodega origen' })
  @IsNumber()
  bodegaOrigenId: number;

  @ApiProperty({ example: 2, description: 'ID de la bodega destino' })
  @IsNumber()
  bodegaDestinoId: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  trasladoCantidad: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  trasladoObservaciones?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;
}

