import { PartialType } from '@nestjs/swagger';
import { CreateInstalacionDto } from './create-instalacion.dto';

export class UpdateInstalacionDto extends PartialType(CreateInstalacionDto) {}

