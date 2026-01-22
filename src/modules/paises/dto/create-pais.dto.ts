import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePaisDto {
  @ApiProperty({ example: 'Colombia' })
  @IsString()
  paisNombre: string;

  @ApiProperty({ required: false, example: 'CO' })
  @IsString()
  @IsOptional()
  paisCodigo?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  paisEstado?: boolean;
}
