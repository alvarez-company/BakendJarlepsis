import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { HasMaterialsException } from '../../common/exceptions/business.exception';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private proveedoresRepository: Repository<Proveedor>,
  ) {}

  async create(createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    const proveedor = this.proveedoresRepository.create(createProveedorDto);
    return this.proveedoresRepository.save(proveedor);
  }

  async findAll(): Promise<Proveedor[]> {
    return this.proveedoresRepository.find({ relations: ['materiales'] });
  }

  async findOne(id: number): Promise<Proveedor> {
    const proveedor = await this.proveedoresRepository.findOne({
      where: { proveedorId: id },
      relations: ['materiales'],
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }
    return proveedor;
  }

  /** Listados: sin relación `materiales` (mucho más liviano que `findOne`). */
  async findSummariesByIds(ids: number[]): Promise<Map<number, Partial<Proveedor> & { proveedorId: number }>> {
    const uniq = [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!uniq.length) return new Map();
    const rows = await this.proveedoresRepository.find({
      where: { proveedorId: In(uniq) },
      select: [
        'proveedorId',
        'proveedorNombre',
        'proveedorNit',
        'proveedorTelefono',
        'proveedorEmail',
        'proveedorDireccion',
        'proveedorContacto',
        'proveedorEstado',
      ],
    });
    return new Map(rows.map((r) => [r.proveedorId, r]));
  }

  async update(id: number, updateProveedorDto: UpdateProveedorDto): Promise<Proveedor> {
    const proveedor = await this.findOne(id);
    Object.assign(proveedor, updateProveedorDto);
    return this.proveedoresRepository.save(proveedor);
  }

  async remove(id: number): Promise<void> {
    const proveedor = await this.findOne(id);

    // Validar que no tenga materiales asociados
    if (proveedor.materiales && proveedor.materiales.length > 0) {
      throw new HasMaterialsException(
        `proveedor "${proveedor.proveedorNombre}"`,
        proveedor.materiales.length,
      );
    }

    await this.proveedoresRepository.remove(proveedor);
  }
}
