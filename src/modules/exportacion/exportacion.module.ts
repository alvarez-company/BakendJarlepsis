import { Module } from '@nestjs/common';
import { ExportacionService } from './exportacion.service';

@Module({
  providers: [ExportacionService],
  exports: [ExportacionService],
})
export class ExportacionModule {}

