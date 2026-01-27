/**
 * Script para agregar tipos de documento de certificados para técnicos y soldadores
 * Ejecutar: node scripts/add-certificados-tipos-documento.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function addCertificadosTiposDocumento() {
  let connection;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
    };

    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // Agregar nuevos tipos de documento
    console.log('📝 Agregando tipos de documento para certificados...\n');
    
    const nuevosTipos = [
      { 
        codigo: 'CI', 
        nombre: 'Certificado Instalador', 
        descripcion: 'Certificado de instalador para técnicos (alfanumérico)' 
      },
      { 
        codigo: 'CS', 
        nombre: 'Certificado Soldador', 
        descripcion: 'Certificado de soldador para personal especializado en soldadura (alfanumérico)' 
      },
    ];

    for (const tipo of nuevosTipos) {
      try {
        const [result] = await connection.query(`
          INSERT INTO \`tipos_documentos_identidad\` 
            (\`tipoDocumentoCodigo\`, \`tipoDocumentoNombre\`, \`tipoDocumentoDescripcion\`, \`tipoDocumentoEstado\`)
          VALUES (?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            \`tipoDocumentoNombre\` = VALUES(\`tipoDocumentoNombre\`),
            \`tipoDocumentoDescripcion\` = VALUES(\`tipoDocumentoDescripcion\`),
            \`tipoDocumentoEstado\` = 1,
            \`fechaActualizacion\` = NOW()
        `, [tipo.codigo, tipo.nombre, tipo.descripcion]);
        
        if (result.affectedRows > 0) {
          console.log(`   ✅ ${tipo.codigo} - ${tipo.nombre}`);
        }
      } catch (error) {
        console.warn(`   ❌ Error al insertar ${tipo.codigo}: ${error.message}`);
      }
    }

    // Mostrar todos los tipos de documento
    console.log('\n📋 Tipos de documento en la base de datos:');
    const [tipos] = await connection.query(`
      SELECT tipoDocumentoId, tipoDocumentoCodigo, tipoDocumentoNombre 
      FROM \`tipos_documentos_identidad\` 
      ORDER BY tipoDocumentoId
    `);
    
    for (const tipo of tipos) {
      console.log(`   ${tipo.tipoDocumentoId}. ${tipo.tipoDocumentoCodigo} - ${tipo.tipoDocumentoNombre}`);
    }

    console.log('\n✅ Proceso completado\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

addCertificadosTiposDocumento();
