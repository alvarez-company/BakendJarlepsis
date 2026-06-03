import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstalacionMaterial } from './instalacion-material.entity';
import {
  CreateInstalacionMaterialDto,
  UpdateInstalacionMaterialDto,
  AssignMaterialesToInstalacionDto,
} from './dto/create-instalacion-material.dto';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { MaterialesService } from '../materiales/materiales.service';
import { instalacionPermiteTecnicoGestionarMaterialesUtilizados } from '../instalaciones/estado-instalacion.codes';
import { EstadoNumeroMedidor } from '../numeros-medidor/numero-medidor.entity';

@Injectable()
export class InstalacionesMaterialesService {
  constructor(
    @InjectRepository(InstalacionMaterial)
    private instalacionMaterialRepository: Repository<InstalacionMaterial>,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
  ) {}

  /**
   * Inventario técnico: si quien registra es técnico/soldador asignado a la obra, se descuenta a él.
   * Si no (p. ej. admin/almacenista), se usa el primer técnico o soldador activo en la instalación.
   */
  private resolveTecnicoInventarioTarget(instalacion: any, requestingUser?: any): number | null {
    const asignados = instalacion?.usuariosAsignados;
    if (!Array.isArray(asignados) || asignados.length === 0) {
      return null;
    }

    const reqUid =
      requestingUser?.usuarioId != null ? Number(requestingUser.usuarioId) : Number.NaN;
    const rolReq = String(
      requestingUser?.usuarioRol?.rolTipo || requestingUser?.role || '',
    ).toLowerCase();

    if (Number.isFinite(reqUid) && reqUid > 0 && (rolReq === 'tecnico' || rolReq === 'soldador')) {
      const yo = asignados.find((u: any) => {
        const id = Number(u.usuarioId ?? u.usuario?.usuarioId);
        const activo = u.activo !== undefined ? Boolean(u.activo) : true;
        return activo && Number.isFinite(id) && id === reqUid;
      });
      if (yo) {
        return reqUid;
      }
    }

    for (const u of asignados) {
      const activo = u.activo !== undefined ? Boolean(u.activo) : true;
      if (!activo) continue;
      const usuario = u.usuario || u;
      if (!usuario?.usuarioId) continue;
      const r = String(usuario.usuarioRol?.rolTipo ?? usuario.rolTipo ?? '').toLowerCase();
      const rolEn = String(u.rolEnInstalacion ?? '').toLowerCase();
      if (r === 'tecnico' || r === 'soldador' || rolEn === 'tecnico' || rolEn === 'soldador') {
        return Number(usuario.usuarioId);
      }
    }
    return null;
  }

  /** Técnico/soldador: solo en AVAN o NOVE. Otros roles no aplican esta restricción aquí. */
  private assertTecnicoPuedeGestionarMateriales(
    instalacionEstado: string | null | undefined,
    requestingUser?: any,
  ): void {
    const rol = String(
      requestingUser?.usuarioRol?.rolTipo || requestingUser?.role || '',
    ).toLowerCase();
    if (rol !== 'tecnico' && rol !== 'soldador') {
      return;
    }
    if (!instalacionPermiteTecnicoGestionarMaterialesUtilizados(instalacionEstado)) {
      throw new BadRequestException(
        'Solo puede registrar, editar o eliminar materiales durante avance de obra o novedad. En certificación, facturación u otros estados de cierre solo intervienen roles administrativos.',
      );
    }
  }

