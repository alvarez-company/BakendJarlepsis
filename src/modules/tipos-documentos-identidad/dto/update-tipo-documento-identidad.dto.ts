import { PartialType } from '@nestjs/swagger';
import { CreateTipoDocumentoIdentidadDto } from './create-tipo-documento-identidad.dto';

export class UpdateTipoDocumentoIdentidadDto extends PartialType(CreateTipoDocumentoIdentidadDto) {}

