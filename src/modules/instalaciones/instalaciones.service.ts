import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instalacion, EstadoInstalacion } from './instalacion.entity';
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
  ) {}

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
    const { usuariosAsignados, instalacionCodigo, instalacionTipo: dtoTipo, ...instalacionData } = createInstalacionDto;

    // Validar instalacionTipo (internas | redes) según el rol del usuario
    const tipo = (dtoTipo || '').toLowerCase();
    if (tipo !== 'internas' && tipo !== 'redes') {
      throw new BadRequestException(
        'Al crear una instalación debe seleccionar el tipo: internas o redes.',
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

    // Determinar el estado inicial: pendiente si no hay técnicos asignados
    let estadoInicial = EstadoInstalacion.PENDIENTE;
    let estadoInstalacionId: number | null = null;

    if (usuariosAsignados && usuariosAsignados.length > 0) {
      // Si hay técnicos asignados, buscar el estado "asignacion" o usar "en_proceso"
      try {
        const estadoAsignacion = await this.estadosInstalacionService.findByCodigo('asignacion');
        estadoInstalacionId = estadoAsignacion.estadoInstalacionId;
        estadoInicial = EstadoInstalacion.ASIGNACION;
      } catch {
        // Si no existe el estado asignacion, usar pendiente
        try {
          const estadoPendiente = await this.estadosInstalacionService.findByCodigo('pendiente');
          estadoInstalacionId = estadoPendiente.estadoInstalacionId;
          estadoInicial = EstadoInstalacion.PENDIENTE;
        } catch (_e) {
          // Si no existe ningún estado, dejar null y usar el enum por defecto
        }
      }
    } else {
      // Si no hay técnicos asignados, establecer estado pendiente
      try {
        const estadoPendiente = await this.estadosInstalacionService.findByCodigo('pendiente');
        estadoInstalacionId = estadoPendiente.estadoInstalacionId;
        estadoInicial = EstadoInstalacion.PENDIENTE;
      } catch {
        // Si no existe el estado pendiente, usar el enum por defecto
      }
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
      const codigoGrupo = savedInstalacion.identificadorUnico || `INST-${savedInstalacion.instalacionId}`;
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
      // Usar SQL raw para evitar completamente que TypeORM intente cargar relaciones automáticamente
      const instalacionesRaw = await this.instalacionesRepository.query(`
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
          i.estado,
          i.estadoInstalacionId,
          i.usuarioRegistra,
          i.bodegaId,
          i.fechaCreacion,
          i.fechaActualizacion
        FROM instalaciones i
      `);

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
                  usuarioTelefono, usuarioDocumento, usuarioEstado
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

      // SuperAdmin / desarrollador / Gerencia ven todo (rol sin distinguir mayúsculas)
      const rolTipoListado = (user?.usuarioRol?.rolTipo ?? user?.role ?? '').toString().toLowerCase();
      if (
        rolTipoListado === 'superadmin' ||
        rolTipoListado === 'gerencia'
      ) {
        return allInstalaciones;
      }

      // Admin (centro operativo) ve instalaciones de su sede y las sin bodega (recién creadas)
      if (user?.usuarioRol?.rolTipo === 'admin' || user?.role === 'admin') {
        if (user.usuarioSede) {
          return allInstalaciones.filter(
            (inst) =>
              !inst.bodegaId ||
              inst.bodega?.sedeId === user.usuarioSede,
          );
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

      // Técnico ve solo sus instalaciones asignadas (solo asignaciones activas)
      if (user?.usuarioRol?.rolTipo === 'tecnico' || user?.role === 'tecnico') {
        return allInstalaciones.filter((inst) => {
          // Verificar si el técnico está asignado activamente a esta instalación
          if (inst.usuariosAsignados && Array.isArray(inst.usuariosAsignados)) {
            return inst.usuariosAsignados.some((ua: any) => {
              const usuarioId = ua.usuarioId || ua.usuario?.usuarioId;
              const activo = ua.activo !== undefined ? ua.activo : true;
              return usuarioId === user.usuarioId && activo === true;
            });
          }
          // No mostrar instalaciones que el técnico registró pero no tiene asignadas activamente
          return false;
        });
      }

      // Soldador ve solo sus instalaciones asignadas (solo asignaciones activas)
      if (user?.usuarioRol?.rolTipo === 'soldador' || user?.role === 'soldador') {
        return allInstalaciones.filter((inst) => {
          if (inst.usuariosAsignados && Array.isArray(inst.usuariosAsignados)) {
            return inst.usuariosAsignados.some((ua: any) => {
              const usuarioId = ua.usuarioId || ua.usuario?.usuarioId;
              const activo = ua.activo !== undefined ? ua.activo : true;
              return usuarioId === user.usuarioId && activo === true;
            });
          }
          // No mostrar instalaciones que el soldador registró pero no tiene asignadas activamente
          return false;
        });
      }

      // Almacenista puede ver todas las instalaciones (solo lectura)
      if (user?.usuarioRol?.rolTipo === 'almacenista' || user?.role === 'almacenista') {
        return allInstalaciones;
      }

      // Bodega Internas y Admin Internas solo ven instalaciones de tipo "internas" (y por sede si aplica)
      if (
        user?.usuarioRol?.rolTipo === 'bodega-internas' ||
        user?.role === 'bodega-internas' ||
        user?.usuarioRol?.rolTipo === 'admin-internas' ||
        user?.role === 'admin-internas'
      ) {
        let list = allInstalaciones.filter((inst) => {
          const tipoNombre = inst.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase() || '';
          return tipoNombre.includes('internas');
        });
        if (filterBySedeIfAdmin) {
          list = list.filter(
            (inst) => !inst.bodegaId || inst.bodega?.sedeId === user.usuarioSede,
          );
        }
        return list;
      }

      // Bodega Redes y Admin Redes solo ven instalaciones de tipo "redes" (y por sede si aplica)
      if (
        user?.usuarioRol?.rolTipo === 'bodega-redes' ||
        user?.role === 'bodega-redes' ||
        user?.usuarioRol?.rolTipo === 'admin-redes' ||
        user?.role === 'admin-redes'
      ) {
        let list = allInstalaciones.filter((inst) => {
          const tipoNombre = inst.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase() || '';
          return tipoNombre.includes('redes');
        });
        if (filterBySedeIfAdmin) {
          list = list.filter(
            (inst) => !inst.bodegaId || inst.bodega?.sedeId === user.usuarioSede,
          );
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
    let numerosByIm: Map<number, string> = new Map();
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
        inst.fechaCertificacion || inst.fechaConstruccion || inst.instalacionFecha || inst.fechaCreacion;
      const certificacion = fechaCert
        ? new Date(fechaCert).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
          const arr = Array.isArray(proy) ? proy : proy?.items ? [proy] : [];
          codProyecto = arr[0]?.proyectoId?.toString() || arr[0]?.codigo || '';
        } catch (_e) {
          codProyecto = '';
        }
      }

      const tecnicoNombre =
        inst.usuariosAsignados?.[0]?.usuario &&
        (inst.usuariosAsignados[0].usuario.usuarioNombre || inst.usuariosAsignados[0].usuario.usuarioApellido)
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
        numerosByIm.get(im.instalacionMaterialId) ||
        inst.instalacionMedidorNumero ||
        '';

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

    // Restricción por centro operativo: admin / admin-internas / admin-redes solo ven instalaciones de su sede
    const rolTipo = user?.usuarioRol?.rolTipo ?? user?.role ?? '';
    const sedeRestricted =
      (rolTipo === 'admin' || rolTipo === 'admin-internas' || rolTipo === 'admin-redes') &&
      user?.usuarioSede;
    if (sedeRestricted) {
      const perteneceSede = !instalacion.bodegaId || (bodega && bodega.sedeId === user.usuarioSede);
      if (!perteneceSede) {
        throw new NotFoundException(`Instalación con ID ${id} no encontrada`);
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
    const { usuariosAsignados, instalacionCodigo, instalacionTipo: dtoTipo, ...instalacionData } = updateInstalacionDto;

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

    // Validar permisos
    if (user) {
      const rolTipo = user.usuarioRol?.rolTipo || user.role;

      // Almacenista no puede editar instalaciones (solo lectura)
      if (rolTipo === 'almacenista') {
        throw new BadRequestException('No tienes permisos para editar instalaciones');
      }

      // Usar instalacionTipo si existe; si no, fallback al nombre del tipo de instalación (legacy)
      const tipoInstalacion = (instalacion as any).instalacionTipo?.toLowerCase()
        || instalacion.tipoInstalacion?.tipoInstalacionNombre?.toLowerCase()
        || '';

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
      } else if (codigoTrimmed !== (instalacion.identificadorUnico ?? instalacion.instalacionCodigo)) {
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

    Object.assign(instalacion, instalacionData);
    const _savedInstalacion = await this.instalacionesRepository.save(instalacion);

    // Verificar si los materiales cambiaron (para actualizar salidas)
    const materialesCambiaron =
      instalacionData.materialesInstalados || instalacionData.instalacionProyectos;

    // Si los materiales cambiaron y la instalación está completada, actualizar las salidas
    if (
      materialesCambiaron &&
      (estadoAnterior === EstadoInstalacion.COMPLETADA ||
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
        // Si hay técnicos asignados, buscar el estado "asignacion" o usar "en_proceso"
        try {
          const estadoAsignacion = await this.estadosInstalacionService.findByCodigo('asignacion');
          nuevoEstadoInstalacionId = estadoAsignacion.estadoInstalacionId;
          nuevoEstado = EstadoInstalacion.ASIGNACION;
        } catch {
          try {
            const estadoPendiente = await this.estadosInstalacionService.findByCodigo('pendiente');
            nuevoEstadoInstalacionId = estadoPendiente.estadoInstalacionId;
            nuevoEstado = EstadoInstalacion.PENDIENTE;
          } catch {
            // Si no existe ningún estado, mantener el estado actual
          }
        }

        // Asignar los nuevos usuarios
        const usuariosParaAsignar = usuariosAsignados.map((usuarioId) => ({
          usuarioId,
          rolEnInstalacion: 'tecnico', // Por defecto técnico
        }));
        await this.instalacionesUsuariosService.asignarUsuarios(id, usuariosParaAsignar);
      } else {
        // Si no hay técnicos asignados, establecer estado pendiente
        try {
          const estadoPendiente = await this.estadosInstalacionService.findByCodigo('pendiente');
          nuevoEstadoInstalacionId = estadoPendiente.estadoInstalacionId;
          nuevoEstado = EstadoInstalacion.PENDIENTE;
        } catch {
          // Si no existe el estado pendiente, mantener el estado actual
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

  async actualizarEstado(
    instalacionId: number,
    nuevoEstado: EstadoInstalacion,
    usuarioId: number,
    user?: any,
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

    // Mapear estados legacy a los nuevos estados
    let estadoNormalizado: EstadoInstalacion = nuevoEstado;
    if (nuevoEstado === EstadoInstalacion.FINALIZADA) {
      estadoNormalizado = EstadoInstalacion.COMPLETADA;
    } else if (nuevoEstado === EstadoInstalacion.CANCELADA) {
      estadoNormalizado = EstadoInstalacion.ANULADA;
    } else if (nuevoEstado === EstadoInstalacion.EN_PROCESO) {
      // EN_PROCESO se mapea a ASIGNACION si hay técnicos, sino a PENDIENTE
      if (instalacion.usuariosAsignados && instalacion.usuariosAsignados.length > 0) {
        estadoNormalizado = EstadoInstalacion.ASIGNACION;
      } else {
        estadoNormalizado = EstadoInstalacion.PENDIENTE;
      }
    }

    // Validar que el estado sea uno de los valores válidos del enum
    const estadosValidos = Object.values(EstadoInstalacion);
    if (!estadosValidos.includes(estadoNormalizado)) {
      throw new Error(
        `Estado inválido: ${estadoNormalizado}. Valores válidos: ${estadosValidos.join(', ')}`,
      );
    }

    instalacion.estado = estadoNormalizado;

    // Sincronizar estadoInstalacionId con el estado enum (usar el estado normalizado)
    const estadoInstalacion = await this.estadosInstalacionService.findByCodigo(estadoNormalizado);
    if (estadoInstalacion) {
      instalacion.estadoInstalacionId = estadoInstalacion.estadoInstalacionId;
    }

    // Establecer fechas específicas según el estado (usar el estado normalizado)
    const ahora = new Date();

    if (estadoNormalizado === EstadoInstalacion.ASIGNACION && !instalacion.fechaAsignacion) {
      instalacion.fechaAsignacion = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.CONSTRUCCION) {
      if (!instalacion.fechaConstruccion) {
        instalacion.fechaConstruccion = ahora as any;
      }
      // Actualizar fecha de instalación si no está establecida
      if (!instalacion.instalacionFecha) {
        instalacion.instalacionFecha = ahora as any;
      }
    }

    if (estadoNormalizado === EstadoInstalacion.CERTIFICACION && !instalacion.fechaCertificacion) {
      instalacion.fechaCertificacion = ahora as any;

      // NO descontar aquí - los materiales ya se descontaron cuando el técnico los registró
      // Esto evita descuentos duplicados que causan que el inventario quede en 0 incorrectamente
    }

    if (estadoNormalizado === EstadoInstalacion.NOVEDAD && !instalacion.fechaNovedad) {
      instalacion.fechaNovedad = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.ANULADA && !instalacion.fechaAnulacion) {
      instalacion.fechaAnulacion = ahora as any;
    }

    if (estadoNormalizado === EstadoInstalacion.COMPLETADA && !instalacion.fechaFinalizacion) {
      instalacion.fechaFinalizacion = ahora as any;
    }

    const instalacionActualizada = await this.instalacionesRepository.save(instalacion);

    // Obtener información del cliente y usuarios asignados usando findOne que ya maneja SQL raw
    const instalacionCompleta = await this.findOne(instalacionId, user);

    // Actualizar estado del cliente según el estado de la instalación
    if (instalacionCompleta.clienteId) {
      let nuevoEstadoCliente: EstadoCliente;

      // Determinar el estado del cliente según el estado de la instalación (usar estadoNormalizado)
      if (estadoNormalizado === EstadoInstalacion.ASIGNACION) {
        nuevoEstadoCliente = EstadoCliente.INSTALACION_ASIGNADA;
      } else if (
        estadoNormalizado === EstadoInstalacion.CONSTRUCCION ||
        estadoNormalizado === EstadoInstalacion.CERTIFICACION
      ) {
        nuevoEstadoCliente = EstadoCliente.REALIZANDO_INSTALACION;
      } else if (
        estadoNormalizado === EstadoInstalacion.COMPLETADA ||
        estadoNormalizado === EstadoInstalacion.ANULADA
      ) {
        // Verificar si hay otras instalaciones activas
        const instalacionesClienteRaw = await this.instalacionesRepository.query(
          `SELECT instalacionId, estado FROM instalaciones WHERE clienteId = ?`,
          [instalacionCompleta.clienteId],
        );

        const tieneOtrasInstalacionesActivas = instalacionesClienteRaw.some(
          (inst: any) =>
            inst.instalacionId !== instalacionId &&
            (inst.estado === EstadoInstalacion.PENDIENTE ||
              inst.estado === EstadoInstalacion.ASIGNACION ||
              inst.estado === EstadoInstalacion.CONSTRUCCION ||
              inst.estado === EstadoInstalacion.CERTIFICACION),
        );

        // Si no tiene otras instalaciones activas, cambiar el estado del cliente a ACTIVO
        nuevoEstadoCliente = tieneOtrasInstalacionesActivas
          ? EstadoCliente.REALIZANDO_INSTALACION
          : EstadoCliente.ACTIVO;
      } else {
        // Para otros estados (PENDIENTE, NOVEDAD), mantener el estado actual o usar ACTIVO
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
    const esTecnico = usuarioQueCambia?.usuarioRol?.rolTipo === 'tecnico';

    // Si un técnico cambia el estado, notificar a supervisores y admins
    let supervisoresIds: number[] = [];
    if (esTecnico) {
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

    // Marcar números de medidor como instalados cuando la instalación se completa o certifica
    const estadosFinales = [EstadoInstalacion.COMPLETADA, EstadoInstalacion.CERTIFICACION];

    if (
      estadosFinales.includes(estadoNormalizado) &&
      !estadosFinales.includes(estadoAnterior as any)
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
      case EstadoInstalacion.COMPLETADA: {
        // Si cambia a COMPLETADA, crear salidas automáticas si no existen (y completarlas inmediatamente)
        if (
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

        // Actualizar materiales cuando la instalación se completa
        // Solo actualizar si el estado anterior no era COMPLETADA para evitar duplicados
        if (
          estadoAnterior !== EstadoInstalacion.COMPLETADA &&
          estadoAnterior !== EstadoInstalacion.FINALIZADA
        ) {
          await this.actualizarMaterialesInstalacion(instalacionId);
        }

        // El estado del cliente ya se actualizó arriba según el estado de la instalación

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
              `✅ La instalación ha sido completada. El chat de esta instalación se cerrará automáticamente.`,
            );
            // Cerrar el chat
            await this.gruposService.cerrarChat(
              TipoGrupo.INSTALACION,
              instalacionId,
              'Chat cerrado: La instalación ha sido completada.',
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
      case EstadoInstalacion.PENDIENTE: {
        // Notificar cuando cambia a pendiente (EN_PROCESO sin técnicos se mapea a PENDIENTE)
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
      case EstadoInstalacion.ASIGNACION: {
        // Notificar a los usuarios asignados cuando cambia a asignación
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
      case EstadoInstalacion.CONSTRUCCION: {
        // Notificar a los usuarios asignados cuando cambia a construcción
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        const tecnicoNombre = usuarioQueCambia
          ? `${usuarioQueCambia.usuarioNombre || ''} ${usuarioQueCambia.usuarioApellido || ''}`.trim()
          : 'Técnico';

        // Crear notificaciones para todos los usuarios asignados
        for (const usuarioIdAsignado of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionConstruccion(
            usuarioIdAsignado,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
          );
        }

        // Si un técnico cambió el estado, notificar a supervisores/admins
        if (esTecnico && supervisoresIds.length > 0) {
          for (const supervisorId of supervisoresIds) {
            await this.notificacionesService.crearNotificacion(
              supervisorId,
              'instalacion_construccion' as any,
              'Instalación en Construcción',
              `El técnico ${tecnicoNombre} cambió la instalación ${instalacionCompleta.identificadorUnico || `INST-${instalacionId}`} del cliente ${clienteNombreCompleto} a estado de construcción.`,
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

        // Enviar mensaje automático al chat de la instalación
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `🔨 La instalación está en construcción.`,
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
      case EstadoInstalacion.CERTIFICACION: {
        // Notificar a los usuarios asignados cuando cambia a certificación
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

        // Si un técnico cambió el estado, notificar a supervisores/admins
        if (esTecnico && supervisoresIds.length > 0) {
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
      case EstadoInstalacion.NOVEDAD: {
        // Notificar a los usuarios asignados cuando hay una novedad técnica
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        const tecnicoNombre = usuarioQueCambia
          ? `${usuarioQueCambia.usuarioNombre || ''} ${usuarioQueCambia.usuarioApellido || ''}`.trim()
          : 'Técnico';

        // Obtener motivo de novedad de las observaciones si está disponible
        const motivoNovedad = instalacionCompleta.instalacionObservaciones || undefined;

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

        // Si un técnico cambió el estado, notificar a supervisores/admins
        if (esTecnico && supervisoresIds.length > 0) {
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
        break;
      }
      case EstadoInstalacion.ANULADA: {
        // Notificar a los usuarios asignados cuando se anula la instalación
        const clienteNombreCompleto = instalacionCompleta.cliente
          ? instalacionCompleta.cliente.nombreUsuario || 'Cliente sin nombre'
          : 'Cliente';

        // Obtener motivo de anulación de las observaciones si está disponible
        const motivoAnulacion = instalacionCompleta.instalacionObservaciones || undefined;

        // Crear notificaciones para todos los usuarios asignados
        for (const usuarioId of usuariosIds) {
          await this.notificacionesService.crearNotificacionInstalacionAnulada(
            usuarioId,
            instalacionId,
            instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
            clienteNombreCompleto,
            motivoAnulacion,
          );
        }

        this.chatGateway.emitirEventoInstalacion(usuariosIds, 'instalacion_anulada', {
          instalacionId,
          instalacionCodigo: instalacionCompleta.identificadorUnico || `INST-${instalacionId}`,
          clienteNombre: clienteNombreCompleto,
          motivo: motivoAnulacion,
        });

        // Enviar mensaje automático al chat de la instalación y cerrarlo
        try {
          const grupo = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );
          if (grupo && grupo.grupoActivo) {
            await this.gruposService.crearMensajeSistema(
              grupo.grupoId,
              `❌ La instalación ha sido anulada. El chat de esta instalación se cerrará automáticamente.${motivoAnulacion ? ` Motivo: ${motivoAnulacion}` : ''}`,
            );
            // Cerrar el chat
            await this.gruposService.cerrarChat(
              TipoGrupo.INSTALACION,
              instalacionId,
              'Chat cerrado: La instalación ha sido anulada.',
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
              pendiente: 'Pendiente',
              asignacion: 'Asignación',
              construccion: 'Construcción',
              certificacion: 'Certificación',
              novedad: 'Novedad',
              anulada: 'Anulada',
              completada: 'Completada',
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

        if (Array.isArray(proyectos)) {
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
        estado: EstadoInstalacion.COMPLETADA,
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
        // Actualizar estado a completada
        await this.movimientosService.actualizarEstado(
          movimiento.movimientoId,
          EstadoMovimiento.COMPLETADA,
        );

        // Si hay materiales utilizados registrados, ajustar la cantidad si es diferente
        const cantidadUtilizada = materialesUtilizados.get(movimiento.materialId);
        if (
          cantidadUtilizada !== undefined &&
          cantidadUtilizada !== movimiento.movimientoCantidad
        ) {
          // La cantidad realmente utilizada es diferente a la planificada
          // Se ajustará automáticamente cuando se procese el movimiento con ajustarStockMovimiento
          // Solo necesitamos actualizar la cantidad del movimiento si es necesario
        }

        // Obtener el material para ajustar inventario
        const material = await this.materialesService.findOne(movimiento.materialId);
        const cantidadFinal =
          cantidadUtilizada !== undefined ? cantidadUtilizada : movimiento.movimientoCantidad;

        // Obtener inventario/bodega del movimiento
        if (movimiento.inventarioId) {
          const inventario = await this.inventariosService.findOne(movimiento.inventarioId);
          const bodegaId = inventario.bodegaId || inventario.bodega?.bodegaId;

          if (bodegaId) {
            // Ajustar stock según la cantidad realmente utilizada
            await this.materialesService.ajustarStock(
              movimiento.materialId,
              -cantidadFinal,
              bodegaId,
            );
          }
        }

        // Actualizar precio si viene en el movimiento
        if (material.inventarioId && movimiento.movimientoPrecioUnitario) {
          await this.materialesService.actualizarInventarioYPrecio(
            movimiento.materialId,
            material.inventarioId,
            movimiento.movimientoPrecioUnitario,
          );
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

      // Buscar el técnico asignado
      const tecnicoAsignado = instalacion.usuariosAsignados.find((u: any) => {
        const usuario = u.usuario || u;
        return (
          usuario && (usuario.usuarioRol?.rolTipo === 'tecnico' || usuario.rolTipo === 'tecnico')
        );
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
