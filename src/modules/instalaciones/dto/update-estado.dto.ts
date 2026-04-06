import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EstadoInstalacion } from '../instalacion.entity';

export class UpdateEstadoInstalacionDto {
  @ApiProperty({
    enum: EstadoInstalacion,
    example: EstadoInstalacion.PPC,
    description: 'Nuevo estado de la instalación (códigos v2: apm, ppc, aat, avan, cons, cert, fact, nove, dev). Legacy anulada/cancelada se normalizan a dev.',
  })
  @Transform(({ value }) => {
    const v = String(value ?? '')
      .toLowerCase()
      .trim();
    if (v === 'anulada' || v === 'cancelada') return EstadoInstalacion.DEV;
    return value;
  })
  @IsEnum(EstadoInstalacion, {
    message: `El estado debe ser uno de: ${Object.values(EstadoInstalacion).join(', ')}`,
  })
  @IsNotEmpty()
  estado: EstadoInstalacion;

  @ApiPropertyOptional({ description: 'Obligatorio al pasar a facturación (fact / legacy completada)' })
  @ValidateIf(
    (o) =>
      o.estado === EstadoInstalacion.FACT ||
      o.estado === EstadoInstalacion.COMPLETADA ||
      o.estado === EstadoInstalacion.FINALIZADA,
  )
  @IsNotEmpty({ message: 'El número de acta es obligatorio para facturación.' })
  @IsString()
  numeroActa?: string;

  @ApiPropertyOptional({ description: 'Detalle de la novedad (recomendado si estado es nove)' })
  @IsOptional()
  @IsString()
  observacionNovedad?: string;
}
