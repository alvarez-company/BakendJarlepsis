import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';
import { EstadoNumeroMedidor } from '../numero-medidor.entity';

export class CreateNumeroMedidorDto {
  @IsNumber()
  materialId: number;

  @IsString()
  numeroMedidor: string;

  @IsOptional()
  @IsEnum(EstadoNumeroMedidor)
  estado?: EstadoNumeroMedidor;

  @IsOptional()
  @IsNumber()
  inventarioTecnicoId?: number;

  @IsOptional()
  @IsNumber()
  instalacionMaterialId?: number;

  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @IsOptional()
  @IsNumber()
  instalacionId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateNumeroMedidorDto {
  @IsOptional()
  @IsString()
  numeroMedidor?: string;

  @IsOptional()
  @IsEnum(EstadoNumeroMedidor)
  estado?: EstadoNumeroMedidor;

  @IsOptional()
  @IsNumber()
  inventarioTecnicoId?: number;

  @IsOptional()
  @IsNumber()
  instalacionMaterialId?: number;

  @IsOptional()
  @IsNumber()
  usuarioId?: number;

  @IsOptional()
  @IsNumber()
  instalacionId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class AsignarNumerosMedidorDto {
  @IsNumber()
  materialId: number;

  @IsArray()
  @IsString({ each: true })
  numerosMedidor: string[]; // Array de números de medidor a asignar

  @IsOptional()
  @IsNumber()
  usuarioId?: number; // Técnico al que se asignan

  @IsOptional()
  @IsNumber()
  instalacionId?: number; // Instalación donde se usan
}