  async create(
    createDto: CreateInstalacionMaterialDto,
    requestingUser?: any,
  ): Promise<InstalacionMaterial> {
    // Validar que solo se permita un medidor por instalación
    const material = await this.materialesService.findOne(createDto.materialId);
    const esMedidor = Boolean(material?.materialEsMedidor);

    if (esMedidor) {
      // Verificar si ya existe un medidor en esta instalación
      const materialesExistentes = await this.instalacionMaterialRepository.find({
        where: { instalacionId: createDto.instalacionId },
        relations: ['material'],
      });

      const tieneMedidor = materialesExistentes.some(
        (mat) => mat.material && Boolean(mat.material.materialEsMedidor),
      );

      if (tieneMedidor) {
        throw new BadRequestException(
          'Solo se puede asignar un medidor por instalación. Ya existe un medidor asignado a esta instalación.',
        );
      }

      // Validar que la cantidad sea exactamente 1
      if (Number(createDto.cantidad) !== 1) {
        throw new BadRequestException(
          'Para medidores, la cantidad debe ser exactamente 1. Solo se puede asignar un medidor por instalación.',
        );
      }
    }

    const instalacionParaEstado = await this.instalacionesService.findOne(
      createDto.instalacionId,
      requestingUser,
    );
    this.assertTecnicoPuedeGestionarMateriales(instalacionParaEstado?.estado, requestingUser);

    await this.validarStockDisponibleTecnico(
      instalacionParaEstado,
      createDto.materialId,
      createDto.cantidad,
      esMedidor,
      requestingUser,
    );

    const instalacionMaterial = this.instalacionMaterialRepository.create(createDto);
    const materialGuardado = await this.instalacionMaterialRepository.save(instalacionMaterial);

    await this.descontarMaterialDelTecnico(
      createDto.instalacionId,
      createDto.materialId,
      createDto.cantidad,
      requestingUser,
    );

    // Manejar números de medidor si el material es de categoría "medidor"
    try {
      // Si se proporcionaron números de medidor específicos, usarlos (el servicio marcará automáticamente el material como medidor)
      if (
        createDto.numerosMedidor &&
        createDto.numerosMedidor.length > 0 &&
        createDto.cantidad > 0
      ) {
        const numerosMedidorIds: number[] = [];

        const instalacionParaNumeros = await this.instalacionesService.findOne(
          createDto.instalacionId,
          requestingUser,
        );
        const tecnicoInventarioId = this.resolveTecnicoInventarioTarget(
          instalacionParaNumeros,
          requestingUser,
        );

        for (const numeroMedidor of createDto.numerosMedidor) {
          const numeroMedidorParaGuardar = numeroMedidor?.trim() || numeroMedidor;
          if (!numeroMedidorParaGuardar) continue;

          const numeroMedidorEntity =
            await this.numerosMedidorService.findByNumero(numeroMedidorParaGuardar);

          if (!numeroMedidorEntity) {
            throw new BadRequestException(
              `El número de medidor "${numeroMedidorParaGuardar}" no existe en el inventario.`,
            );
          }
          if (numeroMedidorEntity.materialId !== createDto.materialId) {
            throw new BadRequestException(
              `El número de medidor "${numeroMedidorParaGuardar}" no corresponde al material seleccionado.`,
            );
          }

          if (numeroMedidorEntity.estado !== EstadoNumeroMedidor.ASIGNADO_TECNICO) {
            throw new BadRequestException(
              `El número de medidor "${numeroMedidorParaGuardar}" no está asignado a un técnico.`,
            );
          }
          if (
            tecnicoInventarioId == null ||
            Number(numeroMedidorEntity.usuarioId) !== Number(tecnicoInventarioId)
          ) {
            throw new BadRequestException(
              `El número de medidor "${numeroMedidorParaGuardar}" no pertenece a tu inventario de técnico.`,
            );
          }

          numerosMedidorIds.push(numeroMedidorEntity.numeroMedidorId);
        }

        if (numerosMedidorIds.length > 0) {
          await this.numerosMedidorService.asignarAInstalacion(
            numerosMedidorIds,
            createDto.instalacionId,
            materialGuardado.instalacionMaterialId,
          );
        }
      } else {
        // Si no se proporcionaron números, obtener números asignados al técnico automáticamente
        const instalacion = await this.instalacionesService.findOne(createDto.instalacionId);
        const tecnicoId = this.resolveTecnicoInventarioTarget(instalacion, requestingUser);
        if (instalacion && tecnicoId != null) {
          // Obtener números de medidor asignados al técnico para este material
          const numerosMedidorTecnico = await this.numerosMedidorService.findByUsuario(tecnicoId);
          const numerosDelMaterial = numerosMedidorTecnico.filter(
            (n) => n.materialId === createDto.materialId && n.estado === 'asignado_tecnico',
          );

          // Asignar los primeros números disponibles a la instalación
          const cantidadNumerica = Math.round(Number(createDto.cantidad || 0));
          const numerosAAsignar = numerosDelMaterial.slice(0, cantidadNumerica);

          if (numerosAAsignar.length > 0) {
            await this.numerosMedidorService.asignarAInstalacion(
              numerosAAsignar.map((n) => n.numeroMedidorId),
              createDto.instalacionId,
              materialGuardado.instalacionMaterialId,
            );
          }
        }
      }
    } catch (error) {
      console.error(`Error al manejar números de medidor en instalación:`, error);
      // No lanzar error para no interrumpir la creación del material
    }

    return materialGuardado;
  }

