import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateInventarioDto {
  @ApiProperty({ example: 'Inventario Principal' })
  @IsString()
  inventarioNombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  inventarioDescripcion?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  bodegaId: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  inventarioEstado?: boolean;
}

