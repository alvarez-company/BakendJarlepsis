import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grupo, TipoGrupo } from './grupo.entity';
import { MensajesService } from '../mensajes/mensajes.service';
import { UsersService } from '../users/users.service';
import { UsuariosGruposService } from '../usuarios-grupos/usuarios-grupos.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class GruposService {
  private sistemaUsuarioId: number | null = null;

  constructor(
    @InjectRepository(Grupo)
    private gruposRepository: Repository<Grupo>,
    @Inject(forwardRef(() => MensajesService))
    private mensajesService: MensajesService,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    @Inject(forwardRef(() => UsuariosGruposService))
    private usuariosGruposService: UsuariosGruposService,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async crearGrupoSede(sedeId: number, sedeNombre: string): Promise<Grupo> {
    // Verificar si ya existe un grupo para esta sede
    const grupoExistente = await this.obtenerGrupoPorEntidad(TipoGrupo.SEDE, sedeId);
    if (grupoExistente) {
      return grupoExistente;
    }

    const grupo = this.gruposRepository.create({
      grupoNombre: `Sede ${sedeNombre}`,
      grupoDescripcion: `Grupo de chat de la sede ${sedeNombre}`,
      tipoGrupo: TipoGrupo.SEDE,
      entidadId: sedeId,
    });
    const savedGrupo = await this.gruposRepository.save(grupo);
    
    // Asignar usuarios al grupo (superadmins y usuarios con esta sede)
    await this.asignarUsuariosAGrupo(savedGrupo.grupoId, TipoGrupo.SEDE, sedeId);
    
    // Crear mensaje automático de bienvenida
    try {
      await this.crearMensajeSistema(
        savedGrupo.grupoId,
        `🏢 Grupo creado para la sede "${sedeNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta sede.`
      );
    } catch (error) {
      console.error(`[GruposService] Error al crear mensaje automático para sede:`, error);
    }
    
    return savedGrupo;
  }


  async crearGrupoBodega(bodegaId: number, bodegaNombre: string): Promise<Grupo> {
    // Verificar si ya existe un grupo para esta bodega
    const grupoExistente = await this.obtenerGrupoPorEntidad(TipoGrupo.BODEGA, bodegaId);
    if (grupoExistente) {
      return grupoExistente;
    }

    const grupo = this.gruposRepository.create({
      grupoNombre: `Bodega ${bodegaNombre}`,
      grupoDescripcion: `Grupo de chat de la bodega ${bodegaNombre}`,
      tipoGrupo: TipoGrupo.BODEGA,
      entidadId: bodegaId,
    });
    const savedGrupo = await this.gruposRepository.save(grupo);
    
    // Asignar usuarios al grupo (superadmins y usuarios con esta bodega)
    await this.asignarUsuariosAGrupo(savedGrupo.grupoId, TipoGrupo.BODEGA, bodegaId);
    
    // Crear mensaje automático de bienvenida
    try {
      await this.crearMensajeSistema(
        savedGrupo.grupoId,
        `🏭 Grupo creado para la bodega "${bodegaNombre}". Este es el espacio de comunicación para coordinar actividades relacionadas con esta bodega.`
      );
    } catch (error) {
      console.error(`[GruposService] Error al crear mensaje automático para bodega:`, error);
    }
    
    return savedGrupo;
  }

  async crearGrupoInstalacion(instalacionId: number, instalacionCodigo: string): Promise<Grupo> {
    // Verificar si ya existe un grupo para esta instalación
    const grupoExistente = await this.obtenerGrupoPorEntidad(TipoGrupo.INSTALACION, instalacionId);
    if (grupoExistente) {
      return grupoExistente;
    }

    const grupo = this.gruposRepository.create({
      grupoNombre: `Instalación ${instalacionCodigo}`,
      grupoDescripcion: `Grupo de chat de la instalación ${instalacionCodigo}`,
      tipoGrupo: TipoGrupo.INSTALACION,
      entidadId: instalacionId,
    });
    const savedGrupo = await this.gruposRepository.save(grupo);
    
    // Asignar superadmins al grupo de instalación
    const superadmins = await this.obtenerSuperadmins();
    if (superadmins.length > 0) {
      for (const superadminId of superadmins) {
        try {
          await this.usuariosGruposService.agregarUsuarioGrupo(savedGrupo.grupoId, superadminId);
        } catch (error) {
          // Ignorar errores si ya está asignado
        }
      }
    }
    
    // Crear mensaje automático de bienvenida
    try {
      await this.crearMensajeSistema(
        savedGrupo.grupoId,
        `🔧 Grupo creado para la instalación "${instalacionCodigo}". Este es el espacio de comunicación para coordinar el trabajo de esta instalación.`
      );
    } catch (error) {
      console.error(`[GruposService] Error al crear mensaje automático para instalación:`, error);
    }
    
    return savedGrupo;
  }

  async obtenerGrupoGeneral(): Promise<Grupo> {
    let grupo = await this.gruposRepository.findOne({ where: { tipoGrupo: TipoGrupo.GENERAL } });
    if (!grupo) {
      grupo = this.gruposRepository.create({
        grupoNombre: 'Chat General',
        grupoDescripcion: 'Chat general del sistema',
        tipoGrupo: TipoGrupo.GENERAL,
      });
      grupo = await this.gruposRepository.save(grupo);
      
      // Asignar todos los usuarios existentes al grupo general
      try {
        await this.asignarTodosUsuariosAGrupoGeneral(grupo.grupoId);
      } catch (error) {
        console.error('[GruposService] Error al asignar usuarios al grupo general:', error);
      }
    }
    return grupo;
  }

  private async asignarTodosUsuariosAGrupoGeneral(grupoId: number): Promise<void> {
    try {
      const usuarios = await this.usersService.findAll({ page: 1, limit: 10000 });
      if (usuarios.data && usuarios.data.length > 0) {
        for (const usuario of usuarios.data) {
          try {
            await this.usuariosGruposService.agregarUsuarioGrupo(grupoId, usuario.usuarioId);
          } catch (error) {
            // Ignorar errores si ya está asignado
          }
        }
      }
    } catch (error) {
      console.error('[GruposService] Error al asignar usuarios al grupo general:', error);
    }
  }

  async obtenerGrupoPorId(grupoId: number): Promise<Grupo> {
    const grupo = await this.gruposRepository.findOne({ 
      where: { grupoId, grupoActivo: true } 
    });
    if (!grupo) {
      throw new NotFoundException(`Grupo con ID ${grupoId} no encontrado`);
    }
    return grupo;
  }

  async obtenerGrupoPorEntidad(tipoGrupo: TipoGrupo, entidadId: number): Promise<Grupo> {
    return this.gruposRepository.findOne({ where: { tipoGrupo, entidadId } });
  }

  async obtenerOCrearChatDirecto(usuarioId1: number, usuarioId2: number): Promise<Grupo> {
    try {
      // Validar que los IDs sean diferentes
      if (usuarioId1 === usuarioId2) {
        throw new BadRequestException('No se puede crear un chat directo consigo mismo');
      }

      // Buscar si ya existe un chat directo entre estos dos usuarios usando una consulta eficiente
      // Buscamos grupos directos donde ambos usuarios estén presentes y solo haya exactamente 2 usuarios
      const grupoExistente = await this.gruposRepository
        .createQueryBuilder('grupo')
        .innerJoin('grupo.usuariosGrupo', 'ug', 'ug.activo = true')
        .where('grupo.tipoGrupo = :tipoGrupo', { tipoGrupo: TipoGrupo.DIRECTO })
        .andWhere('grupo.grupoActivo = true')
        .andWhere('ug.usuarioId IN (:usuarioId1, :usuarioId2)', { usuarioId1, usuarioId2 })
        .groupBy('grupo.grupoId')
        .having('COUNT(DISTINCT ug.usuarioId) = 2')
        .getOne();

      if (grupoExistente) {
        return grupoExistente;
      }

      // Si no existe, crear uno nuevo
      // Validar que ambos usuarios existan
      let usuario1, usuario2;
      try {
        usuario1 = await this.usersService.findOne(usuarioId1);
        // Validar que el usuario esté activo
        if (!usuario1 || !usuario1.usuarioEstado) {
          throw new BadRequestException(`No se puede crear un chat con un usuario bloqueado o inactivo`);
        }
      } catch (error) {
        console.error(`[GruposService] Error al buscar usuario ${usuarioId1}:`, error);
        if (error instanceof NotFoundException) {
          throw new NotFoundException(`Usuario con ID ${usuarioId1} no encontrado`);
        }
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw error;
      }

      try {
        usuario2 = await this.usersService.findOne(usuarioId2);
        // Validar que el usuario esté activo
        if (!usuario2 || !usuario2.usuarioEstado) {
          throw new BadRequestException(`No se puede crear un chat con un usuario bloqueado o inactivo`);
        }
      } catch (error) {
        console.error(`[GruposService] Error al buscar usuario ${usuarioId2}:`, error);
        if (error instanceof NotFoundException) {
          throw new NotFoundException(`Usuario con ID ${usuarioId2} no encontrado`);
        }
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw error;
      }
      
      const nombreUsuario1 = `${usuario1?.usuarioNombre || ''} ${usuario1?.usuarioApellido || ''}`.trim() || usuario1?.usuarioCorreo || 'Usuario';
      const nombreUsuario2 = `${usuario2?.usuarioNombre || ''} ${usuario2?.usuarioApellido || ''}`.trim() || usuario2?.usuarioCorreo || 'Usuario';

      const nuevoGrupo = this.gruposRepository.create({
        grupoNombre: `${nombreUsuario1} - ${nombreUsuario2}`,
        grupoDescripcion: `Chat directo entre ${nombreUsuario1} y ${nombreUsuario2}`,
        tipoGrupo: TipoGrupo.DIRECTO,
        entidadId: Math.min(usuarioId1, usuarioId2), // Almacenamos el ID menor para referencia
      });

      let grupoGuardado: Grupo;
      try {
        grupoGuardado = await this.gruposRepository.save(nuevoGrupo);
      } catch (error) {
        console.error('[GruposService] Error al guardar grupo directo:', error);
        throw new Error(`Error al crear grupo directo: ${error.message || error}`);
      }

      // Asignar ambos usuarios al grupo
      try {
        await this.usuariosGruposService.agregarUsuarioGrupo(grupoGuardado.grupoId, usuarioId1);
        await this.usuariosGruposService.agregarUsuarioGrupo(grupoGuardado.grupoId, usuarioId2);
      } catch (error) {
        console.error('[GruposService] Error al asignar usuarios al grupo directo:', error);
        // Si falla la asignación, intentar eliminar el grupo creado
        try {
          await this.gruposRepository.remove(grupoGuardado);
        } catch (removeError) {
          console.error('[GruposService] Error al eliminar grupo después de fallo en asignación:', removeError);
        }
        // Propagar el error original si es una excepción de NestJS, sino crear una nueva
        if (error instanceof Error) {
          throw error;
        }
        throw new Error(`Error al asignar usuarios al grupo directo: ${error.message || String(error)}`);
      }

      // Crear mensaje de bienvenida
      try {
        await this.crearMensajeSistema(
          grupoGuardado.grupoId,
          `💬 Chat directo creado. Puedes comenzar a chatear.`
        );
      } catch (error) {
        console.error('[GruposService] Error al crear mensaje automático para chat directo:', error);
        // No lanzar error, el grupo ya está creado
      }

      return grupoGuardado;
    } catch (error) {
      console.error('[GruposService] Error en obtenerOCrearChatDirecto:', error);
      console.error('[GruposService] Stack trace completo:', error.stack);
      // Si ya es una excepción de NestJS, propagarla directamente
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, crear una excepción genérica
      if (error instanceof Error) {
        throw new Error(`Error al obtener o crear chat directo: ${error.message}`);
      }
      throw new Error(`Error al obtener o crear chat directo: ${String(error)}`);
    }
  }

  async obtenerMisGrupos(usuarioId: number): Promise<Grupo[]> {
    try {
      // Obtener el usuario para verificar si es superadmin y sus asignaciones
      const usuario = await this.usersService.findOne(usuarioId);
      const esSuperadmin = usuario?.usuarioRol?.rolTipo === 'superadmin';
      
      // Si es superadmin, retornar todos los grupos activos
      if (esSuperadmin) {
        const todosLosGrupos = await this.gruposRepository.find({
          where: { grupoActivo: true },
          order: { fechaCreacion: 'DESC' },
        });
        return todosLosGrupos;
      }
      
      // Si no es superadmin, filtrar grupos según asignaciones
      const gruposAsignados = await this.gruposRepository
        .createQueryBuilder('grupo')
        .innerJoin('grupo.usuariosGrupo', 'usuarioGrupo')
        .where('usuarioGrupo.usuarioId = :usuarioId', { usuarioId })
        .andWhere('usuarioGrupo.activo = true')
        .andWhere('grupo.grupoActivo = true')
        .getMany();

      // Filtrar grupos según las asignaciones del usuario
      const gruposFiltrados = gruposAsignados.filter(grupo => {
        // Siempre incluir grupo general y chats directos
        if (grupo.tipoGrupo === TipoGrupo.GENERAL || grupo.tipoGrupo === TipoGrupo.DIRECTO) {
          return true;
        }
        
        // Para grupos de sede y bodega: verificar que el usuario esté asignado a esa entidad
        if (grupo.tipoGrupo === TipoGrupo.SEDE && grupo.entidadId) {
          return usuario?.usuarioSede === grupo.entidadId;
        }
        
        if (grupo.tipoGrupo === TipoGrupo.BODEGA && grupo.entidadId) {
          return usuario?.usuarioBodega === grupo.entidadId;
        }
        
        // Para instalaciones: verificar que el usuario esté asignado a esa instalación
        if (grupo.tipoGrupo === TipoGrupo.INSTALACION && grupo.entidadId) {
          // Verificar si el usuario está asignado a esta instalación
          // Esto se verifica por la relación UsuarioGrupo, así que si llegó aquí, está asignado
          return true;
        }
        
        return false;
      });
      
      // Ordenar por fecha de creación descendente
      gruposFiltrados.sort((a, b) => 
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      );
      
      return gruposFiltrados;
    } catch (error) {
      console.error('[GruposService] ❌ Error al obtener grupos del usuario:', error);
      console.error('[GruposService] Stack trace:', error.stack);
      return [];
    }
  }

  async obtenerMisGruposConInfo(usuarioId: number): Promise<any[]> {
    const grupos = await this.obtenerMisGrupos(usuarioId);
    const gruposConInfo = await Promise.all(
      grupos.map(async (grupo) => {
        const ultimoMensaje = await this.mensajesService.obtenerUltimoMensaje(grupo.grupoId);
        const notificaciones = await this.notificacionesService.obtenerNotificacionesPorGrupo(
          grupo.grupoId,
          usuarioId
        );
        const noLeidas = notificaciones.filter(n => !n.leida).length;

        return {
          ...grupo,
          ultimoMensaje: ultimoMensaje ? {
            mensajeId: ultimoMensaje.mensajeId,
            mensajeTexto: ultimoMensaje.mensajeTexto,
            fechaCreacion: ultimoMensaje.fechaCreacion,
            usuario: ultimoMensaje.usuario,
          } : null,
          noLeidas,
        };
      })
    );

    // Ordenar por último mensaje (más reciente primero) o por fecha de creación
    gruposConInfo.sort((a, b) => {
      const fechaA = a.ultimoMensaje 
        ? new Date(a.ultimoMensaje.fechaCreacion).getTime()
        : new Date(a.fechaCreacion).getTime();
      const fechaB = b.ultimoMensaje
        ? new Date(b.ultimoMensaje.fechaCreacion).getTime()
        : new Date(b.fechaCreacion).getTime();
      return fechaB - fechaA;
    });

    return gruposConInfo;
  }

  private async obtenerSuperadmins(): Promise<number[]> {
    try {
      const usuarios = await this.usersService.findAll({ page: 1, limit: 1000 });
      if (usuarios.data && usuarios.data.length > 0) {
        return usuarios.data
          .filter((u: any) => u.usuarioRol?.rolTipo === 'superadmin')
          .map((u: any) => u.usuarioId);
      }
      return [];
    } catch (error) {
      console.error('[GruposService] Error al obtener superadmins:', error);
      return [];
    }
  }

  private async asignarUsuariosAGrupo(grupoId: number, tipoGrupo: TipoGrupo, entidadId: number): Promise<void> {
    try {
      // Asignar todos los superadmins al grupo
      const superadmins = await this.obtenerSuperadmins();
      
      if (superadmins.length > 0) {
        for (const superadminId of superadmins) {
          try {
            await this.usuariosGruposService.agregarUsuarioGrupo(grupoId, superadminId);
          } catch (error) {
            // Ignorar errores si ya está asignado
          }
        }
      }

      // Asignar usuarios que tienen esta entidad asignada
      const usuarios = await this.usersService.findAll({ page: 1, limit: 10000 });
      
      if (usuarios.data && usuarios.data.length > 0) {
        const usuariosParaAsignar: number[] = [];
        
        for (const usuario of usuarios.data) {
          let debeAsignar = false;
          
          if (tipoGrupo === TipoGrupo.SEDE && usuario.usuarioSede === entidadId) {
            debeAsignar = true;
          } else if (tipoGrupo === TipoGrupo.BODEGA && usuario.usuarioBodega === entidadId) {
            debeAsignar = true;
          }
          
          if (debeAsignar) {
            usuariosParaAsignar.push(usuario.usuarioId);
          }
        }
        
        // Asignar usuarios a el grupo
        for (const usuarioId of usuariosParaAsignar) {
          try {
            await this.usuariosGruposService.agregarUsuarioGrupo(grupoId, usuarioId);
          } catch (error) {
            // Ignorar errores si ya está asignado
          }
        }
      }
    } catch (error) {
      console.error(`[GruposService] Error al asignar usuarios al grupo ${grupoId}:`, error);
    }
  }

  private async obtenerUsuarioSistema(): Promise<number> {
    if (this.sistemaUsuarioId) {
      return this.sistemaUsuarioId;
    }

    try {
      // Buscar usuario sistema por correo
      const usuarioSistema = await this.usersService.findByEmail('sistema@jarlepsis.com');
      if (usuarioSistema) {
        this.sistemaUsuarioId = usuarioSistema.usuarioId;
        return this.sistemaUsuarioId;
      }

      // Si no existe, buscar usuarios y encontrar un superadmin como fallback
      const usuarios = await this.usersService.findAll({ page: 1, limit: 100 });
      if (usuarios.data && usuarios.data.length > 0) {
        // Buscar un superadmin
        const superadmin = usuarios.data.find((u: any) => 
          u.usuarioRol?.rolTipo === 'superadmin' || u.role === 'superadmin'
        );
        if (superadmin) {
          this.sistemaUsuarioId = superadmin.usuarioId;
          return this.sistemaUsuarioId;
        }
        // Si no hay superadmin, usar el primer usuario
        this.sistemaUsuarioId = usuarios.data[0].usuarioId;
        return this.sistemaUsuarioId;
      }

      // Fallback: usar ID 1 (asumiendo que existe)
      this.sistemaUsuarioId = 1;
      return this.sistemaUsuarioId;
    } catch (error) {
      // Fallback: usar ID 1
      this.sistemaUsuarioId = 1;
      return this.sistemaUsuarioId;
    }
  }

  async crearMensajeSistema(grupoId: number, texto: string): Promise<void> {
    try {
      const sistemaUsuarioId = await this.obtenerUsuarioSistema();
      await this.mensajesService.enviarMensaje(grupoId, sistemaUsuarioId, texto);
    } catch (error) {
      console.error('[GruposService] Error al crear mensaje del sistema:', error);
      throw error;
    }
  }

  async cerrarChat(tipoGrupo: TipoGrupo, entidadId: number, motivo: string): Promise<void> {
    try {
      const grupo = await this.obtenerGrupoPorEntidad(tipoGrupo, entidadId);
      if (!grupo || !grupo.grupoActivo) {
        return; // Ya está cerrado
      }

      // Desactivar el grupo
      grupo.grupoActivo = false;
      await this.gruposRepository.save(grupo);

      // Enviar mensaje automático de cierre
      try {
        await this.crearMensajeSistema(grupo.grupoId, `🔒 ${motivo}`);
      } catch (error) {
        console.error('[GruposService] Error al crear mensaje de cierre:', error);
      }

      // Notificar a los usuarios del grupo que el chat se cerró
      const usuariosDelGrupo = await this.obtenerUsuariosDelGrupo(grupo.grupoId);
      if (usuariosDelGrupo.length > 0) {
        this.chatGateway.emitirCierreChat(grupo.grupoId, usuariosDelGrupo, motivo);
      }
    } catch (error) {
      console.error(`[GruposService] Error al cerrar chat ${tipoGrupo} ${entidadId}:`, error);
      throw error;
    }
  }

  private async obtenerUsuariosDelGrupo(grupoId: number): Promise<number[]> {
    const resultado = await this.gruposRepository.query(
      'SELECT DISTINCT usuarioId FROM usuarios_grupos WHERE grupoId = ? AND activo = true',
      [grupoId]
    );
    return resultado.map((row: any) => row.usuarioId);
  }

  async sincronizarGruposYUsuarios(): Promise<{ gruposSincronizados: number; usuariosAsignados: number; errores: string[] }> {
    const errores: string[] = [];
    let gruposSincronizados = 0;
    let usuariosAsignados = 0;

    try {
      // Obtener todos los grupos activos
      const grupos = await this.gruposRepository.find({
        where: { grupoActivo: true },
      });

      // Obtener todos los usuarios
      const usuarios = await this.usersService.findAll({ page: 1, limit: 10000 });
      const todosLosUsuarios = usuarios.data || [];

      // Obtener superadmins
      const superadmins = await this.obtenerSuperadmins();

      // Sincronizar cada grupo
      for (const grupo of grupos) {
        try {
          // Asignar superadmins a todos los grupos
          for (const superadminId of superadmins) {
            try {
              await this.usuariosGruposService.agregarUsuarioGrupo(grupo.grupoId, superadminId);
              usuariosAsignados++;
            } catch (error) {
              // Ignorar si ya está asignado
            }
          }

          // Asignar usuarios según el tipo de grupo
          if (grupo.tipoGrupo === TipoGrupo.SEDE && grupo.entidadId) {
            for (const usuario of todosLosUsuarios) {
              if (usuario.usuarioSede === grupo.entidadId) {
                try {
                  await this.usuariosGruposService.agregarUsuarioGrupo(grupo.grupoId, usuario.usuarioId);
                  usuariosAsignados++;
                } catch (error) {
                  // Ignorar si ya está asignado
                }
              }
            }
          }
          else if (grupo.tipoGrupo === TipoGrupo.BODEGA && grupo.entidadId) {
            for (const usuario of todosLosUsuarios) {
              if (usuario.usuarioBodega === grupo.entidadId) {
                try {
                  await this.usuariosGruposService.agregarUsuarioGrupo(grupo.grupoId, usuario.usuarioId);
                  usuariosAsignados++;
                } catch (error) {
                  // Ignorar si ya está asignado
                }
              }
            }
          }

          gruposSincronizados++;
        } catch (error) {
          const errorMsg = `Error al sincronizar grupo ${grupo.grupoId}: ${error.message}`;
          console.error(`[GruposService] ${errorMsg}`);
          errores.push(errorMsg);
        }
      }

      // Asegurar que todos los usuarios estén en el grupo general
      const grupoGeneral = await this.obtenerGrupoGeneral();
      
      for (const usuario of todosLosUsuarios) {
        try {
          await this.usuariosGruposService.agregarUsuarioGrupo(grupoGeneral.grupoId, usuario.usuarioId);
          usuariosAsignados++;
        } catch (error) {
          // Ignorar si ya está asignado
        }
      }
    } catch (error) {
      const errorMsg = `Error general en sincronización: ${error.message}`;
      console.error(`[GruposService] ${errorMsg}`);
      errores.push(errorMsg);
    }

    return { gruposSincronizados, usuariosAsignados, errores };
  }
}

