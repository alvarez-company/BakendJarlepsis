import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente, EstadoCliente } from './cliente.entity';
import { Municipio } from '../municipios/municipio.entity';
import { esDepartamentoZonaOperacion } from '../../common/constants/departamentos-operacion.constants';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  private readonly findAllCacheTtlMs = 30_000;
  private readonly findAllCache = new Map<string, { expiresAt: number; data: Cliente[] }>();

  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
    @InjectRepository(Municipio)
    private municipiosRepository: Repository<Municipio>,
  ) {}

  private async assertClienteMunicipioZonaOperacion(municipioId: number | null | undefined): Promise<void> {
    if (municipioId == null || municipioId === 0) return;
    const m = await this.municipiosRepository.findOne({
      where: { municipioId },
      relations: ['departamento'],
    });
    if (!m || !esDepartamentoZonaOperacion(m.departamento?.departamentoNombre)) {
      throw new BadRequestException(
        'El cliente solo puede asociarse a municipios de Santander o Norte de Santander.',
      );
    }
  }

  private getFindAllCacheKey(user?: any): string {
    const rol = (user?.usuarioRol?.rolTipo || user?.role || 'anon').toString().toLowerCase();
    const usuarioId = (user?.usuarioId ?? 'none').toString();
    const sede = (user?.usuarioSede ?? 'none').toString();
    const bodega = (user?.usuarioBodega ?? 'none').toString();
    return `${rol}|${usuarioId}|${sede}|${bodega}`;
  }

  private getCachedFindAll(key: string): Cliente[] | null {
    const cached = this.findAllCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.findAllCache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setFindAllCache(key: string, data: Cliente[]) {
    this.findAllCache.set(key, {
      expiresAt: Date.now() + this.findAllCacheTtlMs,
      data,
    });
  }

  private invalidateFindAllCache() {
    this.findAllCache.clear();
  }

  /**
   * Enriquece clientes en lote para evitar N+1 queries:
   * - cantidadInstalaciones finalizadas por cliente
   * - instalación asignada más reciente por cliente
   */
  private async enrichClientesResumen(clientes: Cliente[]): Promise<Cliente[]> {
    if (!clientes.length) return clientes;

    const clienteIds = clientes.map((c) => c.clienteId);
    const placeholders = clienteIds.map(() => '?').join(',');

    try {
      const countsRows = await this.clientesRepository.query(
        `SELECT clienteId, COUNT(*) as cantidad
         FROM instalaciones
         WHERE estado IN ('fact', 'completada', 'finalizada') AND clienteId IN (${placeholders})
         GROUP BY clienteId`,
        clienteIds,
      );
      const countsMap = new Map<number, number>(
        countsRows.map((r: any) => [Number(r.clienteId), Number(r.cantidad || 0)]),
      );

      const asignadasRows = await this.clientesRepository.query(
        `SELECT i.clienteId, i.instalacionId, i.instalacionCodigo, i.identificadorUnico, i.estado, i.fechaCreacion
         FROM instalaciones i
         LEFT JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId AND iu.activo = 1
         WHERE i.clienteId IN (${placeholders})
           AND (iu.instalacionUsuarioId IS NOT NULL OR i.estado IN (
             'apm','ppc','aat','asignacion','pendiente','en_proceso','avan','construccion','cons','cert','certificacion','nove','novedad','dev'
           ))
         ORDER BY i.clienteId ASC, i.fechaCreacion DESC`,
        clienteIds,
      );

      const asignadaMap = new Map<number, any>();
      for (const row of asignadasRows) {
        const cid = Number(row.clienteId);
        if (!asignadaMap.has(cid)) {
          asignadaMap.set(cid, row);
        }
      }

      for (const cliente of clientes) {
        cliente.cantidadInstalaciones = countsMap.get(Number(cliente.clienteId)) ?? 0;
        const instalacionAsignada = asignadaMap.get(Number(cliente.clienteId));
        if (instalacionAsignada) {
          (cliente as any).instalacionAsignada = {
            instalacionId: instalacionAsignada.instalacionId,
            instalacionCodigo: instalacionAsignada.instalacionCodigo,
            identificadorUnico: instalacionAsignada.identificadorUnico,
            estado: instalacionAsignada.estado,
          };
        }
      }
    } catch (error) {
      console.error('Error enriqueciendo resumen de clientes en lote:', error);
    }

    return clientes;
  }

  async create(createClienteDto: CreateClienteDto, usuarioId: number): Promise<Cliente> {
    await this.assertClienteMunicipioZonaOperacion(createClienteDto.municipioId ?? null);

    // Usar QueryBuilder para tener control total sobre los campos insertados
    const insertValues: any = {
      nombreUsuario: createClienteDto.nombreUsuario,
      clienteDireccion: createClienteDto.clienteDireccion,
      clienteTelefono: createClienteDto.clienteTelefono || null,
      clienteBarrio: createClienteDto.clienteBarrio || null,
      municipioId: createClienteDto.municipioId || null,
      clienteEstado: EstadoCliente.ACTIVO, // Siempre ACTIVO por defecto, se actualiza automáticamente según instalaciones
      usuarioRegistra: usuarioId || null,
      cantidadInstalaciones: 0,
    };

    const insertResult = await this.clientesRepository
      .createQueryBuilder()
      .insert()
      .into(Cliente)
      .values(insertValues)
      .execute();

    const clienteId = insertResult.identifiers[0].clienteId;

    // Obtener el cliente creado usando QueryBuilder
    const cliente = await this.clientesRepository
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
      .where('cliente.clienteId = :id', { id: clienteId })
      .getOne();

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${clienteId} no encontrado`);
    }

    this.invalidateFindAllCache();
    return cliente;
  }

  async findAll(user?: any): Promise<Cliente[]> {
    try {
      const cacheKey = this.getFindAllCacheKey(user);
      const cached = this.getCachedFindAll(cacheKey);
      if (cached) return cached;

      const rolTipo = user?.usuarioRol?.rolTipo || user?.role || '';
      const usuarioSede = user?.usuarioSede;
      let clientes: Cliente[] = [];

      if (usuarioSede != null) {
        // Obtener bodegas de la sede según el rol
        let bodegaIds: number[] = [];
        if (rolTipo === 'admin' || rolTipo === 'almacenista') {
          // Admin: todas las bodegas de su sede
          const bodegasSede = await this.clientesRepository.manager.query(
            `SELECT bodegaId FROM bodegas WHERE sedeId = ?`,
            [usuarioSede],
          );
          bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
        } else if (rolTipo === 'admin-internas') {
          // Admin-internas: solo bodegas tipo internas de su sede
          const bodegasSede = await this.clientesRepository.manager.query(
            `SELECT bodegaId FROM bodegas WHERE sedeId = ? AND bodegaTipo = 'internas'`,
            [usuarioSede],
          );
          bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
        } else if (rolTipo === 'admin-redes') {
          // Admin-redes: solo bodegas tipo redes de su sede
          const bodegasSede = await this.clientesRepository.manager.query(
            `SELECT bodegaId FROM bodegas WHERE sedeId = ? AND bodegaTipo = 'redes'`,
            [usuarioSede],
          );
          bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
        } else if (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes') {
          // Bodega: solo su bodega
          bodegaIds = user.usuarioBodega ? [user.usuarioBodega] : [];
        } else if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
          // Técnico/Soldador: solo clientes de instalaciones asignadas a ellos
          const clienteIdsRaw = await this.clientesRepository.manager.query(
            `SELECT DISTINCT i.clienteId 
             FROM instalaciones i
             INNER JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId
             WHERE iu.usuarioId = ? AND iu.activo = 1`,
            [user.usuarioId],
          );
          const clienteIds = clienteIdsRaw.map((c: any) => c.clienteId);
          if (clienteIds.length > 0) {
            clientes = await this.clientesRepository
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
              .where('cliente.clienteId IN (:...ids)', { ids: clienteIds })
              .getMany();
          } else {
            clientes = [];
          }
          await this.enrichClientesResumen(clientes);
          this.setFindAllCache(cacheKey, clientes);
          return clientes;
        }

        // Obtener clientes que tienen instalaciones en esas bodegas
        if (bodegaIds.length > 0) {
          const placeholders = bodegaIds.map(() => '?').join(',');
          const clienteIdsRaw = await this.clientesRepository.query(
            `SELECT DISTINCT clienteId FROM instalaciones WHERE bodegaId IN (${placeholders})`,
            bodegaIds,
          );
          const clienteIds = clienteIdsRaw.map((c: any) => c.clienteId);

          // Permitir ver también clientes sin instalaciones creados por el admin
          // o por usuarios de su misma sede.
          if (rolTipo === 'admin' || rolTipo === 'admin-internas' || rolTipo === 'admin-redes') {
            const clienteIdsCreadosRaw = await this.clientesRepository.query(
              `SELECT c.clienteId
               FROM clientes c
               LEFT JOIN usuarios u ON c.usuarioRegistra = u.usuarioId
               WHERE c.usuarioRegistra = ? OR u.usuarioSede = ?`,
              [user.usuarioId, usuarioSede],
            );
            const clienteIdsCreados = clienteIdsCreadosRaw.map((c: any) => c.clienteId);
            clienteIds.push(...clienteIdsCreados);
          }

          const clienteIdsUnicos = [...new Set(clienteIds)];
          if (clienteIdsUnicos.length > 0) {
            clientes = await this.clientesRepository
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
              .where('cliente.clienteId IN (:...ids)', { ids: clienteIdsUnicos })
              .getMany();
          }
        }
      } else {
        // SuperAdmin/Gerencia: todos los clientes
        clientes = await this.clientesRepository.find({
          select: [
            'clienteId',
            'nombreUsuario',
            'clienteTelefono',
            'clienteDireccion',
            'clienteBarrio',
            'municipioId',
            'cantidadInstalaciones',
            'clienteEstado',
            'usuarioRegistra',
            'fechaCreacion',
            'fechaActualizacion',
          ],
        });
      }

      await this.enrichClientesResumen(clientes);

      this.setFindAllCache(cacheKey, clientes);
      return clientes;
    } catch (error) {
      console.error('Error en findAll de clientes:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async findOne(id: number, user?: any): Promise<Cliente> {
    // No cargar la relación instalaciones automáticamente
    // Las instalaciones se cargan manualmente cuando es necesario
    const cliente = await this.clientesRepository
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
      .where('cliente.clienteId = :id', { id })
      .getOne();
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    // Restricción por centro operativo: admin / admin-internas / admin-redes solo acceden a clientes con instalación en bodega de su sede
    const rolTipo = (user?.usuarioRol?.rolTipo ?? user?.role ?? '').toString().toLowerCase();
    const sedeRestricted =
      (rolTipo === 'admin' || rolTipo === 'admin-internas' || rolTipo === 'admin-redes') &&
      user?.usuarioSede;
    if (sedeRestricted) {
      const rows = await this.clientesRepository.query(
        `SELECT 1 FROM instalaciones i
         INNER JOIN bodegas b ON i.bodegaId = b.bodegaId
         WHERE i.clienteId = ? AND b.sedeId = ? LIMIT 1`,
        [id, user.usuarioSede],
      );
      if (!rows || rows.length === 0) {
        // También permitir clientes recién creados que aún no tienen instalaciones,
        // si pertenecen al mismo centro operativo (o los creó el usuario actual).
        const clienteVisibleSinInstalacion = await this.clientesRepository.query(
          `SELECT c.clienteId
           FROM clientes c
           LEFT JOIN usuarios u ON c.usuarioRegistra = u.usuarioId
           WHERE c.clienteId = ? AND (c.usuarioRegistra = ? OR u.usuarioSede = ?)
           LIMIT 1`,
          [id, user.usuarioId, user.usuarioSede],
        );
        if (!clienteVisibleSinInstalacion || clienteVisibleSinInstalacion.length === 0) {
          throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
        }
      }
    }

    // Obtener la instalación asignada más reciente
    try {
      const instalacionAsignada = await this.clientesRepository.query(
        `SELECT i.instalacionId, i.instalacionCodigo, i.identificadorUnico, i.estado
         FROM instalaciones i
         LEFT JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId AND iu.activo = 1
         WHERE i.clienteId = ? 
         AND (iu.instalacionUsuarioId IS NOT NULL OR i.estado IN (
           'apm','ppc','aat','asignacion','pendiente','en_proceso','avan','construccion','cons','cert','certificacion','nove','novedad','dev'
         ))
         ORDER BY i.fechaCreacion DESC
         LIMIT 1`,
        [id],
      );

      if (instalacionAsignada && instalacionAsignada.length > 0) {
        (cliente as any).instalacionAsignada = {
          instalacionId: instalacionAsignada[0].instalacionId,
          instalacionCodigo: instalacionAsignada[0].instalacionCodigo,
          identificadorUnico: instalacionAsignada[0].identificadorUnico,
          estado: instalacionAsignada[0].estado,
        };
      }
    } catch (error) {
      console.error(`Error al obtener instalación asignada para cliente ${id}:`, error);
    }

    return cliente;
  }

  async update(
    id: number,
    updateClienteDto: UpdateClienteDto & { clienteEstado?: EstadoCliente },
    user?: any,
  ): Promise<Cliente> {
    await this.findOne(id, user);

    // Actualizar solo los campos permitidos usando QueryBuilder
    const updateValues: any = {};
    if (updateClienteDto.nombreUsuario !== undefined) {
      updateValues.nombreUsuario = updateClienteDto.nombreUsuario;
    }
    if (updateClienteDto.clienteDireccion !== undefined) {
      updateValues.clienteDireccion = updateClienteDto.clienteDireccion;
    }
    if (updateClienteDto.clienteBarrio !== undefined) {
      updateValues.clienteBarrio = updateClienteDto.clienteBarrio || null;
    }
    if (updateClienteDto.clienteTelefono !== undefined) {
      updateValues.clienteTelefono = updateClienteDto.clienteTelefono || null;
    }
    if (updateClienteDto.municipioId !== undefined) {
      const mid = updateClienteDto.municipioId || null;
      await this.assertClienteMunicipioZonaOperacion(mid);
      updateValues.municipioId = mid;
    }
    // clienteEstado se actualiza automáticamente según las instalaciones, no desde el DTO público
    // Pero permitimos actualizarlo directamente si se pasa (para uso interno desde otros servicios)
    if (updateClienteDto.clienteEstado !== undefined) {
      updateValues.clienteEstado = updateClienteDto.clienteEstado;
    }
    if (updateClienteDto.cantidadInstalaciones !== undefined) {
      updateValues.cantidadInstalaciones = updateClienteDto.cantidadInstalaciones;
    }

    if (Object.keys(updateValues).length > 0) {
      await this.clientesRepository
        .createQueryBuilder()
        .update(Cliente)
        .set(updateValues)
        .where('clienteId = :id', { id })
        .execute();
    }

    const updated = await this.findOne(id, user);
    this.invalidateFindAllCache();
    return updated;
  }

  async remove(id: number, user?: any): Promise<void> {
    const cliente = await this.findOne(id, user);
    await this.clientesRepository.remove(cliente);
    this.invalidateFindAllCache();
  }
}
