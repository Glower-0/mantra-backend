const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares para procesar datos e interactuar con el HTML
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS) desde la carpeta raíz del proyecto
app.use(express.static(path.join(__dirname)));

// 2. Configuración de conexión a PostgreSQL usando variables de entorno
// Render inyectará process.env.DATABASE_URL automáticamente en producción
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Obligatorio para que Render no bloquee el acceso por certificados SSL
  }
});

// Verificar la conexión con la base de datos al encender el servidor
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos de Render:', err.stack);
  } else {
    console.log('✅ Conexión segura establecida con PostgreSQL en la nube (Render)');
  }
});

// 3. Ruta principal: Carga la página de inicio (Login/Registro)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. API de Login: Identifica las credenciales y determina el rol del usuario
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
      const orgQuery = await pool.query(
        'SELECT id_usuario FROM public.organizador WHERE id_usuario = $1',
        [usuario.id_usuario]
      );
      if (orgQuery.rows.length > 0) {
        rol = 'organizador'; 
      }
    }

    res.json({
      success: true,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: rol
      }
    });

  } catch (err) {
    console.error('Error en la consulta de login:', err.stack);
    res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
  }
});

// 5. API para traer el feed personalizado basado en las preferencias musicales del usuario
app.get('/api/feed', async (req, res) => {
  const { id_usuario } = req.query;

  try {
    const queryFeed = `
      SELECT e.id_evento, e.titulo, e.fecha, e.ubicacion, c.nombre_categoria as categoria_musical
      FROM public.evento e
      JOIN public.categoria c ON e.id_categoria = c.id_categoria
      WHERE e.id_categoria IN (
          SELECT id_categoria FROM public.preferencia WHERE id_usuario = $1
      )
      ORDER BY e.fecha ASC;
    `;
    const resultado = await pool.query(queryFeed, [id_usuario]);
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error al cargar el feed' });
  }
});

// 6. API para registrar una nueva asistencia
app.post('/api/asistencia', async (req, res) => {
  const { id_usuario, id_evento } = req.body;
  try {
    await pool.query(
      'INSERT INTO public.asistencia (id_usuario, id_evento, estatus) VALUES ($1, $2, \'Confirmado\') ON CONFLICT DO NOTHING',
      [id_usuario, id_evento]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error al procesar asistencia' });
  }
});

// 7. API de Hugo (Métricas): Calcula el promedio de estrellas de sus eventos
app.get('/api/metricas', async (req, res) => {
  const { id_organizador } = req.query;
  try {
    const queryMetricas = `
      SELECT e.titulo, e.ubicacion, COALESCE(AVG(r.calificacion), 0) as promedio_calificacion
      FROM public.evento e
      LEFT JOIN public.resena r ON e.id_evento = r.id_evento
      WHERE e.id_organizador = $1
      GROUP BY e.id_evento, e.titulo, e.ubicacion;
    `;
    const resultado = await pool.query(queryMetricas, [id_organizador]);
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

// 8. API de Hugo (Crear Evento): Inserta una nueva fiesta en la base de datos
app.post('/api/evento', async (req, res) => {
  const { titulo, fecha, ubicacion, id_categoria, id_organizador } = req.body;
  try {
    const queryInsert = `
      INSERT INTO public.evento (titulo, fecha, ubicacion, id_categoria, id_organizador)
      VALUES ($1, $2, $3, $4, $5) RETURNING id_evento;
    `;
    const resultado = await pool.query(queryInsert, [titulo, fecha, ubicacion, id_categoria, id_organizador]);
    res.json({ success: true, id_evento: resultado.rows[0].id_evento });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error al crear el evento' });
  }
});

// 9. API del Dueño: Trae todos los usuarios registrados e identifica su nivel mediante LEFT JOIN
app.get('/api/owner/usuarios', async (req, res) => {
  try {
    const queryDueño = `
      SELECT u.id_usuario, u.nombre, u.email, 
             CASE WHEN o.id_usuario IS NOT NULL THEN TRUE ELSE FALSE END as es_organizador
      FROM public.usuario u
      LEFT JOIN public.organizador o ON u.id_usuario = o.id_usuario
      ORDER BY u.id_usuario ASC;
    `;
    const resultado = await pool.query(queryDueño);
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error en la consola del dueño' });
  }
});

// 10. Encender el servidor (Siempre al final)
app.listen(PORT, () => {
  console.log(`🚀 Servidor de MANTRA corriendo en el puerto ${PORT}`);
});
