import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { NumeroMedidor, EstadoNumeroMedidor } from './numero-medidor.entity';
import { CreateNumeroMedidorDto, UpdateNumeroMedidorDto } from './dto/create-numero-medidor.dto';
import { MaterialesService } from '../materiales/materiales.service';
import { BodegasService } from '../bodegas/bodegas.service';

@Injectable()
export class NumerosMedidorService {
  constructor(
    @InjectRepository(NumeroMedidor)
    private numerosMedidorRepository: Repository<NumeroMedidor>,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => BodegasService))
    private readonly bodegasService: BodegasService,
  ) {}

  /** Sede del usuario: explícita o inferida desde su bodega asignada (sin filtrar permisos en findOne de bodega). */
  private async resolveUsuarioSedeScope(user?: any): Promise<number | null> {
    if (!user) return null;
    const rolTipo = (user.usuarioRol?.rolTipo || user.role || '').toLowerCase();
    if (rolTipo === 'superadmin' || rolTipo === 'gerencia') return null;
    if (user.usuarioSede != null && user.usuarioSede !== '') {
      const n = Number(user.usuarioSede);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    if (user.usuarioBodega != null && user.usuarioBodega !== '') {
      try {
        const b = await this.bodegasService.findOne(Number(user.usuarioBodega));
        if (b?.sedeId != null) return Number(b.sedeId);
      } catch {
        /* ignorar */
      }
    }
    return null;
  }

  private async sincronizarStockMaterialMedidor(materialId: number): Promise<void> {
    try {
      await this.materialesService.sincronizarStock(materialId);
    } catch (err) {
      console.error(`No se pudo sincronizar stock del material ${materialId}:`, err);
    }
  }

  /** Misma regla que el listado por centro: bodega del centro, técnico del centro, o disponible sin bodega/técnico. */
  filtrarPorCentroOperativo(numeros: NumeroMedidor[], sedeId: number): NumeroMedidor[] {
    return this.filterBySede(numeros, sedeId);
  }

  /** Todos los seriales de un material (sincronización de stock / inventario). */
  async findAllByMaterialForSync(materialId: number): Promise<NumeroMedidor[]> {
    return this.numerosMedidorRepository.find({
      where: { materialId },
      relations: ['bodega', 'usuario'],
    });
  }

  async findNumerosByMaterialIds(materialIds: number[]): Promise<NumeroMedidor[]> {
    if (!materialIds.length) return [];
    return this.numerosMedidorRepository.find({
      where: { materialId: In(materialIds) },
      relations: ['bodega', 'usuario'],
    });
  }

  async create(createDto: CreateNumeroMedidorDto): Promise<NumeroMedidor> {
    // Normalizar el número de medidor (trim y lowercase) para comparación
    const numeroNormalizado = createDto.numeroMedidor.trim().toLowerCase();

    // Verificar que el número de medidor sea único (comparación case-insensitive)
    // Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
    const existentes = await this.numerosMedidorRepository.find();
    const existe = existentes.some(
      (n) => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado,
    );

    if (existe) {
      throw new BadRequestException(
        `El número de medidor "${createDto.numeroMedidor}" ya existe en el sistema. Los números de medidor son únicos y nunca se repiten, incluso si ya salieron de inventario o fueron instalados.`,
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
    const saved = await this.numerosMedidorRepository.save(numeroMedidor);
    await this.sincronizarStockMaterialMedidor(saved.materialId);
    return saved;
  }

  async crearMultiples(
    materialId: number,
    items: Array<{ numeroMedidor: string; bodegaId?: number }>,
  ): Promise<NumeroMedidor[]> {
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

    for (const item of items) {
      const numero = item.numeroMedidor;
      try {
        // Normalizar el número (trim y lowercase) para comparación
        const numeroNormalizado = numero.trim().toLowerCase();

        // Verificar si ya existe (comparación case-insensitive)
        // Los números de medidor NUNCA se repiten, incluso si ya salieron o fueron instalados
        const todosExistentes = await this.numerosMedidorRepository.find();
        const existe = todosExistentes.some(
          (n) => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado,
        );

        if (existe) {
          errores.push(`El número ${numero} ya existe`);
          continue;
        }

        const nuevo = this.numerosMedidorRepository.create({
          materialId,
          numeroMedidor: numero,
          estado: EstadoNumeroMedidor.DISPONIBLE,
          bodegaId: item.bodegaId ?? null, // Si no se asigna bodega, queda en centro operativo
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
        `Error al crear números de medidor: ${errores.join(', ')}. Los números de medidor son únicos y nunca se repiten, incluso si ya salieron de inventario o fueron instalados.`,
      );
    }

    if (resultados.length > 0) {
      await this.sincronizarStockMaterialMedidor(materialId);
    }
    return resultados;
  }

  /** Filtra números de medidor por centro operativo (sede): bodega del centro, técnicos del centro, o disponibles sin bodega (asignables desde el centro) */
  private filterBySede(numeros: NumeroMedidor[], sedeId: number): NumeroMedidor[] {
    const sid = Number(sedeId);
    return numeros.filter((n: any) => {
      if (n.bodega?.sedeId != null && Number(n.bodega.sedeId) === sid) return true;
      if (n.usuario?.usuarioSede != null && Number(n.usuario.usuarioSede) === sid) return true;
      if (!n.bodegaId && !n.usuarioId) return true;
      return false;
    });
  }

  async findAll(
    paginationDto?: any,
    user?: any,
  ): Promise<{ data: NumeroMedidor[]; total: number; page: number; limit: number }> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 10;
    const skip = (page - 1) * limit;

    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const esSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    const sedeScope = esSuperadminOGerencia ? null : await this.resolveUsuarioSedeScope(user);

    const qb = this.numerosMedidorRepository
      .createQueryBuilder('numero')
      .leftJoinAndSelect('numero.material', 'material')
      .leftJoinAndSelect('material.categoria', 'categoria')
      .leftJoinAndSelect('numero.usuario', 'usuario')
      .leftJoinAndSelect('numero.inventarioTecnico', 'inventarioTecnico')
      .leftJoinAndSelect('numero.instalacionMaterial', 'instalacionMaterial')
      .leftJoinAndSelect('numero.bodega', 'bodega')
      .leftJoinAndSelect('bodega.sede', 'bodegaSede')
      .orderBy('numero.fechaCreacion', 'DESC');

    if (sedeScope != null) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('bodega.sedeId = :sedeScope', { sedeScope }).orWhere(
            'usuario.usuarioSede = :sedeScope',
            { sedeScope },
          ).orWhere('(numero.bodegaId IS NULL AND numero.usuarioId IS NULL)');
        }),
      );
    }

    const total = await qb.clone().getCount();
    const data = await qb.clone().skip(skip).take(limit).getMany();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findByMaterial(
    materialId: number,
    estado?: EstadoNumeroMedidor,
    user?: any,
  ): Promise<NumeroMedidor[]> {
    const where: any = { materialId };

    if (estado) {
      where.estado = estado;
    }

    let numeros = await this.numerosMedidorRepository.find({
      where,
      relations: [
        'material',
        'usuario',
        'inventarioTecnico',
        'instalacionMaterial',
        'bodega',
        'bodega.sede',
      ],
    });

    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const esSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    const sedeScope = esSuperadminOGerencia ? null : await this.resolveUsuarioSedeScope(user);

    if (sedeScope != null) {
      numeros = this.filterBySede(numeros, sedeScope);
    }
    return numeros;
  }

  async findByUsuario(usuarioId: number): Promise<NumeroMedidor[]> {
    // Buscar números de medidor donde:
    // 1. El usuarioId coincide directamente (asignados al técnico)
    // 2. O están en instalaciones donde el usuario está asignado
    const numerosAsignados = await this.numerosMedidorRepository.find({
      where: { usuarioId },
      relations: [
        'material',
        'material.categoria',
        'inventarioTecnico',
        'instalacionMaterial',
        'instalacionMaterial.instalacion',
      ],
    });

    // Buscar números de medidor en instalaciones del usuario
    // Usamos una subconsulta para encontrar instalaciones del usuario
    const numerosEnInstalaciones = await this.numerosMedidorRepository
      .createQueryBuilder('numero')
      .leftJoinAndSelect('numero.material', 'material')
      .leftJoinAndSelect('material.categoria', 'categoria')
      .leftJoinAndSelect('numero.inventarioTecnico', 'inventarioTecnico')
      .leftJoinAndSelect('numero.instalacionMaterial', 'instalacionMaterial')
      .leftJoinAndSelect('instalacionMaterial.instalacion', 'instalacion')
      .leftJoin(
        'instalaciones_usuarios',
        'iu',
        'iu.instalacionId = numero.instalacionId AND iu.activo = 1',
      )
      .where('iu.usuarioId = :usuarioId', { usuarioId })
      .andWhere('numero.instalacionId IS NOT NULL')
      .getMany();

    // Combinar y eliminar duplicados
    const todosNumeros = [...numerosAsignados, ...numerosEnInstalaciones];
    const numerosUnicos = Array.from(
      new Map(todosNumeros.map((n) => [n.numeroMedidorId, n])).values(),
    );

    // Asegurar que los números de medidor se devuelvan correctamente sin modificaciones
    const resultado = numerosUnicos.map((n) => {
      const numeroOriginal = n.numeroMedidor || '';
      const numeroLimpio = numeroOriginal.trim();
      return {
        ...n,
        numeroMedidor: numeroLimpio,
      };
    });

    return resultado;
  }

  async findByInstalacion(instalacionId: number): Promise<NumeroMedidor[]> {
    return this.numerosMedidorRepository.find({
      where: { instalacionId },
      relations: ['material', 'material.categoria', 'usuario', 'instalacionMaterial'],
    });
  }

  async findByEstado(estado: EstadoNumeroMedidor, user?: any): Promise<NumeroMedidor[]> {
    let numeros = await this.numerosMedidorRepository.find({
      where: { estado },
      relations: [
        'material',
        'material.categoria',
        'usuario',
        'inventarioTecnico',
        'instalacionMaterial',
        'bodega',
        'bodega.sede',
      ],
    });

    const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const esSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';
    const sedeScope = esSuperadminOGerencia ? null : await this.resolveUsuarioSedeScope(user);

    if (sedeScope != null) {
      numeros = this.filterBySede(numeros, sedeScope);
    }
    return numeros;
  }

  async findOne(id: number): Promise<NumeroMedidor> {
    const numeroMedidor = await this.numerosMedidorRepository.findOne({
      where: { numeroMedidorId: id },
      relations: [
        'material',
        'material.categoria',
        'usuario',
        'inventarioTecnico',
        'instalacionMaterial',
      ],
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
      relations: [
        'material',
        'material.categoria',
        'usuario',
        'inventarioTecnico',
        'instalacionMaterial',
      ],
    });

    return todos.find((n) => n.numeroMedidor.trim().toLowerCase() === numeroNormalizado) || null;
  }

  async update(id: number, updateDto: UpdateNumeroMedidorDto): Promise<NumeroMedidor> {
    const numeroMedidor = await this.findOne(id);

    if (updateDto.numeroMedidor && updateDto.numeroMedidor !== numeroMedidor.numeroMedidor) {
      const nuevoNorm = updateDto.numeroMedidor.trim().toLowerCase();
      const actuales = await this.numerosMedidorRepository.find();
      const duplicado = actuales.some(
        (n) =>
          n.numeroMedidorId !== id &&
          n.numeroMedidor.trim().toLowerCase() === nuevoNorm,
      );
      if (duplicado) {
        throw new BadRequestException(
          `El número de medidor "${updateDto.numeroMedidor}" ya existe (comparación sin distinguir mayúsculas).`,
        );
      }
    }

    Object.assign(numeroMedidor, updateDto);
    const saved = await this.numerosMedidorRepository.save(numeroMedidor);
    await this.sincronizarStockMaterialMedidor(saved.materialId);
    return saved;
  }

  async asignarATecnico(
    numerosMedidorIds: number[],
    usuarioId: number,
    inventarioTecnicoId: number,
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

    if (resultados.length > 0) {
      await this.sincronizarStockMaterialMedidor(resultados[0].materialId);
    }
    return resultados;
  }

  async asignarAInstalacion(
    numerosMedidorIds: number[],
    instalacionId: number,
    instalacionMaterialId: number,
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

    if (resultados.length > 0) {
      await this.sincronizarStockMaterialMedidor(resultados[0].materialId);
    }
    return resultados;
  }

  async liberarDeTecnico(numerosMedidorIds: number[]): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
      relations: ['inventarioTecnico', 'usuario'],
    });

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      // Solo liberar si no está en una instalación
      // Si está en instalación, mantener el estado pero limpiar referencias de técnico
      if (numero.instalacionId || numero.instalacionMaterialId) {
        // Si está en instalación, solo limpiar referencias de técnico pero mantener estado de instalación
        numero.usuarioId = null;
        numero.inventarioTecnicoId = null;
      } else {
        // Si no está en instalación, liberar completamente a disponible
        numero.estado = EstadoNumeroMedidor.DISPONIBLE;
        numero.usuarioId = null;
        numero.inventarioTecnicoId = null;
      }

      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    const materialIds = [...new Set(resultados.map((r) => r.materialId))];
    for (const mid of materialIds) {
      await this.sincronizarStockMaterialMedidor(mid);
    }
    return resultados;
  }

  async liberarDeInstalacion(numerosMedidorIds: number[]): Promise<NumeroMedidor[]> {
    const numerosMedidor = await this.numerosMedidorRepository.find({
      where: { numeroMedidorId: In(numerosMedidorIds) },
      relations: ['inventarioTecnico', 'usuario'],
    });

    const resultados: NumeroMedidor[] = [];
    for (const numero of numerosMedidor) {
      // Determinar el estado anterior basado en si tenía inventarioTecnicoId o usuarioId
      // Si tenía inventarioTecnicoId o usuarioId, devolverlo al técnico
      // Si no, devolverlo a disponible
      if (numero.inventarioTecnicoId || numero.usuarioId) {
        // Devolver al técnico (mantener inventarioTecnicoId y usuarioId si existen)
        numero.estado = EstadoNumeroMedidor.ASIGNADO_TECNICO;
        // No limpiar inventarioTecnicoId ni usuarioId para mantener la trazabilidad
      } else {
        // Devolver a disponible (sin asignación)
        numero.estado = EstadoNumeroMedidor.DISPONIBLE;
        numero.inventarioTecnicoId = null;
        numero.usuarioId = null;
      }

      // Limpiar referencias de instalación
      numero.instalacionId = null;
      numero.instalacionMaterialId = null;

      resultados.push(await this.numerosMedidorRepository.save(numero));
    }

    const materialIds = [...new Set(resultados.map((r) => r.materialId))];
    for (const mid of materialIds) {
      await this.sincronizarStockMaterialMedidor(mid);
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

    const materialIds = [...new Set(resultados.map((r) => r.materialId))];
    for (const mid of materialIds) {
      await this.sincronizarStockMaterialMedidor(mid);
    }
    return resultados;
  }

  async remove(id: number): Promise<void> {
    const numeroMedidor = await this.findOne(id);
    const materialId = numeroMedidor.materialId;
    await this.numerosMedidorRepository.remove(numeroMedidor);
    await this.sincronizarStockMaterialMedidor(materialId);
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
        `No hay suficientes números de medidor disponibles. Disponibles: ${disponibles.length}, Requeridos: ${cantidad}`,
      );
    }

    return disponibles;
  }
}
