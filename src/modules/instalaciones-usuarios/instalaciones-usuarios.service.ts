import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InstalacionUsuario } from './instalacion-usuario.entity';
import { CreateInstalacionUsuarioDto } from './dto/create-instalacion-usuario.dto';
import { InstalacionesService } from '../instalaciones/instalaciones.service';
import { ClientesService } from '../clientes/clientes.service';
import { EstadoCliente } from '../clientes/cliente.entity';
import { EstadoInstalacion } from '../instalaciones/instalacion.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ChatGateway } from '../chat/chat.gateway';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { GruposService } from '../grupos/grupos.service';
import { TipoGrupo } from '../grupos/grupo.entity';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';

@Injectable()
export class InstalacionesUsuariosService {
  constructor(
    @InjectRepository(InstalacionUsuario)
    private instalacionesUsuariosRepository: Repository<InstalacionUsuario>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(forwardRef(() => InstalacionesService))
    private instalacionesService: InstalacionesService,
    @Inject(forwardRef(() => ClientesService))
    private clientesService: ClientesService,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => GruposService))
    private gruposService: GruposService,
    @Inject(forwardRef(() => UsuariosGruposService))
    private usuariosGruposService: UsuariosGruposService,
  ) {}

  async create(createDto: CreateInstalacionUsuarioDto): Promise<InstalacionUsuario> {
    const asignacion = this.instalacionesUsuariosRepository.create(createDto);
    return this.instalacionesUsuariosRepository.save(asignacion);
  }

  async asignarUsuarios(
    instalacionId: number,
    usuarios: { usuarioId: number; rolEnInstalacion: string }[],
  ): Promise<InstalacionUsuario[]> {
    // Validar que solo se asigne un técnico
    if (usuarios.length > 1) {
      throw new BadRequestException('Solo se puede asignar un técnico por instalación');
    }

    // Validar que todos los usuarios sean técnicos
    const usuariosIds = usuarios.map((u) => u.usuarioId);
    if (usuariosIds.length > 0) {
      const usuariosEntities = await this.usersRepository.find({
        where: { usuarioId: In(usuariosIds) },
        relations: ['usuarioRol'],
      });

      const usuariosNoTecnicos = usuariosEntities.filter(
        (u) => !u.usuarioRol || u.usuarioRol.rolTipo !== 'tecnico',
      );

      if (usuariosNoTecnicos.length > 0) {
        const nombresNoTecnicos = usuariosNoTecnicos
          .map((u) => `${u.usuarioNombre} ${u.usuarioApellido}`)
          .join(', ');
        throw new BadRequestException(
          `Solo se pueden asignar técnicos a las instalaciones. Los siguientes usuarios no son técnicos: ${nombresNoTecnicos}`,
        );
      }
    }

    // Validar y eliminar duplicados en el array de usuarios recibido
    const usuariosUnicos = usuarios.filter(
      (usuario, index, self) => index === self.findIndex((u) => u.usuarioId === usuario.usuarioId),
    );

    // Filtrar usuarios duplicados silenciosamente

    // Obtener TODAS las asignaciones (activas e inactivas) para esta instalación
    const todasLasAsignaciones = await this.instalacionesUsuariosRepository.find({
      where: { instalacionId },
      relations: ['usuario'],
    });

    // Obtener solo las asignaciones activas para verificar si es primera asignación
    const asignacionesActivas = todasLasAsignaciones.filter((a) => a.activo === true);
    const esPrimeraAsignacion = asignacionesActivas.length === 0;

    // Obtener IDs de usuarios que se van a asignar (sin duplicados)
    const nuevosUsuariosIds = usuariosUnicos.map((u) => u.usuarioId);

    // Validar que no haya usuarios activos duplicados
    const usuariosActivosIds = asignacionesActivas.map((a) => a.usuarioId);
    const usuariosDuplicados = nuevosUsuariosIds.filter((id) => usuariosActivosIds.includes(id));
    // Si hay usuarios que ya están activos, solo actualizar su rol si es necesario

    // Desactivar asignaciones que ya no están en la lista (solo las activas)
    for (const asignacionExistente of asignacionesActivas) {
      if (!nuevosUsuariosIds.includes(asignacionExistente.usuarioId)) {
        asignacionExistente.activo = false;
        await this.instalacionesUsuariosRepository.save(asignacionExistente);
      }
    }

    const asignaciones = [];
    const usuariosProcesados = new Set<number>(); // Para evitar procesar el mismo usuario dos veces

    // Crear o reactivar asignaciones
    for (const usuario of usuariosUnicos) {
      // Validar que no se haya procesado este usuario ya
      if (usuariosProcesados.has(usuario.usuarioId)) {
        continue;
      }

      usuariosProcesados.add(usuario.usuarioId);

      // Buscar si ya existe una asignación ACTIVA para este usuario en esta instalación
      const asignacionActivaExistente = asignacionesActivas.find(
        (a) => a.usuarioId === usuario.usuarioId,
      );

      if (asignacionActivaExistente) {
        // Si ya está activa, solo actualizar el rol si es diferente
        if (asignacionActivaExistente.rolEnInstalacion !== usuario.rolEnInstalacion) {
          asignacionActivaExistente.rolEnInstalacion = usuario.rolEnInstalacion;
          asignaciones.push(
            await this.instalacionesUsuariosRepository.save(asignacionActivaExistente),
          );
        } else {
          // Ya está asignado con el mismo rol, mantenerlo
          asignaciones.push(asignacionActivaExistente);
        }
      } else {
        // Buscar si existe una asignación inactiva
        const asignacionInactivaExistente = todasLasAsignaciones.find(
          (a) =>
            a.usuarioId === usuario.usuarioId &&
            a.instalacionId === instalacionId &&
            a.activo === false,
        );

        if (asignacionInactivaExistente) {
          // Reactivar la asignación existente
          asignacionInactivaExistente.activo = true;
          asignacionInactivaExistente.rolEnInstalacion = usuario.rolEnInstalacion;
          asignaciones.push(
            await this.instalacionesUsuariosRepository.save(asignacionInactivaExistente),
          );
        } else {
          // Crear nueva asignación solo si no existe ninguna
          const asignacion = this.instalacionesUsuariosRepository.create({
            instalacionId,
            usuarioId: usuario.usuarioId,
            rolEnInstalacion: usuario.rolEnInstalacion,
            activo: true,
          });
          asignaciones.push(await this.instalacionesUsuariosRepository.save(asignacion));
        }
      }
    }

    // Si es la primera asignación de usuarios, actualizar el estado del cliente y la instalación
    // NOTA: Las salidas automáticas solo se crean cuando la instalación se marca como FINALIZADA
    if (esPrimeraAsignacion && usuariosUnicos.length > 0) {
      // Obtener la instalación para conseguir el clienteId
      const instalacion = await this.instalacionesService.findOne(instalacionId);

      // Actualizar el estado del cliente a "instalacion_asignada" cuando se asignan usuarios
      if (instalacion && instalacion.clienteId) {
        await this.clientesService.update(instalacion.clienteId, {
          clienteEstado: EstadoCliente.INSTALACION_ASIGNADA,
        });
      }

      // Si la instalación no está en estado ASIGNACION, cambiarla y establecer fechaAsignacion
      if (instalacion && instalacion.estado !== EstadoInstalacion.ASIGNACION) {
        await this.instalacionesService.actualizarEstado(
          instalacionId,
          EstadoInstalacion.ASIGNACION,
          usuariosUnicos[0].usuarioId, // Usar el primer usuario asignado como referencia
        );
      }
    }

    // Crear notificaciones para los usuarios recién asignados
    if (asignaciones.length > 0) {
      const instalacion = await this.instalacionesService.findOne(instalacionId);
      if (instalacion) {
        const clienteNombre = instalacion.cliente?.clienteNombre || 'Cliente';
        const instalacionCodigo = instalacion.identificadorUnico || `INST-${instalacionId}`;

        // Obtener información del usuario que asignó (usuarioRegistra)
        let supervisorNombre = 'Sistema';
        if (instalacion.usuarioRegistra) {
          try {
            const supervisor = await this.usersService.findOne(instalacion.usuarioRegistra);
            if (supervisor) {
              supervisorNombre =
                `${supervisor.usuarioNombre || ''} ${supervisor.usuarioApellido || ''}`.trim() ||
                'Sistema';
            }
          } catch (error) {
            console.error('Error al obtener supervisor:', error);
          }
        }

        // Obtener IDs de usuarios que ya estaban asignados antes de esta operación
        const usuariosIdsAnteriores = asignacionesActivas.map((a) => a.usuarioId);

        // Obtener el grupo de chat de la instalación y asignar usuarios nuevos
        try {
          const grupoInstalacion = await this.gruposService.obtenerGrupoPorEntidad(
            TipoGrupo.INSTALACION,
            instalacionId,
          );

          if (grupoInstalacion) {
            // Asignar usuarios nuevos al grupo de chat
            for (const asignacion of asignaciones) {
              const esUsuarioNuevo = !usuariosIdsAnteriores.includes(asignacion.usuarioId);

              if (esUsuarioNuevo) {
                try {
                  await this.usuariosGruposService.agregarUsuarioGrupo(
                    grupoInstalacion.grupoId,
                    asignacion.usuarioId,
                  );
                } catch (error) {
                  // Ignorar errores si ya está asignado
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error al asignar usuarios al grupo de instalación:`, error);
        }

        // Crear notificaciones solo para usuarios nuevos (no estaban asignados antes)
        for (const asignacion of asignaciones) {
          const esUsuarioNuevo = !usuariosIdsAnteriores.includes(asignacion.usuarioId);

          if (esUsuarioNuevo) {
            try {
              await this.notificacionesService.crearNotificacionInstalacionAsignada(
                asignacion.usuarioId,
                instalacionId,
                instalacionCodigo,
                clienteNombre,
                supervisorNombre,
              );
              // La notificación se emite automáticamente por socket en crearNotificacion
            } catch (error) {
              console.error(
                `[InstalacionesUsuariosService] Error al crear notificación para usuario ${asignacion.usuarioId}:`,
                error,
              );
            }
          }
        }
      }
    }

    return asignaciones;
  }

  async findByInstalacion(instalacionId: number): Promise<InstalacionUsuario[]> {
    return this.instalacionesUsuariosRepository.find({
      where: { instalacionId, activo: true },
      relations: ['usuario'],
    });
  }

  async findByUsuario(usuarioId: number): Promise<InstalacionUsuario[]> {
    // No cargar la relación instalacion para evitar que TypeORM intente cargar cliente automáticamente
    // La relación instalacion se carga manualmente cuando es necesario
    return this.instalacionesUsuariosRepository.find({
      where: { usuarioId, activo: true },
      relations: ['usuario'],
    });
  }

  async remove(instalacionUsuarioId: number): Promise<void> {
    const asignacion = await this.instalacionesUsuariosRepository.findOne({
      where: { instalacionUsuarioId },
    });
    if (!asignacion) {
      throw new NotFoundException(`Asignación con ID ${instalacionUsuarioId} no encontrada`);
    }
    asignacion.activo = false;
    await this.instalacionesUsuariosRepository.save(asignacion);
  }

  async desasignarUsuarios(instalacionId: number): Promise<void> {
    const asignaciones = await this.findByInstalacion(instalacionId);
    for (const asignacion of asignaciones) {
      asignacion.activo = false;
      await this.instalacionesUsuariosRepository.save(asignacion);
    }
  }

  async desasignarTodos(instalacionId: number): Promise<void> {
    // Eliminar físicamente todas las asignaciones de usuarios para esta instalación
    await this.instalacionesUsuariosRepository.delete({ instalacionId });
  }
}
