const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDuplicates() {
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
    connection = await mysql.createConnection(config);
    console.log('✅ Conexión establecida\n');

    // Encontrar materiales duplicados por nombre
    console.log('🔍 Buscando materiales con nombres duplicados...\n');
    const [duplicates] = await connection.query(`
      SELECT materialNombre, COUNT(*) as count, GROUP_CONCAT(materialId ORDER BY materialId) as ids
      FROM materiales
      GROUP BY materialNombre
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (duplicates.length === 0) {
      console.log('✅ No se encontraron materiales duplicados por nombre.\n');
    } else {
      console.log(`⚠️  Se encontraron ${duplicates.length} nombres duplicados:\n`);
      
      for (const dup of duplicates) {
        const ids = dup.ids.split(',').map(id => parseInt(id));
        const keepId = ids[0]; // Mantener el primero
        const deleteIds = ids.slice(1); // Eliminar los demás
        
        console.log(`📦 Material: "${dup.materialNombre}"`);
        console.log(`   - Mantener: ID ${keepId}`);
        console.log(`   - Eliminar: IDs ${deleteIds.join(', ')}`);
        
        // Verificar si los materiales a eliminar tienen stock o relaciones
        for (const id of deleteIds) {
          const [stock] = await connection.query(`
            SELECT 
              (SELECT COUNT(*) FROM materiales_bodegas WHERE materialId = ?) as bodegas,
              (SELECT COUNT(*) FROM inventario_tecnicos WHERE materialId = ?) as tecnicos,
              (SELECT COUNT(*) FROM movimientos_inventario WHERE materialId = ?) as movimientos
          `, [id, id, id]);
          
          if (stock[0].bodegas > 0 || stock[0].tecnicos > 0 || stock[0].movimientos > 0) {
            console.log(`   ⚠️  Material ID ${id} tiene relaciones. Se renombrará en lugar de eliminar.`);
            
            // Renombrar en lugar de eliminar
            let counter = 1;
            let newName = `${dup.materialNombre} (Duplicado ${counter})`;
            let exists = true;
            
            while (exists) {
              const [check] = await connection.query(
                'SELECT COUNT(*) as count FROM materiales WHERE materialNombre = ?',
                [newName]
              );
              if (check[0].count === 0) {
                exists = false;
              } else {
                counter++;
                newName = `${dup.materialNombre} (Duplicado ${counter})`;
              }
            }
            
            await connection.query(
              'UPDATE materiales SET materialNombre = ? WHERE materialId = ?',
              [newName, id]
            );
            console.log(`   ✅ Renombrado a: "${newName}"`);
          } else {
            // Eliminar si no tiene relaciones
            await connection.query('DELETE FROM materiales WHERE materialId = ?', [id]);
            console.log(`   ✅ Eliminado ID ${id}`);
          }
        }
        console.log('');
      }
    }

    // Encontrar materiales duplicados por código
    console.log('🔍 Buscando materiales con códigos duplicados...\n');
    const [duplicateCodes] = await connection.query(`
      SELECT materialCodigo, COUNT(*) as count, GROUP_CONCAT(materialId ORDER BY materialId) as ids
      FROM materiales
      GROUP BY materialCodigo
      HAVING count > 1
      ORDER BY count DESC
    `);

    if (duplicateCodes.length === 0) {
      console.log('✅ No se encontraron materiales duplicados por código.\n');
    } else {
      console.log(`⚠️  Se encontraron ${duplicateCodes.length} códigos duplicados:\n`);
      
      for (const dup of duplicateCodes) {
        const ids = dup.ids.split(',').map(id => parseInt(id));
        const keepId = ids[0];
        const deleteIds = ids.slice(1);
        
        console.log(`📦 Código: "${dup.materialCodigo}"`);
        console.log(`   - Mantener: ID ${keepId}`);
        console.log(`   - Renombrar: IDs ${deleteIds.join(', ')}`);
        
        // Renombrar códigos duplicados
        for (const id of deleteIds) {
          let counter = 1;
          let newCode = `${dup.materialCodigo}-${counter}`;
          let exists = true;
          
          while (exists) {
            const [check] = await connection.query(
              'SELECT COUNT(*) as count FROM materiales WHERE materialCodigo = ?',
              [newCode]
            );
            if (check[0].count === 0) {
              exists = false;
            } else {
              counter++;
              newCode = `${dup.materialCodigo}-${counter}`;
            }
          }
          
          await connection.query(
            'UPDATE materiales SET materialCodigo = ? WHERE materialId = ?',
            [newCode, id]
          );
          console.log(`   ✅ ID ${id} renombrado a: "${newCode}"`);
        }
        console.log('');
      }
    }

    console.log('✅ Proceso de limpieza completado.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

fixDuplicates();

