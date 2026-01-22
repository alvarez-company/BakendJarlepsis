import { PartialType } from '@nestjs/swagger';
import { CreateClasificacionDto } from './create-clasificacion.dto';

export class UpdateClasificacionDto extends PartialType(CreateClasificacionDto) {}
