import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Traslado, EstadoTraslado } from './traslado.entity';
import { CreateTrasladoDto } from './dto/create-traslado.dto';
import { UpdateTrasladoDto } from './dto/update-traslado.dto';
import { MovimientosService } from '../movimientos/movimientos.service';
import { MaterialesService } from '../materiales/materiales.service';
import { InventariosService } from '../inventarios/inventarios.service';
import { BodegasService } from '../bodegas/bodegas.service';
import { TipoMovimiento } from '../movimientos/movimiento-inventario.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { TipoEntidad } from '../auditoria/auditoria.entity';
import { NumerosMedidorService } from '../numeros-medidor/numeros-medidor.service';

@Injectable()
export class TrasladosService {
  constructor(
    @InjectRepository(Traslado)
    private trasladosRepository: Repository<Traslado>,
    @Inject(forwardRef(() => MovimientosService))
    private movimientosService: MovimientosService,
    @Inject(forwardRef(() => MaterialesService))
    private materialesService: MaterialesService,
    @Inject(forwardRef(() => InventariosService))
    private inventariosService: InventariosService,
    @Inject(forwardRef(() => BodegasService))
    private bodegasService: BodegasService,
    @Inject(forwardRef(() => AuditoriaService))
    private auditoriaService: AuditoriaService,
    @Inject(forwardRef(() => NumerosMedidorService))
    private numerosMedidorService: NumerosMedidorService,
  ) {}

  private async generarIdentificadorUnico(): Promise<string> {
    // Buscar el último identificador único
    const ultimoTraslado = await this.trasladosRepository
      .createQueryBuilder('traslado')
      .where('traslado.identificadorUnico IS NOT NULL')
      .andWhere('traslado.identificadorUnico LIKE :pattern', { pattern: 'TRA-%' })
      .orderBy('CAST(SUBSTRING(traslado.identificadorUnico, 5) AS UNSIGNED)', 'DESC')
      .limit(1)
      .getOne();

    let siguienteNumero = 1;
    if (ultimoTraslado?.identificadorUnico) {
      const match = ultimoTraslado.identificadorUnico.match(/TRA-(\d+)/);
      if (match) {
        siguienteNumero = parseInt(match[1], 10) + 1;
      }
    }

    return `TRA-${siguienteNumero}`;
  }

