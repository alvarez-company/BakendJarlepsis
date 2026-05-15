import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MovimientoInventario,
  TipoMovimiento,
  EstadoMovimiento,
} from './movimiento-inventario.entity';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { ProveedoresService } from '../proveedores/proveedores.service';
import { UsersService } from '../users/users.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';
import { AuditoriaInventarioService } from '../auditoria-inventario/auditoria-inventario.service';
import { TipoCambioInventario } from '../auditoria-inventario/auditoria-inventario.entity';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { EstadoNumeroMedidor } from '../numeros-medidor/numero-medidor.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

const MSG_BODEGA_INSTALACIONES_NO_MOVIMIENTOS =
  'La bodega de instalaciones no admite movimientos de inventario (entradas, salidas, devoluciones ni traslados). Solo se usa para novedades de instalación.';

// Función auxiliar para obtener etiqueta del tipo de movimiento
function getTipoLabel(tipo: TipoMovimiento): string {
  if (tipo === TipoMovimiento.ENTRADA) return 'Entrada';
  if (tipo === TipoMovimiento.SALIDA) return 'Salida';
  if (tipo === TipoMovimiento.DEVOLUCION) return 'Devolución';
  return String(tipo);
}

/** Columnas base para listados/historial vía SQL crudo (incluye JSON de seriales). */
const MOVIMIENTO_LIST_SELECT_SQL = `
          movimientoId,
          materialId,
          movimientoTipo,
          movimientoCantidad,
          movimientoPrecioUnitario,
          movimientoObservaciones,
          instalacionId,
          usuarioId,
          proveedorId,
          inventarioId,
          movimientoCodigo,
          numeroOrden,
          identificadorUnico,
          movimientoEstado,
          estadoMovimientoId,
          origenTipo,
          tecnicoOrigenId,
          numerosMedidor,
          fechaCreacion,
          fechaActualizacion`;

function parseNumerosMedidorField(raw: unknown): string[] | null | undefined {
  if (raw == null) return raw as null | undefined;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x ?? '').trim()).filter(Boolean);
      }
      return [t];
    } catch {
      return [t];
    }
  }
  return null;
}

function attachNumerosMedidorParsed<T extends Record<string, unknown>>(row: T): T {
  if (!row || !('numerosMedidor' in row)) return row;
  const parsed = parseNumerosMedidorField(row.numerosMedidor);
  if (parsed !== undefined) {
    (row as any).numerosMedidor = parsed;
  }
  return row;
}

function mapMovimientoGuardadoAResumen(movimientoGuardado: MovimientoInventario): Record<string, unknown> {
  return {
    movimientoId: movimientoGuardado.movimientoId,
    materialId: movimientoGuardado.materialId,
    movimientoTipo: movimientoGuardado.movimientoTipo,
    movimientoCantidad: movimientoGuardado.movimientoCantidad,
    movimientoPrecioUnitario: movimientoGuardado.movimientoPrecioUnitario,
    movimientoObservaciones: movimientoGuardado.movimientoObservaciones,
    instalacionId: movimientoGuardado.instalacionId,
    usuarioId: movimientoGuardado.usuarioId,
    proveedorId: movimientoGuardado.proveedorId,
    inventarioId: movimientoGuardado.inventarioId,
    movimientoCodigo: movimientoGuardado.movimientoCodigo,
    identificadorUnico: movimientoGuardado.identificadorUnico,
    movimientoEstado: movimientoGuardado.movimientoEstado,
    origenTipo: movimientoGuardado.origenTipo,
    tecnicoOrigenId: movimientoGuardado.tecnicoOrigenId,
    numerosMedidor: movimientoGuardado.numerosMedidor,
    fechaCreacion: movimientoGuardado.fechaCreacion,
    fechaActualizacion: movimientoGuardado.fechaActualizacion,
  };
}

