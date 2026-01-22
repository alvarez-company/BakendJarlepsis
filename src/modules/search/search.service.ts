import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { MaterialesService } from '../materiales/materiales.service';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { MovimientosService } from '../movimientos/movimientos.service';
import { TrasladosService } from '../traslados/traslados.service';
import { UsersService } from '../users/users.service';
import { ClientesService } from '../clientes/clientes.service';
import { ProyectosService } from '../proyectos/proyectos.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { SedesService } from '../sedes/sedes.service';

export type SearchResultType =
  | 'material'
  | 'instalacion'
  | 'movimiento'
  | 'traslado'
  | 'usuario'
  | 'cliente'
  | 'proyecto'
  | 'bodega'
  | 'sede';

export type SearchResult = {
  id: number;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  url: string;
  image?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
};

@Injectable()
export class SearchService {
  constructor(
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => TrasladosService))
    private trasladosService: TrasladosService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => ClientesService))
    private clientesService: ClientesService,
    @Inject(forwardRef(() => ProyectosService))
    private proyectosService: ProyectosService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => SedesService))
    private sedesService: SedesService,
  ) {}

  async globalSearch(query: string): Promise<SearchResponse> {
    const searchLower = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Búsquedas en paralelo
    const [
      materiales,
      instalaciones,
      movimientos,
      traslados,
      usuarios,
      clientes,
      proyectos,
      bodegas,
      sedes,
    ] = await Promise.allSettled([
      this.materialesService.findAll(),
      this.instalacionesService.findAll(),
      this.movimientosService.findAll(),
      this.trasladosService.findAll(),
      this.usersService.findAll(),
      this.clientesService.findAll(),
      this.proyectosService.findAll(),
      this.bodegasService.findAll(),
      this.sedesService.findAll(),
    ]);

    // Procesar materiales
    if (materiales.status === 'fulfilled') {
      const materialesData = Array.isArray(materiales.value)
        ? materiales.value
        : (materiales.value as any)?.data || [];

      materialesData
        .filter(
          (m: any) =>
            m.materialNombre?.toLowerCase().includes(searchLower) ||
            m.materialCodigo?.toLowerCase().includes(searchLower),
        )
        .forEach((m: any) => {
          results.push({
            id: m.materialId,
            type: 'material',
            title: m.materialNombre || `Material #${m.materialId}`,
            subtitle: m.materialCodigo,
            url: `/materials/${m.materialId}/view`,
            image: m.materialFoto,
          });
        });
    }

    // Procesar instalaciones
    if (instalaciones.status === 'fulfilled') {
      const instalacionesData = Array.isArray(instalaciones.value)
        ? instalaciones.value
        : (instalaciones.value as any)?.data || [];

      instalacionesData
        .filter(
          (i: any) =>
            i.instalacionCodigo?.toLowerCase().includes(searchLower) ||
            i.cliente?.clienteNombre?.toLowerCase().includes(searchLower) ||
            i.cliente?.clienteApellido?.toLowerCase().includes(searchLower) ||
            i.cliente?.nombreUsuario?.toLowerCase().includes(searchLower),
        )
        .forEach((i: any) => {
          const clienteNombre = i.cliente
            ? i.cliente.nombreUsuario ||
              `${i.cliente.clienteNombre || ''} ${i.cliente.clienteApellido || ''}`.trim() ||
              'Sin cliente'
            : 'Sin cliente';

          results.push({
            id: i.instalacionId,
            type: 'instalacion',
            title: i.instalacionCodigo || `Instalación #${i.instalacionId}`,
            subtitle: clienteNombre,
            url: `/installations/${i.instalacionId}`,
          });
        });
    }

    // Procesar movimientos
    if (movimientos.status === 'fulfilled') {
      const movimientosData = Array.isArray(movimientos.value)
        ? movimientos.value
        : (movimientos.value as any)?.data || [];

      movimientosData
        .filter(
          (m: any) =>
            m.movimientoCodigo?.toLowerCase().includes(searchLower) ||
            m.movimientoTipo?.toLowerCase().includes(searchLower),
        )
        .forEach((m: any) => {
          results.push({
            id: m.movimientoId,
            type: 'movimiento',
            title: m.movimientoCodigo || `Movimiento #${m.movimientoId}`,
            subtitle: m.movimientoTipo,
            url: `/inventory/movements/${m.movimientoId}`,
          });
        });
    }

    // Procesar traslados
    if (traslados.status === 'fulfilled') {
      const trasladosData = Array.isArray(traslados.value)
        ? traslados.value
        : (traslados.value as any)?.data || [];

      trasladosData
        .filter((t: any) => t.trasladoCodigo?.toLowerCase().includes(searchLower))
        .forEach((t: any) => {
          results.push({
            id: t.trasladoId,
            type: 'traslado',
            title: t.trasladoCodigo || `Traslado #${t.trasladoId}`,
            url: `/inventory/transfers/${t.trasladoId}`,
          });
        });
    }

    // Procesar usuarios
    if (usuarios.status === 'fulfilled') {
      let usuariosData: any[] = [];
      if (Array.isArray(usuarios.value)) {
        usuariosData = usuarios.value;
      } else if ((usuarios.value as any)?.data) {
        usuariosData = (usuarios.value as any).data;
      }

      usuariosData
        .filter(
          (u: any) =>
            u.usuarioNombre?.toLowerCase().includes(searchLower) ||
            u.usuarioApellido?.toLowerCase().includes(searchLower) ||
            u.usuarioCorreo?.toLowerCase().includes(searchLower),
        )
        .forEach((u: any) => {
          results.push({
            id: u.usuarioId,
            type: 'usuario',
            title: `${u.usuarioNombre || ''} ${u.usuarioApellido || ''}`.trim() || u.usuarioCorreo,
            subtitle: u.usuarioCorreo,
            url: `/users/${u.usuarioId}/view`,
            image: u.usuarioFoto,
          });
        });
    }

    // Procesar clientes
    if (clientes.status === 'fulfilled') {
      const clientesData = Array.isArray(clientes.value)
        ? clientes.value
        : (clientes.value as any)?.data || [];

      clientesData
        .filter(
          (c: any) =>
            c.clienteNombre?.toLowerCase().includes(searchLower) ||
            c.clienteApellido?.toLowerCase().includes(searchLower) ||
            c.nombreUsuario?.toLowerCase().includes(searchLower),
        )
        .forEach((c: any) => {
          results.push({
            id: c.clienteId,
            type: 'cliente',
            title: c.nombreUsuario || `${c.clienteNombre || ''} ${c.clienteApellido || ''}`.trim(),
            subtitle: c.clienteTelefono || c.clienteCorreo,
            url: `/clients/${c.clienteId}/view`,
          });
        });
    }

    // Procesar proyectos
    if (proyectos.status === 'fulfilled') {
      const proyectosData = Array.isArray(proyectos.value)
        ? proyectos.value
        : (proyectos.value as any)?.data || [];

      proyectosData
        .filter((p: any) => p.proyectoNombre?.toLowerCase().includes(searchLower))
        .forEach((p: any) => {
          results.push({
            id: p.proyectoId,
            type: 'proyecto',
            title: p.proyectoNombre,
            url: `/installations?installations-tab=proyectos&search=${encodeURIComponent(query)}`,
          });
        });
    }

    // Procesar bodegas
    if (bodegas.status === 'fulfilled') {
      const bodegasData = Array.isArray(bodegas.value)
        ? bodegas.value
        : (bodegas.value as any)?.data || [];

      bodegasData
        .filter((b: any) => b.bodegaNombre?.toLowerCase().includes(searchLower))
        .forEach((b: any) => {
          results.push({
            id: b.bodegaId,
            type: 'bodega',
            title: b.bodegaNombre,
            url: `/locations?locations-tab=bodegas&search=${encodeURIComponent(query)}`,
            image: b.bodegaFoto,
          });
        });
    }

    // Procesar sedes
    if (sedes.status === 'fulfilled') {
      const sedesData = Array.isArray(sedes.value) ? sedes.value : (sedes.value as any)?.data || [];

      sedesData
        .filter((s: any) => s.sedeNombre?.toLowerCase().includes(searchLower))
        .forEach((s: any) => {
          results.push({
            id: s.sedeId,
            type: 'sede',
            title: s.sedeNombre,
            url: `/locations?locations-tab=sedes&search=${encodeURIComponent(query)}`,
            image: s.sedeFoto,
          });
        });
    }

    return {
      results: results.slice(0, 20), // Limitar a 20 resultados
      total: results.length,
    };
  }
}
