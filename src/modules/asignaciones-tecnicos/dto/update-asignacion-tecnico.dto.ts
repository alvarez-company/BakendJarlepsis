import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialAsignacionDto } from './create-asignacion-tecnico.dto';

export class UpdateAsignacionTecnicoDto {
  @ApiProperty({ enum: ['pendiente', 'aprobada', 'rechazada'], required: false })
  @IsEnum(['pendiente', 'aprobada', 'rechazada'])
  @IsOptional()
  asignacionEstado?: 'pendiente' | 'aprobada' | 'rechazada';

  @ApiProperty({ type: [MaterialAsignacionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialAsignacionDto)
  @IsOptional()
  materiales?: MaterialAsignacionDto[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
