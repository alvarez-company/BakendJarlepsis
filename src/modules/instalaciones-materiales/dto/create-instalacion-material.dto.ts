import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, IsArray } from 'class-validator';

export class CreateInstalacionMaterialDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  instalacionId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  materialId: number;

  @ApiProperty({ example: 5.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  cantidad: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({ required: false, description: 'Números de medidor específicos utilizados en la instalación (desde miniapp)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  numerosMedidor?: string[]; // Números de medidor específicos que el técnico utilizó
}

export class UpdateInstalacionMaterialDto {
  @ApiProperty({ required: false, example: 5.5, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cantidad?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class AssignMaterialesToInstalacionDto {
  @ApiProperty({ description: 'Array de materiales con cantidades', type: [Object] })
  materiales: Array<{
    materialId: number;
    cantidad: number;
    observaciones?: string;
    numerosMedidor?: string[]; // Números de medidor específicos
  }>;
}