  async asignarMateriales(
    instalacionId: number,
    dto: AssignMaterialesToInstalacionDto,
    requestingUser?: any,
  ): Promise<InstalacionMaterial[]> {
    // Validar que solo se permita un medidor por instalación
    const materialesMedidor = [];
    for (const materialDto of dto.materiales) {
      const material = await this.materialesService.findOne(materialDto.materialId);
      if (material && Boolean(material.materialEsMedidor)) {
        materialesMedidor.push(materialDto);

        // Validar que la cantidad sea exactamente 1
        if (Number(materialDto.cantidad) !== 1) {
          throw new BadRequestException(
            `Para medidores, la cantidad debe ser exactamente 1. El material "${material.materialNombre}" tiene cantidad ${materialDto.cantidad}.`,
          );
        }
      }
    }

    if (materialesMedidor.length > 1) {
      throw new BadRequestException(
        'Solo se puede asignar un medidor por instalación. Se intentó asignar más de un medidor.',
      );
    }

    const instalacionAsignar = await this.instalacionesService.findOne(
      instalacionId,
      requestingUser,
    );
    this.assertTecnicoPuedeGestionarMateriales(instalacionAsignar?.estado, requestingUser);

    const existentes = await this.instalacionMaterialRepository.find({ where: { instalacionId } });
    for (const m of existentes) {
      await this.remove(m.instalacionMaterialId, requestingUser);
    }

    const materiales: InstalacionMaterial[] = [];
    for (const material of dto.materiales) {
      const creado = await this.create(
        {
          instalacionId,
          materialId: material.materialId,
          cantidad: material.cantidad,
          observaciones: material.observaciones,
          numerosMedidor: material.numerosMedidor,
        },
        requestingUser,
      );
      materiales.push(creado);
    }

    return materiales;
  }

  /**
   * Suma de cantidades consumidas en instalaciones por material (excluye desaprobados).
   * Misma visibilidad por rol/sede que el listado de instalaciones.
   */
  async findTotalesPorMaterial(user?: any, vistaSedeId?: number): Promise<Record<number, number>> {
    const { sql: whereExtra, params } = this.buildInstalacionMaterialTotalesWhere(user, vistaSedeId);
    const sql = `
      SELECT im.materialId AS materialId, SUM(im.cantidad) AS total
      FROM instalaciones_materiales im
      INNER JOIN instalaciones i ON i.instalacionId = im.instalacionId
      WHERE (im.materialAprobado IS NULL OR im.materialAprobado = 1)
      ${whereExtra}
      GROUP BY im.materialId
    `;
    const rows = await this.instalacionMaterialRepository.query(sql, params);
    const out: Record<number, number> = {};
    for (const r of rows || []) {
      const mid = Number(r.materialId);
      if (!Number.isFinite(mid) || mid <= 0) continue;
      out[mid] = Number(r.total || 0);
    }
    return out;
  }

