import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Material } from '../materiales/material.entity';
import { Instalacion } from '../instalaciones/instalacion.entity';
import { MovimientoInventario } from '../movimientos/movimiento-inventario.entity';
import { Traslado } from '../traslados/traslado.entity';
import { Cliente } from '../clientes/cliente.entity';
import { User } from '../users/user.entity';
import { InstalacionUsuario } from '../instalaciones-usuarios/instalacion-usuario.entity';
import { Municipio } from '../municipios/municipio.entity';
import { Categoria } from '../categorias/categoria.entity';
import { InventarioTecnico } from '../inventario-tecnico/inventario-tecnico.entity';

export interface DashboardStats {
  totalMateriales: number;
  totalInstalaciones: number;
  totalMovimientos: number;
  totalTraslados: number;
  totalClientes: number;
  totalUsuarios: number;
  materialesBajoStock: number;
  instalacionesPendientes: number;
  trasladosPendientes: number;
  movimientosPorTipo: {
    entrada: number;
    salida: number;
    devolucion: number;
  };
  movimientosUltimoMes: number;
  instalacionesUltimoMes: number;
  movimientosPorMes?: { mes: string; entrada: number; salida: number; devolucion: number }[];
  materialesPorCategoria?: { categoria: string; cantidad: number }[];
  instalacionesPorEstado?: { estado: string; cantidad: number }[];
  tecnicosConMasInstalaciones?: { tecnico: string; cantidad: number }[];
  instalacionesPorMunicipio?: { municipio: string; cantidad: number }[];
  ultimasInstalaciones?: {
    instalacionId: number;
    codigo: string;
    clienteNombre?: string; // Legacy, mantener para compatibilidad
    clienteApellido?: string; // Legacy, mantener para compatibilidad
    nombreUsuario?: string; // Nuevo campo unificado
    cliente?: {
      nombreUsuario?: string;
    };
    estado: string;
    fechaCreacion: Date;
  }[];
  instalacionesPorMes?: { mes: string; cantidad: number }[];
}

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Material)
    private materialesRepository: Repository<Material>,
    @InjectRepository(Instalacion)
    private instalacionesRepository: Repository<Instalacion>,
    @InjectRepository(MovimientoInventario)
    private movimientosRepository: Repository<MovimientoInventario>,
    @InjectRepository(Traslado)
    private trasladosRepository: Repository<Traslado>,
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @InjectRepository(User)
    private usuariosRepository: Repository<User>,
    @InjectRepository(InstalacionUsuario)
    private instalacionesUsuariosRepository: Repository<InstalacionUsuario>,
    @InjectRepository(Municipio)
    private municipiosRepository: Repository<Municipio>,
    @InjectRepository(Categoria)
    private categoriasRepository: Repository<Categoria>,
    @InjectRepository(InventarioTecnico)
    private inventarioTecnicoRepository: Repository<InventarioTecnico>,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Obtener todos los datos en paralelo
      const [
        materiales,
        instalaciones,
        movimientos,
        traslados,
        clientes,
        usuarios,
        instalacionesUsuarios,
        municipios,
      ] = await Promise.all([
        this.materialesRepository.find({
          relations: ['categoria', 'proveedor'],
        }),
        // Usar SQL raw para evitar que TypeORM intente cargar relaciones automáticamente
        this.instalacionesRepository
          .query(
            `
          SELECT 
            instalacionId,
            identificadorUnico,
            instalacionCodigo,
            tipoInstalacionId,
            clienteId,
            instalacionMedidorNumero,
            instalacionSelloNumero,
            instalacionSelloRegulador,
            instalacionFecha,
            fechaAsignacion,
            fechaConstruccion,
            fechaCertificacion,
            fechaAnulacion,
            fechaNovedad,
            materialesInstalados,
            instalacionProyectos,
            instalacionObservaciones,
            observacionesTecnico,
            COALESCE(estado, 'pendiente') as estado,
            estadoInstalacionId,
            usuarioRegistra,
            bodegaId,
            fechaCreacion,
            fechaActualizacion
          FROM instalaciones
          ORDER BY fechaCreacion DESC
        `,
          )
          .then((rows: any[]) => {
            // Mapear resultados raw a objetos con estructura similar a TypeORM
            return rows.map((row: any) => ({
              instalacionId: row.instalacionId,
              identificadorUnico: row.identificadorUnico,
              instalacionCodigo: row.instalacionCodigo,
              tipoInstalacionId: row.tipoInstalacionId,
              clienteId: row.clienteId,
              instalacionMedidorNumero: row.instalacionMedidorNumero,
              instalacionSelloNumero: row.instalacionSelloNumero,
              instalacionSelloRegulador: row.instalacionSelloRegulador,
              instalacionFecha: row.instalacionFecha,
              fechaAsignacion: row.fechaAsignacion,
              fechaConstruccion: row.fechaConstruccion,
              fechaCertificacion: row.fechaCertificacion,
              fechaAnulacion: row.fechaAnulacion,
              fechaNovedad: row.fechaNovedad,
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
              estado: row.estado || 'pendiente',
              estadoInstalacionId: row.estadoInstalacionId,
              usuarioRegistra: row.usuarioRegistra,
              bodegaId: row.bodegaId,
              fechaCreacion: row.fechaCreacion,
              fechaActualizacion: row.fechaActualizacion,
              cliente: null as any, // Se asignará después
            }));
          }),
        this.movimientosRepository.find(),
        this.trasladosRepository.find(),
        this.clientesRepository
          .createQueryBuilder('cliente')
          .select([
            'cliente.clienteId',
            'cliente.nombreUsuario',
            'cliente.clienteTelefono',
            'cliente.clienteDireccion',
            'cliente.clienteBarrio',
            'cliente.municipioId',
            'cliente.cantidadInstalaciones',
            'cliente.clienteEstado',
            'cliente.usuarioRegistra',
            'cliente.fechaCreacion',
            'cliente.fechaActualizacion',
          ])
          .getMany(),
        this.usuariosRepository.find({
          relations: ['usuarioRol'],
        }),
        // Usar SQL raw para evitar que TypeORM intente cargar relaciones automáticamente
        this.instalacionesUsuariosRepository
          .query(
            `
          SELECT 
            iu.instalacionUsuarioId,
            iu.instalacionId,
            iu.usuarioId,
            iu.rolEnInstalacion,
            COALESCE(iu.activo, 1) as activo,
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
        `,
          )
          .then((rows: any[]) => {
            // Mapear resultados raw a objetos con estructura similar a TypeORM
            return rows.map((row: any) => ({
              instalacionUsuarioId: row.instalacionUsuarioId,
              instalacionId: row.instalacionId,
              usuarioId: row.usuarioId,
              rolEnInstalacion: row.rolEnInstalacion,
              activo: row.activo !== undefined && row.activo !== null ? Boolean(row.activo) : true,
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
              instalacion: {
                instalacionId: row.instalacionId,
              },
            }));
          }),
        this.municipiosRepository.find(),
      ]);

      // Cargar clientes manualmente para las instalaciones
      const clienteIds = [
        ...new Set(instalaciones.map((inst: any) => inst.clienteId).filter(Boolean)),
      ];
      const clientesMap = new Map(clientes.map((c) => [c.clienteId, c]));
      instalaciones.forEach((inst: any) => {
        if (inst.clienteId) {
          const cliente = clientesMap.get(inst.clienteId);
          if (cliente) {
            inst.cliente = {
              ...cliente,
              nombreUsuario: cliente.nombreUsuario || 'Sin nombre',
            };
          } else {
            inst.cliente = null;
          }
        }
      });

      // Calcular estadísticas
      const ahora = new Date();
      const haceUnMes = new Date(ahora.getFullYear(), ahora.getMonth() - 1, ahora.getDate());

      const movimientosUltimoMes = movimientos.filter((m) => {
        const fecha = new Date(m.fechaCreacion);
        return fecha >= haceUnMes;
      }).length;

      const instalacionesUltimoMes = instalaciones.filter((i) => {
        const fecha = new Date(i.fechaCreacion);
        return fecha >= haceUnMes;
      }).length;

      const movimientosPorTipo = {
        entrada: movimientos.filter((m) => (m.movimientoTipo || '').toLowerCase() === 'entrada')
          .length,
        salida: movimientos.filter((m) => (m.movimientoTipo || '').toLowerCase() === 'salida')
          .length,
        devolucion: movimientos.filter(
          (m) => (m.movimientoTipo || '').toLowerCase() === 'devolucion',
        ).length,
      };

      const materialesBajoStock = materiales.filter((m) => {
        const stock = Number(m.materialStock || 0);
        // Si no hay stock mínimo definido, considerar bajo stock si stock es 0 o menor
        return stock <= 0;
      }).length;

      const instalacionesPendientes = instalaciones.filter((i) => {
        const estado = (i.estado || '').toLowerCase();
        // Incluir nuevos estados activos y legacy
        return (
          estado === 'pendiente' ||
          estado === 'en_proceso' ||
          estado === 'asignacion' ||
          estado === 'construccion' ||
          estado === 'certificacion'
        );
      }).length;

      const trasladosPendientes = traslados.filter((t) => {
        const estado = (t.trasladoEstado || '').toLowerCase();
        return estado === 'pendiente' || estado === 'en_transito';
      }).length;

      // Calcular movimientos por mes (últimos 6 meses)
      const meses = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
      ];
      const movimientosPorMes = [];
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const mesNombre = meses[fecha.getMonth()];
        const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

        const movimientosMes = movimientos.filter((m) => {
          const fechaMov = new Date(m.fechaCreacion);
          return fechaMov >= mesInicio && fechaMov <= mesFin;
        });

        movimientosPorMes.push({
          mes: mesNombre,
          entrada: movimientosMes.filter(
            (m) => (m.movimientoTipo || '').toLowerCase() === 'entrada',
          ).length,
          salida: movimientosMes.filter((m) => (m.movimientoTipo || '').toLowerCase() === 'salida')
            .length,
          devolucion: movimientosMes.filter(
            (m) => (m.movimientoTipo || '').toLowerCase() === 'devolucion',
          ).length,
        });
      }

      // Calcular materiales por categoría
      const categoriasMap = new Map<string, number>();
      materiales.forEach((m) => {
        const categoria = m.categoria?.categoriaNombre || 'Sin categoría';
        categoriasMap.set(categoria, (categoriasMap.get(categoria) || 0) + 1);
      });
      const materialesPorCategoria = Array.from(categoriasMap.entries())
        .map(([categoria, cantidad]) => ({ categoria, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

      // Calcular instalaciones por estado
      const estadosMap = new Map<string, number>();
      instalaciones.forEach((i) => {
        // El estado puede venir del campo 'estado' directamente o puede ser null/undefined
        const estado = (i.estado || 'pendiente').toLowerCase().trim();
        if (estado) {
          estadosMap.set(estado, (estadosMap.get(estado) || 0) + 1);
        }
      });
      const instalacionesPorEstado = Array.from(estadosMap.entries())
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .filter((e) => e.cantidad > 0); // Solo incluir estados con instalaciones

      // Calcular técnicos con más instalaciones
      const tecnicosMap = new Map<number, { nombre: string; cantidad: number }>();
      instalacionesUsuarios.forEach((iu) => {
        if (iu.usuario && iu.activo) {
          const usuarioId = iu.usuario.usuarioId;
          const nombreCompleto =
            `${iu.usuario.usuarioNombre || ''} ${iu.usuario.usuarioApellido || ''}`.trim() ||
            'Sin nombre';
          if (!tecnicosMap.has(usuarioId)) {
            tecnicosMap.set(usuarioId, { nombre: nombreCompleto, cantidad: 0 });
          }
          const tecnico = tecnicosMap.get(usuarioId)!;
          tecnico.cantidad += 1;
        }
      });
      const tecnicosConMasInstalaciones = Array.from(tecnicosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)
        .map((t) => ({ tecnico: t.nombre, cantidad: t.cantidad }));

      // Calcular instalaciones por municipio
      const municipiosMap = new Map<number, { nombre: string; cantidad: number }>();
      instalaciones.forEach((inst: any) => {
        if (inst.clienteId) {
          const cliente = clientes.find((c) => c.clienteId === inst.clienteId);
          if (cliente && cliente.municipioId) {
            const municipioId = cliente.municipioId;
            const municipio = municipios.find((m) => m.municipioId === municipioId);
            const nombreMunicipio = municipio?.municipioNombre || `Municipio ${municipioId}`;

            if (!municipiosMap.has(municipioId)) {
              municipiosMap.set(municipioId, { nombre: nombreMunicipio, cantidad: 0 });
            }
            const municipioData = municipiosMap.get(municipioId)!;
            municipioData.cantidad += 1;
          }
        }
      });
      const instalacionesPorMunicipio = Array.from(municipiosMap.values())
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10)
        .map((m) => ({ municipio: m.nombre, cantidad: m.cantidad }));

      // Obtener últimas instalaciones (últimas 10)
      const ultimasInstalaciones = instalaciones.slice(0, 10).map((inst: any) => {
        const cliente = inst.cliente || clientes.find((c: any) => c.clienteId === inst.clienteId);
        return {
          instalacionId: inst.instalacionId,
          codigo: inst.instalacionCodigo || inst.identificadorUnico || `INST-${inst.instalacionId}`,
          clienteNombre: cliente?.clienteNombre || '', // Legacy, mantener para compatibilidad
          clienteApellido: cliente?.clienteApellido || '', // Legacy, mantener para compatibilidad
          nombreUsuario: cliente?.nombreUsuario || 'Sin nombre',
          cliente: cliente ? { nombreUsuario: cliente.nombreUsuario } : null,
          estado: inst.estado || 'Sin estado',
          fechaCreacion: inst.fechaCreacion,
        };
      });

      // Calcular instalaciones por mes (últimos 6 meses)
      const instalacionesPorMes = [];
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const mesNombre = meses[fecha.getMonth()];
        const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

        const instalacionesMes = instalaciones.filter((i) => {
          const fechaInst = new Date(i.fechaCreacion);
          return fechaInst >= mesInicio && fechaInst <= mesFin;
        });

        instalacionesPorMes.push({
          mes: mesNombre,
          cantidad: instalacionesMes.length,
        });
      }

      const result = {
        totalMateriales: materiales.length,
        totalInstalaciones: instalaciones.length,
        totalMovimientos: movimientos.length,
        totalTraslados: traslados.length,
        totalClientes: clientes.length,
        totalUsuarios: usuarios.length,
        materialesBajoStock,
        instalacionesPendientes,
        trasladosPendientes,
        movimientosPorTipo,
        movimientosUltimoMes,
        instalacionesUltimoMes,
        movimientosPorMes,
        materialesPorCategoria,
        instalacionesPorEstado,
        tecnicosConMasInstalaciones,
        instalacionesPorMunicipio,
        ultimasInstalaciones,
        instalacionesPorMes,
      };

      return result;
    } catch (error) {
      console.error('Error calculando estadísticas:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
      // Retornar objeto con arrays vacíos en lugar de undefined para que las gráficas puedan renderizarse
      return {
        totalMateriales: 0,
        totalInstalaciones: 0,
        totalMovimientos: 0,
        totalTraslados: 0,
        totalClientes: 0,
        totalUsuarios: 0,
        materialesBajoStock: 0,
        instalacionesPendientes: 0,
        trasladosPendientes: 0,
        movimientosPorTipo: {
          entrada: 0,
          salida: 0,
          devolucion: 0,
        },
        movimientosUltimoMes: 0,
        instalacionesUltimoMes: 0,
        movimientosPorMes: [],
        materialesPorCategoria: [],
        instalacionesPorEstado: [],
        tecnicosConMasInstalaciones: [],
        instalacionesPorMunicipio: [],
        ultimasInstalaciones: [],
        instalacionesPorMes: [],
      };
    }
  }
}
