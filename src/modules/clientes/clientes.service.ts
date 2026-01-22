import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
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

  async findAll(): Promise<Cliente[]> {
    try {
      // Cargar clientes directamente usando find() - TypeORM manejará automáticamente los campos de la entidad
      const clientes = await this.clientesRepository.find({
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

  async findOne(id: number): Promise<Cliente> {
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
  ): Promise<Cliente> {
    const cliente = await this.findOne(id);

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

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const cliente = await this.findOne(id);
    await this.clientesRepository.remove(cliente);
  }
}