  private buildInstalacionMaterialTotalesWhere(
    user?: any,
    vistaSedeId?: number,
  ): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    const rolTipo = String(user?.usuarioRol?.rolTipo || user?.role || '').toLowerCase();
    const esGlobal = !user || rolTipo === 'superadmin' || rolTipo === 'gerencia';
    const rawSede = user?.usuarioSede;
    const usuarioSede =
      rawSede != null && rawSede !== '' && Number(rawSede) !== 0 ? Number(rawSede) : null;

    let sedeScope: number | null = null;
    const sid = vistaSedeId != null ? Number(vistaSedeId) : NaN;
    if (Number.isFinite(sid) && sid > 0) {
      sedeScope = sid;
    } else if (
      !esGlobal &&
      (rolTipo === 'admin' || rolTipo === 'almacenista') &&
      usuarioSede != null
    ) {
      sedeScope = usuarioSede;
    }

    if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
      if (user?.usuarioId) {
        clauses.push(`EXISTS (
          SELECT 1 FROM instalaciones_usuarios iu
          WHERE iu.instalacionId = i.instalacionId AND iu.usuarioId = ?
        )`);
        params.push(Number(user.usuarioId));
      } else {
        clauses.push('1 = 0');
      }
    } else if (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes') {
      if (user?.usuarioBodega) {
        clauses.push('i.bodegaId = ?');
        params.push(Number(user.usuarioBodega));
      } else {
        clauses.push('1 = 0');
      }
    } else if (rolTipo === 'admin-internas' && usuarioSede != null) {
      clauses.push(`(
        EXISTS (
          SELECT 1 FROM bodegas b
          WHERE b.bodegaId = i.bodegaId AND b.sedeId = ? AND b.bodegaTipo = 'internas'
        )
        OR (
          i.bodegaId IS NULL
          AND i.instalacionTipo = 'internas'
          AND (
            i.usuarioRegistra = ?
            OR EXISTS (
              SELECT 1 FROM usuarios ur
              WHERE ur.usuarioId = i.usuarioRegistra AND ur.usuarioSede = ?
            )
          )
        )
      )`);
      params.push(usuarioSede, Number(user.usuarioId), usuarioSede);
    } else if (rolTipo === 'admin-redes' && usuarioSede != null) {
      clauses.push(`(
        EXISTS (
          SELECT 1 FROM bodegas b
          WHERE b.bodegaId = i.bodegaId AND b.sedeId = ? AND b.bodegaTipo = 'redes'
        )
        OR (
          i.bodegaId IS NULL
          AND i.instalacionTipo = 'redes'
          AND (
            i.usuarioRegistra = ?
            OR EXISTS (
              SELECT 1 FROM usuarios ur
              WHERE ur.usuarioId = i.usuarioRegistra AND ur.usuarioSede = ?
            )
          )
        )
      )`);
      params.push(usuarioSede, Number(user.usuarioId), usuarioSede);
    } else if (sedeScope != null && sedeScope > 0) {
      clauses.push(`(
        EXISTS (
          SELECT 1 FROM bodegas b
          WHERE b.bodegaId = i.bodegaId AND b.sedeId = ?
        )
        OR EXISTS (
          SELECT 1 FROM instalaciones_usuarios iu
          INNER JOIN usuarios u ON u.usuarioId = iu.usuarioId
          WHERE iu.instalacionId = i.instalacionId AND u.usuarioSede = ?
        )
        OR EXISTS (
          SELECT 1 FROM usuarios ur
          WHERE ur.usuarioId = i.usuarioRegistra AND ur.usuarioSede = ?
        )
      )`);
      params.push(sedeScope, sedeScope, sedeScope);
    }

    if (clauses.length === 0) {
      return { sql: '', params };
    }
    return { sql: ` AND ${clauses.join(' AND ')}`, params };
  }

  async findAll(): Promise<InstalacionMaterial[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    return this.instalacionMaterialRepository.find({
      relations: ['material'],
    });
  }

  async findByInstalacion(instalacionId: number): Promise<InstalacionMaterial[]> {
    const materiales = await this.instalacionMaterialRepository.find({
      where: { instalacionId },
      relations: ['material', 'material.categoria', 'material.unidadMedida', 'numerosMedidor'],
    });

    // Obtener todos los números de medidor de la instalación para asegurar que se incluyan todos
    const todosNumerosMedidor = await this.numerosMedidorService.findByInstalacion(instalacionId);

    // Transformar los números de medidor a un array de strings para facilitar el uso en el frontend
    return materiales.map((material) => {
      // Primero intentar obtener de la relación cargada
      let numerosMedidorStrings: string[] = [];

      if (material.numerosMedidor && Array.isArray(material.numerosMedidor)) {
        // Filtrar por instalacionMaterialId para asegurar que solo se incluyan los números de este material
        const numerosFiltrados = material.numerosMedidor.filter((num: any) => {
          return num.instalacionMaterialId === material.instalacionMaterialId;
        });

        numerosMedidorStrings = numerosFiltrados
          .map((num: any) => {
            // Asegurar que se obtenga el número correcto
            return (num.numeroMedidor || (typeof num === 'string' ? num : '')).trim();
          })
          .filter((num: string) => num && num !== '');
      }

      // Si no se encontraron números en la relación, buscar en todosNumerosMedidor
      if (numerosMedidorStrings.length === 0) {
        const numerosDelMaterial = todosNumerosMedidor.filter(
          (n) => n.instalacionMaterialId === material.instalacionMaterialId,
        );

        if (numerosDelMaterial.length > 0) {
          numerosMedidorStrings = numerosDelMaterial
            .map((n) => (n.numeroMedidor || '').trim())
            .filter((n) => n && n !== '');
        }
      }

      return {
        ...material,
        numerosMedidor: numerosMedidorStrings,
      };
    });
  }

  async findByMaterial(materialId: number): Promise<InstalacionMaterial[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    return this.instalacionMaterialRepository.find({
      where: { materialId },
    });
  }

  async findOne(id: number): Promise<InstalacionMaterial> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    const instalacionMaterial = await this.instalacionMaterialRepository.findOne({
      where: { instalacionMaterialId: id },
      relations: ['material'],
    });

    if (!instalacionMaterial) {
      throw new NotFoundException(`Material de instalación con ID ${id} no encontrado`);
    }

    return instalacionMaterial;
  }

  async update(
    id: number,
    updateDto: UpdateInstalacionMaterialDto,
    requestingUser?: any,
  ): Promise<InstalacionMaterial> {
    const instalacionMaterial = await this.findOne(id);
    const instalacionUpdate = await this.instalacionesService.findOne(
      instalacionMaterial.instalacionId,
      requestingUser,
    );
    this.assertTecnicoPuedeGestionarMateriales(instalacionUpdate?.estado, requestingUser);

    const cantidadAnterior = Number(instalacionMaterial.cantidad || 0);
    const cantidadNueva =
      updateDto.cantidad !== undefined ? Number(updateDto.cantidad) : cantidadAnterior;
    const diferencia = cantidadNueva - cantidadAnterior;

    if (updateDto.cantidad !== undefined && cantidadNueva < 0) {
      throw new BadRequestException('La cantidad no puede ser negativa.');
    }

    const material = await this.materialesService.findOne(instalacionMaterial.materialId);
    const esMedidor = await this.esMaterialMedidor(material);

    if (esMedidor && updateDto.cantidad !== undefined && cantidadNueva !== 1) {
      throw new BadRequestException(
        'Para medidores, la cantidad debe ser exactamente 1 por instalación.',
      );
    }

    if (diferencia !== 0 && instalacionMaterial.instalacionId) {
      await this.validarCambioCantidadConInventarioTecnico(
        instalacionMaterial,
        instalacionUpdate,
        diferencia,
        esMedidor,
        requestingUser,
      );
    }

    if (diferencia !== 0 && instalacionMaterial.instalacionId) {
      await this.aplicarCambioCantidadInventarioTecnico(
        instalacionMaterial,
        instalacionUpdate,
        diferencia,
        esMedidor,
        requestingUser,
      );
    }

    Object.assign(instalacionMaterial, updateDto);
    return this.instalacionMaterialRepository.save(instalacionMaterial);
  }

  private async validarCambioCantidadConInventarioTecnico(
    instalacionMaterial: InstalacionMaterial,
    instalacion: any,
    diferencia: number,
    esMedidor: boolean,
    requestingUser?: any,
  ): Promise<void> {
    if (diferencia <= 0) {
      return;
    }
    await this.validarStockDisponibleTecnico(
      instalacion,
      instalacionMaterial.materialId,
      Math.round(diferencia),
      esMedidor,
      requestingUser,
    );
  }

  /** Valida stock (y seriales si es medidor) del técnico asignado a la instalación. */
  private async validarStockDisponibleTecnico(
    instalacion: any,
    materialId: number,
    cantidadRequerida: number,
    esMedidor: boolean,
    requestingUser?: any,
  ): Promise<void> {
    const unidades = Math.round(Number(cantidadRequerida || 0));
    if (unidades <= 0) {
      return;
    }

    const tecnicoId = this.resolveTecnicoInventarioTarget(instalacion, requestingUser);
    if (tecnicoId == null) {
      throw new BadRequestException(
        'No se encontró un técnico asignado a la instalación para validar el inventario.',
      );
    }

    const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
    const inventarioItem = inventarioTecnico.find(
      (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
    );
    const stockDisponible = Number(inventarioItem?.cantidad || 0);

    if (stockDisponible < unidades) {
      throw new BadRequestException(
        `El técnico no tiene stock suficiente. Disponible en inventario: ${Math.round(stockDisponible)}, se requieren ${unidades} unidad(es).`,
      );
    }

    if (esMedidor) {
      const numerosMedidorTecnico = await this.numerosMedidorService.findByUsuario(tecnicoId);
      const serialesDisponibles = numerosMedidorTecnico.filter(
        (n) =>
          n.materialId === materialId &&
          n.estado === EstadoNumeroMedidor.ASIGNADO_TECNICO &&
          Number(n.usuarioId) === Number(tecnicoId),
      );

      if (serialesDisponibles.length < unidades) {
        throw new BadRequestException(
          `El técnico no tiene números de medidor disponibles. Seriales en inventario: ${serialesDisponibles.length}, se requieren ${unidades}.`,
        );
      }
    }
  }

  /**
   * Ajusta inventario del técnico y seriales al cambiar la cantidad registrada en la instalación.
   */
  private async aplicarCambioCantidadInventarioTecnico(
    instalacionMaterial: InstalacionMaterial,
    instalacion: any,
    diferencia: number,
    esMedidor: boolean,
    requestingUser?: any,
  ): Promise<void> {
    const tecnicoId = this.resolveTecnicoInventarioTarget(instalacion, requestingUser);
    if (tecnicoId == null) {
      return;
    }

    const unidades = Math.round(Math.abs(diferencia));

    if (diferencia > 0) {
      await this.descontarMaterialDelTecnico(
        instalacionMaterial.instalacionId,
        instalacionMaterial.materialId,
        unidades,
        requestingUser,
        { validarStock: true },
      );

      if (esMedidor) {
        const numerosMedidorTecnico = await this.numerosMedidorService.findByUsuario(tecnicoId);
        const numerosDisponiblesTecnico = numerosMedidorTecnico.filter(
          (n) =>
            n.materialId === instalacionMaterial.materialId &&
            n.estado === EstadoNumeroMedidor.ASIGNADO_TECNICO &&
            Number(n.usuarioId) === Number(tecnicoId),
        );
        const numerosAAsignar = numerosDisponiblesTecnico.slice(0, unidades);

        if (numerosAAsignar.length < unidades) {
          throw new BadRequestException(
            `No hay suficientes números de medidor del técnico para completar el aumento de cantidad.`,
          );
        }

        await this.numerosMedidorService.asignarAInstalacion(
          numerosAAsignar.map((n) => n.numeroMedidorId),
          instalacionMaterial.instalacionId,
          instalacionMaterial.instalacionMaterialId,
        );
      }
      return;
    }

    if (diferencia < 0) {
      await this.devolverMaterialAlTecnico(
        instalacionMaterial.instalacionId,
        instalacionMaterial.materialId,
        unidades,
        requestingUser,
      );

      if (esMedidor) {
        const numerosMedidorInstalacion = await this.numerosMedidorService.findByInstalacion(
          instalacionMaterial.instalacionId,
        );
        const numerosDelMaterial = numerosMedidorInstalacion.filter(
          (n) =>
            n.materialId === instalacionMaterial.materialId &&
            n.instalacionMaterialId === instalacionMaterial.instalacionMaterialId &&
            (n.estado === EstadoNumeroMedidor.EN_INSTALACION ||
              n.estado === EstadoNumeroMedidor.INSTALADO),
        );

        const numerosParaLiberar = numerosDelMaterial.slice(0, unidades);
        if (numerosParaLiberar.length > 0) {
          const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
          const inventarioItem = inventarioTecnico.find(
            (inv) =>
              inv.materialId === instalacionMaterial.materialId && inv.usuarioId === tecnicoId,
          );

          if (inventarioItem) {
            for (const numero of numerosParaLiberar) {
              await this.numerosMedidorService.update(numero.numeroMedidorId, {
                estado: EstadoNumeroMedidor.ASIGNADO_TECNICO as any,
                instalacionId: null,
                instalacionMaterialId: null,
                usuarioId: tecnicoId,
                inventarioTecnicoId: inventarioItem.inventarioTecnicoId,
              });
            }
          } else {
            await this.numerosMedidorService.liberarDeInstalacion(
              numerosParaLiberar.map((n) => n.numeroMedidorId),
            );
          }
        }
      }
    }
  }

  async remove(id: number, requestingUser?: any): Promise<void> {
    const instalacionMaterial = await this.findOne(id);
    const instalacionId = instalacionMaterial.instalacionId;
    const instalacionRemove = await this.instalacionesService.findOne(
      instalacionId,
      requestingUser,
    );
    this.assertTecnicoPuedeGestionarMateriales(instalacionRemove?.estado, requestingUser);

    const materialId = instalacionMaterial.materialId;
    const cantidad = instalacionMaterial.cantidad;

    // Liberar números de medidor asignados a esta instalación
    try {
      const numerosMedidorInstalacion =
        await this.numerosMedidorService.findByInstalacion(instalacionId);
      const numerosDelMaterial = numerosMedidorInstalacion.filter(
        (n) =>
          n.materialId === materialId &&
          n.instalacionMaterialId === instalacionMaterial.instalacionMaterialId,
      );

      if (numerosDelMaterial.length > 0) {
        // Liberar de instalación primero (esto devolverá al técnico si venían del técnico, o a disponible)
        await this.numerosMedidorService.liberarDeInstalacion(
          numerosDelMaterial.map((n) => n.numeroMedidorId),
        );
      }
    } catch (error) {
      console.error(
        `Error al liberar números de medidor al eliminar material de instalación:`,
        error,
      );
      // Continuar con la eliminación aunque falle la liberación
    }

    // Devolver el material al inventario del técnico cuando se elimina
    await this.devolverMaterialAlTecnico(instalacionId, materialId, cantidad, requestingUser);

    await this.instalacionMaterialRepository.remove(instalacionMaterial);
  }

  async removeByInstalacion(instalacionId: number): Promise<void> {
    const materiales = await this.instalacionMaterialRepository.find({
      where: { instalacionId },
    });
    for (const m of materiales) {
      await this.remove(m.instalacionMaterialId, undefined);
    }
  }

  async aprobarMaterial(id: number, aprobado: boolean): Promise<InstalacionMaterial> {
    const instalacionMaterial = await this.findOne(id);
    instalacionMaterial.materialAprobado = aprobado;
    return this.instalacionMaterialRepository.save(instalacionMaterial);
  }

  /**
   * Descontar material del inventario del técnico asignado a una instalación
   */
  private async descontarMaterialDelTecnico(
    instalacionId: number,
    materialId: number,
    cantidad: number,
    requestingUser?: any,
    options?: { validarStock?: boolean },
  ): Promise<void> {
    const instalacion = await this.instalacionesService.findOne(instalacionId);
    const tecnicoId = this.resolveTecnicoInventarioTarget(instalacion, requestingUser);
    if (tecnicoId == null) {
      if (options?.validarStock) {
        throw new BadRequestException(
          'No se encontró un técnico asignado a la instalación para descontar del inventario.',
        );
      }
      return;
    }
    const cantidadNumerica = Math.round(Number(cantidad || 0));

    if (cantidadNumerica <= 0) {
      return;
    }

    const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
    const inventarioItem = inventarioTecnico.find(
      (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
    );

    const cantidadActual = Number(inventarioItem?.cantidad || 0);

    if (options?.validarStock && cantidadActual < cantidadNumerica) {
      throw new BadRequestException(
        `Stock insuficiente en inventario del técnico. Disponible: ${Math.round(cantidadActual)}, requerido: ${cantidadNumerica}.`,
      );
    }

    if (inventarioItem) {
      const nuevaCantidad = Math.max(0, cantidadActual - cantidadNumerica);
      await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
        cantidad: nuevaCantidad,
      });
    } else if (options?.validarStock) {
      throw new BadRequestException(
        'El técnico no tiene este material en su inventario para descontar la cantidad solicitada.',
      );
    }
  }

  /**
   * Devolver material al inventario del técnico cuando se elimina de una instalación
   */
  private async devolverMaterialAlTecnico(
    instalacionId: number,
    materialId: number,
    cantidad: number,
    requestingUser?: any,
  ): Promise<void> {
    try {
      const instalacion = await this.instalacionesService.findOne(instalacionId);
      const tecnicoId = this.resolveTecnicoInventarioTarget(instalacion, requestingUser);
      if (tecnicoId == null) {
        return;
      }
      const cantidadNumerica = Math.round(Number(cantidad || 0));

      if (cantidadNumerica <= 0) {
        return;
      }

      // Obtener el inventario del técnico para este material
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
      const inventarioItem = inventarioTecnico.find(
        (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
      );

      if (inventarioItem) {
        const cantidadActual = Number(inventarioItem.cantidad || 0);
        const nuevaCantidad = cantidadActual + cantidadNumerica;

        await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
          cantidad: nuevaCantidad,
        });
      } else {
        // Si no existe el registro en el inventario, crearlo
        await this.inventarioTecnicoService.create({
          usuarioId: tecnicoId,
          materialId: materialId,
          cantidad: cantidadNumerica,
        });
      }
    } catch (error) {
      console.error(
        `[InstalacionesMaterialesService] Error al devolver material al técnico:`,
        error,
      );
      // No lanzar error para no interrumpir la eliminación del material
    }
  }

  /**
   * Verifica si un material es medidor usando el campo materialEsMedidor
   */
  private async esMaterialMedidor(material: any): Promise<boolean> {
    if (!material) {
      return false;
    }

    // Usar el campo materialEsMedidor para determinar si es medidor
    return Boolean(material.materialEsMedidor);
  }
}