  async create(createTrasladoDto: CreateTrasladoDto): Promise<Traslado[]> {
    // Validar que origen y destino sean diferentes
    if (createTrasladoDto.bodegaOrigenId === createTrasladoDto.bodegaDestinoId) {
      throw new BadRequestException('La bodega origen y destino no pueden ser la misma');
    }

    // Generar código único para agrupar los traslados
    const trasladoCodigo =
      createTrasladoDto.trasladoCodigo ||
      `TRAS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trasladosCreados: Traslado[] = [];

    // Procesar cada material del array
    for (const materialDto of createTrasladoDto.materiales) {
      // Verificar que el material existe
      await this.materialesService.findOne(materialDto.materialId);

      // Generar identificador único para cada traslado individual
      // Esto asegura que cada traslado tenga un identificador único, incluso si son del mismo grupo
      const identificadorUnico = await this.generarIdentificadorUnico();

      // Crear el traslado con estado pendiente
      const traslado = this.trasladosRepository.create({
        materialId: materialDto.materialId,
        bodegaOrigenId: createTrasladoDto.bodegaOrigenId,
        bodegaDestinoId: createTrasladoDto.bodegaDestinoId,
        trasladoCantidad: materialDto.trasladoCantidad,
        trasladoObservaciones: createTrasladoDto.trasladoObservaciones,
        usuarioId: createTrasladoDto.usuarioId,
        trasladoCodigo: trasladoCodigo,
        identificadorUnico: identificadorUnico, // Identificador único autogenerado para cada traslado
        trasladoEstado: EstadoTraslado.PENDIENTE,
        numerosMedidor: materialDto.numerosMedidor || null, // Guardar números de medidor si se proporcionaron
      });
      const trasladoGuardado = await this.trasladosRepository.save(traslado);
      trasladosCreados.push(trasladoGuardado);
    }

    return trasladosCreados;
  }

  async findAll(
    paginationDto?: any,
    user?: any,
  ): Promise<{ data: Traslado[]; total: number; page: number; limit: number }> {
    try {
      const page = paginationDto?.page || 1;
      const limit = paginationDto?.limit || 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.trasladosRepository
        .createQueryBuilder('traslado')
        .leftJoinAndSelect('traslado.material', 'material')
        .leftJoinAndSelect('traslado.bodegaOrigen', 'bodegaOrigen')
        .leftJoinAndSelect('traslado.bodegaDestino', 'bodegaDestino')
        .leftJoinAndSelect('traslado.usuario', 'usuario')
        .orderBy('traslado.fechaCreacion', 'DESC')
        .skip(skip)
        .take(limit);

      const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
      const rolesConFiltroBodega = [
        'admin-internas',
        'admin-redes',
        'bodega-internas',
        'bodega-redes',
      ];
      if (user && rolesConFiltroBodega.includes(rolTipo)) {
        const bodegasPermitidas = await this.bodegasService.findAll(user);
        const bodegaIds = bodegasPermitidas.map((b) => b.bodegaId);
        if (bodegaIds.length > 0) {
          queryBuilder
            .andWhere('traslado.bodegaOrigenId IN (:...bodegaIds)', { bodegaIds })
            .andWhere('traslado.bodegaDestinoId IN (:...bodegaIds)', { bodegaIds });
        } else {
          queryBuilder.andWhere('1 = 0');
        }
      }

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error: any) {
      console.error('Error en findAll de traslados:', error);
      console.error('Mensaje:', error.message);
      // Si el error es por una columna que no existe, usar query builder
      if (error.message?.includes('trasladoCodigo') || error.message?.includes('materialPadreId')) {
        const page = paginationDto?.page || 1;
        const limit = paginationDto?.limit || 10;
        const skip = (page - 1) * limit;

        // Usar query builder y seleccionar explícitamente las columnas
        const queryBuilder = this.trasladosRepository
          .createQueryBuilder('traslado')
          .select([
            'traslado.trasladoId',
            'traslado.materialId',
            'traslado.bodegaOrigenId',
            'traslado.bodegaDestinoId',
            'traslado.trasladoCantidad',
            'traslado.trasladoEstado',
            'traslado.trasladoObservaciones',
            'traslado.usuarioId',
            'traslado.fechaCreacion',
            'traslado.fechaActualizacion',
          ])
          .leftJoinAndSelect('traslado.material', 'material')
          .leftJoinAndSelect('traslado.bodegaOrigen', 'bodegaOrigen')
          .leftJoinAndSelect('traslado.bodegaDestino', 'bodegaDestino')
          .leftJoinAndSelect('traslado.usuario', 'usuario')
          .orderBy('traslado.fechaCreacion', 'DESC')
          .skip(skip)
          .take(limit);

        // Incluir trasladoCodigo en el select (si la columna existe en BD, funcionará; si no, el error se manejará)
        queryBuilder.addSelect('traslado.trasladoCodigo', 'traslado_trasladoCodigo');

        const rolTipoCatch = user?.usuarioRol?.rolTipo || user?.role;
        const rolesConFiltroCatch = [
          'admin-internas',
          'admin-redes',
          'bodega-internas',
          'bodega-redes',
        ];
        if (user && rolesConFiltroCatch.includes(rolTipoCatch)) {
          const bodegasCatch = await this.bodegasService.findAll(user);
          const idsCatch = bodegasCatch.map((b) => b.bodegaId);
          if (idsCatch.length > 0) {
            queryBuilder
              .andWhere('traslado.bodegaOrigenId IN (:...idsCatch)', { idsCatch })
              .andWhere('traslado.bodegaDestinoId IN (:...idsCatch)', { idsCatch });
          } else {
            queryBuilder.andWhere('1 = 0');
          }
        }

        try {
          const [data, total] = await queryBuilder.getManyAndCount();
          return {
            data,
            total,
            page,
            limit,
          };
        } catch (retryError: any) {
          // Si el error persiste, intentar sin trasladoCodigo
          if (retryError.message?.includes('trasladoCodigo')) {
            const queryBuilderFallback = this.trasladosRepository
              .createQueryBuilder('traslado')
              .select([
                'traslado.trasladoId',
                'traslado.materialId',
                'traslado.bodegaOrigenId',
                'traslado.bodegaDestinoId',
                'traslado.trasladoCantidad',
                'traslado.trasladoEstado',
                'traslado.trasladoObservaciones',
                'traslado.usuarioId',
                'traslado.fechaCreacion',
                'traslado.fechaActualizacion',
              ])
              .leftJoinAndSelect('traslado.material', 'material')
              .leftJoinAndSelect('traslado.bodegaOrigen', 'bodegaOrigen')
              .leftJoinAndSelect('traslado.bodegaDestino', 'bodegaDestino')
              .leftJoinAndSelect('traslado.usuario', 'usuario')
              .orderBy('traslado.fechaCreacion', 'DESC')
              .skip(skip)
              .take(limit);
            const rolTipoFb = user?.usuarioRol?.rolTipo || user?.role;
            const rolesFb = ['admin-internas', 'admin-redes', 'bodega-internas', 'bodega-redes'];
            if (user && rolesFb.includes(rolTipoFb)) {
              const bodegasFb = await this.bodegasService.findAll(user);
              const idsFb = bodegasFb.map((b) => b.bodegaId);
              if (idsFb.length > 0) {
                queryBuilderFallback
                  .andWhere('traslado.bodegaOrigenId IN (:...idsFb)', { idsFb })
                  .andWhere('traslado.bodegaDestinoId IN (:...idsFb)', { idsFb });
              } else {
                queryBuilderFallback.andWhere('1 = 0');
              }
            }
            const [data, total] = await queryBuilderFallback.getManyAndCount();
            return {
              data,
              total,
              page,
              limit,
            };
          }
          throw retryError;
        }
      }
      throw error;
    }
  }

  async findOne(id: number, user?: any): Promise<Traslado> {
    try {
      const traslado = await this.trasladosRepository.findOne({
        where: { trasladoId: id },
        relations: ['material', 'bodegaOrigen', 'bodegaDestino', 'usuario'],
      });
      if (!traslado) {
        throw new NotFoundException(`Traslado con ID ${id} no encontrado`);
      }
      const rolTipo = user?.usuarioRol?.rolTipo || user?.role;
      const rolesConFiltroBodega = [
        'admin-internas',
        'admin-redes',
        'bodega-internas',
        'bodega-redes',
      ];
      if (user && rolesConFiltroBodega.includes(rolTipo)) {
        const bodegasPermitidas = await this.bodegasService.findAll(user);
        const bodegaIds = new Set(bodegasPermitidas.map((b) => b.bodegaId));
        const permitido =
          bodegaIds.has(traslado.bodegaOrigenId) && bodegaIds.has(traslado.bodegaDestinoId);
        if (!permitido) {
          throw new NotFoundException(`Traslado con ID ${id} no encontrado`);
        }
      }
      return traslado;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message?.includes('trasladoCodigo') || error.message?.includes('materialPadreId')) {
        // Si el error es por una columna que no existe, usar query builder
        const queryBuilder = this.trasladosRepository
          .createQueryBuilder('traslado')
          .select([
            'traslado.trasladoId',
            'traslado.materialId',
            'traslado.bodegaOrigenId',
            'traslado.bodegaDestinoId',
            'traslado.trasladoCantidad',
            'traslado.trasladoEstado',
            'traslado.trasladoObservaciones',
            'traslado.usuarioId',
            'traslado.fechaCreacion',
            'traslado.fechaActualizacion',
          ])
          .leftJoinAndSelect('traslado.material', 'material')
          .leftJoinAndSelect('traslado.bodegaOrigen', 'bodegaOrigen')
          .leftJoinAndSelect('traslado.bodegaDestino', 'bodegaDestino')
          .leftJoinAndSelect('traslado.usuario', 'usuario')
          .where('traslado.trasladoId = :id', { id });

        try {
          queryBuilder.addSelect('traslado.trasladoCodigo', 'traslado_trasladoCodigo');
        } catch (e) {
          // Ignorar si la columna no existe
        }

        const traslado = await queryBuilder.getOne();
        if (!traslado) {
          throw new NotFoundException(`Traslado con ID ${id} no encontrado`);
        }
        const rolTipoFallback = user?.usuarioRol?.rolTipo || user?.role;
        const rolesConFiltroBodegaFallback = [
          'admin-internas',
          'admin-redes',
          'bodega-internas',
          'bodega-redes',
        ];
        if (user && rolesConFiltroBodegaFallback.includes(rolTipoFallback)) {
          const bodegasPermitidasFallback = await this.bodegasService.findAll(user);
          const bodegaIdsFallback = new Set(bodegasPermitidasFallback.map((b) => b.bodegaId));
          const permitidoFallback =
            bodegaIdsFallback.has(traslado.bodegaOrigenId) &&
            bodegaIdsFallback.has(traslado.bodegaDestinoId);
          if (!permitidoFallback) {
            throw new NotFoundException(`Traslado con ID ${id} no encontrado`);
          }
        }
        return traslado;
      }
      throw error;
    }
  }

  async findByCodigo(codigo: string): Promise<Traslado[]> {
    try {
      return await this.trasladosRepository.find({
        where: { trasladoCodigo: codigo },
        relations: ['material', 'bodegaOrigen', 'bodegaDestino', 'usuario'],
      });
    } catch (error: any) {
      if (error.message?.includes('trasladoCodigo') || error.message?.includes('materialPadreId')) {
        // Si el error es por una columna que no existe, usar query builder
        const queryBuilder = this.trasladosRepository
          .createQueryBuilder('traslado')
          .select([
            'traslado.trasladoId',
            'traslado.materialId',
            'traslado.bodegaOrigenId',
            'traslado.bodegaDestinoId',
            'traslado.trasladoCantidad',
            'traslado.trasladoEstado',
            'traslado.trasladoObservaciones',
            'traslado.usuarioId',
            'traslado.fechaCreacion',
            'traslado.fechaActualizacion',
          ])
          .leftJoinAndSelect('traslado.material', 'material')
          .leftJoinAndSelect('traslado.bodegaOrigen', 'bodegaOrigen')
          .leftJoinAndSelect('traslado.bodegaDestino', 'bodegaDestino')
          .leftJoinAndSelect('traslado.usuario', 'usuario');

        // Si trasladoCodigo existe, filtrar por él
        try {
          queryBuilder
            .addSelect('traslado.trasladoCodigo', 'traslado_trasladoCodigo')
            .where('traslado.trasladoCodigo = :codigo', { codigo });
        } catch (e) {
          // Si la columna no existe, retornar array vacío
          return [];
        }

        return await queryBuilder.getMany();
      }
      throw error;
    }
  }

  async completarTraslado(id: number): Promise<Traslado> {
    const traslado = await this.findOne(id);

    if (
      traslado.trasladoEstado !== EstadoTraslado.PENDIENTE &&
      traslado.trasladoEstado !== EstadoTraslado.EN_TRANSITO
    ) {
      throw new BadRequestException('Solo se pueden completar traslados pendientes o en tránsito');
    }

    // Si tiene código, completar todos los traslados del mismo grupo
    if (traslado.trasladoCodigo) {
      const trasladosGrupo = await this.trasladosRepository.find({
        where: { trasladoCodigo: traslado.trasladoCodigo },
      });

      // Obtener o crear inventarios de bodegas
      let inventarioOrigen = await this.inventariosService.findByBodega(traslado.bodegaOrigenId);
      let inventarioDestino = await this.inventariosService.findByBodega(traslado.bodegaDestinoId);

      // Crear inventarios automáticamente si no existen
      if (!inventarioOrigen) {
        const bodegaOrigen = await this.bodegasService.findOne(traslado.bodegaOrigenId);
        inventarioOrigen = await this.inventariosService.create({
          inventarioNombre: `Inventario - ${bodegaOrigen.bodegaNombre || 'Bodega Origen'}`,
          inventarioDescripcion: `Inventario creado automáticamente para traslados`,
          bodegaId: traslado.bodegaOrigenId,
          inventarioEstado: true,
        });
      }

      if (!inventarioDestino) {
        const bodegaDestino = await this.bodegasService.findOne(traslado.bodegaDestinoId);
        inventarioDestino = await this.inventariosService.create({
          inventarioNombre: `Inventario - ${bodegaDestino.bodegaNombre || 'Bodega Destino'}`,
          inventarioDescripcion: `Inventario creado automáticamente para traslados`,
          bodegaId: traslado.bodegaDestinoId,
          inventarioEstado: true,
        });
      }

      // Procesar cada traslado del grupo
      // NOTA: Las salidas solo se crean automáticamente para instalaciones, no para traslados
      // Los traslados ajustan el stock directamente sin crear movimientos de salida
      for (const t of trasladosGrupo) {
        // Verificar que el material existe
        await this.materialesService.findOne(t.materialId);

        // Ajustar stock en bodega origen (reducir) sin crear movimiento de salida
        // Las salidas solo se crean automáticamente para instalaciones
        if (inventarioOrigen && inventarioOrigen.bodegaId) {
          await this.materialesService.ajustarStock(
            t.materialId,
            -Number(t.trasladoCantidad),
            inventarioOrigen.bodegaId,
          );
        }

        // Crear movimiento de entrada en bodega destino
        // Pasar números de medidor si están guardados en el traslado
        await this.movimientosService.create({
          materiales: [
            {
              materialId: t.materialId,
              movimientoCantidad: t.trasladoCantidad,
              numerosMedidor: t.numerosMedidor || undefined, // Pasar números de medidor guardados
            },
          ],
          movimientoTipo: TipoMovimiento.ENTRADA,
          usuarioId: t.usuarioId,
          inventarioId: inventarioDestino.inventarioId,
          movimientoObservaciones: `Traslado desde bodega ${t.bodegaOrigenId}`,
          movimientoCodigo: traslado.trasladoCodigo,
        });

        // Actualizar estado del traslado
        t.trasladoEstado = EstadoTraslado.COMPLETADO;
        await this.trasladosRepository.save(t);
      }

      return traslado;
    }

    // Si no tiene código, procesar como traslado individual
    // NOTA: Las salidas solo se crean automáticamente para instalaciones, no para traslados
    // Los traslados ajustan el stock directamente sin crear movimientos de salida
    // Verificar que el material existe
    await this.materialesService.findOne(traslado.materialId);

    // Obtener inventarios de bodegas
    const inventarioOrigen = await this.inventariosService.findByBodega(traslado.bodegaOrigenId);
    const inventarioDestino = await this.inventariosService.findByBodega(traslado.bodegaDestinoId);

    if (!inventarioOrigen || !inventarioDestino) {
      throw new BadRequestException(
        'No se encontraron inventarios activos para las bodegas seleccionadas.',
      );
    }

    // Ajustar stock en bodega origen (reducir) sin crear movimiento de salida
    // Las salidas solo se crean automáticamente para instalaciones
    await this.materialesService.ajustarStock(
      traslado.materialId,
      -Number(traslado.trasladoCantidad),
      inventarioOrigen.bodegaId,
    );

    // Crear movimiento de entrada en bodega destino
    // Pasar números de medidor si están guardados en el traslado
    await this.movimientosService.create({
      materiales: [
        {
          materialId: traslado.materialId,
          movimientoCantidad: traslado.trasladoCantidad,
          numerosMedidor: traslado.numerosMedidor || undefined, // Pasar números de medidor guardados
        },
      ],
      movimientoTipo: TipoMovimiento.ENTRADA,
      usuarioId: traslado.usuarioId,
      inventarioId: inventarioDestino.inventarioId,
      movimientoObservaciones: `Traslado desde bodega ${traslado.bodegaOrigenId}`,
      movimientoCodigo: traslado.trasladoCodigo,
    });

    // Actualizar estado del traslado
    traslado.trasladoEstado = EstadoTraslado.COMPLETADO;
    return this.trasladosRepository.save(traslado);
  }

  async update(id: number, updateTrasladoDto: UpdateTrasladoDto): Promise<Traslado> {
    const traslado = await this.findOne(id);
    Object.assign(traslado, updateTrasladoDto);
    return this.trasladosRepository.save(traslado);
  }

  async cancelarTraslado(id: number): Promise<Traslado> {
    const traslado = await this.findOne(id);

    if (traslado.trasladoEstado === EstadoTraslado.COMPLETADO) {
      throw new BadRequestException('No se puede cancelar un traslado completado');
    }

    traslado.trasladoEstado = EstadoTraslado.CANCELADO;
    return this.trasladosRepository.save(traslado);
  }

  async remove(id: number, usuarioId: number): Promise<void> {
    const traslado = await this.findOne(id);

    // Guardar datos completos para auditoría
    const datosEliminados = {
      trasladoId: traslado.trasladoId,
      materialId: traslado.materialId,
      bodegaOrigenId: traslado.bodegaOrigenId,
      bodegaDestinoId: traslado.bodegaDestinoId,
      trasladoCantidad: traslado.trasladoCantidad,
      trasladoEstado: traslado.trasladoEstado,
      trasladoCodigo: traslado.trasladoCodigo,
      identificadorUnico: traslado.identificadorUnico,
      fechaCreacion: traslado.fechaCreacion,
      fechaActualizacion: traslado.fechaActualizacion,
    };

    // Si el traslado está completado, revertir todo
    if (traslado.trasladoEstado === EstadoTraslado.COMPLETADO) {
      try {
        // 1. Revertir stock en bodega origen (sumar de vuelta)
        // Los traslados ajustan el stock directamente sin crear movimiento de salida
        // Entonces necesitamos revertir el stock en la bodega origen
        try {
          const inventarioOrigen = await this.inventariosService.findByBodega(
            traslado.bodegaOrigenId,
          );
          if (inventarioOrigen && inventarioOrigen.bodegaId) {
            // Verificar que el material existe
            const material = await this.materialesService.findOne(traslado.materialId);

            if (material) {
              // Revertir stock en bodega origen (sumar la cantidad trasladada)
              await this.materialesService.ajustarStock(
                traslado.materialId,
                Number(traslado.trasladoCantidad),
                inventarioOrigen.bodegaId,
              );
            }
          }
        } catch (error) {
          console.error('Error al revertir stock en bodega origen:', error);
        }

        // 2. Buscar y eliminar movimientos de entrada asociados
        // Esto revertirá el stock en la bodega destino
        if (traslado.trasladoCodigo) {
          try {
            const movimientosAsociados = await this.movimientosService.findByCodigo(
              traslado.trasladoCodigo,
            );

            // Eliminar cada movimiento de entrada (esto revertirá los stocks en destino automáticamente)
            for (const movimiento of movimientosAsociados) {
              try {
                // Verificar que el movimiento corresponde a este traslado
                if (
                  movimiento.materialId === traslado.materialId &&
                  Math.abs(
                    Number(movimiento.movimientoCantidad) - Number(traslado.trasladoCantidad),
                  ) < 0.01
                ) {
                  await this.movimientosService.remove(movimiento.movimientoId, usuarioId);
                }
              } catch (error) {
                console.error(
                  `Error al eliminar movimiento ${movimiento.movimientoId} asociado a traslado ${id}:`,
                  error,
                );
              }
            }
          } catch (error) {
            console.error('Error al buscar y eliminar movimientos asociados al traslado:', error);
          }
        }

        // 3. Revertir números de medidor a la bodega de origen si el material es medidor
        try {
          const material = await this.materialesService.findOne(traslado.materialId);
          if (material && material.materialEsMedidor && traslado.numerosMedidor) {
            // Parsear números de medidor si viene como string (JSON)
            let numerosMedidorArray: string[] = [];
            if (typeof traslado.numerosMedidor === 'string') {
              try {
                numerosMedidorArray = JSON.parse(traslado.numerosMedidor);
              } catch {
                numerosMedidorArray = [];
              }
            } else if (Array.isArray(traslado.numerosMedidor)) {
              numerosMedidorArray = traslado.numerosMedidor;
            }

            if (numerosMedidorArray && numerosMedidorArray.length > 0) {
              // Los números de medidor deben volver a estar disponibles
              // No necesitamos moverlos físicamente de bodega porque los números de medidor
              // no tienen una bodega asignada directamente, solo están en inventarios
              // Cuando se elimina el movimiento de entrada, los números ya se eliminan o liberan
              // Pero si queremos ser explícitos, podemos marcarlos como disponibles
              const numerosMedidorIds: number[] = [];
              for (const numeroStr of numerosMedidorArray) {
                try {
                  const numeroEntity = await this.numerosMedidorService.findByNumero(numeroStr);
                  if (numeroEntity && numeroEntity.materialId === traslado.materialId) {
                    numerosMedidorIds.push(numeroEntity.numeroMedidorId);
                  }
                } catch (error) {
                  console.warn(`No se encontró número de medidor: ${numeroStr}`);
                }
              }

              // Liberar números de medidor (marcarlos como disponibles)
              if (numerosMedidorIds.length > 0) {
                // Liberar de instalación si estaban instalados
                await this.numerosMedidorService.liberarDeInstalacion(numerosMedidorIds);
                // Liberar de técnico si estaban asignados
                await this.numerosMedidorService.liberarDeTecnico(numerosMedidorIds);
              }
            }
          }
        } catch (error) {
          console.error('Error al revertir números de medidor:', error);
        }
      } catch (error) {
        console.error('Error durante la reversión del traslado:', error);
        // Continuar con la eliminación aunque haya errores
      }
    }

    // Registrar en auditoría antes de eliminar
    try {
      await this.auditoriaService.registrarEliminacion(
        TipoEntidad.TRASLADO,
        traslado.trasladoId,
        datosEliminados,
        usuarioId,
        'Eliminación de traslado',
        `Traslado ${traslado.identificadorUnico || traslado.trasladoCodigo} eliminado. Movimientos asociados eliminados y stocks revertidos.`,
      );
    } catch (error) {
      console.error('Error al registrar en auditoría:', error);
      // Continuar con la eliminación aunque falle la auditoría
    }

    // Eliminar el traslado
    await this.trasladosRepository.remove(traslado);
  }
}
