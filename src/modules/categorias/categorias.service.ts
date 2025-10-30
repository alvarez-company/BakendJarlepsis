import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import { 
  HasSubcategoriesException, 
  HasMaterialsException 
} from '../../common/exceptions/business.exception';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
  ) {}

  async create(createCategoriaDto: CreateCategoriaDto): Promise<Categoria> {
    const categoria = this.categoriasRepository.create(createCategoriaDto);
    return this.categoriasRepository.save(categoria);
  }

  async findAll(): Promise<Categoria[]> {
    return this.categoriasRepository.find({
      relations: ['materiales', 'subcategorias', 'categoriaPadre'],
      where: { categoriaPadreId: null },
    });
  }

  async findSubcategorias(categoriaPadreId: number): Promise<Categoria[]> {
    return this.categoriasRepository.find({
      where: { categoriaPadreId },
      relations: ['materiales', 'subcategorias'],
    });
  }

  async findOne(id: number): Promise<Categoria> {
    const categoria = await this.categoriasRepository.findOne({
      where: { categoriaId: id },
      relations: ['materiales', 'subcategorias', 'categoriaPadre'],
    });
    if (!categoria) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: number, updateCategoriaDto: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.findOne(id);
    Object.assign(categoria, updateCategoriaDto);
    return this.categoriasRepository.save(categoria);
  }

  async remove(id: number): Promise<void> {
    const categoria = await this.findOne(id);
    
    // Validar que no tenga subcategorías
    if (categoria.subcategorias && categoria.subcategorias.length > 0) {
      throw new HasSubcategoriesException(categoria.categoriaNombre, categoria.subcategorias.length);
    }
    
    // Validar que no tenga materiales
    if (categoria.materiales && categoria.materiales.length > 0) {
      throw new HasMaterialsException(categoria.categoriaNombre, categoria.materiales.length);
    }
    
    await this.categoriasRepository.remove(categoria);
  }
}

