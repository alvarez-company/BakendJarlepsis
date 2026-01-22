import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposInstalacionService } from './tipos-instalacion.service';
import { TiposInstalacionController } from './tipos-instalacion.controller';
import { TipoInstalacion } from './tipo-instalacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoInstalacion])],
  controllers: [TiposInstalacionController],
  providers: [TiposInstalacionService],
  exports: [TiposInstalacionService],
})
export class TiposInstalacionModule {}
