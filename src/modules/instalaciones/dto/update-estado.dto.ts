import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { EstadoInstalacion } from '../instalacion.entity';

export class UpdateEstadoInstalacionDto {
  @ApiProperty({
    enum: EstadoInstalacion,
    example: EstadoInstalacion.PENDIENTE,
    description: 'Nuevo estado de la instalación',
  })
  @IsEnum(EstadoInstalacion, {
    message: `El estado debe ser uno de: ${Object.values(EstadoInstalacion).join(', ')}`,
  })
  @IsNotEmpty()
  estado: EstadoInstalacion;
}
