import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Municipio } from './municipio.entity';
import { CreateMunicipioDto } from './dto/create-municipio.dto';
import { UpdateMunicipioDto } from './dto/update-municipio.dto';

@Injectable()
export class MunicipiosService {
  constructor(
    @InjectRepository(Municipio)
    private municipiosRepository: Repository<Municipio>,
  ) {}

  async create(createMunicipioDto: CreateMunicipioDto): Promise<Municipio> {
    const municipio = this.municipiosRepository.create(createMunicipioDto);
    return this.municipiosRepository.save(municipio);
  }

  async findAll(): Promise<Municipio[]> {
    return this.municipiosRepository.find({ relations: ['departamento'] });
  }

  async findOne(id: number): Promise<Municipio> {
    const municipio = await this.municipiosRepository.findOne({
      where: { municipioId: id },
      relations: ['departamento'], // oficinas eliminado
    });
    if (!municipio) {
      throw new NotFoundException(`Municipio con ID ${id} no encontrado`);
    }
    return municipio;
  }

  async update(id: number, updateMunicipioDto: UpdateMunicipioDto): Promise<Municipio> {
    const municipio = await this.findOne(id);
    Object.assign(municipio, updateMunicipioDto);
    return this.municipiosRepository.save(municipio);
  }

  async remove(id: number): Promise<void> {
    const municipio = await this.findOne(id);
    await this.municipiosRepository.remove(municipio);
  }

