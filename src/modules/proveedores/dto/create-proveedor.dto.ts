import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

export class CreateProveedorDto {
  @ApiProperty({ example: 'Proveedor ABC S.A.S.' })
  @IsString()
  proveedorNombre: string;

  @ApiProperty({ required: false, example: '900123456-7' })
  @IsString()
  @IsOptional()
  proveedorNit?: string;

  @ApiProperty({ required: false, example: '3001234567' })
  @IsString()
  @IsOptional()
  proveedorTelefono?: string;

  @ApiProperty({ required: false, example: 'contacto@proveedor.com' })
  @IsEmail()
  @IsOptional()
  proveedorEmail?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  proveedorDireccion?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  proveedorContacto?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  proveedorEstado?: boolean;
}

