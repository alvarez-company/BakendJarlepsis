import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUnidadMedidaDto {
  @ApiProperty({ example: 'Unidad' })
  @IsString()
  unidadMedidaNombre: string;

  @ApiProperty({ required: false, example: 'u' })
  @IsString()
  @IsOptional()
  unidadMedidaSimbolo?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  unidadMedidaEstado?: boolean;
}