  async seedMunicipios(): Promise<{ message: string; count: number }> {
    const municipiosData = [
      // ANTIOQUIA (1)
      { municipioNombre: 'Medellín', municipioCodigo: '05001', departamentoId: 1 },
      { municipioNombre: 'Bello', municipioCodigo: '05088', departamentoId: 1 },
      { municipioNombre: 'Itagüí', municipioCodigo: '05360', departamentoId: 1 },
      { municipioNombre: 'Envigado', municipioCodigo: '05266', departamentoId: 1 },
      { municipioNombre: 'Apartadó', municipioCodigo: '05045', departamentoId: 1 },
      { municipioNombre: 'Turbo', municipioCodigo: '05837', departamentoId: 1 },
      { municipioNombre: 'Rionegro', municipioCodigo: '05615', departamentoId: 1 },
      { municipioNombre: 'Caucasia', municipioCodigo: '05154', departamentoId: 1 },
      { municipioNombre: 'Sabaneta', municipioCodigo: '05631', departamentoId: 1 },
      { municipioNombre: 'La Estrella', municipioCodigo: '05380', departamentoId: 1 },
      
      // ATLÁNTICO (2)
      { municipioNombre: 'Barranquilla', municipioCodigo: '08001', departamentoId: 2 },
      { municipioNombre: 'Soledad', municipioCodigo: '08758', departamentoId: 2 },
      { municipioNombre: 'Malambo', municipioCodigo: '08433', departamentoId: 2 },
      { municipioNombre: 'Sabanalarga', municipioCodigo: '08638', departamentoId: 2 },
      { municipioNombre: 'Puerto Colombia', municipioCodigo: '08573', departamentoId: 2 },
      { municipioNombre: 'Galapa', municipioCodigo: '08296', departamentoId: 2 },
      { municipioNombre: 'Baranoa', municipioCodigo: '08078', departamentoId: 2 },
      { municipioNombre: 'Santo Tomás', municipioCodigo: '08675', departamentoId: 2 },
      { municipioNombre: 'Palmar de Varela', municipioCodigo: '08520', departamentoId: 2 },
      { municipioNombre: 'Candelaria', municipioCodigo: '08137', departamentoId: 2 },
      
      // BOGOTÁ D.C. (3)
      { municipioNombre: 'Bogotá D.C.', municipioCodigo: '11001', departamentoId: 3 },
      
      // BOLÍVAR (4)
      { municipioNombre: 'Cartagena', municipioCodigo: '13001', departamentoId: 4 },
      { municipioNombre: 'Magangué', municipioCodigo: '13430', departamentoId: 4 },
      { municipioNombre: 'Turbaco', municipioCodigo: '13838', departamentoId: 4 },
      { municipioNombre: 'Arjona', municipioCodigo: '13052', departamentoId: 4 },
      { municipioNombre: 'El Carmen de Bolívar', municipioCodigo: '13244', departamentoId: 4 },
      { municipioNombre: 'Mompós', municipioCodigo: '13468', departamentoId: 4 },
      { municipioNombre: 'Santa Rosa del Sur', municipioCodigo: '13744', departamentoId: 4 },
      { municipioNombre: 'Mahates', municipioCodigo: '13433', departamentoId: 4 },
      { municipioNombre: 'San Juan Nepomuceno', municipioCodigo: '13657', departamentoId: 4 },
      { municipioNombre: 'Simití', municipioCodigo: '13760', departamentoId: 4 },
      
      // BOYACÁ (5)
      { municipioNombre: 'Tunja', municipioCodigo: '15001', departamentoId: 5 },
      { municipioNombre: 'Duitama', municipioCodigo: '15238', departamentoId: 5 },
      { municipioNombre: 'Sogamoso', municipioCodigo: '15759', departamentoId: 5 },
      { municipioNombre: 'Chiquinquirá', municipioCodigo: '15176', departamentoId: 5 },
      { municipioNombre: 'Paipa', municipioCodigo: '15531', departamentoId: 5 },
      { municipioNombre: 'Villa de Leyva', municipioCodigo: '15407', departamentoId: 5 },
      { municipioNombre: 'Puerto Boyacá', municipioCodigo: '15572', departamentoId: 5 },
      { municipioNombre: 'Moniquirá', municipioCodigo: '15476', departamentoId: 5 },
      { municipioNombre: 'Nobsa', municipioCodigo: '15491', departamentoId: 5 },
      { municipioNombre: 'Tibasosa', municipioCodigo: '15806', departamentoId: 5 },
      
      // CALDAS (6)
      { municipioNombre: 'Manizales', municipioCodigo: '17001', departamentoId: 6 },
      { municipioNombre: 'Villamaría', municipioCodigo: '17873', departamentoId: 6 },
      { municipioNombre: 'La Dorada', municipioCodigo: '17380', departamentoId: 6 },
      { municipioNombre: 'Chinchiná', municipioCodigo: '17174', departamentoId: 6 },
      { municipioNombre: 'Riosucio', municipioCodigo: '17614', departamentoId: 6 },
      { municipioNombre: 'Anserma', municipioCodigo: '17042', departamentoId: 6 },
      { municipioNombre: 'Neira', municipioCodigo: '17486', departamentoId: 6 },
      { municipioNombre: 'Aguadas', municipioCodigo: '17013', departamentoId: 6 },
      { municipioNombre: 'Palestina', municipioCodigo: '17524', departamentoId: 6 },
      { municipioNombre: 'Supía', municipioCodigo: '17777', departamentoId: 6 },
      
      // CAQUETÁ (7)
      { municipioNombre: 'Florencia', municipioCodigo: '18001', departamentoId: 7 },
      { municipioNombre: 'San Vicente del Caguán', municipioCodigo: '18753', departamentoId: 7 },
      { municipioNombre: 'Puerto Rico', municipioCodigo: '18592', departamentoId: 7 },
      { municipioNombre: 'El Doncello', municipioCodigo: '18247', departamentoId: 7 },
      { municipioNombre: 'Belén de los Andaquíes', municipioCodigo: '18094', departamentoId: 7 },
      
      // CAUCA (8)
      { municipioNombre: 'Popayán', municipioCodigo: '19001', departamentoId: 8 },
      { municipioNombre: 'Santander de Quilichao', municipioCodigo: '19693', departamentoId: 8 },
      { municipioNombre: 'Puerto Tejada', municipioCodigo: '19573', departamentoId: 8 },
      { municipioNombre: 'Patía', municipioCodigo: '19517', departamentoId: 8 },
      { municipioNombre: 'Piendamó', municipioCodigo: '19533', departamentoId: 8 },
      
      // CESAR (9)
      { municipioNombre: 'Valledupar', municipioCodigo: '20001', departamentoId: 9 },
      { municipioNombre: 'Aguachica', municipioCodigo: '20011', departamentoId: 9 },
      { municipioNombre: 'Bosconia', municipioCodigo: '20060', departamentoId: 9 },
      { municipioNombre: 'Chimichagua', municipioCodigo: '20178', departamentoId: 9 },
      
      // CÓRDOBA (10)
      { municipioNombre: 'Montería', municipioCodigo: '23001', departamentoId: 10 },
      { municipioNombre: 'Cereté', municipioCodigo: '23162', departamentoId: 10 },
      { municipioNombre: 'Lorica', municipioCodigo: '23417', departamentoId: 10 },
      { municipioNombre: 'Sahagún', municipioCodigo: '23660', departamentoId: 10 },
      { municipioNombre: 'Montelíbano', municipioCodigo: '23466', departamentoId: 10 },
      
      // CUNDINAMARCA (11)
      { municipioNombre: 'Soacha', municipioCodigo: '25754', departamentoId: 11 },
      { municipioNombre: 'Facatativá', municipioCodigo: '25269', departamentoId: 11 },
      { municipioNombre: 'Zipaquirá', municipioCodigo: '25899', departamentoId: 11 },
      { municipioNombre: 'Chía', municipioCodigo: '25175', departamentoId: 11 },
      { municipioNombre: 'Fusagasugá', municipioCodigo: '25290', departamentoId: 11 },
      { municipioNombre: 'Girardot', municipioCodigo: '25307', departamentoId: 11 },
      { municipioNombre: 'Madrid', municipioCodigo: '25430', departamentoId: 11 },
      { municipioNombre: 'Mosquera', municipioCodigo: '25473', departamentoId: 11 },
      { municipioNombre: 'Funza', municipioCodigo: '25286', departamentoId: 11 },
      { municipioNombre: 'Cajicá', municipioCodigo: '25126', departamentoId: 11 },
      
      // CHOCÓ (12)
      { municipioNombre: 'Quibdó', municipioCodigo: '27001', departamentoId: 12 },
      { municipioNombre: 'Istmina', municipioCodigo: '27361', departamentoId: 12 },
      { municipioNombre: 'Condoto', municipioCodigo: '27205', departamentoId: 12 },
      
      // HUILA (13)
      { municipioNombre: 'Neiva', municipioCodigo: '41001', departamentoId: 13 },
      { municipioNombre: 'Pitalito', municipioCodigo: '41551', departamentoId: 13 },
      { municipioNombre: 'Garzón', municipioCodigo: '41298', departamentoId: 13 },
      { municipioNombre: 'La Plata', municipioCodigo: '41396', departamentoId: 13 },
      
      // LA GUAJIRA (14)
      { municipioNombre: 'Riohacha', municipioCodigo: '44001', departamentoId: 14 },
      { municipioNombre: 'Maicao', municipioCodigo: '44430', departamentoId: 14 },
      { municipioNombre: 'Uribia', municipioCodigo: '44847', departamentoId: 14 },
      
      // MAGDALENA (15)
      { municipioNombre: 'Santa Marta', municipioCodigo: '47001', departamentoId: 15 },
      { municipioNombre: 'Ciénaga', municipioCodigo: '47189', departamentoId: 15 },
      { municipioNombre: 'Fundación', municipioCodigo: '47288', departamentoId: 15 },
      
      // META (16)
      { municipioNombre: 'Villavicencio', municipioCodigo: '50001', departamentoId: 16 },
      { municipioNombre: 'Acacías', municipioCodigo: '50006', departamentoId: 16 },
      { municipioNombre: 'Granada', municipioCodigo: '50318', departamentoId: 16 },
      
      // NARIÑO (17)
      { municipioNombre: 'Pasto', municipioCodigo: '52001', departamentoId: 17 },
      { municipioNombre: 'Tumaco', municipioCodigo: '52835', departamentoId: 17 },
      { municipioNombre: 'Ipiales', municipioCodigo: '52356', departamentoId: 17 },
      
      // NORTE DE SANTANDER (18)
      { municipioNombre: 'Cúcuta', municipioCodigo: '54001', departamentoId: 18 },
      { municipioNombre: 'Ocaña', municipioCodigo: '54498', departamentoId: 18 },
      { municipioNombre: 'Villa del Rosario', municipioCodigo: '54874', departamentoId: 18 },
      { municipioNombre: 'Los Patios', municipioCodigo: '54405', departamentoId: 18 },
      
      // QUINDÍO (19)
      { municipioNombre: 'Armenia', municipioCodigo: '63001', departamentoId: 19 },
      { municipioNombre: 'Calarcá', municipioCodigo: '63130', departamentoId: 19 },
      { municipioNombre: 'Circasia', municipioCodigo: '63190', departamentoId: 19 },
      { municipioNombre: 'La Tebaida', municipioCodigo: '63401', departamentoId: 19 },
      { municipioNombre: 'Montenegro', municipioCodigo: '63470', departamentoId: 19 },
      { municipioNombre: 'Quimbaya', municipioCodigo: '63594', departamentoId: 19 },
      
      // RISARALDA (20)
      { municipioNombre: 'Pereira', municipioCodigo: '66001', departamentoId: 20 },
      { municipioNombre: 'Dosquebradas', municipioCodigo: '66170', departamentoId: 20 },
      { municipioNombre: 'La Virginia', municipioCodigo: '66400', departamentoId: 20 },
      { municipioNombre: 'Santa Rosa de Cabal', municipioCodigo: '66682', departamentoId: 20 },
      
      // SANTANDER (21)
      { municipioNombre: 'Bucaramanga', municipioCodigo: '68001', departamentoId: 21 },
      { municipioNombre: 'Floridablanca', municipioCodigo: '68276', departamentoId: 21 },
      { municipioNombre: 'Girón', municipioCodigo: '68307', departamentoId: 21 },
      { municipioNombre: 'Piedecuesta', municipioCodigo: '68547', departamentoId: 21 },
      { municipioNombre: 'Barrancabermeja', municipioCodigo: '68081', departamentoId: 21 },
      { municipioNombre: 'San Gil', municipioCodigo: '68679', departamentoId: 21 },
      
      // SUCRE (22)
      { municipioNombre: 'Sincelejo', municipioCodigo: '70001', departamentoId: 22 },
      { municipioNombre: 'Corozal', municipioCodigo: '70215', departamentoId: 22 },
      { municipioNombre: 'Sampués', municipioCodigo: '70708', departamentoId: 22 },
      { municipioNombre: 'San Marcos', municipioCodigo: '70742', departamentoId: 22 },
      
      // TOLIMA (23)
      { municipioNombre: 'Ibagué', municipioCodigo: '73001', departamentoId: 23 },
      { municipioNombre: 'Espinal', municipioCodigo: '73268', departamentoId: 23 },
      { municipioNombre: 'Melgar', municipioCodigo: '73449', departamentoId: 23 },
      { municipioNombre: 'Honda', municipioCodigo: '73349', departamentoId: 23 },
      { municipioNombre: 'Chaparral', municipioCodigo: '73168', departamentoId: 23 },
      
      // VALLE DEL CAUCA (24)
      { municipioNombre: 'Cali', municipioCodigo: '76001', departamentoId: 24 },
      { municipioNombre: 'Palmira', municipioCodigo: '76520', departamentoId: 24 },
      { municipioNombre: 'Buenaventura', municipioCodigo: '76109', departamentoId: 24 },
      { municipioNombre: 'Tuluá', municipioCodigo: '76834', departamentoId: 24 },
      { municipioNombre: 'Buga', municipioCodigo: '76111', departamentoId: 24 },
      { municipioNombre: 'Cartago', municipioCodigo: '76147', departamentoId: 24 },
      { municipioNombre: 'Jamundí', municipioCodigo: '76364', departamentoId: 24 },
      { municipioNombre: 'Yumbo', municipioCodigo: '76892', departamentoId: 24 },
    ];

    let insertados = 0;
    
    for (const data of municipiosData) {
      try {
        // Verificar si ya existe
        const existe = await this.municipiosRepository.findOne({
          where: { municipioCodigo: data.municipioCodigo }
        });
        
        if (!existe) {
          const municipio = this.municipiosRepository.create({
            ...data,
            municipioEstado: true
          });
          await this.municipiosRepository.save(municipio);
          insertados++;
        }
      } catch (error) {
        console.error(`Error al insertar ${data.municipioNombre}:`, error);
        // Continuar con los demás
      }
    }

    return {
      message: `Se insertaron ${insertados} municipios correctamente`,
      count: insertados
    };
  }
}
