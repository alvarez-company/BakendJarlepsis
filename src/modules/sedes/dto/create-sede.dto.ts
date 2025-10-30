import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateSedeDto {
  @ApiProperty({ example: 'Sede Principal' })
  @IsString()
  sedeNombre: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  departamentoId: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sedeDireccion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sedeTelefono?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  sedeEstado?: boolean;
}
