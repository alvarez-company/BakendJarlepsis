import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Electrónica' })
  @IsString()
  categoriaNombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoriaDescripcion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoriaCodigo?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  categoriaEstado?: boolean;
}
