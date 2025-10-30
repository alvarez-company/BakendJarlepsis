import { PartialType } from '@nestjs/swagger';
import { CreateTrasladoDto } from './create-traslado.dto';

export class UpdateTrasladoDto extends PartialType(CreateTrasladoDto) {}

