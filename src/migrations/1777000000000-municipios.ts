import { MigrationInterface, QueryRunner } from 'typeorm';

type Mun = { nombre: string; codigo: string };

export class Municipios1777000000000 implements MigrationInterface {
  name = 'Municipios1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [santander] = await queryRunner.query(
      `SELECT departamentoId FROM departamentos WHERE LOWER(departamentoNombre) = 'santander' LIMIT 1`,
    );
    const [norte] = await queryRunner.query(
      `SELECT departamentoId FROM departamentos WHERE LOWER(departamentoNombre) = 'norte de santander' LIMIT 1`,
    );

    const santanderId = Number(santander?.departamentoId);
    const norteId = Number(norte?.departamentoId);

    if (!Number.isFinite(santanderId) || santanderId <= 0) {
      throw new Error('No se encontró el departamento Santander');
    }
    if (!Number.isFinite(norteId) || norteId <= 0) {
      throw new Error('No se encontró el departamento Norte de Santander');
    }

    // Eliminar municipios actuales de estos departamentos para reemplazar por el listado oficial completo
    await queryRunner.query(`DELETE FROM municipios WHERE departamentoId IN (?, ?)`, [
      santanderId,
      norteId,
    ]);

    const municipiosSantander: Mun[] = [
      { codigo: '68001', nombre: 'Bucaramanga' },
      { codigo: '68013', nombre: 'Aguada' },
      { codigo: '68020', nombre: 'Albania' },
      { codigo: '68051', nombre: 'Aratoca' },
      { codigo: '68077', nombre: 'Barbosa' },
      { codigo: '68079', nombre: 'Barichara' },
      { codigo: '68081', nombre: 'Barrancabermeja' },
      { codigo: '68092', nombre: 'Betulia' },
      { codigo: '68101', nombre: 'Bolívar' },
      { codigo: '68121', nombre: 'Cabrera' },
      { codigo: '68132', nombre: 'California' },
      { codigo: '68147', nombre: 'Capitanejo' },
      { codigo: '68152', nombre: 'Carcasí' },
      { codigo: '68160', nombre: 'Cepitá' },
      { codigo: '68162', nombre: 'Cerrito' },
      { codigo: '68167', nombre: 'Charalá' },
      { codigo: '68169', nombre: 'Charta' },
      { codigo: '68176', nombre: 'Chima' },
      { codigo: '68179', nombre: 'Chipatá' },
      { codigo: '68190', nombre: 'Cimitarra' },
      { codigo: '68207', nombre: 'Concepción' },
      { codigo: '68209', nombre: 'Confines' },
      { codigo: '68211', nombre: 'Contratación' },
      { codigo: '68217', nombre: 'Coromoro' },
      { codigo: '68229', nombre: 'Curití' },
      { codigo: '68235', nombre: 'El Carmen de Chucurí' },
      { codigo: '68245', nombre: 'El Guacamayo' },
      { codigo: '68250', nombre: 'El Peñón' },
      { codigo: '68255', nombre: 'El Playón' },
      { codigo: '68264', nombre: 'Encino' },
      { codigo: '68266', nombre: 'Enciso' },
      { codigo: '68271', nombre: 'Florián' },
      { codigo: '68276', nombre: 'Floridablanca' },
      { codigo: '68296', nombre: 'Galán' },
      { codigo: '68298', nombre: 'Gámbita' },
      { codigo: '68307', nombre: 'Girón' },
      { codigo: '68318', nombre: 'Guaca' },
      { codigo: '68320', nombre: 'Guadalupe' },
      { codigo: '68322', nombre: 'Guapotá' },
      { codigo: '68324', nombre: 'Guavatá' },
      { codigo: '68327', nombre: 'Güepsa' },
      { codigo: '68344', nombre: 'Hato' },
      { codigo: '68368', nombre: 'Jesús María' },
      { codigo: '68370', nombre: 'Jordán' },
      { codigo: '68377', nombre: 'La Belleza' },
      { codigo: '68385', nombre: 'Landázuri' },
      { codigo: '68397', nombre: 'La Paz' },
      { codigo: '68406', nombre: 'Lebrija' },
      { codigo: '68418', nombre: 'Los Santos' },
      { codigo: '68425', nombre: 'Macaravita' },
      { codigo: '68432', nombre: 'Málaga' },
      { codigo: '68444', nombre: 'Matanza' },
      { codigo: '68464', nombre: 'Mogotes' },
      { codigo: '68468', nombre: 'Molagavita' },
      { codigo: '68498', nombre: 'Ocamonte' },
      { codigo: '68500', nombre: 'Oiba' },
      { codigo: '68502', nombre: 'Onzaga' },
      { codigo: '68522', nombre: 'Palmar' },
      { codigo: '68524', nombre: 'Palmas del Socorro' },
      { codigo: '68533', nombre: 'Páramo' },
      { codigo: '68547', nombre: 'Piedecuesta' },
      { codigo: '68549', nombre: 'Pinchote' },
      { codigo: '68572', nombre: 'Puente Nacional' },
      { codigo: '68573', nombre: 'Puerto Parra' },
      { codigo: '68575', nombre: 'Puerto Wilches' },
      { codigo: '68615', nombre: 'Rionegro' },
      { codigo: '68655', nombre: 'Sabana de Torres' },
      { codigo: '68669', nombre: 'San Andrés' },
      { codigo: '68673', nombre: 'San Benito' },
      { codigo: '68679', nombre: 'San Gil' },
      { codigo: '68682', nombre: 'San Joaquín' },
      { codigo: '68684', nombre: 'San José de Miranda' },
      { codigo: '68686', nombre: 'San Miguel' },
      { codigo: '68689', nombre: 'San Vicente de Chucurí' },
      { codigo: '68705', nombre: 'Santa Bárbara' },
      { codigo: '68720', nombre: 'Santa Helena del Opón' },
      { codigo: '68745', nombre: 'Simacota' },
      { codigo: '68755', nombre: 'Socorro' },
      { codigo: '68770', nombre: 'Suaita' },
      { codigo: '68773', nombre: 'Sucre' },
      { codigo: '68780', nombre: 'Suratá' },
      { codigo: '68820', nombre: 'Tona' },
      { codigo: '68855', nombre: 'Valle de San José' },
      { codigo: '68861', nombre: 'Vélez' },
      { codigo: '68867', nombre: 'Vetas' },
      { codigo: '68872', nombre: 'Villanueva' },
      { codigo: '68895', nombre: 'Zapatoca' },
    ];

    const municipiosNorte: Mun[] = [
      { codigo: '54001', nombre: 'Cúcuta' },
      { codigo: '54003', nombre: 'Ábrego' },
      { codigo: '54051', nombre: 'Arboledas' },
      { codigo: '54099', nombre: 'Bochalema' },
      { codigo: '54109', nombre: 'Bucarasica' },
      { codigo: '54125', nombre: 'Cácota' },
      { codigo: '54128', nombre: 'Cáchira' },
      { codigo: '54172', nombre: 'Chinácota' },
      { codigo: '54174', nombre: 'Chitagá' },
      { codigo: '54206', nombre: 'Convención' },
      { codigo: '54223', nombre: 'Cucutilla' },
      { codigo: '54239', nombre: 'Durania' },
      { codigo: '54245', nombre: 'El Carmen' },
      { codigo: '54250', nombre: 'El Tarra' },
      { codigo: '54261', nombre: 'El Zulia' },
      { codigo: '54313', nombre: 'Gramalote' },
      { codigo: '54344', nombre: 'Hacarí' },
      { codigo: '54347', nombre: 'Herrán' },
      { codigo: '54377', nombre: 'Labateca' },
      { codigo: '54385', nombre: 'La Esperanza' },
      { codigo: '54398', nombre: 'La Playa de Belén' },
      { codigo: '54405', nombre: 'Los Patios' },
      { codigo: '54418', nombre: 'Lourdes' },
      { codigo: '54480', nombre: 'Mutiscua' },
      { codigo: '54498', nombre: 'Ocaña' },
      { codigo: '54518', nombre: 'Pamplona' },
      { codigo: '54520', nombre: 'Pamplonita' },
      { codigo: '54553', nombre: 'Puerto Santander' },
      { codigo: '54599', nombre: 'Ragonvalia' },
      { codigo: '54660', nombre: 'Salazar de Las Palmas' },
      { codigo: '54670', nombre: 'San Calixto' },
      { codigo: '54673', nombre: 'San Cayetano' },
      { codigo: '54680', nombre: 'Santiago' },
      { codigo: '54720', nombre: 'Sardinata' },
      { codigo: '54743', nombre: 'Silos' },
      { codigo: '54800', nombre: 'Teorama' },
      { codigo: '54810', nombre: 'Tibú' },
      { codigo: '54820', nombre: 'Toledo' },
      { codigo: '54871', nombre: 'Villa Caro' },
      { codigo: '54874', nombre: 'Villa del Rosario' },
    ];

    await this.insertMunicipios(queryRunner, santanderId, municipiosSantander);
    await this.insertMunicipios(queryRunner, norteId, municipiosNorte);
  }

  private async insertMunicipios(queryRunner: QueryRunner, departamentoId: number, municipios: Mun[]) {
    for (const m of municipios) {
      await queryRunner.query(
        `
        INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado, fechaCreacion, fechaActualizacion)
        VALUES (?, ?, ?, 1, NOW(), NOW())
        `,
        [m.nombre, m.codigo, departamentoId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No revertimos automáticamente para evitar borrar data que el negocio haya usado.
  }
}