@Injectable()
export class MovimientosService {
  constructor(
    @InjectRepository(MovimientoInventario)
    private movimientosRepository: Repository<MovimientoInventario>,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => ProveedoresService))
    private proveedoresService: ProveedoresService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
    private auditoriaInventarioService: AuditoriaInventarioService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
  ) {}

  /**
   * La bodega tipo `instalaciones` es contenedor lógico para novedades; no debe alterarse vía movimientos.
   */
  private async assertBodegaNoEsSoloNovedades(
    inventarioId: number | null | undefined,
    bodegaIdHint: number | null | undefined,
  ): Promise<void> {
    let bodegaId = bodegaIdHint ?? null;
    if (inventarioId) {
      const inv = await this.inventariosService.findOne(inventarioId);
      bodegaId = inv.bodegaId ?? inv.bodega?.bodegaId ?? bodegaId;
    }
    if (!bodegaId) return;
    const bodega = await this.bodegasService.findOne(Number(bodegaId));
    if (String(bodega?.bodegaTipo || '').toLowerCase() === 'instalaciones') {
      throw new BadRequestException(MSG_BODEGA_INSTALACIONES_NO_MOVIMIENTOS);
    }
  }

  private async generarIdentificadorUnico(tipoMovimiento: TipoMovimiento): Promise<string> {
    // Determinar el prefijo según el tipo de movimiento
    let prefijo: string;
    switch (tipoMovimiento) {
      case TipoMovimiento.SALIDA:
        prefijo = 'SAL';
        break;
      case TipoMovimiento.ENTRADA:
        prefijo = 'ENT';
        break;
      case TipoMovimiento.DEVOLUCION:
        prefijo = 'DEV';
        break;
      default:
        prefijo = 'MOV';
    }

    // Buscar el último identificador único del mismo tipo
    const ultimoMovimiento = await this.movimientosRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.identificadorUnico IS NOT NULL')
      .andWhere('movimiento.identificadorUnico LIKE :pattern', { pattern: `${prefijo}-%` })
      .andWhere('movimiento.movimientoTipo = :tipo', { tipo: tipoMovimiento })
      .orderBy('CAST(SUBSTRING(movimiento.identificadorUnico, 5) AS UNSIGNED)', 'DESC')
      .limit(1)
      .getOne();

    let siguienteNumero = 1;
    if (ultimoMovimiento?.identificadorUnico) {
      const match = ultimoMovimiento.identificadorUnico.match(new RegExp(`${prefijo}-(\\d+)`));
      if (match) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefijo}-${siguienteNumero}`;
  }

  async create(
    createMovimientoDto: CreateMovimientoDto,
    requestingUser?: any,
  ): Promise<MovimientoInventario[]> {
    // Seguridad: el usuario autenticado manda (evitar spoof de usuarioId)
    if (requestingUser?.usuarioId != null) {
      createMovimientoDto.usuarioId = Number(requestingUser.usuarioId);
    }

    const rolTipo = String(
      requestingUser?.usuarioRol?.rolTipo || requestingUser?.role || '',
    ).toLowerCase();
    const isSuperadminOGerencia = rolTipo === 'superadmin' || rolTipo === 'gerencia';

    const explicitCodigo = createMovimientoDto.movimientoCodigo?.trim();
    if (explicitCodigo) {
      const existentes = await this.movimientosRepository.find({
        where: {
          movimientoCodigo: explicitCodigo,
          movimientoTipo: createMovimientoDto.movimientoTipo,
        },
        order: { movimientoId: 'ASC' },
      });
      if (existentes.length > 0) {
        return existentes.map(
          (m) => mapMovimientoGuardadoAResumen(m),
        ) as unknown as MovimientoInventario[];
      }
    }

    const movimientoCodigo =
      explicitCodigo ||
      `${createMovimientoDto.movimientoTipo.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.assertNumeroOrdenUnicoPorGrupo(
      createMovimientoDto.numeroOrden,
      movimientoCodigo,
      [],
    );

    // NO generar identificador único aquí - se generará por cada movimiento individual
    // para evitar conflictos cuando se crean múltiples movimientos con el mismo código

    const movimientosCreados: MovimientoInventario[] = [];
    const inventarioCache = new Map<number, { inventarioId: number; bodegaId: number | null }>();
    const bodegaCache = new Map<number, { inventarioId: number | null; bodegaId: number | null }>();
    const resolverInventarioPorUsuario = async (): Promise<{
      inventarioId: number;
      bodegaId: number;
    } | null> => {
      try {
        const user = requestingUser?.usuarioId
          ? requestingUser
          : await this.usersService.findOne(createMovimientoDto.usuarioId);
        // Preferir bodega explícita del usuario si existe
        const bodegaIdDirecta =
          user?.usuarioBodega != null ? Number(user.usuarioBodega) : user?.bodega?.bodegaId;
        if (
          bodegaIdDirecta != null &&
          Number.isFinite(Number(bodegaIdDirecta)) &&
          Number(bodegaIdDirecta) > 0
        ) {
          const inv = await this.inventariosService.findOrCreateByBodega(Number(bodegaIdDirecta));
          return { inventarioId: inv.inventarioId, bodegaId: inv.bodegaId };
        }
        // Si solo tiene sede, usar bodega especial del centro operativo
        const sedeId =
          user?.usuarioSede != null
            ? Number(user.usuarioSede)
            : (user?.sede?.sedeId ?? user?.bodega?.sedeId);
        if (sedeId != null && Number.isFinite(Number(sedeId)) && Number(sedeId) > 0) {
          const bodegaCentro = await this.bodegasService.findOrCreateBodegaCentroOperativo(
            Number(sedeId),
          );
          const invCentro = await this.inventariosService.findOrCreateByBodega(
            bodegaCentro.bodegaId,
            {
              inventarioNombre: `Inventario - Centro Operativo ${sedeId}`,
              inventarioDescripcion:
                'Inventario del centro operativo (stock no asignado a bodegas específicas)',
            },
          );
          return { inventarioId: invCentro.inventarioId, bodegaId: invCentro.bodegaId };
        }
      } catch {
        // ignore
      }
      return null;
    };

    const cargarInventario = async (
      inventarioId?: number | null,
    ): Promise<{ inventarioId: number; bodegaId: number | null } | null> => {
      if (!inventarioId) return null;
      if (inventarioCache.has(inventarioId)) {
        return inventarioCache.get(inventarioId)!;
      }
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        const context = {
          inventarioId: inventario.inventarioId,
          bodegaId: inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null,
        };
        inventarioCache.set(inventarioId, context);
        if (context.bodegaId && !bodegaCache.has(context.bodegaId)) {
          bodegaCache.set(context.bodegaId, context);
        }
        return context;
      } catch (error) {
        return null;
      }
    };

    const cargarPorBodega = async (
      bodegaId?: number | null,
    ): Promise<{ inventarioId: number | null; bodegaId: number | null } | null> => {
      if (!bodegaId) return null;
      if (bodegaCache.has(bodegaId)) {
        return bodegaCache.get(bodegaId)!;
      }
      try {
        const inventario = await this.inventariosService.findByBodega(bodegaId);
        if (inventario) {
          const context = {
            inventarioId: inventario.inventarioId,
            bodegaId: inventario.bodegaId ?? inventario.bodega?.bodegaId ?? bodegaId,
          };
          inventarioCache.set(context.inventarioId, context);
          bodegaCache.set(context.bodegaId!, context);
          return context;
        }
      } catch (error) {
        // ignorar
      }
      const fallback = { inventarioId: null, bodegaId };
      bodegaCache.set(bodegaId, fallback);
      return fallback;
    };

    const obtenerContextoInventario = async (
      material: any,
    ): Promise<{ inventarioId: number | null; bodegaId: number | null }> => {
      // Entrada con inventarioId null ("a sede"): asignar bodega/inventario del centro del usuario que registra
      // para que el movimiento y el stock aparezcan en Empresa / historial por sede.
      if (
        createMovimientoDto.inventarioId === null &&
        createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA &&
        createMovimientoDto.origenTipo !== 'tecnico' &&
        createMovimientoDto.usuarioId
      ) {
        const desdeCentro = await resolverInventarioPorUsuario();
        if (desdeCentro) return desdeCentro;
      }
      // PRIORIDAD 1: Preferencia explícita del DTO (siempre usar este si está presente)
      // Si inventarioId es explícitamente null y no hubo resolución por centro, va a sede sin bodega (legacy)
      if (createMovimientoDto.inventarioId === null) {
        // Para mantener inventarios separados por centro, resolvemos al inventario del centro operativo del usuario.
        const ctx = await resolverInventarioPorUsuario();
        if (ctx) return ctx;
        return { inventarioId: null, bodegaId: null };
      }
      // Si inventarioId tiene un valor, cargarlo
      if (createMovimientoDto.inventarioId) {
        const context = await cargarInventario(createMovimientoDto.inventarioId);
        if (!context) {
          throw new BadRequestException('El inventario seleccionado no existe.');
        }
        // Permisos: si el usuario está registrado a bodega, solo puede registrar en esa bodega.
        // Si está registrado a sede (sin bodega), puede registrar en cualquier bodega de su sede.
        if (requestingUser && !isSuperadminOGerencia) {
          const inv = await this.inventariosService.findOne(context.inventarioId, requestingUser);
          const bodegaTipo = String(inv?.bodega?.bodegaTipo || '').toLowerCase();
          const userBodegaId =
            requestingUser?.usuarioBodega != null ? Number(requestingUser.usuarioBodega) : null;
          const userSedeId =
            requestingUser?.usuarioSede != null ? Number(requestingUser.usuarioSede) : null;
          if (userBodegaId != null && userBodegaId > 0) {
            if (Number(inv.bodegaId) !== userBodegaId) {
              throw new BadRequestException(
                'No tienes permisos para registrar movimientos en otra bodega.',
              );
            }
          } else if (userSedeId != null && userSedeId > 0) {
            const invSedeId = Number(inv?.bodega?.sedeId ?? inv?.bodega?.sede?.sedeId ?? NaN);
            const esMismaSede = Number.isFinite(invSedeId) && invSedeId === Number(userSedeId);
            // Bloquear bodegas especiales que no deben recibir inventario operativo.
            const esSoloNovedades = bodegaTipo === 'instalaciones';
            if (!esMismaSede || esSoloNovedades) {
              throw new BadRequestException(
                'No tienes permisos para registrar movimientos en una bodega fuera de tu centro operativo.',
              );
            }
          }
        }
        // Si el inventario existe, retornarlo directamente sin buscar alternativas
        return context;
      }

      // Si NO se especificó inventarioId, resolver por usuario (bodega del usuario o bodega centro de su sede)
      const ctxPorUsuario = await resolverInventarioPorUsuario();
      if (ctxPorUsuario) return ctxPorUsuario;

      // Inventario directo del material
      const materialInventario = await cargarInventario(
        material?.inventarioId || material?.inventario?.inventarioId,
      );
      if (materialInventario) {
        return materialInventario;
      }

      // Distribución por bodegas del material
      if (Array.isArray(material?.materialBodegas) && material.materialBodegas.length > 0) {
        for (const entry of material.materialBodegas) {
          const context = await cargarPorBodega(entry?.bodegaId);
          if (context) {
            return context;
          }
        }
      }

      // Inventario asociado al material (con bodega)
      const inventarioPorBodega = await cargarPorBodega(material?.inventario?.bodegaId);
      if (inventarioPorBodega) {
        return inventarioPorBodega;
      }

      // Ya no hacemos fallback al primer inventario global porque mezcla centros/bodegas.
      // Si no hay contexto, forzar que el cliente especifique inventarioId.
      throw new BadRequestException(
        'No se pudo resolver el inventario destino. Seleccione una bodega/inventario.',
      );
    };

    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

    // Entrada: los seriales de medidor no pueden repetirse en el mismo request ni existir ya en el sistema.
    if (createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA) {
      const seenSerial = new Set<string>();
      const dupInPayload: string[] = [];
      const allSerials: string[] = [];
      for (const m of createMovimientoDto.materiales) {
        const nums = Array.isArray(m.numerosMedidor)
          ? m.numerosMedidor.map((x) => String(x || '').trim()).filter(Boolean)
          : [];
        for (const raw of nums) {
          const norm = raw.trim().toLowerCase();
          if (!norm) continue;
          allSerials.push(raw);
          if (seenSerial.has(norm)) dupInPayload.push(raw);
          seenSerial.add(norm);
        }
      }
      if (dupInPayload.length) {
        const uniq = Array.from(new Set(dupInPayload)).slice(0, 25);
        throw new BadRequestException(
          `Números de medidor repetidos en la misma entrada: ${uniq.join(', ')}${dupInPayload.length > 25 ? '…' : ''}`,
        );
      }
      if (allSerials.length) {
        const existingGlobal = await this.numerosMedidorService.findExistingByNumeros(allSerials);
        if (existingGlobal.size > 0) {
          const sample = Array.from(existingGlobal.keys()).slice(0, 25).join(', ');
          throw new BadRequestException(
            `Estos números de medidor ya existen en el sistema y no pueden registrarse de nuevo en una entrada: ${sample}${existingGlobal.size > 25 ? '…' : ''}`,
          );
        }
      }
    }

    // Procesar cada material del array
    for (const materialDto of createMovimientoDto.materiales) {
      // Verificar que el material existe
      let material = await this.materialesService.findOne(materialDto.materialId);
      let materialIdFinal = materialDto.materialId;
      const precioUnitario = materialDto.movimientoPrecioUnitario;

      // Regla: si el material es medidor y vienen seriales, cada serial equivale a 1 unidad.
      // Para evitar inconsistencias, forzamos la cantidad al tamaño del arreglo.
      const numerosMedidorInput = Array.isArray(materialDto.numerosMedidor)
        ? materialDto.numerosMedidor.filter((x) => String(x || '').trim())
        : [];
      const cantidadMovimiento =
        material?.materialEsMedidor && numerosMedidorInput.length > 0
          ? numerosMedidorInput.length
          : materialDto.movimientoCantidad;

      const inventarioContexto = await obtenerContextoInventario(material);
      // Permitir movimientos sin inventarioId (se asignará después desde la lista)
      const inventarioDestino = inventarioContexto?.inventarioId || null;
      const bodegaDestino = inventarioContexto?.bodegaId || null;

      await this.assertBodegaNoEsSoloNovedades(inventarioDestino, bodegaDestino);

      // Si es una ENTRADA con proveedor diferente, crear o encontrar variante
      if (
        createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA &&
        createMovimientoDto.proveedorId
      ) {
        // Verificar si el proveedor es diferente al del material original
        if (material.proveedorId !== createMovimientoDto.proveedorId) {
          // Buscar si ya existe una variante con este proveedor
          const varianteExistente = await this.materialesService.findByProveedorAndCodigo(
            createMovimientoDto.proveedorId,
            material.materialCodigo,
          );

          if (varianteExistente) {
            // Usar la variante existente
            material = varianteExistente;
            materialIdFinal = varianteExistente.materialId;
          } else {
            // Crear nueva variante del material
            const nuevaVariante = await this.materialesService.createVariante(
              material,
              createMovimientoDto.proveedorId,
              inventarioDestino,
              precioUnitario,
            );
            material = nuevaVariante;
            materialIdFinal = nuevaVariante.materialId;
          }
        }

        // Si tiene inventarioId, actualizar el material
        if (inventarioDestino) {
          await this.materialesService.actualizarInventarioYPrecio(
            materialIdFinal,
            inventarioDestino,
            precioUnitario,
          );
        }
      }

      // Si es SALIDA, usar lógica FIFO para obtener el material más antiguo
      if (createMovimientoDto.movimientoTipo === TipoMovimiento.SALIDA) {
        const materialFIFO = await this.materialesService.findMaterialFIFO(
          material.materialCodigo,
          materialDto.movimientoCantidad,
        );
        if (materialFIFO) {
          materialIdFinal = materialFIFO.materialId;
        }
      }

      // Generar identificador único para este movimiento individual
      // Cada movimiento debe tener su propio identificador único, incluso si comparten el mismo código
      const identificadorUnicoMovimiento = await this.generarIdentificadorUnico(
        createMovimientoDto.movimientoTipo,
      );

      // Crear el movimiento con el materialId correcto
      // Nota: bodegaId no se guarda porque la columna no existe en la BD
      const movimientoData: any = {
        movimientoTipo: createMovimientoDto.movimientoTipo,
        materialId: materialIdFinal,
        movimientoCantidad: cantidadMovimiento,
        movimientoPrecioUnitario: precioUnitario,
        movimientoObservaciones: createMovimientoDto.movimientoObservaciones,
        instalacionId: createMovimientoDto.instalacionId || null,
        usuarioId: createMovimientoDto.usuarioId,
        proveedorId: createMovimientoDto.proveedorId || null,
        movimientoCodigo: movimientoCodigo,
        numeroOrden: createMovimientoDto.numeroOrden || null,
        identificadorUnico: identificadorUnicoMovimiento, // Identificador único autogenerado por movimiento
        numerosMedidor: numerosMedidorInput.length > 0 ? numerosMedidorInput : null, // Guardar números de medidor en el movimiento
        ...(createMovimientoDto.movimientoEstado != null
          ? { movimientoEstado: createMovimientoDto.movimientoEstado }
          : {}),
      };

      // Agregar información del origen (bodega o técnico) para salidas y devoluciones
      // IMPORTANTE: Si el origen es técnico, NO establecer inventarioId
      if (createMovimientoDto.origenTipo) {
        movimientoData.origenTipo = createMovimientoDto.origenTipo;
        if (createMovimientoDto.origenTipo === 'tecnico' && createMovimientoDto.tecnicoOrigenId) {
          movimientoData.tecnicoOrigenId = createMovimientoDto.tecnicoOrigenId;
          // NO establecer inventarioId cuando el origen es técnico
          movimientoData.inventarioId = null;
        } else if (createMovimientoDto.origenTipo === 'bodega') {
          // Solo establecer inventarioId si el origen es bodega
          if (inventarioDestino !== null && inventarioDestino !== undefined) {
            movimientoData.inventarioId = inventarioDestino;
          }
        }
      } else {
        // Si no hay origenTipo definido, usar inventarioId si está disponible (comportamiento legacy)
        // IMPORTANTE: Si createMovimientoDto.inventarioId es explícitamente null, no establecer inventarioId
        if (createMovimientoDto.inventarioId === null) {
          movimientoData.inventarioId = null;
        } else if (inventarioDestino !== null && inventarioDestino !== undefined) {
          movimientoData.inventarioId = inventarioDestino;
        }
      }

      const movimiento = this.movimientosRepository.create(movimientoData);
      const movimientoGuardado = (await this.movimientosRepository.save(
        movimiento,
      )) as unknown as MovimientoInventario;

      // Obtener el movimiento guardado para agregarlo a la lista
      // Usar solo los datos necesarios para evitar problemas de serialización
      if (movimientoGuardado) {
        // Registrar en auditoría de inventario
        try {
          const tipoMovimiento = createMovimientoDto.movimientoTipo;
          let tipoCambio: TipoCambioInventario;
          if (tipoMovimiento === TipoMovimiento.ENTRADA) {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_ENTRADA;
          } else if (tipoMovimiento === TipoMovimiento.SALIDA) {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_SALIDA;
          } else {
            tipoCambio = TipoCambioInventario.MOVIMIENTO_DEVOLUCION;
          }

          // Obtener información de bodega si existe
          let bodegaId: number | undefined = undefined;
          if (movimientoGuardado.inventarioId) {
            try {
              const inventario = await this.inventariosService.findOne(
                movimientoGuardado.inventarioId,
              );
              bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;
            } catch (error) {
              // Error silencioso
            }
          }

          await this.auditoriaInventarioService.registrarCambio({
            materialId: materialIdFinal,
            tipoCambio,
            usuarioId: createMovimientoDto.usuarioId,
            descripcion: `${getTipoLabel(tipoMovimiento)}: ${cantidadMovimiento} unidades`,
            cantidadNueva: cantidadMovimiento,
            diferencia:
              tipoMovimiento === TipoMovimiento.ENTRADA ? cantidadMovimiento : -cantidadMovimiento,
            bodegaId,
            movimientoId: movimientoGuardado.movimientoId,
            observaciones:
              movimientoGuardado.movimientoObservaciones ||
              createMovimientoDto.movimientoObservaciones,
          });
        } catch (error) {
          console.error('Error al registrar movimiento en auditoría:', error);
          // No lanzar error para no interrumpir el proceso
        }

        movimientosCreados.push({
          movimientoId: movimientoGuardado.movimientoId,
          materialId: movimientoGuardado.materialId,
          movimientoTipo: movimientoGuardado.movimientoTipo,
          movimientoCantidad: movimientoGuardado.movimientoCantidad,
          movimientoPrecioUnitario: movimientoGuardado.movimientoPrecioUnitario,
          movimientoObservaciones: movimientoGuardado.movimientoObservaciones,
          instalacionId: movimientoGuardado.instalacionId,
          usuarioId: movimientoGuardado.usuarioId,
          proveedorId: movimientoGuardado.proveedorId,
          inventarioId: movimientoGuardado.inventarioId,
          movimientoCodigo: movimientoGuardado.movimientoCodigo,
          identificadorUnico: movimientoGuardado.identificadorUnico,
          movimientoEstado: movimientoGuardado.movimientoEstado,
          origenTipo: movimientoGuardado.origenTipo,
          tecnicoOrigenId: movimientoGuardado.tecnicoOrigenId,
          numerosMedidor: movimientoGuardado.numerosMedidor,
          fechaCreacion: movimientoGuardado.fechaCreacion,
          fechaActualizacion: movimientoGuardado.fechaActualizacion,
        } as any);
      }

      // Manejar números de medidor si se proporcionan
      try {
        // Si se proporcionan números de medidor, procesarlos (el servicio marcará automáticamente el material como medidor)
        if (numerosMedidorInput.length > 0) {
          const tipoMovimiento = createMovimientoDto.movimientoTipo;
          const esEntrada = tipoMovimiento === TipoMovimiento.ENTRADA;
          const esSalida = tipoMovimiento === TipoMovimiento.SALIDA;
          const esDevolucion = tipoMovimiento === TipoMovimiento.DEVOLUCION;

          const numeros = numerosMedidorInput;
          const existingMap = await this.numerosMedidorService.findExistingByNumeros(numeros);

          if (esEntrada) {
            // ENTRADA: solo creación de seriales nuevos (la validación previa ya rechazó duplicados en BD y en el payload).
            let bodegaIdDestino: number | null = null;
            if (createMovimientoDto.inventarioId) {
              try {
                const inv = await this.inventariosService.findOne(createMovimientoDto.inventarioId);
                if (inv?.bodegaId) bodegaIdDestino = inv.bodegaId;
              } catch {
                // ignore
              }
            }

            const nuevos: string[] = [];
            for (const n of numeros) {
              const norm = String(n || '')
                .trim()
                .toLowerCase();
              if (!norm) continue;
              const found = existingMap.get(norm);
              if (found) {
                throw new BadRequestException(
                  `El número de medidor "${n}" ya existe en el sistema. No se puede repetir en una entrada.`,
                );
              }
              nuevos.push(n);
            }

            if (nuevos.length > 0) {
              await this.numerosMedidorService.crearMultiples(
                materialIdFinal,
                nuevos.map((num) => ({
                  numeroMedidor: num,
                  bodegaId: bodegaIdDestino ?? undefined,
                })),
              );
            }
          } else if (esSalida || esDevolucion) {
            // SALIDA/DEVOLUCIÓN:
            // En este sistema el DTO solo soporta `origenTipo` y `tecnicoOrigenId` (origen técnico),
            // pero NO existe un "destino técnico" para asignaciones (bodega -> técnico).
            // La asignación a técnico maneja los números desde `InventarioTecnicoService`.
            // Por eso, aquí SOLO debemos tocar números cuando el ORIGEN es técnico; en caso contrario, no modificar.
            const origenEsTecnico =
              createMovimientoDto.origenTipo === 'tecnico' &&
              Boolean(createMovimientoDto.tecnicoOrigenId);
            const origenEsBodega =
              createMovimientoDto.origenTipo === 'bodega' || !createMovimientoDto.origenTipo;

            let bodegaIdContexto: number | null = null;
            if (createMovimientoDto.inventarioId) {
              try {
                const inv = await this.inventariosService.findOne(createMovimientoDto.inventarioId);
                if (inv?.bodegaId) bodegaIdContexto = inv.bodegaId;
              } catch {
                // ignore
              }
            }

            for (const numeroMedidor of numeros) {
              const norm = String(numeroMedidor || '')
                .trim()
                .toLowerCase();
              if (!norm) continue;
              const numeroMedidorEntity = existingMap.get(norm);

              if (origenEsTecnico) {
                if (!numeroMedidorEntity) {
                  await this.numerosMedidorService.create({
                    materialId: materialIdFinal,
                    numeroMedidor: numeroMedidor,
                    estado: EstadoNumeroMedidor.DISPONIBLE,
                    bodegaId: bodegaIdContexto ?? undefined,
                    usuarioId: null,
                  });
                } else {
                  await this.numerosMedidorService.update(numeroMedidorEntity.numeroMedidorId, {
                    estado: EstadoNumeroMedidor.DISPONIBLE,
                    bodegaId: bodegaIdContexto ?? undefined,
                    instalacionId: null,
                    instalacionMaterialId: null,
                    usuarioId: null,
                    inventarioTecnicoId: null,
                  });
                }
                continue;
              }

              if (origenEsBodega && esSalida) {
                if (!numeroMedidorEntity) {
                  throw new BadRequestException(
                    `El número de medidor "${numeroMedidor}" no existe en el inventario.`,
                  );
                }
                if (
                  bodegaIdContexto != null &&
                  numeroMedidorEntity.bodegaId != null &&
                  Number(numeroMedidorEntity.bodegaId) !== Number(bodegaIdContexto)
                ) {
                  throw new BadRequestException(
                    `El número de medidor "${numeroMedidor}" no pertenece a la bodega de origen seleccionada.`,
                  );
                }
                if (numeroMedidorEntity.usuarioId) {
                  throw new BadRequestException(
                    `El número de medidor "${numeroMedidor}" está asignado a un técnico y no puede salir desde bodega.`,
                  );
                }
                await this.numerosMedidorService.update(numeroMedidorEntity.numeroMedidorId, {
                  estado: EstadoNumeroMedidor.DISPONIBLE,
                  bodegaId: null,
                  instalacionId: null,
                  instalacionMaterialId: null,
                  usuarioId: null,
                  inventarioTecnicoId: null,
                });
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        console.error(`Error al manejar números de medidor en movimiento:`, error);
        throw new BadRequestException(
          `Error al registrar números de medidor: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // Ajustar stock según el tipo de movimiento (solo si el movimiento está completado)
      // No ajustar stock para movimientos pendientes (como las salidas automáticas)
      // Importante: en algunas BD legacy `movimientoEstado` es TINYINT (default 1),
      // mientras que en código existe enum string (pendiente/completada/cancelada).
      // Para no "perder" stock, tratamos como completada cuando:
      // - estadoMovimientoId apunta a un estado 'completada'
      // - movimientoEstado es 'completada'
      // - movimientoEstado es numérico 1 (legacy: completada)
      const movimientoCompletado = await (async (): Promise<boolean> => {
        const raw = (movimientoGuardado as any)?.movimientoEstado;
        if (raw == null) return true; // compat: si no viene, asumir completada
        if (typeof raw === 'number') return raw === 1;
        const rawNum = Number(raw);
        if (Number.isFinite(rawNum)) return rawNum === 1;
        const rawStr = String(raw).toLowerCase();
        if (rawStr === EstadoMovimiento.COMPLETADA) return true;

        const estadoId = (movimientoGuardado as any)?.estadoMovimientoId;
        if (estadoId != null && Number.isFinite(Number(estadoId))) {
          try {
            const row = await this.movimientosRepository.manager.query<
              Array<{ estadoCodigo: string }>
            >(`SELECT estadoCodigo FROM estados_movimiento WHERE estadoMovimientoId = ? LIMIT 1`, [
              Number(estadoId),
            ]);
            const codigo = String(row?.[0]?.estadoCodigo || '').toLowerCase();
            return codigo === EstadoMovimiento.COMPLETADA;
          } catch {
            // ignorar
          }
        }
        return false;
      })();

      if (movimientoCompletado) {
        const tipoMovimiento = createMovimientoDto.movimientoTipo;
        const tipoStr = String(tipoMovimiento).toLowerCase();
        const esEntrada = tipoStr === 'entrada' || tipoMovimiento === TipoMovimiento.ENTRADA;
        const esSalida = tipoStr === 'salida' || tipoMovimiento === TipoMovimiento.SALIDA;
        const esDevolucion =
          tipoStr === 'devolucion' || tipoMovimiento === TipoMovimiento.DEVOLUCION;

        // Si el origen es técnico, ajustar inventario técnico (para salidas, devoluciones y entradas desde técnico)
        if (createMovimientoDto.origenTipo === 'tecnico' && createMovimientoDto.tecnicoOrigenId) {
          if (esEntrada) {
            // Si es una entrada desde técnico (devolución), reducir inventario técnico y aumentar stock en sede/bodega
            await this.ajustarInventarioTecnicoMovimiento(
              materialIdFinal,
              TipoMovimiento.SALIDA, // Usar SALIDA para reducir inventario técnico
              cantidadMovimiento,
              createMovimientoDto.tecnicoOrigenId,
            );
            // Ajustar stock en sede/bodega destino
            if (bodegaDestino) {
              await this.ajustarStockMovimiento(
                materialIdFinal,
                TipoMovimiento.ENTRADA,
                cantidadMovimiento,
                bodegaDestino,
              );
            }
          } else if (esSalida || esDevolucion) {
            await this.ajustarInventarioTecnicoMovimiento(
              materialIdFinal,
              tipoMovimiento,
              cantidadMovimiento,
              createMovimientoDto.tecnicoOrigenId,
            );
          }
        }
        // Si es una ENTRADA sin bodega seleccionada y sin origen técnico, ajustar stock directamente en la sede
        // Nota: entradas sin inventarioId se enrutan al inventario del centro operativo (bodegaTipo = 'centro')
        // vía `obtenerContextoInventario`, por lo tanto aquí siempre debe existir bodegaDestino para ajustar stock.
        // Si el origen es bodega, ajustar stock de bodega
        else if (bodegaDestino) {
          if (esDevolucion) {
            // Asegurar que para devoluciones se reste stock
            await this.ajustarStockMovimiento(
              materialIdFinal,
              TipoMovimiento.DEVOLUCION, // Forzar el enum correcto
              cantidadMovimiento,
              bodegaDestino,
            );
          } else {
            await this.ajustarStockMovimiento(
              materialIdFinal,
              createMovimientoDto.movimientoTipo,
              cantidadMovimiento,
              bodegaDestino,
            );
          }
        }
      }
    }

    // Si es una ENTRADA y hay asignaciones a técnicos, procesarlas
    if (
      createMovimientoDto.movimientoTipo === TipoMovimiento.ENTRADA &&
      createMovimientoDto.asignacionesTecnicos &&
      createMovimientoDto.asignacionesTecnicos.length > 0
    ) {
      // Obtener el inventario de la sede para crear salidas
      // Usar el inventarioId proporcionado o el primero de los movimientos creados
      let inventarioSede: { inventarioId: number | null; bodegaId: number | null } | null = null;
      if (createMovimientoDto.inventarioId) {
        try {
          const inventario = await this.inventariosService.findOne(
            createMovimientoDto.inventarioId,
          );
          if (inventario && inventario.bodega) {
            inventarioSede = {
              inventarioId: inventario.inventarioId,
              bodegaId:
                inventario.bodegaId ||
                (typeof inventario.bodega === 'object' && 'bodegaId' in inventario.bodega
                  ? inventario.bodega.bodegaId
                  : null),
            };
          }
        } catch (error) {
          console.error('Error al buscar inventario de sede:', error);
        }
      } else if (movimientosCreados.length > 0 && movimientosCreados[0].inventarioId) {
        try {
          const inventario = await this.inventariosService.findOne(
            movimientosCreados[0].inventarioId,
          );
          if (inventario && inventario.bodega) {
            inventarioSede = {
              inventarioId: inventario.inventarioId,
              bodegaId:
                inventario.bodegaId ||
                (typeof inventario.bodega === 'object' && 'bodegaId' in inventario.bodega
                  ? inventario.bodega.bodegaId
                  : null),
            };
          }
        } catch (error) {
          console.error('Error al buscar inventario de sede:', error);
        }
      }

      // Procesar cada asignación a técnico
      for (const asignacion of createMovimientoDto.asignacionesTecnicos) {
        try {
          // Asignar materiales al técnico
          await this.inventarioTecnicoService.asignarMateriales(asignacion.usuarioId, {
            materiales: asignacion.materiales,
          });

          // Si hay inventario de sede, crear movimientos de salida automáticos
          if (inventarioSede && inventarioSede.inventarioId && inventarioSede.bodegaId) {
            const salidaCodigo = `SALIDA-TECNICO-${asignacion.usuarioId}-${Date.now()}`;

            // Crear salidas para cada material asignado
            for (const materialAsignado of asignacion.materiales) {
              try {
                // Verificar que el material existe
                await this.materialesService.findOne(materialAsignado.materialId);

                // Crear movimiento de salida desde la sede/bodega
                const salidaData: any = {
                  movimientoTipo: TipoMovimiento.SALIDA,
                  materialId: materialAsignado.materialId,
                  movimientoCantidad: materialAsignado.cantidad,
                  movimientoObservaciones: `Asignación automática a técnico desde entrada. ${createMovimientoDto.movimientoObservaciones || ''}`,
                  usuarioId: createMovimientoDto.usuarioId,
                  inventarioId: inventarioSede.inventarioId,
                  movimientoCodigo: salidaCodigo,
                  movimientoEstado: EstadoMovimiento.COMPLETADA, // Completar automáticamente
                };

                const identificadorUnicoSalida = await this.generarIdentificadorUnico(
                  TipoMovimiento.SALIDA,
                );
                salidaData.identificadorUnico = identificadorUnicoSalida;

                const salida = this.movimientosRepository.create(salidaData);
                const _salidaGuardada = (await this.movimientosRepository.save(
                  salida,
                )) as unknown as MovimientoInventario;

                // Ajustar stock (reducir de bodega/sede)
                await this.ajustarStockMovimiento(
                  materialAsignado.materialId,
                  TipoMovimiento.SALIDA,
                  materialAsignado.cantidad,
                  inventarioSede.bodegaId,
                );
              } catch (error) {
                console.error(
                  `Error al crear salida para material ${materialAsignado.materialId}:`,
                  error,
                );
                // Continuar con los demás materiales aunque falle uno
              }
            }
          }
        } catch (error) {
          console.error(`Error al asignar materiales al técnico ${asignacion.usuarioId}:`, error);
          // Continuar con los demás técnicos aunque falle uno
        }
      }
    }

    // Retornar el array de movimientos creados
    return movimientosCreados;
  }

  private async ajustarStockMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    bodegaId: number,
  ): Promise<void> {
    // Convertir cantidad a número para asegurar que sea un número válido
    const cantidadNumerica = Number(cantidad) || 0;

    // Normalizar el tipo de movimiento (puede venir como string o enum)
    const tipoStr = String(tipo).toLowerCase();
    const esDevolucion = tipoStr === 'devolucion' || tipo === TipoMovimiento.DEVOLUCION;
    const esEntrada = tipoStr === 'entrada' || tipo === TipoMovimiento.ENTRADA;
    const esSalida = tipoStr === 'salida' || tipo === TipoMovimiento.SALIDA;

    let ajusteCantidad = 0;

    // Determinar el ajuste según el tipo de movimiento
    // IMPORTANTE: Las devoluciones DEBEN restar stock (valor negativo)
    if (esDevolucion) {
      // Las devoluciones RESTAN stock (disminuyen el inventario)
      // Forzar que siempre sea negativo, sin importar cómo venga la cantidad
      ajusteCantidad = cantidadNumerica > 0 ? -cantidadNumerica : cantidadNumerica;
      // Asegurar que sea negativo
      if (ajusteCantidad >= 0) {
        ajusteCantidad = -Math.abs(cantidadNumerica);
      }
    } else if (esEntrada) {
      ajusteCantidad = cantidadNumerica; // +cantidad (aumenta stock)
    } else if (esSalida) {
      ajusteCantidad = -cantidadNumerica; // -cantidad (disminuye stock)
    } else {
      // Si no se reconoce el tipo, no ajustar
      ajusteCantidad = 0;
    }

    // Verificación final crítica: para devoluciones, el ajuste DEBE ser negativo
    if (esDevolucion && ajusteCantidad >= 0) {
      // Si por alguna razón es positivo o cero, forzar a negativo
      ajusteCantidad = -Math.abs(cantidadNumerica);
    }

    await this.materialesService.ajustarStock(materialId, ajusteCantidad, bodegaId);
    // La sincronización ya se hace dentro de ajustarStock, pero la dejamos explícita aquí por claridad
  }

  private async ajustarInventarioTecnicoMovimiento(
    materialId: number,
    tipo: TipoMovimiento,
    cantidad: number,
    tecnicoId: number,
  ): Promise<void> {
    // Convertir cantidad a número para asegurar que sea un número válido
    const cantidadNumerica = Number(cantidad) || 0;

    // Normalizar el tipo de movimiento (puede venir como string o enum)
    const tipoStr = String(tipo).toLowerCase();
    const esDevolucion = tipoStr === 'devolucion' || tipo === TipoMovimiento.DEVOLUCION;
    const esSalida = tipoStr === 'salida' || tipo === TipoMovimiento.SALIDA;

    // Solo procesar salidas y devoluciones desde inventario técnico
    if (!esSalida && !esDevolucion) {
      return;
    }

    try {
      // Buscar el inventario técnico existente
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);
      const inventarioItem = inventarioTecnico.find(
        (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
      );

      if (inventarioItem) {
        // Calcular nueva cantidad (restar para salidas y devoluciones)
        const cantidadActual = Number(inventarioItem.cantidad || 0);
        const nuevaCantidad = Math.max(0, cantidadActual - cantidadNumerica);

        // Actualizar el inventario técnico
        await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
          cantidad: nuevaCantidad,
        });

        // IMPORTANTE: Sincronizar el stock total del material después de actualizar inventario técnico
        await this.materialesService.sincronizarStock(materialId);
      }
    } catch (error) {
      console.error(
        `Error al ajustar inventario técnico para técnico ${tecnicoId} y material ${materialId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Fragmento SQL de acceso por rol (misma semántica que el listado paginado).
   * @param tableAlias alias de `movimientos_inventario` (ej. `movimientos_inventario` o `m`)
   */
  private buildMovimientoRoleWhereSql(
    tableAlias: string,
    user?: any,
  ): { sql: string; params: any[] } {
    const a = tableAlias;
    if (!user) return { sql: '', params: [] };
    const rolTipo = user.usuarioRol?.rolTipo || user.role;

    if (rolTipo === 'superadmin' || rolTipo === 'gerencia') {
      return { sql: '', params: [] };
    }

    if (rolTipo === 'admin' && user.usuarioSede) {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND b.sedeId = ?
              )`,
        params: [user.usuarioSede],
      };
    }
    if (rolTipo === 'almacenista' && user.usuarioSede) {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND b.sedeId = ?
              )`,
        params: [user.usuarioSede],
      };
    }
    if (rolTipo === 'admin-internas' && user.usuarioSede) {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND b.sedeId = ? AND b.bodegaTipo = 'internas'
              )`,
        params: [user.usuarioSede],
      };
    }
    if (rolTipo === 'admin-redes' && user.usuarioSede) {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND b.sedeId = ? AND b.bodegaTipo = 'redes'
              )`,
        params: [user.usuarioSede],
      };
    }
    if (rolTipo === 'bodega-internas') {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND (b.bodegaTipo = 'internas' OR b.bodegaId = ?)
              )`,
        params: [user.usuarioBodega || 0],
      };
    }
    if (rolTipo === 'bodega-redes') {
      return {
        sql: ` WHERE EXISTS (
                SELECT 1 FROM inventarios i
                INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
                WHERE i.inventarioId = ${a}.inventarioId
                  AND (b.bodegaTipo = 'redes' OR b.bodegaId = ?)
              )`,
        params: [user.usuarioBodega || 0],
      };
    }
    if ((rolTipo === 'tecnico' || rolTipo === 'soldador') && user.usuarioId) {
      return {
        sql: ` WHERE (
                ${a}.usuarioId = ?
                OR ${a}.tecnicoOrigenId = ?
                OR EXISTS (
                  SELECT 1 FROM instalaciones_usuarios iu
                  WHERE iu.instalacionId = ${a}.instalacionId
                    AND iu.usuarioId = ?
                    AND iu.activo = 1
                )
              )`,
        params: [user.usuarioId, user.usuarioId, user.usuarioId],
      };
    }

    return { sql: '', params: [] };
  }

  /**
   * Búsqueda por código de movimiento, número de orden e identificador único.
   * Insensible a mayúsculas; en número de orden admite coincidencia ignorando espacios (p. ej. "12 34" vs "1234").
   */
  private buildMovimientoTextSearchClause(
    tableAlias: string,
    trimmedSearch: string,
  ): { sql: string; params: any[] } {
    const p = tableAlias ? `${tableAlias}.` : '';
    const lower = trimmedSearch.toLowerCase();
    const pat = `%${lower}%`;
    const compact = lower.replace(/\s+/g, '');
    const patCompact = `%${compact}%`;
    const ordenExpr = `TRIM(COALESCE(CAST(${p}numeroOrden AS CHAR), ''))`;
    const sql = `(
      LOWER(COALESCE(${p}movimientoCodigo, '')) LIKE ?
      OR LOWER(${ordenExpr}) LIKE ?
      OR LOWER(COALESCE(${p}identificadorUnico, '')) LIKE ?
      OR REPLACE(LOWER(${ordenExpr}), ' ', '') LIKE ?
    )`;
    return { sql, params: [pat, pat, pat, patCompact] };
  }

  /**
   * El número de orden debe ser único entre operaciones distintas (cualquier tipo de movimiento).
   * Varios renglones de la misma operación comparten `movimientoCodigo` y el mismo número de orden.
   */
  private async assertNumeroOrdenUnicoPorGrupo(
    numeroOrdenRaw: string | null | undefined,
    movimientoCodigoGrupo: string | null | undefined,
    excludeMovimientoIds: number[],
  ): Promise<void> {
    const ordenTrim = numeroOrdenRaw != null ? String(numeroOrdenRaw).trim() : '';
    if (!ordenTrim) return;

    const norm = ordenTrim.toLowerCase();
    const codigoGrupo = (movimientoCodigoGrupo ?? '').trim();
    const exclude = Array.from(
      new Set((excludeMovimientoIds || []).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)),
    );

    let sql = `
      SELECT m.movimientoId, m.movimientoTipo
      FROM movimientos_inventario m
      WHERE LOWER(TRIM(COALESCE(CAST(m.numeroOrden AS CHAR), ''))) = ?
        AND NOT (COALESCE(m.movimientoCodigo, '') <=> ?)
    `;
    const params: any[] = [norm, codigoGrupo];

    if (exclude.length) {
      sql += ` AND m.movimientoId NOT IN (${exclude.map(() => '?').join(',')})`;
      params.push(...exclude);
    }
    sql += ' LIMIT 1';

    const rows = await this.movimientosRepository.query(sql.trim(), params);
    if (rows?.length) {
      const tipo = String(rows[0]?.movimientoTipo || '').toLowerCase();
      const tipoLabel =
        tipo === 'entrada' ? 'una entrada' : tipo === 'salida' ? 'una salida' : tipo === 'devolucion' ? 'una devolución' : 'otro movimiento';
      throw new BadRequestException(
        `El número de orden "${ordenTrim}" ya está registrado en ${tipoLabel}. Debe ser único entre todas las operaciones de inventario.`,
      );
    }
  }

  async findAll(
    paginationDto?: PaginationDto,
    user?: any,
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    try {
      const page = Math.max(1, Number(paginationDto?.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(paginationDto?.limit) || 50));
      const skip = (page - 1) * limit;

      const roleWhere = this.buildMovimientoRoleWhereSql('movimientos_inventario', user);
      let whereConditions = roleWhere.sql;
      const queryParams: any[] = [...roleWhere.params];

      const listQuery = paginationDto as PaginationDto & { movimientoTipo?: string; search?: string };

      if (listQuery.movimientoTipo) {
        const frag = 'movimientoTipo = ?';
        whereConditions = whereConditions ? `${whereConditions} AND ${frag}` : ` WHERE ${frag}`;
        queryParams.push(listQuery.movimientoTipo);
      }

      if (listQuery.search && listQuery.search.trim()) {
        const { sql, params: sp } = this.buildMovimientoTextSearchClause('', listQuery.search.trim());
        whereConditions = whereConditions ? `${whereConditions} AND ${sql}` : ` WHERE ${sql}`;
        queryParams.push(...sp);
      }

      // Obtener el total de registros con filtros
      const totalQuery = `SELECT COUNT(*) as total FROM movimientos_inventario ${whereConditions}`;
      const totalResult = await this.movimientosRepository.query(totalQuery, queryParams);
      const total = totalResult[0]?.total || 0;

      // Primero intentar con query raw para evitar problemas con TypeORM y relaciones
      // Asegurar que se incluyan origenTipo y tecnicoOrigenId explícitamente
      const selectQuery = `
        SELECT 
          ${MOVIMIENTO_LIST_SELECT_SQL}
        FROM movimientos_inventario 
        ${whereConditions}
        ORDER BY fechaCreacion DESC
        LIMIT ? OFFSET ?
      `;
      const rawMovimientos = await this.movimientosRepository.query(selectQuery, [
        ...queryParams,
        limit,
        skip,
      ]);

      // Si hay movimientos, cargar relaciones manualmente
      if (rawMovimientos.length > 0) {
        const inventarioIds = Array.from(
          new Set(
            rawMovimientos
              .map((movimiento: any) => movimiento.inventarioId)
              .filter((id: any) => id !== null && id !== undefined)
              .map((id: any) => Number(id))
              .filter((id: number) => !isNaN(id)),
          ),
        );

        const inventarioMap = new Map<number, any>();
        await Promise.all(
          inventarioIds.map(async (inventarioId: number) => {
            try {
              const inventario = await this.inventariosService.findOne(inventarioId);
              inventarioMap.set(inventarioId, inventario);
            } catch (error) {
              // Error silencioso al cargar inventario
            }
          }),
        );

        const materialIds = Array.from(
          new Set(
            rawMovimientos
              .map((movimiento: any) => movimiento.materialId)
              .filter((id: any) => id !== null && id !== undefined)
              .map((id: any) => Number(id))
              .filter((id: number) => !isNaN(id)),
          ),
        ) as number[];
        const proveedorIds = Array.from(
          new Set(
            rawMovimientos
              .map((movimiento: any) => movimiento.proveedorId)
              .filter((id: any) => id !== null && id !== undefined)
              .map((id: any) => Number(id))
              .filter((id: number) => !isNaN(id)),
          ),
        ) as number[];
        const usuarioIdsSet = new Set<number>();
        for (const movimiento of rawMovimientos) {
          const m = movimiento as any;
          if (m.usuarioId) usuarioIdsSet.add(Number(m.usuarioId));
          if (m.origenTipo === 'tecnico' && m.tecnicoOrigenId) {
            usuarioIdsSet.add(Number(m.tecnicoOrigenId));
          }
        }
        const usuarioIds = Array.from(usuarioIdsSet).filter((id) => !isNaN(id) && id > 0);

        const [materialMap, proveedorMap, usuarioMap] = await Promise.all([
          this.materialesService.findSummariesByIds(materialIds),
          this.proveedoresService.findSummariesByIds(proveedorIds),
          this.usersService.findSummariesByIds(usuarioIds),
        ]);

        const instalacionIds = Array.from(
          new Set(
            rawMovimientos
              .map((movimiento: any) => movimiento.instalacionId)
              .filter((id: any) => id !== null && id !== undefined)
              .map((id: any) => Number(id))
              .filter((id: number) => !isNaN(id)),
          ),
        );
        const instalacionMap = new Map<number, { instalacionId: number; instalacionCodigo: string }>();
        if (instalacionIds.length > 0) {
          const placeholders = instalacionIds.map(() => '?').join(',');
          const instRows = await this.movimientosRepository.query(
            `SELECT instalacionId, instalacionCodigo FROM instalaciones WHERE instalacionId IN (${placeholders})`,
            instalacionIds,
          );
          for (const r of instRows || []) {
            instalacionMap.set(Number(r.instalacionId), {
              instalacionId: Number(r.instalacionId),
              instalacionCodigo: r.instalacionCodigo,
            });
          }
        }

        const movimientosConRelaciones = rawMovimientos.map((movimiento: any) => {
          const movimientoConRelaciones: any = attachNumerosMedidorParsed({ ...movimiento });

          if (movimiento.materialId) {
            const material = materialMap.get(Number(movimiento.materialId));
            if (material) {
              movimientoConRelaciones.material = {
                materialId: material.materialId,
                materialCodigo: material.materialCodigo,
                materialNombre: material.materialNombre,
                materialStock: material.materialStock,
                materialPrecio: material.materialPrecio,
                materialFoto: material.materialFoto,
                materialEstado: material.materialEstado,
                materialEsMedidor: material.materialEsMedidor || false,
              };
            }
          }

          if (movimiento.inventarioId) {
            const inventario = inventarioMap.get(Number(movimiento.inventarioId));
            if (inventario) {
              movimientoConRelaciones.inventario = inventario;
              movimientoConRelaciones.bodega = inventario.bodega ?? null;
              movimientoConRelaciones.bodegaId =
                inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
            }
          }

          if (movimiento.proveedorId) {
            const proveedor = proveedorMap.get(Number(movimiento.proveedorId));
            if (proveedor) {
              movimientoConRelaciones.proveedor = {
                proveedorId: proveedor.proveedorId,
                proveedorNombre: proveedor.proveedorNombre,
                proveedorNit: proveedor.proveedorNit,
                proveedorTelefono: proveedor.proveedorTelefono,
                proveedorEmail: proveedor.proveedorEmail,
                proveedorDireccion: proveedor.proveedorDireccion,
                proveedorContacto: proveedor.proveedorContacto,
                proveedorEstado: proveedor.proveedorEstado,
              };
            }
          }

          if (movimiento.usuarioId) {
            const usuario = usuarioMap.get(Number(movimiento.usuarioId));
            if (usuario) {
              movimientoConRelaciones.usuario = {
                usuarioId: usuario.usuarioId,
                usuarioNombre: usuario.usuarioNombre,
                usuarioApellido: usuario.usuarioApellido,
                usuarioCorreo: usuario.usuarioCorreo,
                usuarioTelefono: usuario.usuarioTelefono,
                usuarioDocumento: usuario.usuarioDocumento,
                usuarioEstado: usuario.usuarioEstado,
              };
            }
          }

          if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
            const tecnicoOrigen = usuarioMap.get(Number(movimiento.tecnicoOrigenId));
            if (tecnicoOrigen) {
              movimientoConRelaciones.tecnicoOrigen = {
                usuarioId: tecnicoOrigen.usuarioId,
                usuarioNombre: tecnicoOrigen.usuarioNombre,
                usuarioApellido: tecnicoOrigen.usuarioApellido,
              };
            }
          }

          if (movimiento.instalacionId) {
            const inst = instalacionMap.get(Number(movimiento.instalacionId));
            if (inst) {
              movimientoConRelaciones.instalacion = inst;
            }
          }

          return movimientoConRelaciones;
        });

        return {
          data: movimientosConRelaciones,
          total: Number(total),
          page,
          limit,
        };
      }

      return {
        data: rawMovimientos.map((m: any) => attachNumerosMedidorParsed({ ...m })),
        total: Number(total),
        page,
        limit,
      };
    } catch (error) {
      console.error('Error en findAll de movimientos:', error);
      console.error('Mensaje:', error instanceof Error ? error.message : String(error));
      console.error('Nombre del error:', error instanceof Error ? error.name : 'Unknown');
      if (error instanceof Error && error.stack) {
        console.error('Stack trace completo:');
        console.error(error.stack);
      }
      throw error;
    }
  }

  /**
   * Totales por material y tipo (misma visibilidad que el listado). Para tablas tipo Stock sin traer todos los movimientos.
   */
  async findTotalesPorMaterial(
    user?: any,
  ): Promise<Record<number, { entrada: number; salida: number; devolucion: number }>> {
    const roleWhere = this.buildMovimientoRoleWhereSql('m', user);
    const whereBase = roleWhere.sql || ' WHERE 1=1';
    const sql = `
      SELECT m.materialId AS materialId, m.movimientoTipo AS movimientoTipo, SUM(m.movimientoCantidad) AS total
      FROM movimientos_inventario m
      ${whereBase}
      GROUP BY m.materialId, m.movimientoTipo
    `;
    const rows = await this.movimientosRepository.query(sql, roleWhere.params);
    const out: Record<number, { entrada: number; salida: number; devolucion: number }> = {};
    for (const r of rows || []) {
      const mid = Number(r.materialId);
      if (!Number.isFinite(mid) || mid <= 0) continue;
      const tipo = String(r.movimientoTipo || '').toLowerCase();
      const total = Number(r.total || 0);
      if (!out[mid]) out[mid] = { entrada: 0, salida: 0, devolucion: 0 };
      if (tipo === 'entrada') out[mid].entrada += total;
      else if (tipo === 'salida') out[mid].salida += total;
      else if (tipo === 'devolucion') out[mid].devolucion += total;
    }
    return out;
  }

  /**
   * Listado de movimientos agrupados por `movimientoCodigo` (una fila por operación), paginado en servidor.
   */
  async findGruposPaginated(
    user: any,
    opts: {
      page: number;
      limit: number;
      movimientoTipo: string;
      search?: string;
      excludeTrasladoSalidas?: boolean;
    },
  ): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(opts.limit) || 50));
    const skip = (page - 1) * limit;
    const tipo = String(opts.movimientoTipo || '').toLowerCase();
    if (!['entrada', 'salida', 'devolucion'].includes(tipo)) {
      return { data: [], total: 0, page, limit };
    }

    const roleWhere = this.buildMovimientoRoleWhereSql('m', user);
    let where = roleWhere.sql;
    const params: any[] = [...roleWhere.params];

    const tipoFrag = 'm.movimientoTipo = ?';
    where = where ? `${where} AND ${tipoFrag}` : ` WHERE ${tipoFrag}`;
    params.push(tipo);

    if (opts.excludeTrasladoSalidas && tipo === 'salida') {
      where += ` AND NOT (
        LOWER(COALESCE(m.movimientoObservaciones, '')) LIKE '%traslado%'
        OR UPPER(COALESCE(m.movimientoCodigo, '')) LIKE 'TRA-%'
        OR UPPER(COALESCE(m.identificadorUnico, '')) LIKE 'TRA-%'
      )`;
    }

    if (opts.search && opts.search.trim()) {
      const { sql, params: sp } = this.buildMovimientoTextSearchClause('m', opts.search.trim());
      where += ` AND ${sql}`;
      params.push(...sp);
    }

    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT m.movimientoCodigo
        FROM movimientos_inventario m
        ${where}
        GROUP BY m.movimientoCodigo
      ) g
    `;
    const countRows = await this.movimientosRepository.query(countSql, params);
    const total = Number(countRows?.[0]?.total ?? 0);

    const dataSql = `
      SELECT
        MIN(m.movimientoId) AS movimientoId,
        m.movimientoCodigo AS movimientoCodigo,
        MAX(m.fechaCreacion) AS fechaCreacion,
        COUNT(DISTINCT m.materialId) AS materialesCount,
        SUM(m.movimientoCantidad) AS totalCantidad,
        MAX(m.proveedorId) AS proveedorId,
        MAX(m.numeroOrden) AS numeroOrden,
        MAX(m.identificadorUnico) AS identificadorUnico
      FROM movimientos_inventario m
      ${where}
      GROUP BY m.movimientoCodigo
      ORDER BY MAX(m.fechaCreacion) DESC
      LIMIT ? OFFSET ?
    `;
    const dataRows = await this.movimientosRepository.query(dataSql, [...params, limit, skip]);

    const proveedorIds = Array.from(
      new Set(
        (dataRows || [])
          .map((r: any) => Number(r.proveedorId))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      ),
    ) as number[];
    const proveedorMap = await this.proveedoresService.findSummariesByIds(proveedorIds);

    const data = (dataRows || []).map((r: any) => {
      const pid = r.proveedorId != null ? Number(r.proveedorId) : null;
      const prov = pid && proveedorMap.get(pid) ? proveedorMap.get(pid)! : null;
      const codigo = r.movimientoCodigo || '';
      const ident = r.identificadorUnico || '';
      return {
        movimientoCodigo: codigo,
        displayCodigo: ident || codigo,
        identificadorUnico: ident || undefined,
        movimientoId: Number(r.movimientoId),
        numeroOrden: r.numeroOrden ? String(r.numeroOrden).trim() : undefined,
        materialesCount: Number(r.materialesCount || 0),
        totalCantidad: Number(r.totalCantidad || 0),
        proveedorNombre: prov?.proveedorNombre || '-',
        proveedorId: pid && pid > 0 ? pid : undefined,
        fechaCreacion: r.fechaCreacion,
      };
    });

    return { data, total, page, limit };
  }

  /**
   * Recorre todas las páginas con límite 50 (exportaciones / jobs internos).
   * Cada 20 páginas API cede el event loop para no bloquear Node con datasets enormes.
   */
  async findAllFetchAllPages(user?: any): Promise<any[]> {
    const PAGE_SIZE = 50;
    const PAGES_PER_WINDOW = 20;
    const acc: any[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    for (;;) {
      const res = await this.findAll({ page, limit: PAGE_SIZE }, user);
      total = Number(res.total) || acc.length + res.data.length;
      acc.push(...res.data);
      if (res.data.length < PAGE_SIZE || acc.length >= total) {
        break;
      }
      if (page % PAGES_PER_WINDOW === 0) {
        await new Promise<void>((resolve) => setImmediate(() => resolve()));
      }
      page += 1;
      if (page > 50_000) {
        break;
      }
    }

    return acc;
  }

  async findOne(id: number, user?: any): Promise<any> {
    // Obtener el movimiento sin relaciones problemáticas (bodega se obtiene a través de inventario)
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    // La instalacion se carga manualmente cuando es necesario
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
      relations: ['usuario', 'proveedor', 'inventario', 'inventario.bodega'],
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    // Admin (centro operativo): solo movimientos de inventarios de bodegas de su sede
    if (user && rolTipo === 'admin' && user.usuarioSede) {
      const sedeIdBodega = movimiento.inventario?.bodega?.sedeId ?? null;
      // Si el movimiento tiene bodega y no es de la sede del admin, denegar
      if (sedeIdBodega != null && sedeIdBodega !== user.usuarioSede) {
        throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
      }
    }
    const rolesConFiltroBodega = [
      'admin-internas',
      'admin-redes',
      'bodega-internas',
      'bodega-redes',
    ];
    if (user && rolesConFiltroBodega.includes(rolTipo)) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const bodegaIdMov =
        movimiento.inventario?.bodegaId ?? movimiento.inventario?.bodega?.bodegaId;
      const permitido =
        bodegaIdMov != null && bodegasPermitidas.some((b) => b.bodegaId === bodegaIdMov);
      if (!permitido) {
        throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
      }
    }

    // Cargar material manualmente
    const movimientoConRelaciones: any = { ...movimiento };

    const parsedNumeros = parseNumerosMedidorField(movimiento.numerosMedidor);
    if (parsedNumeros !== undefined) {
      movimientoConRelaciones.numerosMedidor = parsedNumeros;
    }
    if (movimiento.materialId) {
      try {
        const material = await this.materialesService.findOne(movimiento.materialId);
        movimientoConRelaciones.material = {
          materialId: material.materialId,
          materialCodigo: material.materialCodigo,
          materialNombre: material.materialNombre,
          materialStock: material.materialStock,
          materialPrecio: material.materialPrecio,
          materialFoto: material.materialFoto,
          materialEstado: material.materialEstado,
          materialEsMedidor: material.materialEsMedidor || false,
        };
      } catch (err) {
        // Error silencioso al cargar material
      }
    }

    // Asegurar que inventario tenga bodega cargada
    if (movimiento.inventario && !movimiento.inventario.bodega && movimiento.inventario.bodegaId) {
      try {
        const inventarioCompleto = await this.inventariosService.findOne(
          movimiento.inventario.inventarioId,
        );
        movimientoConRelaciones.inventario = inventarioCompleto;
      } catch (err) {
        // Error silencioso al cargar inventario
      }
    }

    // Asignar bodega desde inventario
    if (movimientoConRelaciones.inventario) {
      movimientoConRelaciones.bodega = movimientoConRelaciones.inventario.bodega ?? null;
      movimientoConRelaciones.bodegaId =
        movimientoConRelaciones.inventario.bodegaId ??
        movimientoConRelaciones.inventario.bodega?.bodegaId ??
        null;
    }

    // Cargar proveedor si existe y no está cargado
    if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
      try {
        const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
        movimientoConRelaciones.proveedor = {
          proveedorId: proveedor.proveedorId,
          proveedorNombre: proveedor.proveedorNombre,
          proveedorNit: proveedor.proveedorNit,
          proveedorTelefono: proveedor.proveedorTelefono,
          proveedorEmail: proveedor.proveedorEmail,
          proveedorDireccion: proveedor.proveedorDireccion,
          proveedorContacto: proveedor.proveedorContacto,
          proveedorEstado: proveedor.proveedorEstado,
        };
      } catch (err) {
        // Error silencioso al cargar proveedor
      }
    }

    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

    // Cargar usuario si existe y no está cargado
    if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
      try {
        const usuario = await this.usersService.findOne(movimiento.usuarioId);
        movimientoConRelaciones.usuario = {
          usuarioId: usuario.usuarioId,
          usuarioNombre: usuario.usuarioNombre,
          usuarioApellido: usuario.usuarioApellido,
          usuarioCorreo: usuario.usuarioCorreo,
          usuarioTelefono: usuario.usuarioTelefono,
          usuarioDocumento: usuario.usuarioDocumento,
          usuarioEstado: usuario.usuarioEstado,
          // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
        };
      } catch (err) {
        // Error silencioso al cargar usuario
      }
    }

    return movimientoConRelaciones;
  }

  async findByCodigo(codigo: string): Promise<any[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    // La instalacion se carga manualmente cuando es necesario
    const movimientos = await this.movimientosRepository.find({
      where: { movimientoCodigo: codigo },
      relations: [
        'usuario',
        'proveedor',
        'inventario',
        'inventario.bodega',
        'inventario.bodega.sede',
      ],
    });

    // Cargar materiales manualmente para cada movimiento
    const movimientosConRelaciones = await Promise.all(
      movimientos.map(async (movimiento) => {
        const movimientoConRelaciones: any = { ...movimiento };

        const parsedNumeros = parseNumerosMedidorField(movimiento.numerosMedidor);
        if (parsedNumeros !== undefined) {
          movimientoConRelaciones.numerosMedidor = parsedNumeros;
        }

        if (movimiento.materialId) {
          try {
            const material = await this.materialesService.findOne(movimiento.materialId);
            movimientoConRelaciones.material = {
              materialId: material.materialId,
              materialCodigo: material.materialCodigo,
              materialNombre: material.materialNombre,
              materialStock: material.materialStock,
              materialPrecio: material.materialPrecio,
              materialFoto: material.materialFoto,
              materialEstado: material.materialEstado,
              materialEsMedidor: material.materialEsMedidor || false,
            };
          } catch (err) {
            // Error silencioso al cargar material
          }
        }

        // Cargar inventario si existe
        if (movimiento.inventarioId) {
          try {
            const inventarioCompleto = await this.inventariosService.findOne(
              movimiento.inventarioId,
            );
            movimientoConRelaciones.inventario = inventarioCompleto;

            // Asignar bodega desde inventario
            if (inventarioCompleto) {
              movimientoConRelaciones.bodega = inventarioCompleto.bodega ?? null;
              movimientoConRelaciones.bodegaId =
                inventarioCompleto.bodegaId ?? inventarioCompleto.bodega?.bodegaId ?? null;
            }
          } catch (err) {
            // Error silencioso al cargar inventario
          }
        }

        // Cargar proveedor si existe y no está cargado
        if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoConRelaciones.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
              proveedorNit: proveedor.proveedorNit,
              proveedorTelefono: proveedor.proveedorTelefono,
              proveedorEmail: proveedor.proveedorEmail,
              proveedorDireccion: proveedor.proveedorDireccion,
              proveedorContacto: proveedor.proveedorContacto,
              proveedorEstado: proveedor.proveedorEstado,
            };
          } catch (err) {
            // Error silencioso al cargar proveedor
          }
        }

        // Cargar usuario si existe y no está cargado
        if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoConRelaciones.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
              usuarioTelefono: usuario.usuarioTelefono,
              usuarioDocumento: usuario.usuarioDocumento,
              usuarioEstado: usuario.usuarioEstado,
              // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
            };
          } catch (err) {
            // Error silencioso al cargar usuario
          }
        }

        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async findByInstalacion(instalacionId: number): Promise<any[]> {
    // Usar query builder con select explícito para evitar que TypeORM intente seleccionar inventarioId
    // que puede no existir en la base de datos
    // Seleccionar solo las columnas que existen en la BD
    const movimientos = await this.movimientosRepository
      .createQueryBuilder('movimiento')
      .select([
        'movimiento.movimientoId',
        'movimiento.materialId',
        'movimiento.movimientoTipo',
        'movimiento.movimientoCantidad',
        'movimiento.movimientoPrecioUnitario',
        'movimiento.movimientoObservaciones',
        'movimiento.instalacionId',
        'movimiento.usuarioId',
        'movimiento.proveedorId',
        // movimientoCodigo no se selecciona porque puede no existir en la BD
        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
        'movimiento.movimientoEstado',
        'movimiento.fechaCreacion',
        'movimiento.fechaActualizacion',
      ])
      .leftJoinAndSelect('movimiento.usuario', 'usuario')
      .leftJoinAndSelect(
        'movimiento.instalacion',
        'instalacion',
        'instalacion.instalacionId = movimiento.instalacionId',
      )
      .addSelect(['instalacion.instalacionId', 'instalacion.instalacionCodigo'])
      .leftJoinAndSelect('movimiento.proveedor', 'proveedor')
      .where('movimiento.instalacionId = :instalacionId', { instalacionId })
      .getMany();

    // Nota: inventarioId no se selecciona porque puede no existir en la BD
    // Se cargará manualmente más adelante si es necesario usando movimiento.inventarioId
    // que se obtiene de la consulta raw cuando se necesita

    // Cargar materiales manualmente
    const movimientosConRelaciones = await Promise.all(
      movimientos.map(async (movimiento) => {
        const movimientoConRelaciones: any = { ...movimiento };

        if (movimiento.materialId) {
          try {
            const material = await this.materialesService.findOne(movimiento.materialId);
            movimientoConRelaciones.material = {
              materialId: material.materialId,
              materialCodigo: material.materialCodigo,
              materialNombre: material.materialNombre,
              materialStock: material.materialStock,
              materialPrecio: material.materialPrecio,
              materialFoto: material.materialFoto,
              materialEstado: material.materialEstado,
              materialEsMedidor: material.materialEsMedidor || false,
            };
          } catch (err) {
            // Error silencioso al cargar material
          }
        }

        // Cargar inventario si existe
        if (movimiento.inventarioId) {
          try {
            const inventarioCompleto = await this.inventariosService.findOne(
              movimiento.inventarioId,
            );
            movimientoConRelaciones.inventario = inventarioCompleto;

            // Asignar bodega desde inventario
            if (inventarioCompleto) {
              movimientoConRelaciones.bodega = inventarioCompleto.bodega ?? null;
              movimientoConRelaciones.bodegaId =
                inventarioCompleto.bodegaId ?? inventarioCompleto.bodega?.bodegaId ?? null;
            }
          } catch (err) {
            // Error silencioso al cargar inventario
          }
        }

        // Cargar proveedor si existe y no está cargado
        if (movimiento.proveedorId && !movimientoConRelaciones.proveedor) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoConRelaciones.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
              proveedorNit: proveedor.proveedorNit,
              proveedorTelefono: proveedor.proveedorTelefono,
              proveedorEmail: proveedor.proveedorEmail,
              proveedorDireccion: proveedor.proveedorDireccion,
              proveedorContacto: proveedor.proveedorContacto,
              proveedorEstado: proveedor.proveedorEstado,
            };
          } catch (err) {
            // Error silencioso al cargar proveedor
          }
        }

        // Cargar usuario si existe y no está cargado
        if (movimiento.usuarioId && !movimientoConRelaciones.usuario) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoConRelaciones.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
              usuarioTelefono: usuario.usuarioTelefono,
              usuarioDocumento: usuario.usuarioDocumento,
              usuarioEstado: usuario.usuarioEstado,
              // usuarioOficina eliminado - las bodegas ahora pertenecen directamente a sedes
            };
          } catch (err) {
            // Error silencioso al cargar usuario
          }
        }

        // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async update(
    id: number,
    updateMovimientoDto: Partial<CreateMovimientoDto>,
  ): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Guardar valores originales para revertir stock
    const movimientoTipoOriginal = movimiento.movimientoTipo;
    const cantidadOriginal = Number(movimiento.movimientoCantidad) || 0;
    const materialIdOriginal = movimiento.materialId;
    const inventarioIdOriginal = movimiento.inventarioId;
    const movimientoCompletado = movimiento.movimientoEstado === EstadoMovimiento.COMPLETADA;

    // Revertir stock del movimiento original si estaba completado
    if (movimientoCompletado && inventarioIdOriginal) {
      try {
        const inventarioOriginal = await this.inventariosService.findOne(inventarioIdOriginal);
        const bodegaIdOriginal = inventarioOriginal.bodegaId || inventarioOriginal.bodega?.bodegaId;

        if (bodegaIdOriginal) {
          // Revertir el stock (invertir la operación original)
          let cantidadRevertir = 0;
          switch (movimientoTipoOriginal) {
            case TipoMovimiento.ENTRADA:
              cantidadRevertir = -cantidadOriginal; // Revertir entrada = restar
              break;
            case TipoMovimiento.SALIDA:
              cantidadRevertir = cantidadOriginal; // Revertir salida = sumar
              break;
            case TipoMovimiento.DEVOLUCION:
              cantidadRevertir = cantidadOriginal; // Revertir devolución = sumar (porque devolución resta stock)
              break;
          }

          await this.materialesService.ajustarStock(
            materialIdOriginal,
            cantidadRevertir,
            bodegaIdOriginal,
          );
        }
      } catch (error) {
        // Continuar con la actualización aunque falle la reversión de stock
      }
    }

    // Actualizar campos permitidos
    if (updateMovimientoDto.movimientoObservaciones !== undefined) {
      movimiento.movimientoObservaciones = updateMovimientoDto.movimientoObservaciones || null;
    }
    if (updateMovimientoDto.instalacionId !== undefined) {
      movimiento.instalacionId = updateMovimientoDto.instalacionId || null;
    }
    if (updateMovimientoDto.proveedorId !== undefined) {
      movimiento.proveedorId = updateMovimientoDto.proveedorId || null;
    }
    if (updateMovimientoDto.inventarioId !== undefined) {
      movimiento.inventarioId = updateMovimientoDto.inventarioId || null;
    }
    if (updateMovimientoDto.materiales && updateMovimientoDto.materiales.length > 0) {
      const primer = updateMovimientoDto.materiales[0];
      if (primer.numerosMedidor !== undefined) {
        const nums = Array.isArray(primer.numerosMedidor)
          ? primer.numerosMedidor.map((x) => String(x || '').trim()).filter(Boolean)
          : [];
        movimiento.numerosMedidor = nums.length > 0 ? nums : null;
      }
    }
    if (updateMovimientoDto.numeroOrden !== undefined) {
      const trimmed =
        updateMovimientoDto.numeroOrden != null ? String(updateMovimientoDto.numeroOrden).trim() : '';
      await this.assertNumeroOrdenUnicoPorGrupo(
        trimmed || null,
        movimiento.movimientoCodigo ?? null,
        [movimiento.movimientoId],
      );
      movimiento.numeroOrden = trimmed ? trimmed : null;
    }
    // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes

    // Si hay materiales, actualizar el primer material (para movimientos únicos)
    let nuevaCantidad = cantidadOriginal;
    let nuevoMaterialId = materialIdOriginal;
    let nuevoInventarioId = inventarioIdOriginal;

    if (updateMovimientoDto.materiales && updateMovimientoDto.materiales.length > 0) {
      const primerMaterial = updateMovimientoDto.materiales[0];
      nuevoMaterialId = primerMaterial.materialId;
      nuevaCantidad = Number(primerMaterial.movimientoCantidad) || 0;
      movimiento.materialId = nuevoMaterialId;
      movimiento.movimientoCantidad = nuevaCantidad;
      movimiento.movimientoPrecioUnitario = primerMaterial.movimientoPrecioUnitario || null;
    }

    // Obtener el nuevo inventarioId (puede haber cambiado)
    nuevoInventarioId = movimiento.inventarioId || inventarioIdOriginal;

    // Guardar el movimiento actualizado
    const movimientoActualizado = (await this.movimientosRepository.save(
      movimiento,
    )) as unknown as MovimientoInventario;

    // Aplicar el nuevo ajuste de stock si el movimiento está completado
    if (movimientoCompletado && nuevoInventarioId) {
      try {
        const inventarioNuevo = await this.inventariosService.findOne(nuevoInventarioId);
        const bodegaIdNuevo = inventarioNuevo.bodegaId || inventarioNuevo.bodega?.bodegaId;

        if (bodegaIdNuevo) {
          // Aplicar el nuevo ajuste de stock usando el método privado
          await this.ajustarStockMovimiento(
            nuevoMaterialId,
            movimientoTipoOriginal,
            nuevaCantidad,
            bodegaIdNuevo,
          );
        }
      } catch (error) {
        // Continuar aunque falle el ajuste de stock
      }
    }

    return movimientoActualizado;
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    // Validaciones previas
    if (!id || isNaN(id) || id <= 0) {
      throw new BadRequestException('ID de movimiento inválido');
    }

    if (!usuarioId || isNaN(usuarioId) || usuarioId <= 0) {
      throw new BadRequestException('ID de usuario inválido');
    }

    // Verificar que el movimiento existe directamente en la base de datos
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId: id },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${id} no encontrado`);
    }

    // Guardar datos completos para auditoría
    const datosEliminados = {
      movimientoId: movimiento.movimientoId,
      materialId: movimiento.materialId,
      movimientoTipo: movimiento.movimientoTipo,
      movimientoCantidad: movimiento.movimientoCantidad,
      movimientoPrecioUnitario: movimiento.movimientoPrecioUnitario,
      movimientoObservaciones: movimiento.movimientoObservaciones,
      instalacionId: movimiento.instalacionId,
      usuarioId: movimiento.usuarioId,
      proveedorId: movimiento.proveedorId,
      inventarioId: movimiento.inventarioId,
      movimientoCodigo: movimiento.movimientoCodigo,
      identificadorUnico: movimiento.identificadorUnico,
      // oficinaId eliminado - las bodegas ahora pertenecen directamente a sedes
      movimientoEstado: movimiento.movimientoEstado,
      fechaCreacion: movimiento.fechaCreacion,
      fechaActualizacion: movimiento.fechaActualizacion,
    };

    // Revertir stock si el movimiento estaba completado y tiene inventario/bodega
    const movimientoCompletado = movimiento.movimientoEstado === EstadoMovimiento.COMPLETADA;

    if (movimientoCompletado && movimiento.inventarioId) {
      try {
        // Validar que el inventario existe
        const inventario = await this.inventariosService.findOne(movimiento.inventarioId);

        if (!inventario) {
          throw new BadRequestException(
            `Inventario con ID ${movimiento.inventarioId} no encontrado`,
          );
        }

        const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;

        if (bodegaId) {
          // Validar que el material existe
          const material = await this.materialesService.findOne(movimiento.materialId);

          if (!material) {
            throw new BadRequestException(`Material con ID ${movimiento.materialId} no encontrado`);
          }

          // Revertir el stock (invertir la operación original)
          const tipoStr = String(movimiento.movimientoTipo).toLowerCase();
          const esDevolucion =
            tipoStr === 'devolucion' || movimiento.movimientoTipo === TipoMovimiento.DEVOLUCION;
          const esEntrada =
            tipoStr === 'entrada' || movimiento.movimientoTipo === TipoMovimiento.ENTRADA;
          const esSalida =
            tipoStr === 'salida' || movimiento.movimientoTipo === TipoMovimiento.SALIDA;

          let cantidadRevertir = 0;
          const cantidadNumerica = Number(movimiento.movimientoCantidad) || 0;

          if (cantidadNumerica <= 0) {
            throw new BadRequestException('La cantidad del movimiento debe ser mayor a cero');
          }

          if (esEntrada) {
            // Revertir entrada = restar (porque entrada suma stock)
            cantidadRevertir = -cantidadNumerica;
          } else if (esSalida) {
            // Revertir salida = sumar (porque salida resta stock)
            cantidadRevertir = cantidadNumerica;
          } else if (esDevolucion) {
            // Revertir devolución = sumar (porque devolución RESTA stock, entonces revertir es SUMAR)
            cantidadRevertir = cantidadNumerica;
          }

          await this.materialesService.ajustarStock(
            movimiento.materialId,
            cantidadRevertir,
            bodegaId,
          );

          // Manejar números de medidor si el material es medidor
          try {
            if (material.materialEsMedidor && movimiento.numerosMedidor) {
              // Parsear números de medidor si viene como string (JSON)
              let numerosMedidorArray: string[] = [];
              if (typeof movimiento.numerosMedidor === 'string') {
                try {
                  numerosMedidorArray = JSON.parse(movimiento.numerosMedidor);
                } catch {
                  numerosMedidorArray = [];
                }
              } else if (Array.isArray(movimiento.numerosMedidor)) {
                numerosMedidorArray = movimiento.numerosMedidor;
              }

              if (numerosMedidorArray && numerosMedidorArray.length > 0) {
                // Buscar los IDs de los números de medidor
                const numerosMedidorIds: number[] = [];
                for (const numeroStr of numerosMedidorArray) {
                  try {
                    const numeroEntity = await this.numerosMedidorService.findByNumero(numeroStr);
                    if (numeroEntity) {
                      numerosMedidorIds.push(numeroEntity.numeroMedidorId);
                    }
                  } catch (error) {
                    console.warn(`No se encontró número de medidor: ${numeroStr}`);
                  }
                }

                if (numerosMedidorIds.length > 0) {
                  if (esEntrada) {
                    // Si se elimina una ENTRADA: verificar si los números fueron creados en esta entrada
                    // Solo eliminar si fueron creados recientemente (fechaCreacion cercana a la fecha del movimiento)
                    // Si no, liberarlos a disponible
                    for (const numeroId of numerosMedidorIds) {
                      try {
                        const numero = await this.numerosMedidorService.findOne(numeroId);
                        if (numero) {
                          // Verificar si el número fue creado en esta entrada (misma fecha aproximadamente)
                          const fechaMovimiento = new Date(movimiento.fechaCreacion);
                          const fechaNumero = new Date(numero.fechaCreacion);
                          const diferenciaDias = Math.abs(
                            (fechaMovimiento.getTime() - fechaNumero.getTime()) /
                              (1000 * 60 * 60 * 24),
                          );

                          // Si fue creado en los últimos 2 días, probablemente fue creado en esta entrada
                          if (diferenciaDias <= 2 && numero.estado === 'disponible') {
                            // Eliminar solo si fue creado recientemente y está disponible
                            await this.numerosMedidorService.remove(numeroId);
                          } else {
                            // Si no, liberarlo a disponible (puede haber sido usado antes)
                            await this.numerosMedidorService.liberarDeInstalacion([numeroId]);
                            await this.numerosMedidorService.liberarDeTecnico([numeroId]);
                          }
                        }
                      } catch (error) {
                        console.warn(`Error al procesar número de medidor ${numeroId}:`, error);
                      }
                    }
                  } else if (esSalida || esDevolucion) {
                    // Si se elimina una SALIDA/DEVOLUCION: liberar números de medidor
                    // Primero liberar de instalación si estaban instalados
                    await this.numerosMedidorService.liberarDeInstalacion(numerosMedidorIds);
                    // Luego liberar de técnico si estaban asignados
                    await this.numerosMedidorService.liberarDeTecnico(numerosMedidorIds);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error al manejar números de medidor durante eliminación:', error);
            // Continuar con la eliminación aunque falle el manejo de números de medidor
          }
        }
      } catch (error) {
        // Si es un error de validación, lanzarlo
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        // Para otros errores, loguear y continuar con la eliminación
        console.error('Error al revertir stock durante eliminación:', error);
      }
    }

    // Registrar en auditoría antes de eliminar
    try {
      await this.auditoriaService.registrarEliminacion(
        TipoEntidad.MOVIMIENTO,
        movimiento.movimientoId,
        datosEliminados,
        usuarioId,
        'Eliminación de movimiento',
        `Movimiento ${movimiento.movimientoTipo} eliminado. Stock revertido.`,
      );
    } catch (error) {
      // Loguear error pero continuar con la eliminación
      console.error('Error al registrar auditoría durante eliminación:', error);
    }

    // Eliminar el movimiento - verificar nuevamente que existe antes de eliminar
    try {
      const movimientoAEliminar = await this.movimientosRepository.findOne({
        where: { movimientoId: id },
      });

      if (!movimientoAEliminar) {
        throw new NotFoundException(`Movimiento con ID ${id} ya fue eliminado o no existe`);
      }

      await this.movimientosRepository.remove(movimientoAEliminar);
    } catch (error) {
      // Si es un error de validación, lanzarlo
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, intentar eliminar directamente
      await this.movimientosRepository.remove(movimiento);
    }
  }

  async actualizarEstado(
    movimientoId: number,
    nuevoEstado: EstadoMovimiento,
  ): Promise<MovimientoInventario> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { movimientoId },
    });

    if (!movimiento) {
      throw new NotFoundException(`Movimiento con ID ${movimientoId} no encontrado`);
    }

    const estadoAnterior = movimiento.movimientoEstado;
    const estabaCompletado = estadoAnterior === EstadoMovimiento.COMPLETADA;
    const seraCompletado = nuevoEstado === EstadoMovimiento.COMPLETADA;

    // Si el movimiento tiene inventario, ajustar stock según el cambio de estado
    if (movimiento.inventarioId) {
      try {
        const inventario = await this.inventariosService.findOne(movimiento.inventarioId);
        const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;

        if (bodegaId) {
          // Si estaba completado y ahora no lo está, revertir el stock
          if (estabaCompletado && !seraCompletado) {
            // Revertir el stock (invertir la operación original)
            let cantidadRevertir = 0;
            switch (movimiento.movimientoTipo) {
              case TipoMovimiento.ENTRADA:
                cantidadRevertir = -Number(movimiento.movimientoCantidad); // Revertir entrada = restar
                break;
              case TipoMovimiento.SALIDA:
                cantidadRevertir = Number(movimiento.movimientoCantidad); // Revertir salida = sumar
                break;
              case TipoMovimiento.DEVOLUCION:
                cantidadRevertir = Number(movimiento.movimientoCantidad); // Revertir devolución = sumar (porque devolución resta stock)
                break;
            }
            await this.materialesService.ajustarStock(
              movimiento.materialId,
              cantidadRevertir,
              bodegaId,
            );
          }
          // Si no estaba completado y ahora sí lo está, aplicar el ajuste de stock
          else if (!estabaCompletado && seraCompletado) {
            // Asegurar que para devoluciones se use el tipo correcto
            const tipoMovimiento = movimiento.movimientoTipo;
            const tipoStr = String(tipoMovimiento).toLowerCase();
            if (tipoStr === 'devolucion' || tipoMovimiento === TipoMovimiento.DEVOLUCION) {
              await this.ajustarStockMovimiento(
                movimiento.materialId,
                TipoMovimiento.DEVOLUCION, // Forzar el enum correcto
                Number(movimiento.movimientoCantidad),
                bodegaId,
              );
            } else {
              await this.ajustarStockMovimiento(
                movimiento.materialId,
                movimiento.movimientoTipo,
                Number(movimiento.movimientoCantidad),
                bodegaId,
              );
            }
          }
        }
      } catch (error) {
        // Continuar con la actualización aunque falle el ajuste de stock
      }
    }

    movimiento.movimientoEstado = nuevoEstado;
    return (await this.movimientosRepository.save(movimiento)) as unknown as MovimientoInventario;
  }

  async findByMaterial(materialId: number): Promise<any[]> {
    // Obtener todos los movimientos del material ordenados por fecha
    const rawMovimientos = await this.movimientosRepository.query(
      `SELECT 
          m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.numeroOrden,
          m.identificadorUnico,
          m.movimientoEstado,
          m.origenTipo,
          m.tecnicoOrigenId,
          m.fechaCreacion,
          m.fechaActualizacion
        FROM movimientos_inventario m
        WHERE m.materialId = ?
        ORDER BY m.fechaCreacion DESC`,
      [materialId],
    );

    // Obtener material actual para cálculo de stock
    const material = await this.materialesService.findOne(materialId);

    // Cargar inventarios y bodegas
    const inventariosIds = [
      ...new Set(
        rawMovimientos
          .map((m: any) => m.inventarioId)
          .filter((id: any) => id && typeof id === 'number'),
      ),
    ] as number[];
    const inventarioMap = new Map<number, any>();

    for (const inventarioId of inventariosIds) {
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        inventarioMap.set(inventarioId, inventario);
      } catch (err) {
        // Error silencioso
      }
    }

    // Calcular stock antes y después para cada movimiento
    // Ordenar movimientos de más antiguo a más reciente
    const movimientosOrdenados = [...rawMovimientos].sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaA - fechaB;
    });

    // Calcular stock antes y después recorriendo desde el principio
    // Empezar desde 0 y calcular stock acumulativo
    const stockPorMovimiento = new Map<number, { antes: number; despues: number }>();
    let stockAcumulado = 0; // Empezar desde 0 (stock inicial)

    for (const movimiento of movimientosOrdenados) {
      const cantidad = Number(movimiento.movimientoCantidad || 0);
      const tipo = movimiento.movimientoTipo;

      // Stock antes del movimiento (estado actual antes de aplicar este movimiento)
      const stockAntes = stockAcumulado;

      // Calcular stock después según el tipo de movimiento
      let stockDespues = stockAcumulado;
      if (tipo === 'entrada') {
        stockDespues = stockAcumulado + cantidad; // Entrada aumenta stock
      } else if (tipo === 'salida') {
        stockDespues = stockAcumulado - cantidad; // Salida disminuye stock
      } else if (tipo === 'devolucion') {
        stockDespues = stockAcumulado - cantidad; // Devolución disminuye stock
      }

      stockPorMovimiento.set(movimiento.movimientoId, {
        antes: stockAntes,
        despues: stockDespues,
      });

      // Actualizar stock acumulado para el siguiente movimiento
      stockAcumulado = stockDespues;
    }

    // Ahora procesar movimientos en orden descendente (más reciente primero) con la información de stock
    const movimientosDesc = [...rawMovimientos].sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    const movimientosConRelaciones = await Promise.all(
      movimientosDesc.map(async (movimiento: any) => {
        const movimientoConRelaciones: any = attachNumerosMedidorParsed({ ...movimiento });

        // Agregar información de stock
        const stockInfo = stockPorMovimiento.get(movimiento.movimientoId);
        movimientoConRelaciones.stockAntes = stockInfo?.antes ?? 0;
        movimientoConRelaciones.stockDespues = stockInfo?.despues ?? 0;

        // Cargar material
        movimientoConRelaciones.material = {
          materialId: material.materialId,
          materialCodigo: material.materialCodigo,
          materialNombre: material.materialNombre,
          materialStock: material.materialStock,
          materialEsMedidor: material.materialEsMedidor || false,
        };

        // Cargar inventario
        if (movimiento.inventarioId) {
          const inventario = inventarioMap.get(Number(movimiento.inventarioId));
          if (inventario) {
            movimientoConRelaciones.inventario = inventario;
            movimientoConRelaciones.bodega = inventario.bodega ?? null;
            movimientoConRelaciones.bodegaId =
              inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
          }
        }

        // Cargar usuario
        if (movimiento.usuarioId) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoConRelaciones.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar proveedor
        if (movimiento.proveedorId) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoConRelaciones.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar técnico origen si el movimiento viene de un técnico
        if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
          try {
            const tecnicoOrigen = await this.usersService.findOne(movimiento.tecnicoOrigenId);
            movimientoConRelaciones.tecnicoOrigen = {
              usuarioId: tecnicoOrigen.usuarioId,
              usuarioNombre: tecnicoOrigen.usuarioNombre,
              usuarioApellido: tecnicoOrigen.usuarioApellido,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        return movimientoConRelaciones;
      }),
    );

    return movimientosConRelaciones;
  }

  async findByBodega(bodegaId: number, user?: any): Promise<any[]> {
    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    const rolesConFiltroBodega = [
      'admin-internas',
      'admin-redes',
      'bodega-internas',
      'bodega-redes',
    ];
    if (user && rolesConFiltroBodega.includes(rolTipo)) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const permitido = bodegasPermitidas.some((b) => b.bodegaId === bodegaId);
      if (!permitido) {
        return [];
      }
    }
    // Obtener todos los inventarios de la bodega (filtrados por user si aplica)
    const allInventarios = await this.inventariosService.findAll(user);
    const inventarios = allInventarios.filter(
      (inv) => inv.bodegaId === bodegaId && inv.inventarioEstado,
    );

    if (inventarios.length === 0) {
      return [];
    }

    const inventariosIds = inventarios.map((inv) => inv.inventarioId);

    // Obtener todos los movimientos de esos inventarios
    const rawMovimientos = await this.movimientosRepository.query(
      `SELECT 
          m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.numeroOrden,
          m.identificadorUnico,
          m.movimientoEstado,
          m.origenTipo,
          m.tecnicoOrigenId,
          m.numerosMedidor,
          m.fechaCreacion,
          m.fechaActualizacion
        FROM movimientos_inventario m
        WHERE m.inventarioId IN (${inventariosIds.map(() => '?').join(',')})
        ORDER BY m.fechaCreacion ASC`,
      inventariosIds,
    );

    // Calcular stock antes y después para cada movimiento por material
    const movimientosConStock = await this.calcularStockMovimientos(rawMovimientos);

    // Ordenar por fecha descendente (más reciente primero)
    const movimientosOrdenados = movimientosConStock.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return await this.enrichMovimientos(movimientosOrdenados);
  }

  async findBySede(sedeId: number, user?: any): Promise<any[]> {
    const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
    if (
      user &&
      (rolTipo === 'admin-internas' || rolTipo === 'admin-redes') &&
      user.usuarioSede !== sedeId
    ) {
      return [];
    }
    if (user && (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes')) {
      const bodegasPermitidas = await this.bodegasService.findAll(user);
      const sedesPermitidas = new Set(bodegasPermitidas.map((b) => b.sedeId).filter(Boolean));
      if (!sedesPermitidas.has(sedeId)) {
        return [];
      }
    }
    const sid = Number(sedeId);

    const bodegas = await this.movimientosRepository.query(
      `SELECT b.bodegaId 
         FROM bodegas b
         WHERE b.sedeId = ?`,
      [sid],
    );
    const bodegasIds = bodegas.map((b: any) => b.bodegaId);

    const selectCols = `m.movimientoId,
          m.materialId,
          m.movimientoTipo,
          m.movimientoCantidad,
          m.movimientoPrecioUnitario,
          m.movimientoObservaciones,
          m.instalacionId,
          m.usuarioId,
          m.proveedorId,
          m.inventarioId,
          m.movimientoCodigo,
          m.numeroOrden,
          m.identificadorUnico,
          m.movimientoEstado,
          m.origenTipo,
          m.tecnicoOrigenId,
          m.numerosMedidor,
          m.fechaCreacion,
          m.fechaActualizacion`;

    let rawPorInventario: any[] = [];
    if (bodegasIds.length > 0) {
      const allInventarios = await this.inventariosService.findAll(user);
      const inventarios = allInventarios.filter(
        (inv) => bodegasIds.includes(inv.bodegaId) && inv.inventarioEstado,
      );
      const inventariosIds = inventarios.map((inv) => inv.inventarioId);
      if (inventariosIds.length > 0) {
        rawPorInventario = await this.movimientosRepository.query(
          `SELECT 
          ${selectCols}
        FROM movimientos_inventario m
        WHERE m.inventarioId IN (${inventariosIds.map(() => '?').join(',')})
        ORDER BY m.fechaCreacion ASC`,
          inventariosIds,
        );
      }
    }

    const rawEntradaSinInventario = await this.movimientosRepository.query(
      `SELECT ${selectCols}
        FROM movimientos_inventario m
        INNER JOIN usuarios u ON u.usuarioId = m.usuarioId
        LEFT JOIN bodegas ub ON ub.bodegaId = u.usuarioBodega
        WHERE m.inventarioId IS NULL
          AND LOWER(CAST(m.movimientoTipo AS CHAR)) = 'entrada'
          AND (u.usuarioSede = ? OR ub.sedeId = ?)
        ORDER BY m.fechaCreacion ASC`,
      [sid, sid],
    );

    const porId = new Map<number, any>();
    for (const m of rawPorInventario) {
      porId.set(Number(m.movimientoId), m);
    }
    for (const m of rawEntradaSinInventario) {
      const id = Number(m.movimientoId);
      if (!porId.has(id)) porId.set(id, m);
    }
    const merged = Array.from(porId.values());
    if (merged.length === 0) {
      return [];
    }

    const movimientosConStock = await this.calcularStockMovimientos(merged);
    const movimientosOrdenados = movimientosConStock.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion).getTime();
      const fechaB = new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return await this.enrichMovimientos(movimientosOrdenados);
  }

  async findByTecnico(usuarioId: number): Promise<any[]> {
    // Obtener todas las asignaciones del técnico desde inventario-tecnico
    const asignaciones = await this.movimientosRepository.query(
      `SELECT 
          it.inventarioTecnicoId,
          it.materialId,
          it.cantidad,
          it.fechaCreacion,
          it.fechaActualizacion
        FROM inventario_tecnicos it
        WHERE it.usuarioId = ?
        ORDER BY it.fechaCreacion ASC`,
      [usuarioId],
    );

    // Calcular stock acumulado para cada asignación
    const historialItems: any[] = [];
    const stockPorMaterial = new Map<number, number>();

    for (const asignacion of asignaciones) {
      const materialId = asignacion.materialId;
      const cantidad = Number(asignacion.cantidad || 0);

      // Stock antes es el acumulado actual del material
      const stockAntes = stockPorMaterial.get(materialId) || 0;
      const stockDespues = stockAntes + cantidad;

      // Actualizar stock acumulado
      stockPorMaterial.set(materialId, stockDespues);

      // Cargar información del material
      let material: any = null;
      try {
        const materialData = await this.materialesService.findOne(materialId);
        material = {
          materialId: materialData.materialId,
          materialCodigo: materialData.materialCodigo,
          materialNombre: materialData.materialNombre,
        };
      } catch (err) {
        // Error silencioso
      }

      historialItems.push({
        id: `asignacion-${asignacion.inventarioTecnicoId}`,
        tipo: 'asignacion',
        fecha: new Date(asignacion.fechaCreacion),
        cantidad,
        stockAntes,
        stockDespues,
        material,
        usuario: {
          usuarioId,
        },
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    return historialItems.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  }

  private async calcularStockMovimientos(rawMovimientos: any[]): Promise<any[]> {
    // Agrupar movimientos por material
    const movimientosPorMaterial = new Map<number, any[]>();

    rawMovimientos.forEach((mov: any) => {
      const materialId = mov.materialId;
      if (!movimientosPorMaterial.has(materialId)) {
        movimientosPorMaterial.set(materialId, []);
      }
      movimientosPorMaterial.get(materialId)!.push(mov);
    });

    // Calcular stock para cada material
    const movimientosConStock: any[] = [];

    for (const [_materialId, movimientos] of movimientosPorMaterial.entries()) {
      // Ordenar movimientos por fecha (más antiguo primero)
      const movimientosOrdenados = movimientos.sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion).getTime();
        const fechaB = new Date(b.fechaCreacion).getTime();
        return fechaA - fechaB;
      });

      let stockAcumulado = 0;

      for (const movimiento of movimientosOrdenados) {
        const cantidad = Number(movimiento.movimientoCantidad || 0);
        const tipo = movimiento.movimientoTipo;

        const stockAntes = stockAcumulado;
        let stockDespues = stockAcumulado;

        if (tipo === 'entrada') {
          stockDespues = stockAcumulado + cantidad;
        } else if (tipo === 'salida') {
          stockDespues = stockAcumulado - cantidad;
        } else if (tipo === 'devolucion') {
          stockDespues = stockAcumulado - cantidad;
        }

        movimientosConStock.push({
          ...movimiento,
          stockAntes,
          stockDespues,
        });

        stockAcumulado = stockDespues;
      }
    }

    return movimientosConStock;
  }

  private async enrichMovimientos(rawMovimientos: any[]): Promise<any[]> {
    const inventariosIds = [
      ...new Set(
        rawMovimientos
          .map((m: any) => m.inventarioId)
          .filter((id: any) => id && typeof id === 'number'),
      ),
    ] as number[];
    const inventarioMap = new Map<number, any>();

    for (const inventarioId of inventariosIds) {
      try {
        const inventario = await this.inventariosService.findOne(inventarioId);
        inventarioMap.set(inventarioId, inventario);
      } catch (err) {
        // Error silencioso
      }
    }

    return await Promise.all(
      rawMovimientos.map(async (movimiento: any) => {
        const movimientoEnriquecido: any = attachNumerosMedidorParsed({ ...movimiento });

        // Cargar material
        try {
          const material = await this.materialesService.findOne(movimiento.materialId);
          movimientoEnriquecido.material = {
            materialId: material.materialId,
            materialCodigo: material.materialCodigo,
            materialNombre: material.materialNombre,
            materialStock: material.materialStock,
          };
        } catch (err) {
          // Error silencioso
        }

        // Cargar inventario y bodega
        if (movimiento.inventarioId) {
          const inventario = inventarioMap.get(Number(movimiento.inventarioId));
          if (inventario) {
            movimientoEnriquecido.inventario = inventario;
            movimientoEnriquecido.bodega = inventario.bodega ?? null;
            movimientoEnriquecido.bodegaId =
              inventario.bodegaId ?? inventario.bodega?.bodegaId ?? null;
          }
        }

        // Cargar usuario
        if (movimiento.usuarioId) {
          try {
            const usuario = await this.usersService.findOne(movimiento.usuarioId);
            movimientoEnriquecido.usuario = {
              usuarioId: usuario.usuarioId,
              usuarioNombre: usuario.usuarioNombre,
              usuarioApellido: usuario.usuarioApellido,
              usuarioCorreo: usuario.usuarioCorreo,
              usuarioSede: usuario.usuarioSede ?? null,
              usuarioBodega: usuario.usuarioBodega ?? null,
              bodegaSedeId: usuario.bodega?.sedeId ?? null,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar técnico origen si el movimiento viene de un técnico
        if (movimiento.origenTipo === 'tecnico' && movimiento.tecnicoOrigenId) {
          try {
            const tecnicoOrigen = await this.usersService.findOne(movimiento.tecnicoOrigenId);
            movimientoEnriquecido.tecnicoOrigen = {
              usuarioId: tecnicoOrigen.usuarioId,
              usuarioNombre: tecnicoOrigen.usuarioNombre,
              usuarioApellido: tecnicoOrigen.usuarioApellido,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        // Cargar proveedor
        if (movimiento.proveedorId) {
          try {
            const proveedor = await this.proveedoresService.findOne(movimiento.proveedorId);
            movimientoEnriquecido.proveedor = {
              proveedorId: proveedor.proveedorId,
              proveedorNombre: proveedor.proveedorNombre,
            };
          } catch (err) {
            // Error silencioso
          }
        }

        return movimientoEnriquecido;
      }),
    );
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
