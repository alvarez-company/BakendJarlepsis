import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NumeroMedidor, EstadoNumeroMedidor } from './numero-medidor.entity';
import { CreateNumeroMedidorDto, UpdateNumeroMedidorDto, AsignarNumerosMedidorDto } from './dto/create-numero-medidor.dto';
import { MaterialesService } from '../materiales/materiales.service';

@Injectable()
export class NumerosMedidorService {
  constructor(
    @InjectRepository(NumeroMedidor)
    private numerosMedidorRepository: Repository<NumeroMedidor>,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
  ) {}

  async create(createDto: CreateNumeroMedidorDto): Promise<NumeroMedidor> {
    // Normalizar el número de medidor (trim y lowercase) para comparación
    const numeroNormalizado = createDto.numeroMedidor.trim().toLowerCase();
    
    // Verificar que el número de medidor sea único (comparación case-insensitive)
    // Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
    const existentes = await this.numerosMedidorRepository.find();
    const existe = existentes.some(
      n => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado
    );

    if (existe) {
      throw new BadRequestException(
        `El número de medidor "${createDto.numeroMedidor}" ya existe en el sistema. Los números de medidor son únicos y nunca se repiten, incluso si ya salieron de inventario o fueron instalados.`
      );
    }

    // Verificar que el material existe
    const material = await this.materialesService.findOne(createDto.materialId);
    if (!material) {
      throw new NotFoundException(`Material con ID ${createDto.materialId} no encontrado`);
    }

    // Si el material no está marcado como medidor, marcarlo automáticamente
    if (!material.materialEsMedidor) {
      await this.materialesService.update(createDto.materialId, { materialEsMedidor: true });
    }

    const numeroMedidor = this.numerosMedidorRepository.create(createDto);
    return this.numerosMedidorRepository.save(numeroMedidor);
  }

  async crearMultiples(materialId: number, numerosMedidor: string[]): Promise<NumeroMedidor[]> {
    // Verificar que el material existe
    const material = await this.materialesService.findOne(materialId);
    if (!material) {
      throw new NotFoundException(`Material con ID ${materialId} no encontrado`);
    }

    // Si el material no está marcado como medidor, marcarlo automáticamente
    if (!material.materialEsMedidor) {
      await this.materialesService.update(materialId, { materialEsMedidor: true });
    }

    const resultados: NumeroMedidor[] = [];
    const errores: string[] = [];

    for (const numero of numerosMedidor) {
      try {
        // Normalizar el número (trim y lowercase) para comparación
        const numeroNormalizado = numero.trim().toLowerCase();
        
        // Verificar si ya existe (comparación case-insensitive)
        // Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
        const todosExistentes = await this.numerosMedidorRepository.find();
        const existe = todosExistentes.some(
          n => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado
        );

        if (existe) {
          errores.push(`El número ${numero} ya existe`);
          continue;
        }

        const nuevo = this.numerosMedidorRepository.create({
          materialId,
          numeroMedidor: numero,
          estado: EstadoNumeroMedidor.DISPONIBLE,
        });

        resultados.push(await this.numerosMedidorRepository.save(nuevo));
      } catch (error) {
        errores.push(`Error al crear número ${numero}: ${error.message}`);
      }
    }

    // Si hay errores (números duplicados), RECHAZAR completamente
    // Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
    if (errores.length > 0) {
      throw new BadRequestException(
        `Error al crear números de medidor: ${errores.join(', ')}. Los números de medidor son únicos y nunca se repiten, incluso si ya salieron de inventario o fueron instalados.`
      );
    }

    return resultados;
  }

