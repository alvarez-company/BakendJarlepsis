import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Instalacion, EstadoInstalacion } from './instalacion.entity';
import { esEstadoInstalacionCanonico, normalizarEstadoInstalacionCodigo } from './estado-instalacion.codes';
import { CreateInstalacionDto } from './dto/create-instalacion.dto';
import { UpdateInstalacionDto } from './dto/update-instalacion.dto';
import { ChatGateway } from '../chat/chat.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { InstalacionesUsuariosService } from '../instalaciones-usuarios/instalaciones-usuarios.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { ClientesService } from '../clientes/clientes.service';
import { Cliente, EstadoCliente } from '../clientes/cliente.entity';
import { TipoMovimiento, EstadoMovimiento } from '../movimientos/movimiento-inventario.entity';
import { GruposService } from '../grupos/grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';
import { EstadosInstalacionService } from '../estados-instalacion/estados-instalacion.service';
import { InstalacionesMaterialesService } from '../instalaciones-materiales/instalaciones-materiales.service';
import { InventarioTecnicoService } from '../inventario-tecnico/inventario-tecnico.service';
import { UsersService } from '../users/users.service';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { ProyectosRedesService } from '../proyectos-redes/proyectos-redes.service';

@Injectable()
export class InstalacionesService {
  constructor(
    @InjectRepository(Instalacion)
    private instalacionesRepository: Repository<Instalacion>,
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => InstalacionesUsuariosService))
    private instalacionesUsuariosService: InstalacionesUsuariosService,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => ClientesService))
    private clientesService: ClientesService,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
    @Inject(forwardRef(() => EstadosInstalacionService))
    private estadosInstalacionService: EstadosInstalacionService,
    @Inject(forwardRef(() => InstalacionesMaterialesService))
    private instalacionesMaterialesService: InstalacionesMaterialesService,
    @Inject(forwardRef(() => InventarioTecnicoService))
    private inventarioTecnicoService: InventarioTecnicoService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    private readonly proyectosRedesService: ProyectosRedesService,
  ) {}

  /** True si el cliente envió proyectos/actividades que deben rechazarse en instalaciones internas. */
  private instalacionProyectosPayloadNoVacio(raw: any): boolean {
    if (raw == null) return false;
    if (Array.isArray(raw)) return raw.length > 0;
    if (typeof raw === 'object') return Object.keys(raw).length > 0;
    return Boolean(raw);
  }

  /**
   * Valida y persiste el contrato redes_v2 (solo filas fijas en proyectos_redes + actividades + metrajes ZV/ACO/CO).
   */
  private async normalizarInstalacionProyectosRedes(raw: any): Promise<{
    version: 'redes_v2';
    proyectoRedesId: number;
    proyectoRedesCodigo: string;
    metrajePorTipologia: { ZV: number; ACO: number; CO: number };
    actividadIds: number[];
  }> {
    if (raw == null) {
      // Compatibilidad: permitir instalaciones de redes sin payload y asignar Inversión por defecto.
      const tipo = await this.proyectosRedesService.findByCodigo('inversion');
      if (!tipo) {
        throw new BadRequestException(
          'No se encontró el tipo por defecto de proyecto de redes (inversion). Ejecute la migración de proyectos_redes.',
        );
      }
      return {
        version: 'redes_v2',
        proyectoRedesId: tipo.proyectoRedesId,
        proyectoRedesCodigo: tipo.codigo,
        metrajePorTipologia: { ZV: 0, ACO: 0, CO: 0 },
        actividadIds: [],
      };
    }
    if (Array.isArray(raw)) {
      throw new BadRequestException(
        'El formato de proyectos por combinación (lista) ya no está soportado. Use el objeto de proyecto de redes: tipo inversión/mantenimiento, metrajes por tipología (ZV, ACO, CO) e IDs de actividades.',
      );
    }
    if (typeof raw !== 'object') {
      throw new BadRequestException('instalacionProyectos inválido.');
    }
    const version = (raw as any).version;
    if (version != null && version !== 'redes_v2') {
      throw new BadRequestException(`Versión de instalacionProyectos no soportada: ${String(version)}.`);
    }

    let proyectoRedesId: number | undefined =
      (raw as any).proyectoRedesId != null ? Number((raw as any).proyectoRedesId) : undefined;
    const codigoRaw = (
      (raw as any).proyectoRedesCodigo ||
      (raw as any).proyectoTipoRedes ||
      (raw as any).codigo ||
      ''
    )
      .toString()
      .trim()
      .toLowerCase();

    if (proyectoRedesId == null || Number.isNaN(proyectoRedesId)) {
      if (!codigoRaw) {
        throw new BadRequestException(
          'Debe indicar el tipo de proyecto de redes (inversión o mantenimiento).',
        );
      }
      const porCodigo = await this.proyectosRedesService.findByCodigo(codigoRaw);
      if (!porCodigo) {
        throw new BadRequestException(`Tipo de proyecto de redes '${codigoRaw}' no encontrado.`);
      }
      proyectoRedesId = porCodigo.proyectoRedesId;
    }

    const tipoRow = await this.proyectosRedesService.findTipoById(proyectoRedesId);

    const metSrc =
      (raw as any).metrajePorTipologia || (raw as any).terrenos || (raw as any).metrajes;
    if (!metSrc || typeof metSrc !== 'object') {
      throw new BadRequestException('Debe enviar metrajePorTipologia con ZV, ACO y CO.');
    }

    const leerMetraje = (k: string) => {
      const v =
        (metSrc as any)[k] ??
        (metSrc as any)[k.toLowerCase()] ??
        (metSrc as any)[k.toUpperCase()];
      if (v === '' || v == null) return 0;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0) {
        throw new BadRequestException(`El metraje ${k} debe ser un número mayor o igual a 0.`);
      }
      return n;
    };

    const metrajePorTipologia = {
      ZV: leerMetraje('ZV'),
      ACO: leerMetraje('ACO'),
      CO: leerMetraje('CO'),
    };

    let actividadIds: number[] = [];
    if ((raw as any).actividadIds != null) {
      if (!Array.isArray((raw as any).actividadIds)) {
        throw new BadRequestException('actividadIds debe ser un arreglo.');
      }
      actividadIds = ((raw as any).actividadIds as any[])
        .map((x) => Number(x))
        .filter((n) => !Number.isNaN(n));
    }

    await this.proyectosRedesService.assertActividadesPertenecen(
      tipoRow.proyectoRedesId,
      actividadIds,
    );

    return {
      version: 'redes_v2',
      proyectoRedesId: tipoRow.proyectoRedesId,
      proyectoRedesCodigo: tipoRow.codigo,
      metrajePorTipologia,
      actividadIds,
    };
  }

  private async generarIdentificadorUnico(): Promise<string> {
    try {
      // Buscar el último identificador único usando query raw para mejor compatibilidad
      const resultado = await this.instalacionesRepository.query(
        `SELECT identificadorUnico 
         FROM instalaciones 
         WHERE identificadorUnico IS NOT NULL 
           AND identificadorUnico LIKE 'INST-%'
         ORDER BY CAST(SUBSTRING(identificadorUnico, 6) AS UNSIGNED) DESC
         LIMIT 1`,
      );

      let siguienteNumero = 1;
      if (resultado && resultado.length > 0 && resultado[0].identificadorUnico) {
        const ultimoIdentificador = resultado[0].identificadorUnico;
        const match = ultimoIdentificador.match(/INST-(\d+)/);
        if (match) {
          siguienteNumero = parseInt(match[1], 10) + 1;
        }
      }

      const nuevoIdentificador = `INST-${siguienteNumero}`;
      return nuevoIdentificador;
    } catch (error) {
      console.error('Error al generar identificador único:', error);
      // En caso de error, usar timestamp como fallback
      return `INST-${Date.now()}`;
    }
  }

  async create(
    createInstalacionDto: CreateInstalacionDto,
    usuarioId: number,
    user?: any,
  ): Promise<Instalacion> {
    const {
      usuariosAsignados,
      instalacionCodigo,
      instalacionTipo: dtoTipo,
      ...instalacionData
    } = createInstalacionDto;

    // Validar instalacionTipo (internas | redes) según el rol del usuario
    const tipo = (dtoTipo || '').toLowerCase();
    if (tipo !== 'internas' && tipo !== 'redes') {
      throw new BadRequestException(
        'Al crear una instalación debe seleccionar el tipo: internas o redes.',
      );
    }

    // Proyectos/actividades SOLO aplican para redes
    if (
      tipo === 'internas' &&
      this.instalacionProyectosPayloadNoVacio((instalacionData as any)?.instalacionProyectos)
    ) {
      throw new BadRequestException(
        'La selección de proyectos/actividades solo aplica para instalaciones de tipo redes.',
      );
    }

    if (user) {
      const userRole = user?.usuarioRol?.rolTipo || user?.role;

      if (userRole === 'admin-internas') {
        if (tipo !== 'internas') {
          throw new BadRequestException('Solo puedes crear instalaciones de tipo internas.');
        }
      } else if (userRole === 'admin-redes') {
        if (tipo !== 'redes') {
          throw new BadRequestException('Solo puedes crear instalaciones de tipo redes.');
        }
      } else if (userRole === 'bodega-internas') {
        if (tipo !== 'internas') {
          throw new BadRequestException('Solo puedes crear instalaciones de tipo internas.');
        }
      } else if (userRole === 'bodega-redes') {
        if (tipo !== 'redes') {
          throw new BadRequestException('Solo puedes crear instalaciones de tipo redes.');
        }
      }
      // admin, superadmin, gerencia pueden elegir internas o redes
    }

    // Código de instalación opcional (en redes no siempre hay código)
    const codigoTrimmed = instalacionCodigo?.trim();
    const tieneCodigo = Boolean(codigoTrimmed);

    let identificadorUnico: string | null = null;
    if (tieneCodigo) {
      identificadorUnico = codigoTrimmed ?? null;
      // Verificar que el código no esté duplicado solo cuando se proporciona
      const instalacionExistente = await this.instalacionesRepository
        .createQueryBuilder('instalacion')
        .where('instalacion.identificadorUnico = :codigo', { codigo: identificadorUnico })
        .orWhere('instalacion.instalacionCodigo = :codigo', { codigo: identificadorUnico })
        .getOne();

      if (instalacionExistente) {
        throw new ConflictException(
          `El código de instalación '${identificadorUnico}' ya está en uso. Por favor, use un código diferente.`,
        );
      }
    }

    /** PPC sin técnicos; AAT con técnicos (códigos v2). */
    let estadoInicial = EstadoInstalacion.PPC;
    let estadoInstalacionId: number | null = null;

    if (usuariosAsignados && usuariosAsignados.length > 0) {
      try {
        const estadoRow = await this.estadosInstalacionService.findByCodigo('aat');
        estadoInstalacionId = estadoRow.estadoInstalacionId;
        estadoInicial = EstadoInstalacion.AAT;
      } catch {
        try {
          const estadoRow = await this.estadosInstalacionService.findByCodigo('ppc');
          estadoInstalacionId = estadoRow.estadoInstalacionId;
          estadoInicial = EstadoInstalacion.PPC;
        } catch (_e) {
          /* sin catálogo */
        }
      }
    } else {
      try {
        const estadoRow = await this.estadosInstalacionService.findByCodigo('ppc');
        estadoInstalacionId = estadoRow.estadoInstalacionId;
        estadoInicial = EstadoInstalacion.PPC;
      } catch {
        /* sin catálogo */
      }
    }

    if (tipo === 'redes') {
      (instalacionData as any).instalacionProyectos = await this.normalizarInstalacionProyectosRedes(
        (instalacionData as any).instalacionProyectos,
      );
    } else {
      (instalacionData as any).instalacionProyectos = null;
    }

    const instalacion = this.instalacionesRepository.create({
      ...instalacionData,
      instalacionTipo: tipo as 'internas' | 'redes',
      identificadorUnico: identificadorUnico ?? null,
      instalacionCodigo: identificadorUnico ?? null, // Mismo valor que identificadorUnico o null si sin código
      usuarioRegistra: usuarioId,
      estado: estadoInicial,
      estadoInstalacionId: estadoInstalacionId || undefined,
    });

    const savedInstalacion = await this.instalacionesRepository.save(instalacion);

    // Si el identificadorUnico no se guardó y teníamos código, actualizar con SQL (legacy)
    if (tieneCodigo && !savedInstalacion.identificadorUnico && savedInstalacion.instalacionId) {
      await this.instalacionesRepository.query(
        'UPDATE instalaciones SET identificadorUnico = ? WHERE instalacionId = ?',
        [identificadorUnico, savedInstalacion.instalacionId],
      );
      savedInstalacion.identificadorUnico = identificadorUnico;
    }

    // Crear grupo de chat automáticamente (usar código o fallback a INST-{id})
    try {
      const codigoGrupo =
        savedInstalacion.identificadorUnico || `INST-${savedInstalacion.instalacionId}`;
      await this.gruposService.crearGrupoInstalacion(savedInstalacion.instalacionId, codigoGrupo);
    } catch (error) {
      console.error(
        `[InstalacionesService] Error al crear grupo de chat para instalación ${savedInstalacion.identificadorUnico}:`,
        error,
      );
      // No lanzar error para no interrumpir la creación de la instalación
    }

    // Asignar usuarios si se proporcionaron
    if (usuariosAsignados && usuariosAsignados.length > 0) {
      const usuariosParaAsignar = usuariosAsignados.map((usuarioId) => ({
        usuarioId,
        rolEnInstalacion: 'tecnico', // Por defecto técnico, se puede cambiar después
      }));
      await this.instalacionesUsuariosService.asignarUsuarios(
        savedInstalacion.instalacionId,
        usuariosParaAsignar,
      );
    }

    // Recargar con relaciones
    const instalacionCompleta = await this.findOne(savedInstalacion.instalacionId);
    return instalacionCompleta;
  }

  async findAll(user?: any): Promise<Instalacion[]> {
    try {
      // Filtrar por centro operativo (sede): usuarios con sede solo ven instalaciones de bodegas de su sede
      const rolTipo = (user?.usuarioRol?.rolTipo || user?.role || '').toString().toLowerCase();
      // 0 se usa a veces como "vacío"; sin sede válida no aplicar filtro (mismo criterio que otros servicios)
      const rawSede = user?.usuarioSede;
      const usuarioSede =
        rawSede != null && rawSede !== '' && Number(rawSede) !== 0 ? Number(rawSede) : null;
      let whereClause = '';
      const queryParams: any[] = [];

      // SuperAdmin/Gerencia: sin filtro (ven todas las instalaciones)
      if (usuarioSede != null) {
        // Admin / almacenista: solo instalaciones del centro operativo (bodega de su sede)
        // o sin bodega aún pero registradas por su centro (usuario registra o usuarioRegistra = yo).
        if (rolTipo === 'admin' || rolTipo === 'almacenista') {
          whereClause = `
            LEFT JOIN bodegas b ON i.bodegaId = b.bodegaId
            LEFT JOIN usuarios ur ON i.usuarioRegistra = ur.usuarioId
            WHERE (
              (i.bodegaId IS NOT NULL AND b.sedeId = ?)
              OR (
                i.bodegaId IS NULL
                AND (
                  i.usuarioRegistra = ?
                  OR ur.usuarioSede = ?
                )
              )
            )
          `;
          queryParams.push(usuarioSede, user.usuarioId, usuarioSede);
        }
        // Admin-internas: bodega internas de su sede, o sin bodega pero instalacionTipo internas y su centro
        else if (rolTipo === 'admin-internas') {
          whereClause = `
            LEFT JOIN bodegas b ON i.bodegaId = b.bodegaId
            LEFT JOIN usuarios ur ON i.usuarioRegistra = ur.usuarioId
            WHERE (
              (i.bodegaId IS NOT NULL AND b.sedeId = ? AND b.bodegaTipo = 'internas')
              OR (
                i.bodegaId IS NULL
                AND i.instalacionTipo = 'internas'
                AND (
                  i.usuarioRegistra = ?
                  OR ur.usuarioSede = ?
                )
              )
            )
          `;
          queryParams.push(usuarioSede, user.usuarioId, usuarioSede);
        }
        // Admin-redes: bodega redes de su sede, o sin bodega pero instalacionTipo redes y su centro
        else if (rolTipo === 'admin-redes') {
          whereClause = `
            LEFT JOIN bodegas b ON i.bodegaId = b.bodegaId
            LEFT JOIN usuarios ur ON i.usuarioRegistra = ur.usuarioId
            WHERE (
              (i.bodegaId IS NOT NULL AND b.sedeId = ? AND b.bodegaTipo = 'redes')
              OR (
                i.bodegaId IS NULL
                AND i.instalacionTipo = 'redes'
                AND (
                  i.usuarioRegistra = ?
                  OR ur.usuarioSede = ?
                )
              )
            )
          `;
          queryParams.push(usuarioSede, user.usuarioId, usuarioSede);
        }
        // Bodega-internas/redes: solo instalaciones de su bodega
        else if (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes') {
          whereClause = 'WHERE i.bodegaId = ?';
          queryParams.push(user.usuarioBodega);
        }
        // Técnico/Soldador: solo instalaciones asignadas a ellos
        else if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
          whereClause = `
            INNER JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId
            WHERE iu.usuarioId = ? AND iu.activo = 1
          `;
          queryParams.push(user.usuarioId);
        }
      }

      // Usar SQL raw para evitar completamente que TypeORM intente cargar relaciones automáticamente
      const instalacionesRaw = await this.instalacionesRepository.query(
        `
        SELECT 
          i.instalacionId,
          i.identificadorUnico,
          i.instalacionCodigo,
          i.instalacionTipo,
          i.tipoInstalacionId,
          i.clienteId,
          i.instalacionMedidorNumero,
          i.instalacionSelloNumero,
          i.instalacionSelloRegulador,
          i.instalacionFecha,
          i.fechaAsignacionMetrogas,
          i.fechaAsignacion,
          i.fechaConstruccion,
          i.fechaCertificacion,
          i.fechaAnulacion,
          i.fechaNovedad,
          i.fechaFinalizacion,
          i.materialesInstalados,
          i.instalacionProyectos,
          i.instalacionObservaciones,
          i.observacionesTecnico,
          i.instalacionAnexos,
          i.estado,
          i.estadoInstalacionId,
          i.usuarioRegistra,
          i.bodegaId,
          i.fechaCreacion,
          i.fechaActualizacion
        FROM instalaciones i
        ${whereClause}
      `,
        queryParams,
      );

      // Cargar tipoInstalacion, usuariosAsignados y sus relaciones por separado
      const instalacionIds = instalacionesRaw.map((row: any) => row.instalacionId);

      // Cargar tipos de instalación
      const tipoInstalacionIds = [
        ...new Set(instalacionesRaw.map((row: any) => row.tipoInstalacionId).filter(Boolean)),
      ];
      const tiposInstalacionMap = new Map();
      if (tipoInstalacionIds.length > 0) {
        const tiposRaw = await this.instalacionesRepository.query(
          `SELECT tipoInstalacionId, tipoInstalacionNombre, usuarioRegistra, fechaCreacion, fechaActualizacion
         FROM tipos_instalacion 
         WHERE tipoInstalacionId IN (${tipoInstalacionIds.map(() => '?').join(',')})`,
          tipoInstalacionIds,
        );
        tiposRaw.forEach((tipo: any) => {
          tiposInstalacionMap.set(tipo.tipoInstalacionId, tipo);
        });
      }

      // Cargar usuarios asignados y sus relaciones (solo activos)
      const usuariosAsignadosMap = new Map<number, any[]>();
      if (instalacionIds.length > 0) {
        const usuariosAsignadosRaw = await this.instalacionesRepository.query(
          `SELECT 
          iu.instalacionUsuarioId,
          iu.instalacionId,
          iu.usuarioId,
          iu.rolEnInstalacion,
          iu.activo,
          u.usuarioId as u_usuarioId,
          u.usuarioNombre,
          u.usuarioApellido,
          u.usuarioCorreo,
          u.usuarioTelefono,
          u.usuarioEstado,
          u.usuarioRolId,
          r.rolId as r_rolId,
          r.rolNombre,
          r.rolTipo,
          r.rolDescripcion
         FROM instalaciones_usuarios iu
         LEFT JOIN usuarios u ON iu.usuarioId = u.usuarioId
         LEFT JOIN roles r ON u.usuarioRolId = r.rolId
         WHERE iu.instalacionId IN (${instalacionIds.map(() => '?').join(',')})
         AND iu.activo = 1`,
          instalacionIds,
        );

        usuariosAsignadosRaw.forEach((row: any) => {
          if (!usuariosAsignadosMap.has(row.instalacionId)) {
            usuariosAsignadosMap.set(row.instalacionId, []);
          }
          const usuariosAsignados = usuariosAsignadosMap.get(row.instalacionId)!;
          usuariosAsignados.push({
            instalacionUsuarioId: row.instalacionUsuarioId,
            instalacionId: row.instalacionId,
            usuarioId: row.usuarioId,
            rolEnInstalacion: row.rolEnInstalacion,
            activo: row.activo !== undefined ? Boolean(row.activo) : true,
            usuario: row.u_usuarioId
              ? {
                  usuarioId: row.u_usuarioId,
                  usuarioNombre: row.usuarioNombre,
                  usuarioApellido: row.usuarioApellido,
                  usuarioCorreo: row.usuarioCorreo,
                  usuarioTelefono: row.usuarioTelefono,
                  usuarioEstado: row.usuarioEstado,
                  usuarioRol: row.r_rolId
                    ? {
                        rolId: row.r_rolId,
                        rolNombre: row.rolNombre,
                        rolTipo: row.rolTipo,
                        rolDescripcion: row.rolDescripcion,
                      }
                    : null,
                }
              : null,
          });
        });
      }

      // Cargar clientes por separado para evitar problemas con la relación
      const clienteIds = [
        ...new Set(instalacionesRaw.map((row: any) => row.clienteId).filter(Boolean)),
      ];
      const clientesMap = new Map();
      if (clienteIds.length > 0) {
        try {
          // Usar SQL raw para seleccionar solo las columnas que existen en la BD
          const clientesRaw = await this.clientesRepository.query(
            `SELECT clienteId, nombreUsuario, clienteTelefono, 
                  clienteDireccion, clienteBarrio, municipioId, cantidadInstalaciones, 
                  clienteEstado, usuarioRegistra, fechaCreacion, fechaActualizacion
           FROM clientes 
           WHERE clienteId IN (${clienteIds.map(() => '?').join(',')})`,
            clienteIds,
          );
          clientesRaw.forEach((c: any) => {
            clientesMap.set(c.clienteId, c);
          });
        } catch (error) {
          console.error(
            '[InstalacionesService.findAll] Error al cargar clientes con SQL raw:',
            error,
          );
        }
      }

      // Cargar bodegas por separado
      const bodegaIds = [
        ...new Set(instalacionesRaw.map((row: any) => row.bodegaId).filter(Boolean)),
      ];
      const bodegasMap = new Map();
      if (bodegaIds.length > 0) {
        try {
          const bodegasRaw = await this.instalacionesRepository.query(
            `SELECT bodegaId, bodegaNombre, bodegaDescripcion, bodegaUbicacion, 
                  bodegaTelefono, bodegaCorreo, sedeId, bodegaEstado, bodegaTipo
           FROM bodegas 
           WHERE bodegaId IN (${bodegaIds.map(() => '?').join(',')})`,
            bodegaIds,
          );
          bodegasRaw.forEach((b: any) => {
            bodegasMap.set(b.bodegaId, b);
          });
        } catch (error) {
          console.error('[InstalacionesService.findAll] Error al cargar bodegas:', error);
        }
      }

      // Cargar usuarios registradores por separado
      const usuarioIds = [
        ...new Set(instalacionesRaw.map((row: any) => row.usuarioRegistra).filter(Boolean)),
      ];
      const usuariosMap = new Map();
      if (usuarioIds.length > 0) {
        try {
          const usuariosRaw = await this.instalacionesRepository.query(
            `SELECT usuarioId, usuarioNombre, usuarioApellido, usuarioCorreo, 
                  usuarioTelefono, usuarioDocumento, usuarioEstado, usuarioSede
           FROM usuarios 
           WHERE usuarioId IN (${usuarioIds.map(() => '?').join(',')})`,
            usuarioIds,
          );
          usuariosRaw.forEach((u: any) => {
            usuariosMap.set(u.usuarioId, u);
          });
        } catch (error) {
          console.error('[InstalacionesService.findAll] Error al cargar usuarios:', error);
        }
      }

      // Mapear resultados raw a objetos Instalacion
      const allInstalaciones = instalacionesRaw.map((row: any) => {
        const instalacion: any = {
          instalacionId: row.instalacionId,
          identificadorUnico: row.identificadorUnico,
          instalacionCodigo: row.instalacionCodigo,
          instalacionTipo: row.instalacionTipo ?? null,
          tipoInstalacionId: row.tipoInstalacionId,
          clienteId: row.clienteId,
          instalacionMedidorNumero: row.instalacionMedidorNumero,
          instalacionSelloNumero: row.instalacionSelloNumero,
          instalacionSelloRegulador: row.instalacionSelloRegulador,
          instalacionFecha: row.instalacionFecha,
          fechaAsignacionMetrogas: row.fechaAsignacionMetrogas,
          fechaAsignacion: row.fechaAsignacion,
          fechaConstruccion: row.fechaConstruccion,
          fechaCertificacion: row.fechaCertificacion,
          fechaAnulacion: row.fechaAnulacion,
          fechaNovedad: row.fechaNovedad,
          fechaFinalizacion: row.fechaFinalizacion,
          materialesInstalados:
            typeof row.materialesInstalados === 'string'
              ? JSON.parse(row.materialesInstalados)
              : row.materialesInstalados,
          instalacionProyectos:
            typeof row.instalacionProyectos === 'string'
              ? JSON.parse(row.instalacionProyectos)
              : row.instalacionProyectos,
          instalacionObservaciones: row.instalacionObservaciones,
          observacionesTecnico: row.observacionesTecnico,
          instalacionAnexos:
            typeof row.instalacionAnexos === 'string'
              ? (() => {
                  try {
                    return JSON.parse(row.instalacionAnexos);
                  } catch {
                    return null;
                  }
                })()
              : row.instalacionAnexos,
          estado: row.estado,
          estadoInstalacionId: row.estadoInstalacionId,
          usuarioRegistra: row.usuarioRegistra,
          bodegaId: row.bodegaId,
          fechaCreacion: row.fechaCreacion,
          fechaActualizacion: row.fechaActualizacion,
          tipoInstalacion: tiposInstalacionMap.get(row.tipoInstalacionId) || null,
          usuariosAsignados: usuariosAsignadosMap.get(row.instalacionId) || [],
          cliente: row.clienteId ? clientesMap.get(row.clienteId) || null : null,
          bodega: row.bodegaId ? bodegasMap.get(row.bodegaId) || null : null,
          usuarioRegistrador: row.usuarioRegistra
            ? usuariosMap.get(row.usuarioRegistra) || null
            : null,
        };
        return instalacion;
      });

      /** Bodega de la sede del usuario, o sin bodega pero registrada en su centro / por él. */
      const instalacionPerteneceASede = (inst: any): boolean => {
        if (usuarioSede == null) return false;
        if (inst.bodegaId && inst.bodega?.sedeId != null) {
          return Number(inst.bodega.sedeId) === usuarioSede;
        }
        if (!inst.bodegaId) {
          if (
            inst.usuarioRegistra != null &&
            Number(inst.usuarioRegistra) === Number(user.usuarioId)
          ) {
            return true;
          }
          const regSede = inst.usuarioRegistrador?.usuarioSede;
          return (
            regSede != null &&
            regSede !== '' &&
            Number(regSede) !== 0 &&
            Number(regSede) === usuarioSede
          );
        }
        return false;
      };

      /** Admin-internas / admin-redes: mismo alcance de sede y tipo de bodega o instalacionTipo acorde. */
      const instalacionPerteneceSedeYTipoBodega = (
        inst: any,
        tipo: 'internas' | 'redes',
      ): boolean => {
        if (usuarioSede == null) return false;
        const tipoLower = tipo;
        if (inst.bodegaId && inst.bodega) {
          const bTipo = (inst.bodega.bodegaTipo ?? '').toString().toLowerCase();
          if (bTipo !== tipoLower) return false;
          return Number(inst.bodega.sedeId) === usuarioSede;
        }
        if (!inst.bodegaId) {
          const colTipo = (inst.instalacionTipo ?? '').toString().toLowerCase();
          if (colTipo !== tipoLower) return false;
          if (
            inst.usuarioRegistra != null &&
            Number(inst.usuarioRegistra) === Number(user.usuarioId)
          ) {
            return true;
          }
          const regSede = inst.usuarioRegistrador?.usuarioSede;
          return (
            regSede != null &&
            regSede !== '' &&
            Number(regSede) !== 0 &&
            Number(regSede) === usuarioSede
          );
        }
        return false;
      };

      const instalacionCoincideTipoOperacion = (inst: any, tipo: 'internas' | 'redes'): boolean => {
        if (inst.bodegaId && inst.bodega?.bodegaTipo) {
          return (inst.bodega.bodegaTipo as string).toLowerCase() === tipo;
        }
        if ((inst.instalacionTipo ?? '').toString().toLowerCase() === tipo) return true;
        return (inst.tipoInstalacion?.tipoInstalacionNombre ?? '').toLowerCase().includes(tipo);
      };

      // SuperAdmin / desarrollador / Gerencia ven todo (rol sin distinguir mayúsculas)
      const rolTipoListado = (user?.usuarioRol?.rolTipo ?? user?.role ?? '')
        .toString()
        .toLowerCase();
      if (rolTipoListado === 'superadmin' || rolTipoListado === 'gerencia') {
        return allInstalaciones;
      }

      // Admin (centro operativo): solo su sede; sin bodega solo si es de su centro o la creó él
      if (rolTipoListado === 'admin') {
        if (usuarioSede != null) {
          return allInstalaciones.filter(instalacionPerteneceASede);
        }
        return [];
      }

      // Filtro por sede para admin-internas y admin-redes (solo su centro operativo)
      const filterBySedeIfAdmin =
        user?.usuarioSede &&
        (user?.usuarioRol?.rolTipo === 'admin-internas' ||
          user?.usuarioRol?.rolTipo === 'admin-redes' ||
          user?.role === 'admin-internas' ||
          user?.role === 'admin-redes');

      // Técnico o soldador ven solo sus instalaciones asignadas (solo asignaciones activas)
      const rolUsuario = user?.usuarioRol?.rolTipo ?? user?.role;
      if (rolUsuario === 'tecnico' || rolUsuario === 'soldador') {
        return allInstalaciones.filter((inst) => {
          if (inst.usuariosAsignados && Array.isArray(inst.usuariosAsignados)) {
            return inst.usuariosAsignados.some((ua: any) => {
              const usuarioId = ua.usuarioId || ua.usuario?.usuarioId;
              const activo = ua.activo !== undefined ? ua.activo : true;
              return usuarioId === user.usuarioId && activo === true;
            });
          }
          return false;
        });
      }

      // Almacenista: mismo criterio de centro que admin cuando tiene sede
      if (rolTipoListado === 'almacenista') {
        if (usuarioSede != null) {
          return allInstalaciones.filter(instalacionPerteneceASede);
        }
        return allInstalaciones;
      }

      // Bodega Internas y Admin Internas: solo operación internas (bodega o clasificación coherente + sede si aplica)
      if (
        user?.usuarioRol?.rolTipo === 'bodega-internas' ||
        user?.role === 'bodega-internas' ||
        user?.usuarioRol?.rolTipo === 'admin-internas' ||
        user?.role === 'admin-internas'
      ) {
        let list = allInstalaciones.filter((inst) =>
          instalacionCoincideTipoOperacion(inst, 'internas'),
        );
        if (filterBySedeIfAdmin) {
          list = list.filter((inst) => instalacionPerteneceSedeYTipoBodega(inst, 'internas'));
        }
        return list;
      }

      // Bodega Redes y Admin Redes: solo operación redes
      if (
        user?.usuarioRol?.rolTipo === 'bodega-redes' ||
        user?.role === 'bodega-redes' ||
        user?.usuarioRol?.rolTipo === 'admin-redes' ||
        user?.role === 'admin-redes'
      ) {
        let list = allInstalaciones.filter((inst) =>
          instalacionCoincideTipoOperacion(inst, 'redes'),
        );
        if (filterBySedeIfAdmin) {
          list = list.filter((inst) => instalacionPerteneceSedeYTipoBodega(inst, 'redes'));
        }
        return list;
      }

      return allInstalaciones;
    } catch (error) {
      console.error('[InstalacionesService.findAll] Error en findAll:', error);
      throw error;
    }
  }

  /**
   * Datos para Reporte Metrogas: una fila por material instalado, filtrado por rango de fechas (certificación).
   */
  async getReporteMetrogasData(
    dateStart?: string,
    dateEnd?: string,
    user?: any,
  ): Promise<
    {
      certificacion: string;
      codigoUsuario: string;
      numeroOrdenActividad: string;
      descripcionMaterial: string;
      unid: string;
      codMaterial: string;
      cantInstalado: string;
      codProyecto: string;
      concepto: string;
      ubicacion: string;
      numMedidor: string;
      precioUnitario: string;
      total: string;
      tecnico: string;
      instalador: string;
      observaciones: string;
    }[]
  > {
    const instalaciones = await this.findAll(user);
    let filtered = instalaciones;

    if (dateStart || dateEnd) {
      const start = dateStart ? new Date(dateStart) : null;
      const end = dateEnd ? new Date(dateEnd) : null;
      if (end) end.setHours(23, 59, 59, 999);
      filtered = instalaciones.filter((i: any) => {
        const fecha =
          i.fechaCertificacion || i.fechaConstruccion || i.instalacionFecha || i.fechaCreacion;
        if (!fecha) return false;
        const d = new Date(fecha);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    const instalacionIds = filtered.map((i: any) => i.instalacionId).filter(Boolean);
    if (instalacionIds.length === 0) return [];

    const placeholders = instalacionIds.map(() => '?').join(',');
    const imRows = await this.instalacionesRepository.query(
      `SELECT im.instalacionMaterialId, im.instalacionId, im.materialId, im.cantidad, im.observaciones as im_observaciones,
              m.materialCodigo, m.materialNombre, m.materialPrecio, m.unidadMedidaId,
              um.unidadMedidaSimbolo, um.unidadMedidaNombre
       FROM instalaciones_materiales im
       JOIN materiales m ON im.materialId = m.materialId
       LEFT JOIN unidades_medida um ON m.unidadMedidaId = um.unidadMedidaId
       WHERE im.instalacionId IN (${placeholders})`,
      instalacionIds,
    );

    const instalacionMaterialIds = imRows.map((r: any) => r.instalacionMaterialId).filter(Boolean);
    const numerosByIm: Map<number, string> = new Map();
    if (instalacionMaterialIds.length > 0) {
      const nmPlaceholders = instalacionMaterialIds.map(() => '?').join(',');
      const nmRows = await this.instalacionesRepository.query(
        `SELECT instalacionMaterialId, numeroMedidor FROM numeros_medidor WHERE instalacionMaterialId IN (${nmPlaceholders})`,
        instalacionMaterialIds,
      );
      nmRows.forEach((r: any) => {
        if (!numerosByIm.has(r.instalacionMaterialId))
          numerosByIm.set(r.instalacionMaterialId, r.numeroMedidor || '');
      });
    }

    const instalacionMap = new Map(filtered.map((i: any) => [i.instalacionId, i]));
    const rows: any[] = [];

    for (const im of imRows) {
      const inst = instalacionMap.get(im.instalacionId);
      if (!inst) continue;

      const fechaCert =
        inst.fechaCertificacion ||
        inst.fechaConstruccion ||
        inst.instalacionFecha ||
        inst.fechaCreacion;
      const certificacion = fechaCert
        ? new Date(fechaCert).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '';

      const codigoUsuario =
        inst.cliente?.clienteId?.toString() ||
        inst.identificadorUnico ||
        inst.instalacionCodigo ||
        inst.instalacionId?.toString() ||
        '';

      const numeroOrden =
        inst.instalacionCodigo || inst.identificadorUnico || inst.instalacionId?.toString() || '';

      let codProyecto = '';
      if (inst.instalacionProyectos) {
        try {
          const proy =
            typeof inst.instalacionProyectos === 'string'
              ? JSON.parse(inst.instalacionProyectos)
              : inst.instalacionProyectos;
          if (proy && typeof proy === 'object' && proy.version === 'redes_v2') {
            codProyecto =
              (proy.proyectoRedesCodigo && String(proy.proyectoRedesCodigo)) ||
              (proy.proyectoRedesId != null ? String(proy.proyectoRedesId) : '');
          } else {
            const arr = Array.isArray(proy) ? proy : proy?.items ? [proy] : [];
            codProyecto = arr[0]?.proyectoId?.toString() || arr[0]?.codigo || '';
          }
        } catch (_e) {
          codProyecto = '';
        }
      }

      const tecnicoNombre =
        inst.usuariosAsignados?.[0]?.usuario &&
        (inst.usuariosAsignados[0].usuario.usuarioNombre ||
          inst.usuariosAsignados[0].usuario.usuarioApellido)
          ? `${inst.usuariosAsignados[0].usuario.usuarioNombre || ''} ${inst.usuariosAsignados[0].usuario.usuarioApellido || ''}`.trim()
          : '';
      const iniciales = tecnicoNombre
        ? tecnicoNombre
            .split(/\s+/)
            .map((s: string) => s[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '';

      const cantidad = Number(im.cantidad) || 0;
      const precio = Number(im.materialPrecio) || 0;
      const total = cantidad * precio;

      const numMedidor =
        numerosByIm.get(im.instalacionMaterialId) || inst.instalacionMedidorNumero || '';

      rows.push({
        certificacion,
        codigoUsuario,
        numeroOrdenActividad: numeroOrden,
        descripcionMaterial: im.materialNombre || '',
        unid: im.unidadMedidaSimbolo || im.unidadMedidaNombre || 'UND',
        codMaterial: im.materialCodigo || '',
        cantInstalado: cantidad.toFixed(2).replace('.', ','),
        codProyecto,
        concepto: 'MATERIAL',
        ubicacion: 'CM',
        numMedidor: numMedidor.toString(),
        precioUnitario: precio.toFixed(3).replace('.', ','),
        total: total.toFixed(2).replace('.', ','),
        tecnico: iniciales || 'CS',
        instalador: tecnicoNombre || '',
        observaciones: inst.observacionesTecnico || im.im_observaciones || '',
      });
    }

    return rows;
  }

  async findOne(id: number, user?: any): Promise<Instalacion> {
    if (!id || isNaN(id)) {
      throw new NotFoundException(`ID de instalación inválido: ${id}`);
    }

    // Usar SQL raw para evitar que TypeORM intente cargar relaciones automáticamente
    const instalacionesRaw = await this.instalacionesRepository.query(
      `SELECT 
        i.instalacionId,
        i.identificadorUnico,
        i.instalacionCodigo,
        i.instalacionTipo,
        i.tipoInstalacionId,
        i.clienteId,
        i.instalacionMedidorNumero,
        i.instalacionSelloNumero,
        i.instalacionSelloRegulador,
        i.instalacionFecha,
        i.fechaAsignacionMetrogas,
        i.fechaAsignacion,
        i.fechaConstruccion,
        i.fechaCertificacion,
        i.fechaNovedad,
        i.fechaAnulacion,
        i.fechaFinalizacion,
        i.materialesInstalados,
        i.instalacionProyectos,
        i.instalacionObservaciones,
        i.observacionesTecnico,
        i.instalacionAnexos,
        i.estado,
        i.usuarioRegistra,
          i.bodegaId,
        i.fechaCreacion,
        i.fechaActualizacion
      FROM instalaciones i
      WHERE i.instalacionId = ?`,
      [id],
    );

    if (!instalacionesRaw || instalacionesRaw.length === 0) {
      throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
    }

    const row = instalacionesRaw[0];

    // Cargar tipoInstalacion
    let tipoInstalacion = null;
    if (row.tipoInstalacionId) {
      const tiposRaw = await this.instalacionesRepository.query(
        `SELECT tipoInstalacionId, tipoInstalacionNombre, usuarioRegistra, fechaCreacion, fechaActualizacion
         FROM tipos_instalacion 
         WHERE tipoInstalacionId = ?`,
        [row.tipoInstalacionId],
      );
      if (tiposRaw && tiposRaw.length > 0) {
        tipoInstalacion = tiposRaw[0];
      }
    }

    // Cargar usuarios asignados y sus relaciones
    const usuariosAsignadosRaw = await this.instalacionesRepository.query(
      `SELECT 
        iu.instalacionUsuarioId,
        iu.instalacionId,
        iu.usuarioId,
        iu.rolEnInstalacion,
        u.usuarioId as u_usuarioId,
        u.usuarioNombre,
        u.usuarioApellido,
        u.usuarioCorreo,
        u.usuarioTelefono,
        u.usuarioEstado,
        u.usuarioRolId,
        r.rolId as r_rolId,
        r.rolNombre,
        r.rolTipo,
        r.rolDescripcion
       FROM instalaciones_usuarios iu
       LEFT JOIN usuarios u ON iu.usuarioId = u.usuarioId
       LEFT JOIN roles r ON u.usuarioRolId = r.rolId
       WHERE iu.instalacionId = ?`,
      [id],
    );

    const usuariosAsignados = usuariosAsignadosRaw.map((uaRow: any) => ({
      instalacionUsuarioId: uaRow.instalacionUsuarioId,
      instalacionId: uaRow.instalacionId,
      usuarioId: uaRow.usuarioId,
      rolEnInstalacion: uaRow.rolEnInstalacion,
      usuario: uaRow.u_usuarioId
        ? {
            usuarioId: uaRow.u_usuarioId,
            usuarioNombre: uaRow.usuarioNombre,
            usuarioApellido: uaRow.usuarioApellido,
            usuarioCorreo: uaRow.usuarioCorreo,
            usuarioTelefono: uaRow.usuarioTelefono,
            usuarioEstado: uaRow.usuarioEstado,
            usuarioRol: uaRow.r_rolId
              ? {
                  rolId: uaRow.r_rolId,
                  rolNombre: uaRow.rolNombre,
                  rolTipo: uaRow.rolTipo,
                  rolDescripcion: uaRow.rolDescripcion,
                }
              : null,
          }
        : null,
    }));

    // Cargar cliente por separado para evitar problemas con la relación
    let cliente = null;
    if (row.clienteId) {
      try {
        const clienteRaw = await this.clientesRepository.query(
          `SELECT clienteId, nombreUsuario, clienteTelefono, 
                  clienteDireccion, clienteBarrio, municipioId, cantidadInstalaciones, 
                  clienteEstado, usuarioRegistra, fechaCreacion, fechaActualizacion
           FROM clientes 
           WHERE clienteId = ?`,
          [row.clienteId],
        );

        if (clienteRaw && clienteRaw.length > 0) {
          cliente = clienteRaw[0];
        }
      } catch (error) {
        console.error('Error al cargar cliente:', error);
      }
    }

    // Cargar bodega (necesario para restricción por sede y para respuesta)
    let bodega = null;
    if (row.bodegaId) {
      try {
        const bodegasRaw = await this.instalacionesRepository.query(
          `SELECT bodegaId, bodegaNombre, bodegaDescripcion, bodegaUbicacion, 
                  bodegaTelefono, bodegaCorreo, sedeId, bodegaEstado, bodegaTipo
           FROM bodegas WHERE bodegaId = ?`,
          [row.bodegaId],
        );
        if (bodegasRaw && bodegasRaw.length > 0) bodega = bodegasRaw[0];
      } catch (error) {
        console.error('Error al cargar bodega:', error);
      }
    }

    // Construir objeto Instalacion
    const instalacion: any = {
      instalacionId: row.instalacionId,
      identificadorUnico: row.identificadorUnico,
      instalacionTipo: row.instalacionTipo ?? null,
      tipoInstalacionId: row.tipoInstalacionId,
      clienteId: row.clienteId,
      instalacionMedidorNumero: row.instalacionMedidorNumero,
      instalacionSelloNumero: row.instalacionSelloNumero,
      instalacionSelloRegulador: row.instalacionSelloRegulador,
      instalacionFecha: row.instalacionFecha,
      fechaAsignacionMetrogas: row.fechaAsignacionMetrogas,
      fechaAsignacion: row.fechaAsignacion,
      fechaConstruccion: row.fechaConstruccion,
      fechaCertificacion: row.fechaCertificacion,
      fechaNovedad: row.fechaNovedad,
      fechaAnulacion: row.fechaAnulacion,
      fechaFinalizacion: row.fechaFinalizacion,
      materialesInstalados:
        typeof row.materialesInstalados === 'string'
          ? JSON.parse(row.materialesInstalados)
          : row.materialesInstalados,
      instalacionProyectos:
        typeof row.instalacionProyectos === 'string'
          ? JSON.parse(row.instalacionProyectos)
          : row.instalacionProyectos,
      instalacionObservaciones: row.instalacionObservaciones,
      observacionesTecnico: row.observacionesTecnico,
      instalacionAnexos:
        typeof row.instalacionAnexos === 'string'
          ? (() => {
              try {
                return JSON.parse(row.instalacionAnexos);
              } catch {
                return null;
              }
            })()
          : row.instalacionAnexos,
      estado: row.estado,
      usuarioRegistra: row.usuarioRegistra,
      bodegaId: row.bodegaId,
      fechaCreacion: row.fechaCreacion,
      fechaActualizacion: row.fechaActualizacion,
      instalacionCodigo: row.instalacionCodigo || row.identificadorUnico,
      tipoInstalacion,
      usuariosAsignados,
      cliente,
      bodega,
    };

    // Restricción por centro operativo (admin, admin-internas, admin-redes, almacenista con sede)
    const rolTipo = (user?.usuarioRol?.rolTipo ?? user?.role ?? '').toString().toLowerCase();
    const rawSede = user?.usuarioSede;
    const usuarioSede =
      rawSede != null && rawSede !== '' && Number(rawSede) !== 0 ? Number(rawSede) : null;
    const sedeRestricted =
      (rolTipo === 'admin' ||
        rolTipo === 'admin-internas' ||
        rolTipo === 'admin-redes' ||
        rolTipo === 'almacenista') &&
      usuarioSede != null;
    if (sedeRestricted) {
      // Sin bodega: solo si es de su centro (registrador con misma sede o la creó el usuario actual)
      if (!instalacion.bodegaId) {
        if (instalacion.usuarioRegistra == null) {
          throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
        }
        const esPropia = Number(instalacion.usuarioRegistra) === Number(user.usuarioId);
        if (!esPropia) {
          const reg = await this.instalacionesRepository.query(
            `SELECT usuarioSede FROM usuarios WHERE usuarioId = ? LIMIT 1`,
            [instalacion.usuarioRegistra],
          );
          const rawRegSede = reg?.[0]?.usuarioSede;
          const sedeRegistrador =
            rawRegSede != null && rawRegSede !== '' && Number(rawRegSede) !== 0
              ? Number(rawRegSede)
              : null;
          if (sedeRegistrador == null || sedeRegistrador !== usuarioSede) {
            throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
          }
        }
      } else if (!bodega) {
        // bodegaId inválido o borrada
        throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
      } else if (bodega.sedeId !== usuarioSede) {
        throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
      } else if (rolTipo === 'admin-internas' && bodega.bodegaTipo !== 'internas') {
        throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
      } else if (rolTipo === 'admin-redes' && bodega.bodegaTipo !== 'redes') {
        throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
      }

      // Admin-internas / admin-redes: deben ser de ese tipo (bodega, columna o nombre de tipo catálogo)
      if (rolTipo === 'admin-internas' || rolTipo === 'admin-redes') {
        const esperado = rolTipo === 'admin-internas' ? 'internas' : 'redes';
        const porBodega = String(bodega?.bodegaTipo ?? '').toLowerCase() === esperado;
        const porInst = (instalacion.instalacionTipo ?? '').toString().toLowerCase() === esperado;
        const porNombre = (tipoInstalacion?.tipoInstalacionNombre ?? '')
          .toLowerCase()
          .includes(esperado);
        if (!porBodega && !porInst && !porNombre) {
          throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
        }
      }
    }

    return instalacion;
  }

  async update(
    id: number,
    updateInstalacionDto: UpdateInstalacionDto,
    usuarioId?: number,
    user?: any,
  ): Promise<Instalacion> {
    const {
      usuariosAsignados,
      instalacionCodigo,
      instalacionTipo: dtoTipo,
      ...instalacionData
    } = updateInstalacionDto;

    const instalacion = await this.findOne(id, user);

    // Si se envía instalacionTipo en el update, validar según el rol
    if (dtoTipo !== undefined && dtoTipo !== null) {
      const tipo = (dtoTipo as string).toLowerCase();
      if (tipo !== 'internas' && tipo !== 'redes') {
        throw new BadRequestException('instalacionTipo debe ser "internas" o "redes".');
      }
      if (user) {
        const rolTipo = user.usuarioRol?.rolTipo || user.role;
        if (rolTipo === 'admin-internas' && tipo !== 'internas') {
          throw new BadRequestException('Solo puedes asignar instalaciones de tipo internas.');
        }
        if (rolTipo === 'admin-redes' && tipo !== 'redes') {
          throw new BadRequestException('Solo puedes asignar instalaciones de tipo redes.');
        }
        if (rolTipo === 'bodega-internas' && tipo !== 'internas') {
          throw new BadRequestException('Solo puedes asignar instalaciones de tipo internas.');
        }
        if (rolTipo === 'bodega-redes' && tipo !== 'redes') {
          throw new BadRequestException('Solo puedes asignar instalaciones de tipo redes.');
        }
      }
      (instalacionData as any).instalacionTipo = tipo as 'internas' | 'redes';
    }

    // Proyectos/actividades SOLO aplican para redes (en update usamos el tipo final)
    const tipoFinal = String(
      (instalacionData as any).instalacionTipo ?? (instalacion as any).instalacionTipo ?? '',
    ).toLowerCase();
    if (
      tipoFinal === 'internas' &&
      updateInstalacionDto &&
      Object.prototype.hasOwnProperty.call(updateInstalacionDto as object, 'instalacionProyectos') &&
      this.instalacionProyectosPayloadNoVacio((updateInstalacionDto as any).instalacionProyectos)
    ) {
      throw new BadRequestException(
        'La selección de proyectos/actividades solo aplica para instalaciones de tipo redes.',
      );
    }

    // Validar permisos
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;

      // Almacenista no puede editar instalaciones (solo lectura)
      if (rolTipo === 'almacenista') {
        throw new BadRequestException('No tienes permisos para editar instalaciones');
      }

      // Usar instalacionTipo si existe; si no, fallback al nombre del tipo de instalación (legacy)
      const tipoInstalacion =
        (instalacion as any).instalacionTipo?.toLowerCase() ||
        instalacion.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase() ||
        '';

      // Bodega Internas y Admin Internas solo pueden editar instalaciones de tipo "internas"
      if (rolTipo === 'bodega-internas' || rolTipo === 'admin-internas') {
        const esInternas = tipoInstalacion === 'internas' || tipoInstalacion.includes('internas');
        if (!esInternas) {
          throw new BadRequestException(
            'El rol "Bodega Internas" / "Administrador Internas" solo puede editar instalaciones de tipo "Internas"',
          );
        }
      }

      // Bodega Redes y Admin Redes solo pueden editar instalaciones de tipo "redes"
      if (rolTipo === 'bodega-redes' || rolTipo === 'admin-redes') {
        const esRedes = tipoInstalacion === 'redes' || tipoInstalacion.includes('redes');
        if (!esRedes) {
          throw new BadRequestException(
            'El rol "Bodega Redes" / "Administrador Redes" solo puede editar instalaciones de tipo "Redes"',
          );
        }
      }

      // Técnico solo puede editar instalaciones asignadas a él
      if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
        const tieneAsignacion = instalacion.usuariosAsignados?.some((ua: any) => {
          const usuarioId = ua.usuarioId || ua.usuario?.usuarioId;
          const activo = ua.activo !== undefined ? ua.activo : true;
          return usuarioId === user.usuarioId && activo === true;
        });
        if (!tieneAsignacion) {
          throw new BadRequestException(
            'No tienes permisos para editar esta instalación. Solo puedes editar instalaciones asignadas a ti.',
          );
        }
      }
    }

    const estadoAnterior = instalacion.estado;

    // Actualizar código de instalación (opcional; se puede dejar vacío o borrar)
    if (instalacionCodigo !== undefined) {
      const codigoTrimmed = typeof instalacionCodigo === 'string' ? instalacionCodigo.trim() : '';
      if (!codigoTrimmed) {
        instalacion.identificadorUnico = null;
        instalacion.instalacionCodigo = null;
      } else if (
        codigoTrimmed !== (instalacion.identificadorUnico ?? instalacion.instalacionCodigo)
      ) {
        const instalacionExistente = await this.instalacionesRepository
          .createQueryBuilder('instalacion')
          .where('instalacion.instalacionId != :id', { id })
          .andWhere(
            '(instalacion.identificadorUnico = :codigo OR instalacion.instalacionCodigo = :codigo)',
            { codigo: codigoTrimmed },
          )
          .getOne();

        if (instalacionExistente) {
          throw new ConflictException(
            `El código de instalación '${codigoTrimmed}' ya está en uso por otra instalación. Por favor, use un código diferente.`,
          );
        }
        instalacion.identificadorUnico = codigoTrimmed;
        instalacion.instalacionCodigo = codigoTrimmed;
      }
    }

    if (tipoFinal === 'internas') {
      (instalacionData as any).instalacionProyectos = null;
    } else if (
      tipoFinal === 'redes' &&
      updateInstalacionDto &&
      Object.prototype.hasOwnProperty.call(updateInstalacionDto as object, 'instalacionProyectos')
    ) {
      const raw = (updateInstalacionDto as any).instalacionProyectos;
      if (raw == null) {
        (instalacionData as any).instalacionProyectos = null;
      } else {
        (instalacionData as any).instalacionProyectos =
          await this.normalizarInstalacionProyectosRedes(raw);
      }
    }

    Object.assign(instalacion, instalacionData);
    const _savedInstalacion = await this.instalacionesRepository.save(instalacion);

    // Verificar si los materiales cambiaron (para actualizar salidas)
    const materialesCambiaron =
      instalacionData.materialesInstalados || instalacionData.instalacionProyectos;

    // Si los materiales cambiaron y la instalación está completada, actualizar las salidas
    if (
      materialesCambiaron &&
      (estadoAnterior === EstadoInstalacion.FACT ||
        estadoAnterior === EstadoInstalacion.COMPLETADA ||
        estadoAnterior === EstadoInstalacion.FINALIZADA) &&
      usuarioId
    ) {
      // Buscar y eliminar salidas existentes asociadas a esta instalación
      const salidasExistentes = await this.movimientosService.findByInstalacion(id);
      const salidasCompletadas = salidasExistentes.filter(
        (m) =>
          m.movimientoTipo === TipoMovimiento.SALIDA &&
          (m.movimientoEstado === EstadoMovimiento.COMPLETADA || m.movimientoEstado === true),
      );

      // Eliminar las salidas existentes (esto revertirá los stocks automáticamente)
      for (const salida of salidasCompletadas) {
        try {
          await this.movimientosService.remove(salida.movimientoId, usuarioId);
        } catch (error) {
          console.error(`Error al eliminar salida ${salida.movimientoId}:`, error);
        }
      }

      // Crear nuevas salidas con los materiales actualizados
      await this.crearSalidasAutomaticas(id, usuarioId, true, instalacion.bodegaId);
    }

    // Actualizar usuarios asignados si se proporcionaron
    if (usuariosAsignados !== undefined && Array.isArray(usuariosAsignados)) {
      // Desasignar todos los usuarios actuales
      await this.instalacionesUsuariosService.desasignarUsuarios(id);

      // Determinar el nuevo estado según si hay técnicos asignados
      let nuevoEstado = instalacion.estado;
      let nuevoEstadoInstalacionId: number | null = null;

      if (usuariosAsignados.length > 0) {
        try {
          const estadoRow = await this.estadosInstalacionService.findByCodigo('aat');
          nuevoEstadoInstalacionId = estadoRow.estadoInstalacionId;
          nuevoEstado = EstadoInstalacion.AAT;
        } catch {
          try {
            const estadoRow = await this.estadosInstalacionService.findByCodigo('ppc');
            nuevoEstadoInstalacionId = estadoRow.estadoInstalacionId;
            nuevoEstado = EstadoInstalacion.PPC;
          } catch {
            /* mantener estado */
          }
        }

        // Asignar los nuevos usuarios
        const usuariosParaAsignar = usuariosAsignados.map((usuarioId) => ({
          usuarioId,
          rolEnInstalacion: 'tecnico', // Por defecto técnico
        }));
        await this.instalacionesUsuariosService.asignarUsuarios(id, usuariosParaAsignar);
      } else {
        try {
          const estadoRow = await this.estadosInstalacionService.findByCodigo('ppc');
          nuevoEstadoInstalacionId = estadoRow.estadoInstalacionId;
          nuevoEstado = EstadoInstalacion.PPC;
        } catch {
          /* mantener estado */
        }
      }

      // Actualizar el estado de la instalación si cambió
      if (nuevoEstado !== instalacion.estado) {
        await this.instalacionesRepository.update(id, {
          estado: nuevoEstado,
          estadoInstalacionId: nuevoEstadoInstalacionId || undefined,
        });
      }
    }

    // Recargar con relaciones
    return this.findOne(id, user);
  }

  async remove(id: number, usuarioId: number, user?: any): Promise<void> {
    const instalacion = await this.findOne(id, user);

    // Validar permisos
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;

      // Almacenista no puede eliminar instalaciones
      if (rolTipo === 'almacenista') {
        throw new BadRequestException('No tienes permisos para eliminar instalaciones');
      }

      // Bodega Internas y Admin Internas solo pueden eliminar instalaciones de tipo "internas"
      if (rolTipo === 'bodega-internas' || rolTipo === 'admin-internas') {
        const tipoNombre = instalacion.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase() || '';
        if (!tipoNombre.includes('internas')) {
          throw new BadRequestException(
            'El rol "Bodega Internas" solo puede eliminar instalaciones de tipo "Internas"',
          );
        }
      }

      // Bodega Redes y Admin Redes solo pueden eliminar instalaciones de tipo "redes"
      if (rolTipo === 'bodega-redes' || rolTipo === 'admin-redes') {
        const tipoNombre = instalacion.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase() || '';
        if (!tipoNombre.includes('redes')) {
          throw new BadRequestException(
            'El rol "Bodega Redes" solo puede eliminar instalaciones de tipo "Redes"',
          );
        }
      }
    }

    // Guardar datos completos para auditoría
    const datosEliminados = {
      instalacionId: instalacion.instalacionId,
      identificadorUnico: instalacion.identificadorUnico,
      tipoInstalacionId: instalacion.tipoInstalacionId,
      clienteId: instalacion.clienteId,
      estado: instalacion.estado,
      materialesInstalados: instalacion.materialesInstalados,
      instalacionProyectos: instalacion.instalacionProyectos,
      fechaCreacion: instalacion.fechaCreacion,
      fechaActualizacion: instalacion.fechaActualizacion,
    };

    // Eliminar todas las asignaciones de usuarios asociadas a esta instalación
    try {
      await this.instalacionesUsuariosService.desasignarTodos(id);
    } catch (error) {
      console.error(
        `[InstalacionesService] Error al eliminar asignaciones de usuarios asociadas para instalación ${id}:`,
        error,
      );
      throw error; // Lanzar el error para detener la eliminación si falla
    }

    // Liberar números de medidor asignados a esta instalación antes de eliminar
    try {
      const numerosMedidorInstalacion = await this.numerosMedidorService.findByInstalacion(id);
      if (numerosMedidorInstalacion.length > 0) {
        await this.numerosMedidorService.liberarDeInstalacion(
          numerosMedidorInstalacion.map((n) => n.numeroMedidorId),
        );
      }
    } catch (error) {
      console.error(`Error al liberar números de medidor al eliminar instalación ${id}:`, error);
      // Continuar con la eliminación aunque falle la liberación
    }

    // Buscar y eliminar todas las salidas asociadas a esta instalación
    try {
      const movimientosAsociados = await this.movimientosService.findByInstalacion(id);
      const salidasAsociadas = movimientosAsociados.filter(
        (m) => m.movimientoTipo === TipoMovimiento.SALIDA,
      );

      // Eliminar cada salida (esto revertirá los stocks automáticamente)
      for (const salida of salidasAsociadas) {
        try {
          await this.movimientosService.remove(salida.movimientoId, usuarioId);
        } catch (error) {
          console.error(
            `Error al eliminar salida ${salida.movimientoId} asociada a instalación ${id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error('Error al buscar y eliminar salidas asociadas:', error);
      // Continuar con la eliminación aunque falle la eliminación de salidas
    }

    // Eliminar todos los materiales de instalación (esto también liberará números de medidor)
    try {
      await this.instalacionesMaterialesService.removeByInstalacion(id);
    } catch (error) {
      console.error(`Error al eliminar materiales de instalación ${id}:`, error);
      // Continuar con la eliminación aunque falle
    }

    // Actualizar cantidad de instalaciones del cliente
    try {
      await this.actualizarCantidadInstalacionesCliente(instalacion.clienteId);
    } catch (error) {
      console.error('Error al actualizar cantidad de instalaciones del cliente:', error);
    }

    // Registrar en auditoría antes de eliminar
    try {
      await this.auditoriaService.registrarEliminacion(
        TipoEntidad.INSTALACION,
        instalacion.instalacionId,
        datosEliminados,
        usuarioId,
        'Eliminación de instalación',
        `Instalación ${instalacion.identificadorUnico} eliminada. Salidas asociadas eliminadas y stocks revertidos.`,
      );
    } catch (error) {
      console.error('Error al registrar en auditoría:', error);
      // Continuar con la eliminación aunque falle la auditoría
    }

    // Eliminar la instalación
    await this.instalacionesRepository.remove(instalacion);
  }

  /**
   * Agrega URLs de fotos/archivos del chat como anexos de la instalación.
   * Se llama cuando se suben fotos en el chat del grupo de la instalación.
   */
  async agregarAnexos(instalacionId: number, urls: string[]): Promise<void> {
    if (!urls?.length) return;
    const instalacion = await this.instalacionesRepository.findOne({
      where: { instalacionId },
    });
    if (!instalacion) return;
    const actuales: string[] = Array.isArray(instalacion.instalacionAnexos)
      ? [...instalacion.instalacionAnexos]
      : [];
    const nuevos = urls.filter((u) => u && !actuales.includes(u));
    if (nuevos.length === 0) return;
    instalacion.instalacionAnexos = [...actuales, ...nuevos];
    await this.instalacionesRepository.save(instalacion);
  }

  /**
   * Elimina un anexo (URL) de la lista de anexos de la instalación.
   */
  async eliminarAnexo(instalacionId: number, url: string): Promise<void> {
    const instalacion = await this.instalacionesRepository.findOne({
      where: { instalacionId },
    });
    if (!instalacion) {
      throw new NotFoundException('Instalación no encontrada');
    }
    const actuales: string[] = Array.isArray(instalacion.instalacionAnexos)
      ? [...instalacion.instalacionAnexos]
      : [];
    instalacion.instalacionAnexos = actuales.filter((u) => u !== url);
    await this.instalacionesRepository.save(instalacion);
  }

  async actualizarEstado(
    instalacionId: number,
    nuevoEstado: EstadoInstalacion,
    usuarioId: number,
    user?: any,
    extras?: { numeroActa?: string; observacionNovedad?: string },
  ): Promise<Instalacion> {
    // Validar que almacenista no pueda cambiar estado de instalaciones
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;
      if (rolTipo === 'almacenista') {
        throw new BadRequestException('No tienes permisos para cambiar el estado de instalaciones');
      }
    }
    const instalacion = await this.findOne(instalacionId, user);
    const estadoAnterior = instalacion.estado;

    let estadoNormalizado = normalizarEstadoInstalacionCodigo(String(nuevoEstado));
    if (nuevoEstado === EstadoInstalacion.FINALIZADA) {
      estadoNormalizado = EstadoInstalacion.FACT;
    } else if (nuevoEstado === EstadoInstalacion.CANCELADA) {
      estadoNormalizado = EstadoInstalacion.DEV;
    } else if (nuevoEstado === EstadoInstalacion.COMPLETADA) {
      estadoNormalizado = EstadoInstalacion.FACT;
    } else if (nuevoEstado === EstadoInstalacion.EN_PROCESO) {
      estadoNormalizado =
        instalacion.usuariosAsignados && instalacion.usuariosAsignados.length > 0
          ? EstadoInstalacion.AAT
          : EstadoInstalacion.PPC;
    }

    if (!esEstadoInstalacionCanonico(estadoNormalizado)) {
      throw new BadRequestException(`Estado inválido: ${estadoNormalizado}`);
    }

    if (estadoNormalizado === EstadoInstalacion.FACT) {
      const prev = normalizarEstadoInstalacionCodigo(String(estadoAnterior));
      if (prev !== EstadoInstalacion.CERT) {
        throw new BadRequestException(
          'Solo puede pasar a facturación cuando la instalación está certificada.',
        );
      }
      const acta = (extras?.numeroActa ?? '').trim();
      if (!acta) {
        throw new BadRequestException('Debe indicar el número de acta para facturación.');
      }
    }

    instalacion.estado = estadoNormalizado;

    const estadoInstalacion = await this.estadosInstalacionService.findByCodigo(estadoNormalizado);
    if (estadoInstalacion) {
      instalacion.estadoInstalacionId = estadoInstalacion.estadoInstalacionId;
    }

    const ahora = new Date();

    if (estadoNormalizado === EstadoInstalacion.AAT && !instalacion.fechaAsignacion) {
      instalacion.fechaAsignacion = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.AVAN) {
      if (!instalacion.fechaConstruccion) {
        instalacion.fechaConstruccion = ahora as any;
      }
      if (!instalacion.instalacionFecha) {
        instalacion.instalacionFecha = ahora as any;
      }
    }

    if (estadoNormalizado === EstadoInstalacion.CONS && !instalacion.fechaConstruida) {
      instalacion.fechaConstruida = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.CERT && !instalacion.fechaCertificacion) {
      instalacion.fechaCertificacion = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.FACT) {
      if (!instalacion.fechaFacturacion) instalacion.fechaFacturacion = ahora as any;
      if (!instalacion.fechaFinalizacion) instalacion.fechaFinalizacion = ahora as any;
      instalacion.instalacionNumeroActa = (extras?.numeroActa ?? '').trim();
    }

    if (estadoNormalizado === EstadoInstalacion.NOVE) {
      if (!instalacion.fechaNovedad) instalacion.fechaNovedad = ahora as any;
      if (extras?.observacionNovedad != null) {
        const o = String(extras.observacionNovedad).trim();
        instalacion.observacionNovedad = o || null;
      }
    }

    if (estadoNormalizado === EstadoInstalacion.DEV) {
      if (!instalacion.fechaDevolucion) {
        instalacion.fechaDevolucion = (instalacion.fechaAnulacion as any) || (ahora as any);
      }
    }

    const instalacionActualizada = await this.instalacionesRepository.save(instalacion);

    // Obtener información del cliente y usuarios asignados usando findOne que ya maneja SQL raw
    const instalacionCompleta = await this.findOne(instalacionId, user);

    // Actualizar estado del cliente según el estado de la instalación
    if (instalacionCompleta.clienteId) {
      let nuevoEstadoCliente: EstadoCliente;

      const terminalesCliente = new Set([EstadoInstalacion.FACT, EstadoInstalacion.DEV]);

      if (estadoNormalizado === EstadoInstalacion.AAT) {
        nuevoEstadoCliente = EstadoCliente.INSTALACION_ASIGNADA;
      } else if (
        estadoNormalizado === EstadoInstalacion.AVAN ||
        estadoNormalizado === EstadoInstalacion.CONS ||
        estadoNormalizado === EstadoInstalacion.CERT
      ) {
        nuevoEstadoCliente = EstadoCliente.REALIZANDO_INSTALACION;
      } else if (terminalesCliente.has(estadoNormalizado)) {
        const instalacionesClienteRaw = await this.instalacionesRepository.query(
          `SELECT instalacionId, estado FROM instalaciones WHERE clienteId = ?`,
          [instalacionCompleta.clienteId],
        );

        const tieneOtrasInstalacionesActivas = instalacionesClienteRaw.some(
          (inst: any) =>
            inst.instalacionId !== instalacionId &&
            !terminalesCliente.has(normalizarEstadoInstalacionCodigo(String(inst.estado))),
        );

        nuevoEstadoCliente = tieneOtrasInstalacionesActivas
          ? EstadoCliente.REALIZANDO_INSTALACION
          : EstadoCliente.ACTIVO;
      } else {
        nuevoEstadoCliente = EstadoCliente.ACTIVO;
      }

      await this.clientesService.update(instalacionCompleta.clienteId, {
        clienteEstado: nuevoEstadoCliente,
      });
    }

    // Obtener todos los usuarios asignados a esta instalación
    const usuariosAsignados =
      await this.instalacionesUsuariosService.findByInstalacion(instalacionId);
    const usuariosIds = usuariosAsignados.map((u) => u.usuarioId);

    // Obtener información del usuario que está cambiando el estado
    const usuarioQueCambia = await this.usersService.findOne(usuarioId);
    const esTecnicoOSoldador =
      usuarioQueCambia?.usuarioRol?.rolTipo === 'tecnico' ||
      usuarioQueCambia?.usuarioRol?.rolTipo === 'soldador';

    // Si un técnico o soldador cambia el estado, notificar a supervisores y admins
    let supervisoresIds: number[] = [];
    if (esTecnicoOSoldador) {
      try {
        const todosUsuarios = await this.usersService.findAll({ page: 1, limit: 1000 });
        supervisoresIds = todosUsuarios.data
          .filter(
            (u: any) =>
              u.usuarioRol?.rolTipo === 'superadmin' ||
              u.usuarioRol?.rolTipo === 'gerencia' ||
              u.usuarioRol?.rolTipo === 'admin' ||
              u.usuarioRol?.rolTipo === 'supervisor',
          )
          .map((u: any) => u.usuarioId)
          .filter((id: number) => id !== usuarioId); // Excluir al técnico que hizo el cambio
      } catch (error) {
        console.error('Error al obtener supervisores para notificación:', error);
      }
    }

    const estadosFinalesMedidor = [
      EstadoInstalacion.FACT,
      EstadoInstalacion.CERT,
      EstadoInstalacion.COMPLETADA,
      EstadoInstalacion.CERTIFICACION,
    ];

    if (
      estadosFinalesMedidor.includes(estadoNormalizado) &&
      !estadosFinalesMedidor.includes(estadoAnterior as any)
    ) {
      try {
        await this.numerosMedidorService.marcarComoInstalados(instalacionId);
      } catch (error) {
        console.error(
          `Error al marcar números de medidor como instalados para instalación ${instalacionId}:`,
          error,
        );
        // No lanzar error para no interrumpir el proceso de actualización de estado
      }
    }

    // Enviar notificaciones según el estado (usar estadoNormalizado)
    // Usar switch para mejor inferencia de tipos de TypeScript
    switch (estadoNormalizado) {
      case EstadoInstalacion.FACT:
      case EstadoInstalacion.COMPLETADA: {
        // Facturación (antes completada): salidas automáticas e inventario
        if (
          estadoAnterior !== EstadoInstalacion.FACT &&
          estadoAnterior !== EstadoInstalacion.COMPLETADA &&
          estadoAnterior !== EstadoInstalacion.FINALIZADA
        ) {
          // Verificar si ya existen salidas para esta instalación
          const salidasExistentes = await this.movimientosService.findByInstalacion(instalacionId);
          const tieneSalidas = salidasExistentes.some(
            (m) => m.movimientoTipo === TipoMovimiento.SALIDA,
          );

          // Si no hay salidas, crearlas automáticamente y completarlas inmediatamente
          if (!tieneSalidas) {
            await this.crearSalidasAutomaticas(
              instalacionId,
              usuarioId,
              true,
              instalacion.bodegaId,
            );
          } else {
            // Si ya existen salidas pendientes, completarlas
            const salidasPendientes = salidasExistentes.filter(
              (m) =>
                m.movimientoTipo === TipoMovimiento.SALIDA &&
                m.movimientoEstado === EstadoMovimiento.PENDIENTE,
            );
            for (const salida of salidasPendientes) {
              await this.movimientosService.actualizarEstado(
                salida.movimientoId,
                EstadoMovimiento.COMPLETADA,
              );
            }
            // Actualizar materiales después de completar las salidas
            await this.actualizarMaterialesInstalacion(instalacionId);
          }
        }

        if (
          estadoAnterior !== EstadoInstalacion.FACT &&
          estadoAnterior !== EstadoInstalacion.COMPLETADA &&
          estadoAnterior !== EstadoInstalacion.FINALIZADA
        ) {
          await this.actualizarMaterialesInstalacion(instalacionId);
        }

        // Notificar al usuario que completó la instalación
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        await this.notificacionesService.crearNotificacionInstalacionCompletada(
          usuarioId,
          instalacionId,
          instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombreCompleto,
        );

        // Emitir evento por WebSocket
        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_completada', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
          usuarioId,
        });

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `✅ La instalación ha sido facturada (cierre operativo). El chat de esta instalación se cerrará automáticamente.`,
            );
            await this.gruposService.cerrarChat(
              TipoGrupo.INSTALACION,
              instalacionId,
              'Chat cerrado: Instalación facturada.',
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje/cerrar chat para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.PPC:
      case EstadoInstalacion.PENDIENTE: {
        // Pendiente por construir
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        this.chatGateway.emitirEventoInstalacion(
          usuariosIds.filter((id) => id !== usuarioId),
          'instalacion_pendiente',
          {
            instalacionId,
            instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombre: clienteNombreCompleto,
          },
        );

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `⏳ La instalación está pendiente de asignación.`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.AAT:
      case EstadoInstalacion.ASIGNACION: {
        // Asignada al técnico
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        // Crear notificaciones para todos los usuarios asignados
        for (const usuarioId of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionAsignacion(
            usuarioId,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
          );
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_asignacion', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
        });

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `📋 La instalación ha sido asignada. El trabajo puede comenzar.`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.CONS:
      case EstadoInstalacion.AVAN:
      case EstadoInstalacion.CONSTRUCCION: {
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        const tecnicoNombre = usuarioQueCambia
          ? `${usuarioQueCambia.usuarioNombre || ''} ${usuarioQueCambia.usuarioApellido || ''}`.trim()
          : 'Técnico';

        const esConstruida = estadoNormalizado === EstadoInstalacion.CONS;

        for (const usuarioIdAsignado of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionConstruccion(
            usuarioIdAsignado,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
          );
        }

        if (esTecnicoOSoldador && supervisoresIds.length > 0) {
          for (const supervisorId of supervisoresIds) {
            await this.notificacionesService.crearNotificacion(
              supervisorId,
              'instalacion_construccion' as any,
              esConstruida ? 'Instalación construida' : 'Instalación en avance',
              `El técnico ${tecnicoNombre} actualizó la instalación ${instalacionCompleta.identificadorUnico || `INST-${instalacionId}`} del cliente ${clienteNombreCompleto} (${esConstruida ? 'construida' : 'en avance'}).`,
              {
                instalacionId,
                instalacionCodigo:
                  instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
                clienteNombre: clienteNombreCompleto,
                tecnicoNombre,
                tecnicoId: usuarioId,
              },
            );
          }
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_construccion', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
        });

        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              esConstruida
                ? `✅ La instalación está construida (obra lista).`
                : `🔨 La instalación está en avance de obra.`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.CERT:
      case EstadoInstalacion.CERTIFICACION: {
        // Certificada
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        const tecnicoNombre = usuarioQueCambia
          ? `${usuarioQueCambia.usuarioNombre || ''} ${usuarioQueCambia.usuarioApellido || ''}`.trim()
          : 'Técnico';

        // Crear notificaciones para todos los usuarios asignados
        for (const usuarioIdAsignado of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionCertificacion(
            usuarioIdAsignado,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
          );
        }

        // Si un técnico o soldador cambió el estado, notificar a supervisores/admins
        if (esTecnicoOSoldador && supervisoresIds.length > 0) {
          for (const supervisorId of supervisoresIds) {
            await this.notificacionesService.crearNotificacion(
              supervisorId,
              'instalacion_certificacion' as any,
              'Instalación en Certificación',
              `El técnico ${tecnicoNombre} cambió la instalación ${instalacionCompleta.identificadorUnico || `INST-${instalacionId}`} del cliente ${clienteNombreCompleto} a estado de certificación.`,
              {
                instalacionId,
                instalacionCodigo:
                  instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
                clienteNombre: clienteNombreCompleto,
                tecnicoNombre,
                tecnicoId: usuarioId,
              },
            );
          }
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_certificacion', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
        });

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `📝 La instalación está en proceso de certificación.`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.NOVE:
      case EstadoInstalacion.NOVEDAD: {
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        const tecnicoNombre = usuarioQueCambia
          ? `${usuarioQueCambia.usuarioNombre || ''} ${usuarioQueCambia.usuarioApellido || ''}`.trim()
          : 'Técnico';

        const motivoNovedad =
          instalacionCompleta.observacionNovedad ||
          instalacionCompleta.instalacionObservaciones ||
          undefined;

        // Crear notificaciones para todos los usuarios asignados
        for (const usuarioIdAsignado of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionNovedad(
            usuarioIdAsignado,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
            motivoNovedad,
          );
        }

        // Si un técnico o soldador cambió el estado, notificar a supervisores/admins
        if (esTecnicoOSoldador && supervisoresIds.length > 0) {
          for (const supervisorId of supervisoresIds) {
            await this.notificacionesService.crearNotificacion(
              supervisorId,
              'instalacion_novedad' as any,
              'Novedad Técnica en Instalación',
              `El técnico ${tecnicoNombre} reportó una novedad técnica en la instalación ${instalacionCompleta.identificadorUnico || `INST-${instalacionId}`} del cliente ${clienteNombreCompleto}.${motivoNovedad ? ` Motivo: ${motivoNovedad}` : ''}`,
              {
                instalacionId,
                instalacionCodigo:
                  instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
                clienteNombre: clienteNombreCompleto,
                tecnicoNombre,
                tecnicoId: usuarioId,
                motivo: motivoNovedad,
              },
            );
          }
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_novedad', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
          motivo: motivoNovedad,
        });

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `⚠️ Se ha reportado una novedad técnica en la instalación.${motivoNovedad ? ` Motivo: ${motivoNovedad}` : ''}`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }

        // Una sola bodega por sede para todas las instalaciones en novedad: obtener o crear la
        // "Bodega de instalaciones" del centro operativo (solo estructura para reportes).
        // NO se crean movimientos (ENTRADA) aquí para no afectar el stock: los materiales ya fueron
        // descontados del técnico al registrarse en la instalación (instalaciones-materiales).
        // Para saber dónde están los materiales, consultar instalaciones_materiales de las
        // instalaciones con estado NOVEDAD (no el inventario de esta bodega).
        try {
          let sedeId: number | null =
            instalacionCompleta.bodegaId != null
              ? ((await this.bodegasService.findOne(instalacionCompleta.bodegaId))?.sedeId ?? null)
              : null;
          if (sedeId == null && usuarioId != null) {
            const usuario = await this.usersService.findOne(usuarioId).catch(() => null);
            if (usuario?.usuarioSede != null) sedeId = usuario.usuarioSede;
          }
          if (sedeId != null) {
            const bodegaInstalaciones =
              await this.bodegasService.findOrCreateBodegaInstalaciones(sedeId);
            const inventario = await this.inventariosService.findByBodega(
              bodegaInstalaciones.bodegaId,
            );
            if (!inventario) {
              await this.inventariosService.create({
                bodegaId: bodegaInstalaciones.bodegaId,
                inventarioNombre: 'Inventario bodega instalaciones',
                inventarioDescripcion:
                  'Materiales de instalaciones con novedad (ubicación vía instalaciones_materiales)',
              });
            }
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al crear bodega de instalaciones para sede (instalación ${instalacionId}):`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.APM: {
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `📌 Instalación en etapa Metrogas (asignación registrada).`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      case EstadoInstalacion.DEV: {
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';
        const motivoDevolucion = instalacionCompleta.instalacionObservaciones || undefined;

        for (const uid of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionDevuelta(
            uid,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
            motivoDevolucion,
          );
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_devuelta', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
          motivo: motivoDevolucion,
        });

        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `↩️ La instalación ha sido marcada como devuelta.${motivoDevolucion ? ` Motivo: ${motivoDevolucion}` : ''} El chat se cerrará automáticamente.`,
            );
            await this.gruposService.cerrarChat(
              TipoGrupo.INSTALACION,
              instalacionId,
              'Chat cerrado: instalación devuelta.',
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje/cerrar chat para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
      }
      default:
        // Para otros estados, enviar mensaje automático al chat si existe
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            const estadoLabels: Record<string, string> = {
              apm: 'Asignada por Metrogas',
              ppc: 'Pendiente por construir',
              aat: 'Asignada al técnico',
              avan: 'Avance',
              cons: 'Construida',
              cert: 'Certificada',
              fact: 'Facturación',
              nove: 'Novedad',
              dev: 'Devuelta',
              pendiente: 'Pendiente por construir',
              asignacion: 'Asignada al técnico',
              construccion: 'Avance',
              certificacion: 'Certificada',
              novedad: 'Novedad',
              completada: 'Facturación',
            };
            const estadoTexto = estadoLabels[estadoNormalizado] || estadoNormalizado;
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `📋 El estado de la instalación ha cambiado a: ${estadoTexto}`,
            );
          }
        } catch (error) {
          console.error(
            `[InstalacionesService] Error al enviar mensaje para instalación ${instalacionId}:`,
            error,
          );
        }
        break;
    }

    return instalacionActualizada;
  }

  /**
   * Crea salidas automáticamente cuando se asignan usuarios a una instalación
   * Basa las salidas en los materiales de instalacionProyectos o materialesInstalados
   * @param completarInmediatamente Si es true, las salidas se crean en estado COMPLETADA (para instalaciones finalizadas)
   * @param bodegaId ID de la bodega de origen (opcional)
   */
  async crearSalidasAutomaticas(
    instalacionId: number,
    usuarioId: number,
    completarInmediatamente: boolean = false,
    bodegaId?: number,
  ): Promise<void> {
    const instalacion = await this.findOne(instalacionId);

    // Verificar si ya existen salidas pendientes para esta instalación
    const salidasExistentes = await this.movimientosService.findByInstalacion(instalacionId);
    const tieneSalidasPendientes = salidasExistentes.some(
      (m) =>
        m.movimientoTipo === TipoMovimiento.SALIDA &&
        m.movimientoEstado === EstadoMovimiento.PENDIENTE,
    );

    if (tieneSalidasPendientes) {
      // Ya existen salidas pendientes, no crear duplicados
      return;
    }

    const materiales: Array<{ materialId: number; cantidad: number; precio?: number }> = [];

    // Intentar obtener materiales de instalacionProyectos
    if (instalacion.instalacionProyectos) {
      try {
        const proyectos =
          typeof instalacion.instalacionProyectos === 'string'
            ? JSON.parse(instalacion.instalacionProyectos)
            : instalacion.instalacionProyectos;

        if (
          proyectos &&
          typeof proyectos === 'object' &&
          !Array.isArray(proyectos) &&
          proyectos.version === 'redes_v2'
        ) {
          // Catálogo redes_v2 no incluye ítems de inventario; siguen materialesInstalados / otros flujos
        } else if (Array.isArray(proyectos)) {
          for (const proyecto of proyectos) {
            if (proyecto.items && Array.isArray(proyecto.items)) {
              for (const item of proyecto.items) {
                if (item.materialId && item.itemCantidad) {
                  materiales.push({
                    materialId: item.materialId,
                    cantidad: Number(item.itemCantidad),
                    precio: item.materialPrecio || undefined,
                  });
                }
              }
            }
          }
        } else if (proyectos.items && Array.isArray(proyectos.items)) {
          // Estructura simple con items directo
          for (const item of proyectos.items) {
            if (item.materialId && item.itemCantidad) {
              materiales.push({
                materialId: item.materialId,
                cantidad: Number(item.itemCantidad),
                precio: item.materialPrecio || undefined,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al procesar instalacionProyectos:', error);
      }
    }

    // Si no se encontraron materiales en proyectos, intentar materialesInstalados
    if (materiales.length === 0 && instalacion.materialesInstalados) {
      try {
        const materialesInst =
          typeof instalacion.materialesInstalados === 'string'
            ? JSON.parse(instalacion.materialesInstalados)
            : instalacion.materialesInstalados;

        if (Array.isArray(materialesInst)) {
          for (const mat of materialesInst) {
            if (mat.materialId && mat.cantidad) {
              materiales.push({
                materialId: mat.materialId,
                cantidad: Number(mat.cantidad),
                precio: mat.precio || undefined,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al procesar materialesInstalados:', error);
      }
    }

    // Si hay materiales, crear las salidas en estado PENDIENTE
    if (materiales.length > 0) {
      const movimientoCodigo = `SALIDA-AUTO-${instalacionId}-${Date.now()}`;

      // Usar bodegaId de la instalación si está disponible, o el parámetro pasado
      const bodegaIdFinal = instalacion.bodegaId || bodegaId;

      // Obtener inventarioId desde bodegaId si está disponible
      let inventarioId: number | undefined = undefined;
      if (bodegaIdFinal) {
        try {
          const inventarios = await this.inventariosService.findAll();
          const inventario = inventarios.find((inv) => inv.bodegaId === bodegaIdFinal);
          if (inventario) {
            inventarioId = inventario.inventarioId;
          }
        } catch (error) {
          console.error('Error al obtener inventario desde bodega:', error);
        }
      }

      await this.movimientosService.create({
        movimientoTipo: TipoMovimiento.SALIDA,
        materiales: materiales.map((m) => ({
          materialId: m.materialId,
          movimientoCantidad: m.cantidad,
          movimientoPrecioUnitario: m.precio,
        })),
        instalacionId,
        usuarioId,
        inventarioId,
        movimientoObservaciones: `Salida automática generada al asignar usuarios a instalación ${instalacion.identificadorUnico || `INST-${instalacion.instalacionId}`}`,
        movimientoCodigo,
      });

      // Actualizar los movimientos creados según el estado deseado
      const salidasCreadas = await this.movimientosService.findByInstalacion(instalacionId);
      const salidasNuevas = salidasCreadas.filter(
        (m) =>
          m.movimientoCodigo === movimientoCodigo && m.movimientoTipo === TipoMovimiento.SALIDA,
      );

      const estadoFinal = completarInmediatamente
        ? EstadoMovimiento.COMPLETADA
        : EstadoMovimiento.PENDIENTE;
      for (const salida of salidasNuevas) {
        await this.movimientosService.actualizarEstado(salida.movimientoId, estadoFinal);
      }

      // Si se completan inmediatamente, también actualizar materiales
      if (completarInmediatamente) {
        await this.actualizarMaterialesInstalacion(instalacionId);
      }
    }
  }

  private async actualizarCantidadInstalacionesCliente(clienteId: number): Promise<void> {
    // Contar solo las instalaciones completadas del cliente
    const cantidadFinalizadas = await this.instalacionesRepository.count({
      where: {
        clienteId,
        estado: In([EstadoInstalacion.FACT, EstadoInstalacion.COMPLETADA]),
      },
    });

    // Actualizar el campo cantidadInstalaciones del cliente usando el servicio
    await this.clientesService.update(clienteId, {
      cantidadInstalaciones: cantidadFinalizadas,
    } as any);
  }

  private async actualizarMaterialesInstalacion(instalacionId: number): Promise<void> {
    // Obtener todos los movimientos asociados a esta instalación
    const movimientos = await this.movimientosService.findByInstalacion(instalacionId);

    // Obtener los materiales realmente utilizados de la instalación
    const instalacion = await this.findOne(instalacionId);
    const materialesUtilizados = new Map<number, number>(); // materialId -> cantidad

    // Procesar materialesInstalados para obtener los realmente utilizados
    if (instalacion.materialesInstalados) {
      try {
        const materialesInst =
          typeof instalacion.materialesInstalados === 'string'
            ? JSON.parse(instalacion.materialesInstalados)
            : instalacion.materialesInstalados;

        if (Array.isArray(materialesInst)) {
          for (const mat of materialesInst) {
            if (mat.materialId && mat.cantidad) {
              const materialId = Number(mat.materialId);
              const cantidad = Number(mat.cantidad);
              materialesUtilizados.set(materialId, cantidad);
            }
          }
        }
      } catch (error) {
        console.error('Error al procesar materialesInstalados para actualización:', error);
      }
    }

    // Actualizar salidas pendientes a completadas y ajustar inventario
    for (const movimiento of movimientos) {
      if (
        movimiento.movimientoTipo === TipoMovimiento.SALIDA &&
        movimiento.movimientoEstado === EstadoMovimiento.PENDIENTE
      ) {
        const cantidadUtilizada = materialesUtilizados.get(movimiento.materialId);
        const tieneCantidadUtilizada =
          typeof cantidadUtilizada === 'number' && !Number.isNaN(cantidadUtilizada);
        const cantidadFinal = tieneCantidadUtilizada
          ? Number(cantidadUtilizada)
          : Number(movimiento.movimientoCantidad);

        // Si la cantidad realmente utilizada difiere de la planificada, actualizar el movimiento
        // ANTES de completarlo, para que el ajuste de stock se haga con la cantidad correcta.
        if (
          tieneCantidadUtilizada &&
          Number(movimiento.movimientoCantidad) !== cantidadFinal
        ) {
          await this.movimientosService.update(movimiento.movimientoId, {
            materiales: [
              {
                materialId: movimiento.materialId,
                movimientoCantidad: cantidadFinal,
                movimientoPrecioUnitario: movimiento.movimientoPrecioUnitario,
              } as any,
            ],
            inventarioId: movimiento.inventarioId,
          } as any);
        }

        // Completar el movimiento. Este método ya aplica el ajuste de stock (una sola vez)
        // según el tipo de movimiento y el inventario/bodega.
        await this.movimientosService.actualizarEstado(
          movimiento.movimientoId,
          EstadoMovimiento.COMPLETADA,
        );

        // Actualizar precio si viene en el movimiento (no tocar stock aquí para evitar dobles descuentos)
        if (movimiento.movimientoPrecioUnitario) {
          const material = await this.materialesService.findOne(movimiento.materialId);
          if (material.inventarioId) {
            await this.materialesService.actualizarInventarioYPrecio(
              movimiento.materialId,
              material.inventarioId,
              movimiento.movimientoPrecioUnitario,
            );
          }
        }
      }
    }
  }

  /**
   * Descontar materiales utilizados del inventario del técnico cuando pasa de construccion a certificacion
   */
  private async descontarMaterialesDeTecnico(instalacionId: number): Promise<void> {
    try {
      // Obtener la instalación con usuarios asignados
      const instalacion = await this.findOne(instalacionId);

      if (
        !instalacion ||
        !instalacion.usuariosAsignados ||
        !Array.isArray(instalacion.usuariosAsignados)
      ) {
        return;
      }

      // Buscar el técnico o soldador asignado (para descontar de su inventario)
      const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
        const usuario = u.usuario || u;
        const rol = usuario?.usuarioRol?.rolTipo ?? usuario?.rolTipo;
        return usuario && (rol === 'tecnico' || rol === 'soldador');
      });

      if (!tecnicoAsignado) {
        return;
      }

      const usuario = tecnicoAsignado.usuario || tecnicoAsignado;
      const tecnicoId = usuario.usuarioId;

      // Obtener todos los materiales utilizados en esta instalación
      const materialesUtilizados =
        await this.instalacionesMaterialesService.findByInstalacion(instalacionId);

      if (!materialesUtilizados || materialesUtilizados.length === 0) {
        return;
      }

      // Obtener el inventario del técnico
      const inventarioTecnico = await this.inventarioTecnicoService.findByUsuario(tecnicoId);

      // Descontar cada material utilizado
      for (const materialUtilizado of materialesUtilizados) {
        const materialId = materialUtilizado.materialId;
        const cantidadUtilizada = Math.round(Number(materialUtilizado.cantidad || 0));

        if (cantidadUtilizada <= 0) {
          continue;
        }

        // Buscar el material en el inventario del técnico
        const inventarioItem = inventarioTecnico.find(
          (inv) => inv.materialId === materialId && inv.usuarioId === tecnicoId,
        );

        if (inventarioItem) {
          const cantidadActual = Number(inventarioItem.cantidad || 0);
          const nuevaCantidad = Math.max(0, cantidadActual - cantidadUtilizada);

          await this.inventarioTecnicoService.update(inventarioItem.inventarioTecnicoId, {
            cantidad: nuevaCantidad,
          });
        }
      }
    } catch (error) {
      console.error(
        `[InstalacionesService] Error al descontar materiales del técnico para instalación ${instalacionId}:`,
        error,
      );
      // No lanzar error para no interrumpir el cambio de estado
    }
  }
}
