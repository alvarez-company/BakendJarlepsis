import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEstadoUsuarioDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  usuarioEstado: boolean;
}
