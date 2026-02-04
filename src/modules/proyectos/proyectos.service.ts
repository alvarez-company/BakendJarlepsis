import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Proyecto } from './proyecto.entity';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectosRepository: Repository<Proyecto>,
  ) {}

  async create(data: DeepPartial<Proyecto>, usuarioId?: number): Promise<Proyecto> {
    // Usar QueryBuilder para tener control total sobre los campos insertados
    const insertResult = await this.proyectosRepository
      .createQueryBuilder()
      .insert()
      .into(Proyecto)
      .values({
        proyectoNombre: data.proyectoNombre,
        proyectoDescripcion: data.proyectoDescripcion || null,
        proyectoCodigo: data.proyectoCodigo || null,
        proyectoEstado: data.proyectoEstado !== undefined ? data.proyectoEstado : true,
        usuarioRegistra: usuarioId || null,
      })
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

    Object.assign(proyecto, updateData);
    return this.proyectosRepository.save(proyecto);
  }

  async remove(id: number): Promise<void> {
    const proyecto = await this.findOne(id);
    await this.proyectosRepository.remove(proyecto);
  }
}
