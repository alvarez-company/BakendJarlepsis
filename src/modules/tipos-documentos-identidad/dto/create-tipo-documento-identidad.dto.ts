import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateTipoDocumentoIdentidadDto {
  @ApiProperty({ example: 'CC' })
  @IsString()
  tipoDocumentoCodigo: string;

  @ApiProperty({ example: 'Cédula de Ciudadanía' })
  @IsString()
  tipoDocumentoNombre: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tipoDocumentoDescripcion?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  tipoDocumentoEstado?: boolean;
}
