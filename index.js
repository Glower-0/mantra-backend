const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5432;

// 1. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 2. Configuración de Base de Datos (USANDO VARIABLE DE ENTORNO)
// NOTA: Asegúrate de configurar DATABASE_URL en Render (Settings > Environment)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificación de conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a la BD:', err.stack);
  } else {
    console.log('✅ Conexión establecida con PostgreSQL');
  }
});

// 3. Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. API de Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query(
      'SELECT id_usuario, nombre, email FROM public.usuario WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    const usuario = userQuery.rows[0];
    let rol = 'asistidor'; 
    if (usuario.email === 'owner@mantra.com') {
      rol = 'owner'; 
    } else {
      const orgQuery = await pool.query('SELECT id_usuario FROM public.organizador WHERE id_usuario = $1', [usuario.id_usuario]);
      if (orgQuery.rows.length > 0) rol = 'organizador'; 
    }
    res.json({ success: true, usuario: { id: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: rol } });
  } catch (err) {
    console.error('Error:', err.stack);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ... (El resto de tus APIs: feed, asistencia, metricas, evento, owner/usuarios se mantienen igual) ...

// 10. Encender el servidor (SOLO UNO)
app.listen(PORT, () => {
  console.log(`🚀 Servidor de MANTRA corriendo en el puerto ${PORT}`);
});
