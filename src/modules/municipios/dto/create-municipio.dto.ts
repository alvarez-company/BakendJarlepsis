import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateMunicipioDto {
  @ApiProperty({ example: 'Bucaramanga' })
  @IsString()
  municipioNombre: string;

  @ApiProperty({ required: false, example: '68001' })
  @IsString()
  @IsOptional()
  municipioCodigo?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  departamentoId: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  municipioEstado?: boolean;
}

