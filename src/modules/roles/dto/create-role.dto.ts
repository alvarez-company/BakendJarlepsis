import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { RoleType } from '../role.entity';

export class CreateRoleDto {
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  rolNombre: string;

  @ApiProperty({ enum: RoleType, example: RoleType.ADMIN })
  @IsEnum(RoleType)
  rolTipo: RoleType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rolDescripcion?: string;

  @ApiProperty({ required: false, default: true })
  @IsBoolean()
  @IsOptional()
  rolEstado?: boolean;
}
