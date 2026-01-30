import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './inventario.entity';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';
import { HasMaterialsException } from '../../common/exceptions/business.exception';
import { BodegasService } from '../bodegas/bodegas.service';

@Injectable()
export class InventariosService {
  constructor(
    @InjectRepository(Inventario)
    private inventariosRepository: Repository<Inventario>,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
  ) {}

  async create(createInventarioDto: CreateInventarioDto): Promise<Inventario> {
    const inventario = this.inventariosRepository.create(createInventarioDto);
    return this.inventariosRepository.save(inventario);
  }

  async findAll(user?: any): Promise<Inventario[]> {
    const all = await this.inventariosRepository.find({
      relations: ['bodega', 'bodega.sede', 'materiales'],
      where: { inventarioEstado: true },
    });
    if (!user) return all;
    const rolTipo = user.usuarioRol?.rolTipo || user.role;
    const rolesConFiltroBodega = [
      'admin-internas',
      'admin-redes',
      'bodega-internas',
      'bodega-redes',
    ];
    if (!rolesConFiltroBodega.includes(rolTipo)) return all;
    const bodegasPermitidas = await this.bodegasService.findAll(user);
    const bodegaIds = new Set(bodegasPermitidas.map((b) => b.bodegaId));
    return all.filter((inv) => inv.bodegaId != null && bodegaIds.has(inv.bodegaId));
  }

  async findOne(id: number, user?: any): Promise<Inventario> {
    const inventario = await this.inventariosRepository.findOne({
      where: { inventarioId: id },
      relations: ['bodega', 'bodega.sede', 'materiales'],
    });
    if (!inventario) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
    }
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      const rolesConFiltroBodega = [
        'admin-internas',
        'admin-redes',
        'bodega-internas',
        'bodega-redes',
      ];
      if (rolesConFiltroBodega.includes(rolTipo)) {
        const bodegasPermitidas = await this.bodegasService.findAll(user);
        const permitido = bodegasPermitidas.some((b) => b.bodegaId === inventario.bodegaId);
        if (!permitido) {
          throw new NotFoundException(`Inventario con ID ${id} no encontrado`);
        }
      }
    }
    return inventario;
  }

  async update(id: number, updateInventarioDto: UpdateInventarioDto): Promise<Inventario> {
    const inventario = await this.findOne(id);
    Object.assign(inventario, updateInventarioDto);
    return this.inventariosRepository.save(inventario);
  }

  async findByBodega(bodegaId: number): Promise<Inventario | null> {
    const inventarios = await this.inventariosRepository.find({
      where: { bodegaId, inventarioEstado: true },
      relations: ['bodega'],
    });
    // Retornar el primer inventario activo de la bodega, o null si no hay
    return inventarios.length > 0 ? inventarios[0] : null;
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);

    // Validar que no tenga materiales asociados
    if (inventario.materiales && inventario.materiales.length > 0) {
      throw new HasMaterialsException(
        `inventario "${inventario.inventarioNombre}"`,
        inventario.materiales.length,
      );
    }

    await this.inventariosRepository.remove(inventario);
  }
}
