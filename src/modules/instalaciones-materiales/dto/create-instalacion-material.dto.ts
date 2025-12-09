import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
  }>;
}

