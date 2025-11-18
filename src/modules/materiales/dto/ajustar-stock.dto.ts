import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AjustarStockDto {
  @ApiProperty({ example: 10, description: 'Cantidad a agregar o restar del stock' })
  @IsNumber()
  cantidad: number;

  @ApiProperty({ example: 1, description: 'Bodega sobre la cual ajustar el stock' })
  @IsNumber()
  bodegaId: number;
}

