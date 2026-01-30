import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateClienteDto {
  @ApiProperty({
    example: 'Juan Pérez García',
    description: 'Nombre completo del usuario (persona a quien se le realiza la instalación)',
  })
  @IsString()
  nombreUsuario: string;

  @ApiProperty({ required: false, example: '3001234567' })
  @IsString()
  @IsOptional()
  clienteTelefono?: string;

  @ApiProperty({ example: 'Calle 123 #45-67' })
  @IsString()
  clienteDireccion: string;

  @ApiProperty({ required: false, example: 'Centro' })
  @IsString()
  @IsOptional()
  clienteBarrio?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @IsOptional()
  municipioId?: number;

  // clienteEstado se establece automáticamente:
  // - ACTIVO por defecto al crear
  // - REALIZANDO_INSTALACION cuando se asignan usuarios a una instalación
  // - ACTIVO cuando se completa una instalación y no hay otras activas

  @ApiProperty({ required: false, example: 0 })
  @IsNumber()
  @IsOptional()
  cantidadInstalaciones?: number;
}
