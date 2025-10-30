import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEstadoDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  usuarioEstado: boolean;
}

