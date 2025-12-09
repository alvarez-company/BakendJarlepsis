import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateOficinaDto {
  @ApiProperty({ example: 'Oficina Bucaramanga' })
  @IsString()
  oficinaNombre: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  municipioId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  oficinaDireccion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  oficinaTelefono?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  oficinaCorreo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  oficinaFoto?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  sedeId?: number;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  oficinaEstado?: boolean;
}
