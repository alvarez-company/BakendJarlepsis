import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NumerosMedidorService } from './numeros-medidor.service';
import { NumerosMedidorController } from './numeros-medidor.controller';
import { NumeroMedidor } from './numero-medidor.entity';
import { MaterialesModule } from '../materiales/materiales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NumeroMedidor]),
    forwardRef(() => MaterialesModule),
  ],
  controllers: [NumerosMedidorController],
  providers: [NumerosMedidorService],
  exports: [NumerosMedidorService],
})
export class NumerosMedidorModule {}
