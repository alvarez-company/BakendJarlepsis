const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function fixAdmin() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'jarlepsisdev';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    // Buscar el usuario
    const [users] = await connection.execute(
      'SELECT usuarioId, usuarioCorreo, usuarioContrasena, usuarioEstado FROM usuarios WHERE usuarioCorreo = ?',
      ['admin@jarlepsis.com']
    );

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const dbUser = users[0];
    console.log('✅ Usuario encontrado:');
    console.log('   ID:', dbUser.usuarioId);
    console.log('   Email:', dbUser.usuarioCorreo);
    console.log('   Estado:', dbUser.usuarioEstado);
    console.log('   Hash actual:', dbUser.usuarioContrasena ? `${dbUser.usuarioContrasena.substring(0, 30)}...` : 'VACIO');
    console.log('   Hash length:', dbUser.usuarioContrasena ? dbUser.usuarioContrasena.length : 0);

    // Generar nuevo hash
    const newHash = await bcrypt.hash('Admin123', 10);
    console.log('\n🔐 Generando nuevo hash...');
    console.log('   Nuevo hash:', `${newHash.substring(0, 30)}...`);

    // Actualizar contraseña
    const [result] = await connection.execute(
      'UPDATE usuarios SET usuarioContrasena = ? WHERE usuarioCorreo = ?',
      [newHash, 'admin@jarlepsis.com']
    );
    console.log('   Filas actualizadas:', result.affectedRows);

    // Verificar que funciona
    const [verify] = await connection.execute(
      'SELECT usuarioContrasena FROM usuarios WHERE usuarioCorreo = ?',
      ['admin@jarlepsis.com']
    );
    const isValid = await bcrypt.compare('Admin123', verify[0].usuarioContrasena);
    console.log('\n✅ Verificación:');
    console.log('   Contraseña "Admin123" válida:', isValid);

    if (!isValid) {
      console.log('❌ ERROR: El hash no funciona!');
    } else {
      console.log('✅ Todo correcto! Puedes iniciar sesión con:');
      console.log('   Email: admin@jarlepsis.com');
      console.log('   Password: Admin123');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAdmin();