  async findAll(paginationDto?: any): Promise<{ data: NumeroMedidor[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.numerosMedidorRepository
      .createQueryBuilder('numero')
      .leftJoinAndSelect('numero.material', 'material')
      .leftJoinAndSelect('material.categoria', 'categoria')
      .leftJoinAndSelect('numero.usuario', 'usuario')
      .leftJoinAndSelect('numero.inventarioTecnico', 'inventarioTecnico')
      .leftJoinAndSelect('numero.instalacionMaterial', 'instalacionMaterial')
      .orderBy('numero.fechaCreacion', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByMaterial(materialId: number, estado?: EstadoNumeroMedidor): Promise<NumeroMedidor[]> {
    const where: any = { materialId };
    
    // Si se especifica un estado, filtrar por él
    if (estado) {
      where.estado = estado;
    }
    
    return this.numerosMedidorRepository.find({
      where,
      relations: ['material', 'usuario', 'inventarioTecnico', 'instalacionMaterial'],
    });
  }

  async findByUsuario(usuarioId: number): Promise<NumeroMedidor[]> {
    return this.numerosMedidorRepository.find({
      where: { usuarioId },
      relations: ['material', 'material.categoria', 'inventarioTecnico', 'instalacionMaterial'],
    });
  }

  async findByInstalacion(instalacionId: number): Promise<NumeroMedidor[]> {
    return this.numerosMedidorRepository.find({
      where: { instalacionId },
      relations: ['material', 'material.categoria', 'usuario', 'instalacionMaterial'],
    });
  }

  async findByEstado(estado: EstadoNumeroMedidor): Promise<NumeroMedidor[]> {
    return this.numerosMedidorRepository.find({
      where: { estado },
      relations: ['material', 'material.categoria', 'usuario', 'inventarioTecnico', 'instalacionMaterial'],
    });
  }

  async findOne(id: number): Promise<NumeroMedidor> {
    const numeroMedidor = await this.numerosMedidorRepository.findOne({
      where: { numeroMedidorId: id },
      relations: ['material', 'material.categoria', 'usuario', 'inventarioTecnico', 'instalacionMaterial'],
    });

    if (!numeroMedidor) {
      throw new NotFoundException(`Número de medidor con ID ${id} no encontrado`);
    }

    return numeroMedidor;
  }

  async findByNumero(numeroMedidor: string): Promise<NumeroMedidor | null> {
    // Normalizar el número para búsqueda case-insensitive
    const numeroNormalizado = numeroMedidor.trim().toLowerCase();
    
    // Buscar todos y filtrar por normalización
    const todos = await this.numerosMedidorRepository.find({
      relations: ['material', 'material.categoria', 'usuario', 'inventarioTecnico', 'instalacionMaterial'],
    });
    
    return todos.find(n => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado) || null;
  }

  async update(id: number, updateDto: UpdateNumeroMedidorDto): Promise<NumeroMedidor> {
    const numeroMedidor = await this.findOne(id);

    // Si se actualiza el número, verificar que sea único
    if (updateDto.numeroMedidor && updateDto.numeroMedidor !== numeroMedidor.numeroMedidor) {
      const existente = await this.numerosMedidorRepository.findOne({
        where: { numeroMedidor: updateDto.numeroMedidor },
      });

      if (existente) {
        throw new BadRequestException(`El número de medidor ${updateDto.numeroMedidor} ya existe`);
      }
    }

    Object.assign(numeroMedidor, updateDto);
    return this.numerosMedidorRepository.save(numeroMedidor);
  }

  async asignarATecnico(
    numerosMedidorIds: number[],
    usuarioId: number,
    inventarioTecnicoId: number
  ): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
    });

    if (numerosMedidor.length !== numerosMedidorIds.length) {
      throw new NotFoundException('Algunos números de medidor no fueron encontrados');
    }

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      numero.estado = EstadoNumeroMedidor.ASIGNADO_TECNICO;
      numero.usuarioId = usuarioId;
      numero.inventarioTecnicoId = inventarioTecnicoId;
      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    return resultados;
  }

  async asignarAInstalacion(
    numerosMedidorIds: number[],
    instalacionId: number,
    instalacionMaterialId: number
  ): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
    });

    if (numerosMedidor.length !== numerosMedidorIds.length) {
      throw new NotFoundException('Algunos números de medidor no fueron encontrados');
    }

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      numero.estado = EstadoNumeroMedidor.EN_INSTALACION;
      numero.instalacionId = instalacionId;
      numero.instalacionMaterialId = instalacionMaterialId;
      // Limpiar asignación a técnico si estaba asignado
      numero.inventarioTecnicoId = null;
      numero.usuarioId = null;
      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    return resultados;
  }

  async liberarDeTecnico(numerosMedidorIds: number[]): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
    });

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      numero.estado = EstadoNumeroMedidor.DISPONIBLE;
      numero.usuarioId = null;
      numero.inventarioTecnicoId = null;
      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    return resultados;
  }

  async liberarDeInstalacion(numerosMedidorIds: number[]): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
    });

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      numero.estado = EstadoNumeroMedidor.DISPONIBLE;
      numero.instalacionId = null;
      numero.instalacionMaterialId = null;
      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    return resultados;
  }

  /**
   * Marcar números de medidor como instalados cuando una instalación se completa/finaliza
   */
  async marcarComoInstalados(instalacionId: number): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { instalacionId },
    });

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      if (numero.estado === EstadoNumeroMedidor.EN_INSTALACION) {
        numero.estado = EstadoNumeroMedidor.INSTALADO;
        resultados.push(await this.numerosMedidorRepository.save(numero));
      }
    }

    return resultados;
  }

  async remove(id: number): Promise<void> {
    const numeroMedidor = await this.findOne(id);
    await this.numerosMedidorRepository.remove(numeroMedidor);
  }

  /**
   * Verifica si un material es medidor usando el campo materialEsMedidor
   */
  private async esMaterialMedidor(materialId: number): Promise<boolean> {
    try {
      const material = await this.materialesService.findOne(materialId);
      if (!material) {
        return false;
      }

      // Usar el campo materialEsMedidor para determinar si es medidor
      return Boolean(material.materialEsMedidor);
    } catch (error) {
      console.error('Error al verificar si el material es medidor:', error);
      return false;
    }
  }

  /**
   * Obtiene números de medidor disponibles (en inventario) para un material
   */
  async obtenerDisponibles(materialId: number, cantidad: number): Promise<NumeroMedidor[]> {
    const disponibles = await this.numerosMedidorRepository.find({
      where: {
        materialId,
        estado: EstadoNumeroMedidor.DISPONIBLE,
      },
      take: cantidad,
    });

    if (disponibles.length < cantidad) {
      throw new BadRequestException(
        `No hay suficientes números de medidor disponibles. Disponibles: ${disponibles.length}, Requeridos: ${cantidad}`
      );
    }

    return disponibles;
  }
}
