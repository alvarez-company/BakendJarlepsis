import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposDocumentosIdentidadController } from './tipos-documentos-identidad.controller';
import { TiposDocumentosIdentidadService } from './tipos-documentos-identidad.service';
import { TipoDocumentoIdentidad } from './tipo-documento-identidad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoDocumentoIdentidad])],
  controllers: [TiposDocumentosIdentidadController],
  providers: [TiposDocumentosIdentidadService],
  exports: [TiposDocumentosIdentidadService],
})
export class TiposDocumentosIdentidadModule {}
