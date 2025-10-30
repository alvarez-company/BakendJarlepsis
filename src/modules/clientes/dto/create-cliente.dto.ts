import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEmail, IsOptional } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({ example: 'Juan Pérez García' })
  @IsString()
  clienteNombreCompleto: string;

  @ApiProperty({ required: false, example: '3001234567' })
  @IsString()
  @IsOptional()
  clienteTelefono?: string;

  @ApiProperty({ required: false, example: 'juan.perez@example.com' })
  @IsEmail()
  @IsOptional()
  clienteCorreo?: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  clienteDocumento: string;

  @ApiProperty({ example: 'Calle 123 #45-67' })
  @IsString()
  clienteDireccion: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  municipioId?: number;
}

