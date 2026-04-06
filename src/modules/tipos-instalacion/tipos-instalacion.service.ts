import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TipoInstalacion } from './tipo-instalacion.entity';

@Injectable()
export class TiposInstalacionService {
  private readonly cacheTtlMs = 60_000;
  private readonly findAllCache = new Map<string, { expiresAt: number; data: TipoInstalacion[] }>();

  constructor(
    @InjectRepository(TipoInstalacion)
    private tiposInstalacionRepository: Repository<TipoInstalacion>,
  ) {}

  private getCacheKey(user?: any): string {
    const rol = (user?.usuarioRol?.rolTipo || user?.role || 'anon').toString().toLowerCase();
    const sede = (user?.usuarioSede ?? 'none').toString();
    const bodega = (user?.usuarioBodega ?? 'none').toString();
    return `${rol}|${sede}|${bodega}`;
  }

  private getCachedFindAll(key: string): TipoInstalacion[] | null {
    const cached = this.findAllCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.findAllCache.delete(key);
      return null;
    }
    return cached.data;
  }

  private setFindAllCache(key: string, data: TipoInstalacion[]) {
    this.findAllCache.set(key, {
      expiresAt: Date.now() + this.cacheTtlMs,
      data,
    });
  }

  private invalidateFindAllCache() {
    this.findAllCache.clear();
  }

  async create(data: DeepPartial<TipoInstalacion>, usuarioId: number): Promise<TipoInstalacion> {
    const tipo = this.tiposInstalacionRepository.create({ ...data, usuarioRegistra: usuarioId });
    const saved = await this.tiposInstalacionRepository.save(tipo);
    this.invalidateFindAllCache();
    return saved;
  }

  async findAll(user?: any): Promise<TipoInstalacion[]> {
    const cacheKey = this.getCacheKey(user);
    const cached = this.getCachedFindAll(cacheKey);
    if (cached) return cached;

    const allTipos = await this.tiposInstalacionRepository.find();

    // SuperAdmin, Admin, Administrador de Internas y de Redes ven todos los tipos (admin-internas/admin-redes filtran por bodega en otros módulos)
    if (
      user?.usuarioRol?.rolTipo === 'superadmin' ||
      user?.role === 'superadmin' ||
      user?.usuarioRol?.rolTipo === 'gerencia' ||
      user?.role === 'gerencia' ||
      user?.usuarioRol?.rolTipo === 'admin' ||
      user?.role === 'admin' ||
      user?.usuarioRol?.rolTipo === 'admin-internas' ||
      user?.role === 'admin-internas' ||
      user?.usuarioRol?.rolTipo === 'admin-redes' ||
      user?.role === 'admin-redes'
    ) {
      this.setFindAllCache(cacheKey, allTipos);
      return allTipos;
    }

    // Bodega Internas solo ve tipos que contengan "internas"
    if (user?.usuarioRol?.rolTipo === 'bodega-internas' || user?.role === 'bodega-internas') {
      const data = allTipos.filter((tipo) =>
        tipo.tipoInstalacionNombre?.toLowerCase().includes('internas'),
      );
      this.setFindAllCache(cacheKey, data);
      return data;
    }

    // Bodega Redes solo ve tipos que contengan "redes"
    if (user?.usuarioRol?.rolTipo === 'bodega-redes' || user?.role === 'bodega-redes') {
      const data = allTipos.filter((tipo) => tipo.tipoInstalacionNombre?.toLowerCase().includes('redes'));
      this.setFindAllCache(cacheKey, data);
      return data;
    }

    // Otros roles ven todos los tipos
    this.setFindAllCache(cacheKey, allTipos);
    return allTipos;
  }

  async findOne(id: number): Promise<TipoInstalacion> {
    const tipo = await this.tiposInstalacionRepository.findOne({
      where: { tipoInstalacionId: id },
    });
    if (!tipo) throw new NotFoundException(`Tipo de instalación con ID ${id} no encontrado`);
    return tipo;
  }

  async update(id: number, data: any): Promise<TipoInstalacion> {
    const tipo = await this.findOne(id);
    Object.assign(tipo, data);
    const saved = await this.tiposInstalacionRepository.save(tipo);
    this.invalidateFindAllCache();
    return saved;
  }

  async remove(id: number): Promise<void> {
    const tipo = await this.findOne(id);
    await this.tiposInstalacionRepository.remove(tipo);
    this.invalidateFindAllCache();
  }
}
