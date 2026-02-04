import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente, EstadoCliente } from './cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente)
    private clientesRepository: Repository<Cliente>,
  ) {}

  async create(createClienteDto: CreateClienteDto, usuarioId: number): Promise<Cliente> {
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

    return cliente;
  }

  async findAll(user?: any): Promise<Cliente[]> {
    try {
      // Filtrar por centro operativo: solo clientes que tienen instalaciones en bodegas de la sede del usuario
      const rolTipo = user?.usuarioRol?.rolTipo || user?.role || '';
      const usuarioSede = user?.usuarioSede;
      let clientes: Cliente[] = [];

      if (usuarioSede != null) {
        // Obtener bodegas de la sede según el rol
        let bodegaIds: number[] = [];
        if (rolTipo === 'admin') {
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
            const placeholdersClientes = clienteIds.map(() => '?').join(',');
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
              .where(`cliente.clienteId IN (${placeholdersClientes})`, clienteIds)
              .getMany();
          } else {
            clientes = [];
          }
          // Saltar el resto del código y retornar directamente
          for (const cliente of clientes) {
            try {
              const resultado = await this.clientesRepository.query(
                `SELECT COUNT(*) as cantidad FROM instalaciones WHERE clienteId = ? AND estado = 'finalizada'`,
                [cliente.clienteId],
              );
              const cantidadFinalizadas = resultado[0]?.cantidad || 0;
              if (cliente.cantidadInstalaciones !== cantidadFinalizadas) {
                await this.clientesRepository
                  .createQueryBuilder()
                  .update(Cliente)
                  .set({ cantidadInstalaciones: cantidadFinalizadas })
                  .where('clienteId = :id', { id: cliente.clienteId })
                  .execute();
                cliente.cantidadInstalaciones = cantidadFinalizadas;
              }
            } catch (error) {
              console.error(
                `Error al recalcular cantidadInstalaciones para cliente ${cliente.clienteId}:`,
                error,
              );
            }
          }
          return clientes;
        } else if (rolTipo === 'almacenista') {
          // Almacenista: todas las bodegas de su sede
          const bodegasSede = await this.clientesRepository.manager.query(
            `SELECT bodegaId FROM bodegas WHERE sedeId = ?`,
            [usuarioSede],
          );
          bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
        }

        // Obtener clientes que tienen instalaciones en esas bodegas
        if (bodegaIds.length > 0) {
          const placeholders = bodegaIds.map(() => '?').join(',');
          const clienteIdsRaw = await this.clientesRepository.query(
            `SELECT DISTINCT clienteId FROM instalaciones WHERE bodegaId IN (${placeholders})`,
            bodegaIds,
          );
          const clienteIds = clienteIdsRaw.map((c: any) => c.clienteId);
          if (clienteIds.length > 0) {
            const placeholdersClientes = clienteIds.map(() => '?').join(',');
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
              .where(`cliente.clienteId IN (${placeholdersClientes})`, clienteIds)
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

      // Recalcular cantidadInstalaciones para cada cliente (solo finalizadas)
      // y obtener información de instalación asignada
      for (const cliente of clientes) {
        try {
          const resultado = await this.clientesRepository.query(
            `SELECT COUNT(*) as cantidad FROM instalaciones WHERE clienteId = ? AND estado = 'finalizada'`,
            [cliente.clienteId],
          );
          const cantidadFinalizadas = resultado[0]?.cantidad || 0;

          // Solo actualizar si el valor es diferente
          if (cliente.cantidadInstalaciones !== cantidadFinalizadas) {
            await this.clientesRepository
              .createQueryBuilder()
              .update(Cliente)
              .set({ cantidadInstalaciones: cantidadFinalizadas })
              .where('clienteId = :id', { id: cliente.clienteId })
              .execute();
            cliente.cantidadInstalaciones = cantidadFinalizadas;
          }

          // Obtener la instalación asignada más reciente (que tenga usuarios asignados o esté en estado asignacion)
          const instalacionAsignada = await this.clientesRepository.query(
            `SELECT i.instalacionId, i.instalacionCodigo, i.identificadorUnico, i.estado
             FROM instalaciones i
             LEFT JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId AND iu.activo = 1
             WHERE i.clienteId = ? 
             AND (iu.instalacionUsuarioId IS NOT NULL OR i.estado IN ('asignacion', 'pendiente', 'en_proceso'))
             ORDER BY i.fechaCreacion DESC
             LIMIT 1`,
            [cliente.clienteId],
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
          console.error(
            `Error al recalcular instalaciones para cliente ${cliente.clienteId}:`,
            error,
          );
        }
      }

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
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }
    }

    // Obtener la instalación asignada más reciente
    try {
      const instalacionAsignada = await this.clientesRepository.query(
        `SELECT i.instalacionId, i.instalacionCodigo, i.identificadorUnico, i.estado
         FROM instalaciones i
         LEFT JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId AND iu.activo = 1
         WHERE i.clienteId = ? 
         AND (iu.instalacionUsuarioId IS NOT NULL OR i.estado IN ('asignacion', 'pendiente', 'en_proceso'))
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
      updateValues.municipioId = updateClienteDto.municipioId || null;
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

    return this.findOne(id, user);
  }

  async remove(id: number, user?: any): Promise<void> {
    const cliente = await this.findOne(id, user);
    await this.clientesRepository.remove(cliente);
  }
}
