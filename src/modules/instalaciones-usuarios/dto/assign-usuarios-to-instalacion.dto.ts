import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class UsuarioAsignacion {
  @ApiProperty({ example: 1 })
  @IsNumber()
  usuarioId: number;

  @ApiProperty({ example: 'tecnico', enum: ['tecnico', 'empleado', 'supervisor'] })
  @IsString()
  rolEnInstalacion: string;
}

export class AssignUsuariosToInstalacionDto {
  @ApiProperty({ type: [UsuarioAsignacion] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsuarioAsignacion)
  usuarios: UsuarioAsignacion[];
}
