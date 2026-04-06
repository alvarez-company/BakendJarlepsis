import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProyectoRedes } from './entities/proyecto-redes.entity';
import { ProyectoRedesActividad } from './entities/proyecto-redes-actividad.entity';

@Injectable()
export class ProyectosRedesService {
  constructor(
    @InjectRepository(ProyectoRedes)
    private readonly proyectosRepo: Repository<ProyectoRedes>,
    @InjectRepository(ProyectoRedesActividad)
    private readonly actividadesRepo: Repository<ProyectoRedesActividad>,
  ) {}

  async findAllTipos(): Promise<ProyectoRedes[]> {
    return this.proyectosRepo.find({ order: { proyectoRedesId: 'ASC' } });
  }

  async findByCodigo(codigo: string): Promise<ProyectoRedes | null> {
    const c = String(codigo || '').toLowerCase();
    return this.proyectosRepo.findOne({ where: { codigo: c } });
  }

  async assertActividadesPertenecen(proyectoRedesId: number, actividadIds: number[]): Promise<void> {
    if (!actividadIds.length) return;
    const rows = await this.actividadesRepo.find({ where: { proyectoRedesId } });
    const permitidas = new Set(rows.map((r) => r.actividadId));
    for (const id of actividadIds) {
      if (!permitidas.has(id)) {
        throw new BadRequestException(
          `La actividad ${id} no pertenece al tipo de proyecto redes seleccionado.`,
        );
      }
    }
  }

  async findTipoById(id: number): Promise<ProyectoRedes> {
    const p = await this.proyectosRepo.findOne({ where: { proyectoRedesId: id } });
    if (!p) throw new NotFoundException(`Tipo de proyecto redes ${id} no encontrado`);
    return p;
  }

  async findActividadesByProyectoRedesId(proyectoRedesId: number): Promise<ProyectoRedesActividad[]> {
    await this.findTipoById(proyectoRedesId);
    return this.actividadesRepo.find({
      where: { proyectoRedesId },
      order: { orden: 'ASC', actividadId: 'ASC' },
    });
  }

  async createActividad(
    proyectoRedesId: number,
    dto: { nombre: string; orden?: number; activo?: boolean },
    usuarioId?: number,
  ): Promise<ProyectoRedesActividad> {
    await this.findTipoById(proyectoRedesId);
    const nombre = (dto.nombre || '').trim();
    if (!nombre) {
      throw new BadRequestException('El nombre de la actividad es obligatorio.');
    }
    const act = this.actividadesRepo.create({
      proyectoRedesId,
      nombre,
      orden: dto.orden ?? 0,
      activo: dto.activo !== false,
      usuarioRegistra: usuarioId ?? null,
    });
    return this.actividadesRepo.save(act);
  }

  async updateActividad(
    actividadId: number,
    dto: Partial<{ nombre: string; orden: number; activo: boolean }>,
  ): Promise<ProyectoRedesActividad> {
    const act = await this.actividadesRepo.findOne({ where: { actividadId } });
    if (!act) throw new NotFoundException(`Actividad ${actividadId} no encontrada`);
    if (dto.nombre !== undefined) {
      const nombre = String(dto.nombre).trim();
      if (!nombre) throw new BadRequestException('El nombre de la actividad no puede quedar vacío.');
      act.nombre = nombre;
    }
    if (dto.orden !== undefined) act.orden = Number(dto.orden);
    if (dto.activo !== undefined) act.activo = Boolean(dto.activo);
    return this.actividadesRepo.save(act);
  }

  async removeActividad(actividadId: number): Promise<void> {
    const act = await this.actividadesRepo.findOne({ where: { actividadId } });
    if (!act) throw new NotFoundException(`Actividad ${actividadId} no encontrada`);
    await this.actividadesRepo.remove(act);
  }
}
