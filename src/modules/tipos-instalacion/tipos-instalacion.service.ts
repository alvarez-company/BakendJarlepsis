import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { TipoInstalacion } from './tipo-instalacion.entity';

@Injectable()
export class TiposInstalacionService {
  constructor(
    @InjectRepository(TipoInstalacion)
    private tiposInstalacionRepository: Repository<TipoInstalacion>,
  ) {}

  async create(data: DeepPartial<TipoInstalacion>, usuarioId: number): Promise<TipoInstalacion> {
    const tipo = this.tiposInstalacionRepository.create({ ...data, usuarioRegistra: usuarioId });
    return await this.tiposInstalacionRepository.save(tipo);
  }

  async findAll(user?: any): Promise<TipoInstalacion[]> {
    const allTipos = await this.tiposInstalacionRepository.find();

    // SuperAdmin, Admin, Administrador de Internas y de Redes ven todos los tipos (admin-internas/admin-redes filtran por bodega en otros módulos)
    if (
      user?.usuarioRol?.rolTipo === 'superadmin' ||
      user?.role === 'superadmin' ||
      user?.usuarioRol?.rolTipo === 'admin' ||
      user?.role === 'admin' ||
      user?.usuarioRol?.rolTipo === 'admin-internas' ||
      user?.role === 'admin-internas' ||
      user?.usuarioRol?.rolTipo === 'admin-redes' ||
      user?.role === 'admin-redes'
    ) {
      return allTipos;
    }

    // Bodega Internas solo ve tipos que contengan "internas"
    if (user?.usuarioRol?.rolTipo === 'bodega-internas' || user?.role === 'bodega-internas') {
      return allTipos.filter((tipo) =>
        tipo.tipoInstalacionNombre?.toLowerCase().includes('internas'),
      );
    }

    // Bodega Redes solo ve tipos que contengan "redes"
    if (user?.usuarioRol?.rolTipo === 'bodega-redes' || user?.role === 'bodega-redes') {
      return allTipos.filter((tipo) => tipo.tipoInstalacionNombre?.toLowerCase().includes('redes'));
    }

    // Otros roles ven todos los tipos
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
    return this.tiposInstalacionRepository.save(tipo);
  }

  async remove(id: number): Promise<void> {
    const tipo = await this.findOne(id);
    await this.tiposInstalacionRepository.remove(tipo);
  }
}
