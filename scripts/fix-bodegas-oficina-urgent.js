/**
 * Script urgente específico para eliminar la constraint de oficinaId en bodegas
 * Ejecutar: node scripts/fix-bodegas-oficina-urgent.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixBodegasOficina() {
  let connection;

  try {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'jarlepsisdev',
      multipleStatements: true,
    };

    console.log('🔌 Conectando a la base de datos...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}\n`);

    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // 1. Eliminar la constraint específica que está causando el error
    console.log('📝 Eliminando constraint FK_7aa38510f9d318ddd2dff2f0de2...');
    try {
      await connection.query(`
        ALTER TABLE \`bodegas\` DROP FOREIGN KEY \`FK_7aa38510f9d318ddd2dff2f0de2\`
      `);
      console.log('✅ Constraint FK_7aa38510f9d318ddd2dff2f0de2 eliminada\n');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('⚠️  La constraint ya no existe o tiene otro nombre\n');
      } else {
        console.warn('⚠️  Error al eliminar constraint específica:', error.message);
      }
      
      // Buscar todas las constraints de oficinaId
      console.log('📝 Buscando todas las constraints de oficinaId...');
      try {
        const [fkConstraints] = await connection.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'bodegas'
            AND COLUMN_NAME = 'oficinaId'
            AND CONSTRAINT_NAME IS NOT NULL
        `);

        if (fkConstraints && fkConstraints.length > 0) {
          for (const fk of fkConstraints) {
            console.log(`📝 Eliminando constraint ${fk.CONSTRAINT_NAME}...`);
            await connection.query(`
              ALTER TABLE \`bodegas\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
            `);
            console.log(`✅ Constraint ${fk.CONSTRAINT_NAME} eliminada\n`);
          }
        } else {
          console.log('✅ No hay constraints de oficinaId para eliminar\n');
        }
      } catch (error2) {
        console.warn('⚠️  Error al buscar constraints:', error2.message);
      }
    }

    // 2. Verificar columnas
    console.log('📝 Verificando columnas en bodegas...');
    const [bodegasColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bodegas'
        AND COLUMN_NAME IN ('oficinaId', 'sedeId')
    `);

    const hasOficinaId = bodegasColumns.some(col => col.COLUMN_NAME === 'oficinaId');
    const hasSedeId = bodegasColumns.some(col => col.COLUMN_NAME === 'sedeId');

    console.log(`   oficinaId existe: ${hasOficinaId}`);
    console.log(`   sedeId existe: ${hasSedeId}\n`);

    // 3. Si existe oficinaId pero no sedeId, agregar sedeId
    // NOTA: Las oficinas ya no existen, así que no migramos datos
    if (hasOficinaId && !hasSedeId) {
      console.log('📝 Agregando columna sedeId...');
      console.log('⚠️  NOTA: Las oficinas ya no existen. Las bodegas deben tener sedeId asignado manualmente.\n');
      
      await connection.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`sedeId\` INT NULL AFTER \`oficinaId\`
      `);
      console.log('✅ Columna sedeId agregada (NULL por ahora)\n');
      console.log('⚠️  IMPORTANTE: Debes asignar sedeId a todas las bodegas antes de hacerlo NOT NULL\n');
    } else if (!hasSedeId) {
      // Si no existe oficinaId pero tampoco sedeId, agregar sedeId directamente
      console.log('📝 Agregando columna sedeId...');
      await connection.query(`
        ALTER TABLE \`bodegas\` 
        ADD COLUMN \`sedeId\` INT NOT NULL AFTER \`bodegaEstado\`
      `);
      console.log('✅ Columna sedeId agregada\n');
    }

    // 4. Verificar si hay bodegas sin sedeId antes de eliminar oficinaId
    if (hasOficinaId) {
      if (hasSedeId) {
        const [bodegasSinSede] = await connection.query(`
          SELECT COUNT(*) as count 
          FROM \`bodegas\` 
          WHERE \`sedeId\` IS NULL
        `);
        
        if (bodegasSinSede[0].count > 0) {
          console.log(`⚠️  ADVERTENCIA: Hay ${bodegasSinSede[0].count} bodega(s) sin sedeId asignado`);
          console.log('⚠️  Debes asignar sedeId a estas bodegas antes de eliminar oficinaId\n');
        }
      }
      
      console.log('📝 Eliminando columna oficinaId...');
      try {
        await connection.query(`
          ALTER TABLE \`bodegas\` DROP COLUMN \`oficinaId\`
        `);
        console.log('✅ Columna oficinaId eliminada\n');
      } catch (error) {
        console.warn('⚠️  No se pudo eliminar columna oficinaId:', error.message);
        console.warn('⚠️  Puede que haya bodegas sin sedeId. Asigna sedeId a todas las bodegas primero.\n');
      }
    }

    // 5. Asegurar foreign key de sedeId (solo si todas las bodegas tienen sedeId)
    if (hasSedeId || !hasOficinaId) {
      console.log('📝 Verificando foreign key de sedeId...');
      
      // Verificar si hay bodegas sin sedeId
      const [bodegasSinSede] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM \`bodegas\` 
        WHERE \`sedeId\` IS NULL
      `);
      
      if (bodegasSinSede[0].count > 0) {
        console.log(`⚠️  Hay ${bodegasSinSede[0].count} bodega(s) sin sedeId`);
        console.log('⚠️  No se puede agregar foreign key hasta que todas las bodegas tengan sedeId\n');
      } else {
        try {
          const [fkSedeExists] = await connection.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'bodegas'
              AND COLUMN_NAME = 'sedeId'
              AND CONSTRAINT_NAME IS NOT NULL
            LIMIT 1
          `);

          if (!fkSedeExists || fkSedeExists.length === 0) {
            console.log('📝 Agregando foreign key de sedeId...');
            await connection.query(`
              ALTER TABLE \`bodegas\` 
              ADD CONSTRAINT \`fk_bodegas_sede\` 
              FOREIGN KEY (\`sedeId\`) 
              REFERENCES \`sedes\` (\`sedeId\`) 
              ON DELETE RESTRICT 
              ON UPDATE CASCADE
            `);
            console.log('✅ Foreign key de sedeId agregada\n');
            
            // Ahora podemos hacer sedeId NOT NULL
            console.log('📝 Haciendo sedeId NOT NULL...');
            await connection.query(`
              ALTER TABLE \`bodegas\` 
              MODIFY COLUMN \`sedeId\` INT NOT NULL
            `);
            console.log('✅ sedeId ahora es NOT NULL\n');
          } else {
            console.log('✅ Foreign key de sedeId ya existe\n');
          }
        } catch (error) {
          console.warn('⚠️  No se pudo agregar FK de sedeId:', error.message);
        }
      }
    }

    console.log('✅ Proceso completado exitosamente\n');

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

fixBodegasOficina();
