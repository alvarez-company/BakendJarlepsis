import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateDepartamentoDto {
  @ApiProperty({ example: 'Santander' })
  @IsString()
  departamentoNombre: string;

  @ApiProperty({ required: false, example: '68' })
  @IsString()
  @IsOptional()
  departamentoCodigo?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  paisId: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  departamentoEstado?: boolean;
}
