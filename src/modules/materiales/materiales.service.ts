import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from './material.entity';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialesService {
  constructor(
    @InjectRepository(Material)
    private materialesRepository: Repository<Material>,
  ) {}

  async create(createMaterialDto: CreateMaterialDto, usuarioId?: number): Promise<Material> {
    const material = this.materialesRepository.create({
      ...createMaterialDto,
      usuarioRegistra: usuarioId,
    });
    return this.materialesRepository.save(material);
  }

  async findAll(user?: any): Promise<Material[]> {
    const allMateriales = await this.materialesRepository.find({
      relations: ['categoria', 'proveedor', 'inventario'],
    });
    
    // SuperAdmin ve todo
    if (user?.usuarioRol?.rolTipo === 'superadmin' || user?.role === 'superadmin') {
      return allMateriales;
    }
    
    // Admin ve materiales de su oficina
    if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
      return allMateriales.filter(material => material.inventario?.bodega?.oficinaId === user.usuarioOficina);
    }
    
    // Usuario Bodega ve solo materiales de su bodega
    if (user?.usuarioRol?.rolTipo === 'bodega' || user?.role === 'bodega') {
      return allMateriales.filter(material => material.inventario?.bodegaId === user.usuarioBodega);
    }
    
    return allMateriales;
  }

  async findOne(id: number): Promise<Material> {
    const material = await this.materialesRepository.findOne({
      where: { materialId: id },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }
    return material;
  }

  async findByCodigo(codigo: string): Promise<Material | null> {
    return this.materialesRepository.findOne({
      where: { materialCodigo: codigo },
      relations: ['categoria', 'proveedor', 'inventario'],
    });
  }

  async update(id: number, updateMaterialDto: UpdateMaterialDto): Promise<Material> {
    const material = await this.findOne(id);
    Object.assign(material, updateMaterialDto);
    return this.materialesRepository.save(material);
  }

  async ajustarStock(id: number, cantidad: number): Promise<Material> {
    const material = await this.findOne(id);
    material.materialStock += cantidad;
    return this.materialesRepository.save(material);
  }

  async remove(id: number): Promise<void> {
    const material = await this.findOne(id);
    await this.materialesRepository.remove(material);
  }
}

