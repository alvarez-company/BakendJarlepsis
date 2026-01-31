import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
  @IsNumber()
  bodegaId?: number;

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
  @IsNumber()
  bodegaId?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ItemAsignarNumeroMedidorDto {
  @IsString()
  numeroMedidor: string;

  @IsOptional()
  @IsNumber()
  bodegaId?: number; // Si no se envía, el medidor queda en el centro operativo
}

export class AsignarNumerosMedidorDto {
  @IsNumber()
  materialId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAsignarNumeroMedidorDto)
  items: ItemAsignarNumeroMedidorDto[]; // Array de { numeroMedidor, bodegaId? }

  @IsOptional()
  @IsNumber()
  usuarioId?: number; // Técnico al que se asignan

  @IsOptional()
  @IsNumber()
  instalacionId?: number; // Instalación donde se usan
}

// Body para POST materiales/:id/asignar-numeros-medidor
export class AsignarNumerosMedidorBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAsignarNumeroMedidorDto)
  items: ItemAsignarNumeroMedidorDto[];
}
