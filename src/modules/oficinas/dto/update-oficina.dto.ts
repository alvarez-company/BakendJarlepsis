import { PartialType } from '@nestjs/swagger';
import { CreateOficinaDto } from './create-oficina.dto';

export class UpdateOficinaDto extends PartialType(CreateOficinaDto) {}

