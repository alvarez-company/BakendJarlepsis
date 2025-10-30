import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grupo, TipoGrupo } from './grupo.entity';

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(Grupo)
    private gruposRepository: Repository<Grupo>,
  ) {}

  async crearGrupoOficina(oficinaId: number, oficinaNombre: string): Promise<Grupo> {
    const grupo = this.gruposRepository.create({
      grupoNombre: `Oficina ${oficinaNombre}`,
      grupoDescripcion: `Grupo de chat de la oficina ${oficinaNombre}`,
      tipoGrupo: TipoGrupo.OFICINA,
      entidadId: oficinaId,
    });
    return this.gruposRepository.save(grupo);
  }

  async crearGrupoBodega(bodegaId: number, bodegaNombre: string): Promise<Grupo> {
    const grupo = this.gruposRepository.create({
      grupoNombre: `Bodega ${bodegaNombre}`,
      grupoDescripcion: `Grupo de chat de la bodega ${bodegaNombre}`,
      tipoGrupo: TipoGrupo.BODEGA,
      entidadId: bodegaId,
    });
    return this.gruposRepository.save(grupo);
  }

  async crearGrupoInstalacion(instalacionId: number, instalacionCodigo: string): Promise<Grupo> {
    const grupo = this.gruposRepository.create({
      grupoNombre: `Instalación ${instalacionCodigo}`,
      grupoDescripcion: `Grupo de chat de la instalación ${instalacionCodigo}`,
      tipoGrupo: TipoGrupo.INSTALACION,
      entidadId: instalacionId,
    });
    return this.gruposRepository.save(grupo);
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
    }
    return grupo;
  }

  async obtenerGrupoPorEntidad(tipoGrupo: TipoGrupo, entidadId: number): Promise<Grupo> {
    return this.gruposRepository.findOne({ where: { tipoGrupo, entidadId } });
  }

  async obtenerMisGrupos(usuarioId: number): Promise<Grupo[]> {
    return this.gruposRepository
      .createQueryBuilder('grupo')
      .innerJoin('grupo.usuariosGrupo', 'usuarioGrupo')
      .where('usuarioGrupo.usuarioId = :usuarioId', { usuarioId })
      .andWhere('usuarioGrupo.activo = true')
      .getMany();
  }
}

