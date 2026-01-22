import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ChangeRoleDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  usuarioRolId: number;
}

