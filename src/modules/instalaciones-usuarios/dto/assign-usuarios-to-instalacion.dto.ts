import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UsuarioAsignacion {
  @ApiProperty({ example: 1 })
  usuarioId: number;

  @ApiProperty({ example: 'tecnico', enum: ['tecnico', 'empleado', 'supervisor'] })
  rolEnInstalacion: string;
}

export class AssignUsuariosToInstalacionDto {
  @ApiProperty({ type: [UsuarioAsignacion] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsuarioAsignacion)
  usuarios: UsuarioAsignacion[];
}

