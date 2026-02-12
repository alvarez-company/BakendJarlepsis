#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

const municipiosData = [
  // NORTE DE SANTANDER (18)
  { municipioNombre: 'Cúcuta', municipioCodigo: '54001', departamentoId: 18 },
  { municipioNombre: 'Ocaña', municipioCodigo: '54498', departamentoId: 18 },
  { municipioNombre: 'Villa del Rosario', municipioCodigo: '54874', departamentoId: 18 },
  { municipioNombre: 'Los Patios', municipioCodigo: '54405', departamentoId: 18 },
  { municipioNombre: 'Pamplona', municipioCodigo: '54518', departamentoId: 18 },
  { municipioNombre: 'Tibú', municipioCodigo: '54810', departamentoId: 18 },
  { municipioNombre: 'El Zulia', municipioCodigo: '54261', departamentoId: 18 },
  { municipioNombre: 'Cúcutilla', municipioCodigo: '54206', departamentoId: 18 },
  { municipioNombre: 'Puerto Santander', municipioCodigo: '54553', departamentoId: 18 },
  { municipioNombre: 'Sardinata', municipioCodigo: '54670', departamentoId: 18 },
  { municipioNombre: 'Convención', municipioCodigo: '54172', departamentoId: 18 },
  { municipioNombre: 'Teorama', municipioCodigo: '54800', departamentoId: 18 },
  { municipioNombre: 'Hacarí', municipioCodigo: '54344', departamentoId: 18 },
  { municipioNombre: 'El Tarra', municipioCodigo: '54250', departamentoId: 18 },
  { municipioNombre: 'Abrego', municipioCodigo: '54003', departamentoId: 18 },
  { municipioNombre: 'La Esperanza', municipioCodigo: '54385', departamentoId: 18 },
  { municipioNombre: 'Cachirá', municipioCodigo: '54128', departamentoId: 18 },
  { municipioNombre: 'Gramalote', municipioCodigo: '54313', departamentoId: 18 },
  { municipioNombre: 'La Playa', municipioCodigo: '54398', departamentoId: 18 },
  { municipioNombre: 'Salazar', municipioCodigo: '54660', departamentoId: 18 },
  { municipioNombre: 'Santiago', municipioCodigo: '54673', departamentoId: 18 },
  { municipioNombre: 'Arboledas', municipioCodigo: '54051', departamentoId: 18 },
  { municipioNombre: 'Bochalema', municipioCodigo: '54099', departamentoId: 18 },
  { municipioNombre: 'Bucarasica', municipioCodigo: '54109', departamentoId: 18 },
  { municipioNombre: 'Chinácota', municipioCodigo: '54174', departamentoId: 18 },
  { municipioNombre: 'Chitagá', municipioCodigo: '54174', departamentoId: 18 },
  { municipioNombre: 'Durania', municipioCodigo: '54239', departamentoId: 18 },
  { municipioNombre: 'Herrán', municipioCodigo: '54347', departamentoId: 18 },
  { municipioNombre: 'Labateca', municipioCodigo: '54377', departamentoId: 18 },
  { municipioNombre: 'Mutiscua', municipioCodigo: '54480', departamentoId: 18 },
  { municipioNombre: 'Pamplonita', municipioCodigo: '54520', departamentoId: 18 },
  { municipioNombre: 'Ragonvalia', municipioCodigo: '54599', departamentoId: 18 },
  { municipioNombre: 'Silos', municipioCodigo: '54743', departamentoId: 18 },
  { municipioNombre: 'Toledo', municipioCodigo: '54820', departamentoId: 18 },
  { municipioNombre: 'Villa Caro', municipioCodigo: '54871', departamentoId: 18 },
  
  // SANTANDER (21)
  { municipioNombre: 'Bucaramanga', municipioCodigo: '68001', departamentoId: 21 },
  { municipioNombre: 'Floridablanca', municipioCodigo: '68276', departamentoId: 21 },
  { municipioNombre: 'Girón', municipioCodigo: '68307', departamentoId: 21 },
  { municipioNombre: 'Piedecuesta', municipioCodigo: '68547', departamentoId: 21 },
  { municipioNombre: 'Barrancabermeja', municipioCodigo: '68081', departamentoId: 21 },
  { municipioNombre: 'San Gil', municipioCodigo: '68679', departamentoId: 21 },
  { municipioNombre: 'Socorro', municipioCodigo: '68770', departamentoId: 21 },
  { municipioNombre: 'Málaga', municipioCodigo: '68444', departamentoId: 21 },
  { municipioNombre: 'Barbosa', municipioCodigo: '68077', departamentoId: 21 },
  { municipioNombre: 'Vélez', municipioCodigo: '68855', departamentoId: 21 },
  { municipioNombre: 'Lebrija', municipioCodigo: '68406', departamentoId: 21 },
  { municipioNombre: 'Sabana de Torres', municipioCodigo: '68655', departamentoId: 21 },
  { municipioNombre: 'Rionegro', municipioCodigo: '68615', departamentoId: 21 },
  { municipioNombre: 'Zapatoca', municipioCodigo: '68895', departamentoId: 21 },
  { municipioNombre: 'Puerto Wilches', municipioCodigo: '68575', departamentoId: 21 },
  { municipioNombre: 'Simacota', municipioCodigo: '68755', departamentoId: 21 },
  { municipioNombre: 'Aguada', municipioCodigo: '68013', departamentoId: 21 },
  { municipioNombre: 'Albania', municipioCodigo: '68020', departamentoId: 21 },
  { municipioNombre: 'Aratoca', municipioCodigo: '68051', departamentoId: 21 },
  { municipioNombre: 'Barichara', municipioCodigo: '68079', departamentoId: 21 },
  { municipioNombre: 'Betulia', municipioCodigo: '68092', departamentoId: 21 },
  { municipioNombre: 'Bolívar', municipioCodigo: '68101', departamentoId: 21 },
  { municipioNombre: 'Cabrera', municipioCodigo: '68121', departamentoId: 21 },
  { municipioNombre: 'California', municipioCodigo: '68132', departamentoId: 21 },
  { municipioNombre: 'Capitanejo', municipioCodigo: '68147', departamentoId: 21 },
  { municipioNombre: 'Carcasí', municipioCodigo: '68152', departamentoId: 21 },
  { municipioNombre: 'Cepitá', municipioCodigo: '68160', departamentoId: 21 },
  { municipioNombre: 'Charalá', municipioCodigo: '68169', departamentoId: 21 },
  { municipioNombre: 'Charta', municipioCodigo: '68176', departamentoId: 21 },
  { municipioNombre: 'Chima', municipioCodigo: '68179', departamentoId: 21 },
  { municipioNombre: 'Chipatá', municipioCodigo: '68190', departamentoId: 21 },
  { municipioNombre: 'Cimitarra', municipioCodigo: '68190', departamentoId: 21 },
  { municipioNombre: 'Concepción', municipioCodigo: '68207', departamentoId: 21 },
  { municipioNombre: 'Confines', municipioCodigo: '68209', departamentoId: 21 },
  { municipioNombre: 'Contratación', municipioCodigo: '68211', departamentoId: 21 },
  { municipioNombre: 'Coromoro', municipioCodigo: '68217', departamentoId: 21 },
  { municipioNombre: 'Curití', municipioCodigo: '68229', departamentoId: 21 },
  { municipioNombre: 'El Carmen de Chucurí', municipioCodigo: '68235', departamentoId: 21 },
  { municipioNombre: 'El Guacamayo', municipioCodigo: '68245', departamentoId: 21 },
  { municipioNombre: 'El Peñón', municipioCodigo: '68250', departamentoId: 21 },
  { municipioNombre: 'El Playón', municipioCodigo: '68255', departamentoId: 21 },
  { municipioNombre: 'Encino', municipioCodigo: '68264', departamentoId: 21 },
  { municipioNombre: 'Enciso', municipioCodigo: '68266', departamentoId: 21 },
  { municipioNombre: 'Galán', municipioCodigo: '68296', departamentoId: 21 },
  { municipioNombre: 'Gámbita', municipioCodigo: '68298', departamentoId: 21 },
  { municipioNombre: 'Guaca', municipioCodigo: '68318', departamentoId: 21 },
  { municipioNombre: 'Guadalupe', municipioCodigo: '68320', departamentoId: 21 },
  { municipioNombre: 'Guapotá', municipioCodigo: '68322', departamentoId: 21 },
  { municipioNombre: 'Guavatá', municipioCodigo: '68324', departamentoId: 21 },
  { municipioNombre: 'Güepsa', municipioCodigo: '68327', departamentoId: 21 },
  { municipioNombre: 'Hato', municipioCodigo: '68344', departamentoId: 21 },
  { municipioNombre: 'Jesús María', municipioCodigo: '68368', departamentoId: 21 },
  { municipioNombre: 'Jordán', municipioCodigo: '68370', departamentoId: 21 },
  { municipioNombre: 'La Belleza', municipioCodigo: '68377', departamentoId: 21 },
  { municipioNombre: 'Landázuri', municipioCodigo: '68385', departamentoId: 21 },
  { municipioNombre: 'La Paz', municipioCodigo: '68397', departamentoId: 21 },
  { municipioNombre: 'Lebríja', municipioCodigo: '68406', departamentoId: 21 },
  { municipioNombre: 'Los Santos', municipioCodigo: '68418', departamentoId: 21 },
  { municipioNombre: 'Macaravita', municipioCodigo: '68425', departamentoId: 21 },
  { municipioNombre: 'Matanza', municipioCodigo: '68444', departamentoId: 21 },
  { municipioNombre: 'Mogotes', municipioCodigo: '68464', departamentoId: 21 },
  { municipioNombre: 'Molagavita', municipioCodigo: '68468', departamentoId: 21 },
  { municipioNombre: 'Ocamonte', municipioCodigo: '68498', departamentoId: 21 },
  { municipioNombre: 'Oiba', municipioCodigo: '68500', departamentoId: 21 },
  { municipioNombre: 'Onzaga', municipioCodigo: '68502', departamentoId: 21 },
  { municipioNombre: 'Palmar', municipioCodigo: '68522', departamentoId: 21 },
  { municipioNombre: 'Palmas del Socorro', municipioCodigo: '68524', departamentoId: 21 },
  { municipioNombre: 'Páramo', municipioCodigo: '68533', departamentoId: 21 },
  { municipioNombre: 'Pinchote', municipioCodigo: '68549', departamentoId: 21 },
  { municipioNombre: 'Puente Nacional', municipioCodigo: '68572', departamentoId: 21 },
  { municipioNombre: 'Páramo', municipioCodigo: '68533', departamentoId: 21 },
  { municipioNombre: 'San Andrés', municipioCodigo: '68669', departamentoId: 21 },
  { municipioNombre: 'San Benito', municipioCodigo: '68673', departamentoId: 21 },
  { municipioNombre: 'San Joaquín', municipioCodigo: '68682', departamentoId: 21 },
  { municipioNombre: 'San José de Miranda', municipioCodigo: '68684', departamentoId: 21 },
  { municipioNombre: 'San Miguel', municipioCodigo: '68686', departamentoId: 21 },
  { municipioNombre: 'San Vicente de Chucurí', municipioCodigo: '68689', departamentoId: 21 },
  { municipioNombre: 'Santa Bárbara', municipioCodigo: '68705', departamentoId: 21 },
  { municipioNombre: 'Santa Helena del Opón', municipioCodigo: '68720', departamentoId: 21 },
  { municipioNombre: 'Suaita', municipioCodigo: '68773', departamentoId: 21 },
  { municipioNombre: 'Sucre', municipioCodigo: '68780', departamentoId: 21 },
  { municipioNombre: 'Suratá', municipioCodigo: '68820', departamentoId: 21 },
  { municipioNombre: 'Tona', municipioCodigo: '68820', departamentoId: 21 },
  { municipioNombre: 'Valle de San José', municipioCodigo: '68861', departamentoId: 21 },
  { municipioNombre: 'Vetas', municipioCodigo: '68867', departamentoId: 21 },
  { municipioNombre: 'Villanueva', municipioCodigo: '68872', departamentoId: 21 },
  { municipioNombre: 'Zapatoca', municipioCodigo: '68895', departamentoId: 21 },
];

async function seedMunicipios() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
    });

    console.log('✅ Conexión establecida');
    console.log('📊 Poblando municipios...');

    let insertados = 0;
    let yaExistentes = 0;

    for (const mun of municipiosData) {
      try {
        // Verificar si ya existe
        const [rows] = await connection.execute(
          'SELECT municipioId FROM municipios WHERE municipioCodigo = ?',
          [mun.municipioCodigo]
        );

        if (rows.length === 0) {
          // Insertar
          await connection.execute(
            `INSERT INTO municipios (municipioNombre, municipioCodigo, departamentoId, municipioEstado) 
             VALUES (?, ?, ?, 1)`,
            [mun.municipioNombre, mun.municipioCodigo, mun.departamentoId]
          );
          insertados++;
          console.log(`  ✓ ${mun.municipioNombre} (${mun.municipioCodigo})`);
        } else {
          yaExistentes++;
        }
      } catch (error) {
        console.error(`  ✗ Error al insertar ${mun.municipioNombre}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`  - Municipios insertados: ${insertados}`);
    console.log(`  - Ya existentes: ${yaExistentes}`);
    console.log(`  - Total procesados: ${municipiosData.length}`);
    console.log('\n✅ Proceso completado');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar
seedMunicipios().catch(console.error);
