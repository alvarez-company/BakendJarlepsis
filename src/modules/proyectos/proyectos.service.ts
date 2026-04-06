import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepository: Repository<Proyecto>,
  ) {}

  private async tableHasTipoProyectoColumn(): Promise<boolean> {
    const result = await this.proyectosRepository.manager.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'proyectos'
         AND COLUMN_NAME = 'tipoProyectoId'
       LIMIT 1`,
    );

    return Array.isArray(result) && result.length > 0;
  }

  private async resolveTipoProyectoId(data: any, user?: any): Promise<number | null> {
    const tipoProyectoIdFromBody = Number(data?.tipoProyectoId);
    if (Number.isFinite(tipoProyectoIdFromBody) && tipoProyectoIdFromBody > 0) {
      const exists = await this.proyectosRepository.manager.query(
        `SELECT tipoProyectoId
         FROM tipos_proyecto
         WHERE tipoProyectoId = ?
         LIMIT 1`,
        [tipoProyectoIdFromBody],
      );
      if (Array.isArray(exists) && exists.length > 0) {
        return tipoProyectoIdFromBody;
      }
      throw new BadRequestException('El tipo de proyecto seleccionado no existe.');
    }

    const rolTipo = String(user?.usuarioRol?.rolTipo || user?.rolTipo || '').toLowerCase();
    const tipoPreferido =
      rolTipo === 'admin-redes' || rolTipo === 'bodega-redes'
        ? 'redes'
        : rolTipo === 'admin-internas' || rolTipo === 'bodega-internas'
          ? 'internas'
          : null;

    if (tipoPreferido) {
      const preferred = await this.proyectosRepository.manager.query(
        `SELECT tipoProyectoId
         FROM tipos_proyecto
         WHERE LOWER(tipoProyectoNombre) LIKE ?
         ORDER BY tipoProyectoId ASC
         LIMIT 1`,
        [`%${tipoPreferido}%`],
      );
      if (Array.isArray(preferred) && preferred.length > 0) {
        return Number(preferred[0].tipoProyectoId);
      }
    }

    const firstAvailable = await this.proyectosRepository.manager.query(
      `SELECT tipoProyectoId
       FROM tipos_proyecto
       ORDER BY tipoProyectoId ASC
       LIMIT 1`,
    );
    if (Array.isArray(firstAvailable) && firstAvailable.length > 0) {
      return Number(firstAvailable[0].tipoProyectoId);
    }

    throw new BadRequestException(
      'No hay tipos de proyecto disponibles para crear el proyecto. Crea al menos uno e intenta nuevamente.',
    );
  }

  async create(data: DeepPartial<Proyecto>, user?: any): Promise<Proyecto> {
    const hasTipoProyectoId = await this.tableHasTipoProyectoColumn();
    const tipoProyectoId = hasTipoProyectoId ? await this.resolveTipoProyectoId(data, user) : null;

    const proyectoTipo =
      (data as any)?.proyectoTipo != null ? String((data as any).proyectoTipo).toLowerCase() : null;
    const proyectoTipologiaTerreno =
      (data as any)?.proyectoTipologiaTerreno != null
        ? String((data as any).proyectoTipologiaTerreno).toUpperCase()
        : null;

    if (proyectoTipo && !['inversion', 'mantenimiento'].includes(proyectoTipo)) {
      throw new BadRequestException('proyectoTipo debe ser "inversion" o "mantenimiento".');
    }
    if (proyectoTipologiaTerreno && !['ZV', 'ACO', 'CO'].includes(proyectoTipologiaTerreno)) {
      throw new BadRequestException('proyectoTipologiaTerreno debe ser "ZV", "ACO" o "CO".');
    }

    const values: any = {
      proyectoNombre: data.proyectoNombre,
      proyectoDescripcion: data.proyectoDescripcion || null,
      proyectoCodigo: data.proyectoCodigo || null,
      proyectoEstado: data.proyectoEstado !== undefined ? data.proyectoEstado : true,
      proyectoTipo: proyectoTipo || null,
      proyectoTipologiaTerreno: proyectoTipologiaTerreno || null,
      usuarioRegistra: user?.usuarioId || null,
    };
    if (hasTipoProyectoId) {
      values.tipoProyectoId = tipoProyectoId;
    }

    // Usar QueryBuilder para tener control total sobre los campos insertados
    const insertResult = await this.proyectosRepository
      .createQueryBuilder()
      .insert()
      .into(Proyecto)
      .values(values)
      .execute();

    const proyectoId = insertResult.identifiers[0].proyectoId;

    // Usar QueryBuilder también para obtener el proyecto, evitando metadatos en caché
    const proyecto = await this.proyectosRepository
      .createQueryBuilder('proyecto')
      .select([
        'proyecto.proyectoId',
        'proyecto.proyectoNombre',
        'proyecto.proyectoDescripcion',
        'proyecto.proyectoCodigo',
        'proyecto.proyectoEstado',
        'proyecto.proyectoTipo',
        'proyecto.proyectoTipologiaTerreno',
        'proyecto.usuarioRegistra',
        'proyecto.fechaCreacion',
        'proyecto.fechaActualizacion',
      ])
      .leftJoinAndSelect('proyecto.items', 'items')
      .where('proyecto.proyectoId = :id', { id: proyectoId })
      .getOne();

    if (!proyecto) {
      throw new NotFoundException(`Proyecto con ID ${proyectoId} no encontrado`);
    }

    return proyecto;
  }

  async findAll(user?: any): Promise<Proyecto[]> {
    // Filtrar por centro operativo: solo proyectos que pertenecen a instalaciones de bodegas de la sede del usuario
    const rolTipo = user?.usuarioRol?.rolTipo || user?.role || '';
    const usuarioSede = user?.usuarioSede;

    if (usuarioSede != null) {
      // Obtener bodegas de la sede según el rol
      let bodegaIds: number[] = [];
      if (rolTipo === 'admin') {
        // Admin: todas las bodegas de su sede
        const bodegasSede = await this.proyectosRepository.manager.query(
          `SELECT bodegaId FROM bodegas WHERE sedeId = ?`,
          [usuarioSede],
        );
        bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
      } else if (rolTipo === 'admin-internas') {
        // Admin-internas: solo bodegas tipo internas de su sede
        const bodegasSede = await this.proyectosRepository.manager.query(
          `SELECT bodegaId FROM bodegas WHERE sedeId = ? AND bodegaTipo = 'internas'`,
          [usuarioSede],
        );
        bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
      } else if (rolTipo === 'admin-redes') {
        // Admin-redes: solo bodegas tipo redes de su sede
        const bodegasSede = await this.proyectosRepository.manager.query(
          `SELECT bodegaId FROM bodegas WHERE sedeId = ? AND bodegaTipo = 'redes'`,
          [usuarioSede],
        );
        bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
      } else if (rolTipo === 'bodega-internas' || rolTipo === 'bodega-redes') {
        // Bodega: solo su bodega
        bodegaIds = user.usuarioBodega ? [user.usuarioBodega] : [];
      } else if (rolTipo === 'tecnico' || rolTipo === 'soldador') {
        // Técnico/Soldador: solo proyectos de instalaciones asignadas a ellos
        const instalacionesRaw = await this.proyectosRepository.manager.query(
          `SELECT instalacionProyectos FROM instalaciones i
             INNER JOIN instalaciones_usuarios iu ON i.instalacionId = iu.instalacionId
             WHERE iu.usuarioId = ? AND iu.activo = 1 AND i.instalacionProyectos IS NOT NULL`,
          [user.usuarioId],
        );

        const proyectoIdsSet = new Set<number>();
        instalacionesRaw.forEach((row: any) => {
          if (row.instalacionProyectos) {
            try {
              const proyectos =
                typeof row.instalacionProyectos === 'string'
                  ? JSON.parse(row.instalacionProyectos)
                  : row.instalacionProyectos;
              if (Array.isArray(proyectos)) {
                proyectos.forEach((p: any) => {
                  const proyectoId = typeof p === 'object' ? p.proyectoId || p.id : p;
                  if (proyectoId) proyectoIdsSet.add(Number(proyectoId));
                });
              } else if (typeof proyectos === 'object' && proyectos.proyectoId) {
                proyectoIdsSet.add(Number(proyectos.proyectoId));
              }
            } catch (e) {
              // Ignorar errores de parsing JSON
            }
          }
        });

        const proyectoIds = Array.from(proyectoIdsSet);
        if (proyectoIds.length > 0) {
          return this.proyectosRepository
            .createQueryBuilder('proyecto')
            .leftJoinAndSelect('proyecto.items', 'items')
            .where('proyecto.proyectoId IN (:...ids)', { ids: proyectoIds })
            .getMany();
        }
        return [];
      } else if (rolTipo === 'almacenista') {
        // Almacenista: todas las bodegas de su sede
        const bodegasSede = await this.proyectosRepository.manager.query(
          `SELECT bodegaId FROM bodegas WHERE sedeId = ?`,
          [usuarioSede],
        );
        bodegaIds = bodegasSede.map((b: any) => b.bodegaId);
      }

      // Obtener proyectos que pertenecen a instalaciones de esas bodegas
      // instalacionProyectos es un JSON que puede contener objetos con proyectoId o arrays
      if (bodegaIds.length > 0) {
        const placeholders = bodegaIds.map(() => '?').join(',');
        // Obtener todas las instalaciones de esas bodegas y extraer proyectoIds de instalacionProyectos
        const instalacionesRaw = await this.proyectosRepository.manager.query(
          `SELECT instalacionProyectos FROM instalaciones WHERE bodegaId IN (${placeholders}) AND instalacionProyectos IS NOT NULL`,
          bodegaIds,
        );

        // Extraer proyectoIds únicos del JSON instalacionProyectos
        const proyectoIdsSet = new Set<number>();
        instalacionesRaw.forEach((row: any) => {
          if (row.instalacionProyectos) {
            try {
              const proyectos =
                typeof row.instalacionProyectos === 'string'
                  ? JSON.parse(row.instalacionProyectos)
                  : row.instalacionProyectos;
              if (Array.isArray(proyectos)) {
                proyectos.forEach((p: any) => {
                  const proyectoId = typeof p === 'object' ? p.proyectoId || p.id : p;
                  if (proyectoId) proyectoIdsSet.add(Number(proyectoId));
                });
              } else if (typeof proyectos === 'object' && proyectos.proyectoId) {
                proyectoIdsSet.add(Number(proyectos.proyectoId));
              }
            } catch (e) {
              // Ignorar errores de parsing JSON
            }
          }
        });

        const proyectoIds = Array.from(proyectoIdsSet);
        if (proyectoIds.length > 0) {
          return this.proyectosRepository
            .createQueryBuilder('proyecto')
            .leftJoinAndSelect('proyecto.items', 'items')
            .where('proyecto.proyectoId IN (:...ids)', { ids: proyectoIds })
            .getMany();
        }
        return [];
      }
      return [];
    }

    // SuperAdmin/Gerencia: todos los proyectos
    return this.proyectosRepository.find({ relations: ['items'] });
  }

  async findOne(id: number): Promise<Proyecto> {
    const proyecto = await this.proyectosRepository.findOne({
      where: { proyectoId: id },
      relations: ['items'],
    });
    if (!proyecto) throw new NotFoundException(`Proyecto con ID ${id} no encontrado`);
    return proyecto;
  }

  async update(id: number, data: any): Promise<Proyecto> {
    const proyecto = await this.findOne(id);

    // Solo actualizar campos válidos, ignorar tipoProyectoId si viene
    const updateData: any = {};
    if (data.proyectoNombre !== undefined) updateData.proyectoNombre = data.proyectoNombre;
    if (data.proyectoDescripcion !== undefined)
      updateData.proyectoDescripcion = data.proyectoDescripcion || null;
    if (data.proyectoCodigo !== undefined) updateData.proyectoCodigo = data.proyectoCodigo || null;
    if (data.proyectoEstado !== undefined) updateData.proyectoEstado = data.proyectoEstado;
    if (data.proyectoTipo !== undefined) {
      const val = data.proyectoTipo == null ? null : String(data.proyectoTipo).toLowerCase();
      if (val && !['inversion', 'mantenimiento'].includes(val)) {
        throw new BadRequestException('proyectoTipo debe ser "inversion" o "mantenimiento".');
      }
      updateData.proyectoTipo = val;
    }
    if (data.proyectoTipologiaTerreno !== undefined) {
      const val =
        data.proyectoTipologiaTerreno == null
          ? null
          : String(data.proyectoTipologiaTerreno).toUpperCase();
      if (val && !['ZV', 'ACO', 'CO'].includes(val)) {
        throw new BadRequestException('proyectoTipologiaTerreno debe ser "ZV", "ACO" o "CO".');
      }
      updateData.proyectoTipologiaTerreno = val;
    }

    Object.assign(proyecto, updateData);
    return this.proyectosRepository.save(proyecto);
  }

  async remove(id: number): Promise<void> {
    const proyecto = await this.findOne(id);
    await this.proyectosRepository.remove(proyecto);
  }
}
