import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNumber, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioRolId: number;

  @ApiProperty({ required: false, nullable: true })
  @IsNumber()
  @IsOptional()
  usuarioSede?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsNumber()
  @IsOptional()
  usuarioBodega?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsNumber()
  @IsOptional()
  usuarioOficina?: number | null;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  usuarioNombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  usuarioApellido: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail()
  usuarioCorreo: string;

  @ApiProperty({ required: false, example: '3001234567' })
  @IsString()
  @IsOptional()
  usuarioTelefono?: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  usuarioDocumento: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  usuarioContrasena: string;
}
