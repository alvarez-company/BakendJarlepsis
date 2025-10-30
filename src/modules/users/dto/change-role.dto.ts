import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  usuarioRolId: number;
}

