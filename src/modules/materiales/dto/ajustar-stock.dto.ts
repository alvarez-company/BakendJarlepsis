import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class AjustarStockDto {
  @ApiProperty({ example: 10, description: 'Cantidad a agregar o restar del stock' })
  @IsNumber()
  cantidad: number;
}

