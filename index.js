const multer = require('multer');
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ==========================
   MIDDLEWARES
========================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

/* ==========================
   IMÁGENES / UPLOADS
========================== */

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    const allowed = /jpg|jpeg|png|webp/;
    const ext = allowed.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (ext) {
      return cb(null, true);
    }

    cb(new Error('Solo se permiten imágenes JPG, JPEG, PNG o WEBP'));
  }
});

/* ==========================
   CONEXIÓN POSTGRESQL
========================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conexión segura establecida con PostgreSQL en Render');
  }
});

/* ==========================
   HOME
========================== */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ==========================
   LOGIN
========================== */

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userQuery = await pool.query(
      `
      SELECT
        id_usuario,
        nombre,
        email
      FROM public.usuario
      WHERE email = $1
      AND password = $2
      `,
      [email, password]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        error: 'Correo o contraseña incorrectos.'
      });
    }

    const usuario = userQuery.rows[0];

    let rol = 'asistidor';

    if (usuario.email === 'owner@mantra.com') {
      rol = 'owner';
    } else {
      const orgQuery = await pool.query(
        `
        SELECT id_usuario
        FROM public.organizador
        WHERE id_usuario = $1
        `,
        [usuario.id_usuario]
      );

      if (orgQuery.rows.length > 0) {
        rol = 'organizador';
      }
    }

    res.json({
      success: true,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: rol
      }
    });

  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: 'Error interno del servidor.'
    });
  }
});

/* ==========================
   REGISTRO ASISTIDOR
========================== */

app.post('/api/register/asistidor', async (req, res) => {
  const {
    nombre,
    email,
    password,
    edad,
    biografia,
    intereses
  } = req.body;

  try {
    const existe = await pool.query(
      `
      SELECT email
      FROM public.usuario
      WHERE email = $1
      `,
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        error: 'Este correo ya está registrado.'
      });
    }

    const nextId = await pool.query(
      `
      SELECT COALESCE(MAX(id_usuario), 0) + 1 AS id
      FROM public.usuario
      `
    );

    const idUsuario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.usuario
      (
        id_usuario,
        nombre,
        email,
        password,
        edad,
        biografia
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        idUsuario,
        nombre,
        email,
        password,
        edad,
        biografia
      ]
    );

    await pool.query(
      `
      INSERT INTO public.participante
      (
        id_usuario,
        intereses
      )
      VALUES ($1, $2)
      `,
      [
        idUsuario,
        intereses
      ]
    );

    res.json({
      success: true,
      message: 'Cuenta de asistidor creada correctamente.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error registrando asistidor.'
    });
  }
});

/* ==========================
   REGISTRO ORGANIZADOR
========================== */

app.post('/api/register/organizador', async (req, res) => {
  const {
    nombre,
    email,
    password,
    edad,
    biografia
  } = req.body;

  try {
    const existe = await pool.query(
      `
      SELECT email
      FROM public.usuario
      WHERE email = $1
      `,
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        error: 'Correo ya registrado.'
      });
    }

    const nextId = await pool.query(
      `
      SELECT COALESCE(MAX(id_usuario), 0) + 1 AS id
      FROM public.usuario
      `
    );

    const idUsuario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.usuario
      (
        id_usuario,
        nombre,
        email,
        password,
        edad,
        biografia
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        idUsuario,
        nombre,
        email,
        password,
        edad,
        biografia
      ]
    );

    await pool.query(
      `
      INSERT INTO public.organizador
      (
        id_usuario,
        reputacion
      )
      VALUES ($1, $2)
      `,
      [
        idUsuario,
        0.00
      ]
    );

    res.json({
      success: true,
      message: 'Cuenta de organizador creada correctamente.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error registrando organizador.'
    });
  }
});

/* ==========================
   FEED ASISTIDOR
========================== */

app.get('/api/feed', async (req, res) => {

  try {

    const eventos = await pool.query(
      `
      SELECT
        e.id_evento,
        e.titulo,
        e.fecha,
        e.hora,
        e.calle,
        e.ciudad,
        e.imagen_url,
        c.nombre_cat
      FROM public.evento e

      LEFT JOIN public.evento_categoria ec
      ON e.id_evento = ec.id_evento

      LEFT JOIN public.categoria c
      ON ec.id_categoria = c.id_categoria

      ORDER BY e.fecha ASC
      `
    );

    res.json(eventos.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: 'Error cargando eventos'
    });

  }

});
/* ==========================
   ASISTENCIA
========================== */

app.post('/api/asistencia', async (req, res) => {
  const { id_usuario, id_evento } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO public.asistencia
      (
        id_participante,
        id_evento
      )
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [
        id_usuario,
        id_evento
      ]
    );

    res.json({
      success: true,
      message: 'Asistencia confirmada.'
    });

  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: 'Error al procesar asistencia.'
    });
  }
});

/* ==========================
   CREAR EVENTO CON IMAGEN
========================== */

app.post('/api/eventos/crear', upload.single('imagen'), async (req, res) => {
  const {
    titulo,
    fecha,
    hora,
    calle,
    ciudad,
    idOrganizador,
    id_categoria
  } = req.body;

  try {
    const imagen_url = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const nextId = await pool.query(
      `
      SELECT COALESCE(MAX(id_evento), 0) + 1 AS id
      FROM public.evento
      `
    );

    const idEvento = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.evento
      (
        id_evento,
        titulo,
        fecha,
        hora,
        calle,
        ciudad,
        imagen_url,
        id_organizador
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        idEvento,
        titulo,
        fecha,
        hora,
        calle,
        ciudad,
        imagen_url,
        idOrganizador
      ]
    );

    if (id_categoria) {
      await pool.query(
        `
        INSERT INTO public.evento_categoria
        (
          id_evento,
          id_categoria
        )
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [
          idEvento,
          id_categoria
        ]
      );
    }

    res.json({
      success: true,
      message: 'Evento publicado correctamente.',
      id_evento: idEvento,
      imagen_url
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error creando evento.'
    });
  }
});

/* ==========================
   MIS EVENTOS ORGANIZADOR
========================== */

app.get('/api/eventos/mis-eventos/:id', async (req, res) => {
  const idOrganizador = req.params.id;

  try {
    const eventos = await pool.query(
      `
      SELECT
        e.id_evento,
        e.titulo,
        e.fecha,
        e.hora,
        e.calle,
        e.ciudad,
        e.imagen_url,
        COUNT(a.id_participante) AS asistentes,
        COALESCE(AVG(r.calificacion), 0) AS promedio_calificacion
      FROM public.evento e
      LEFT JOIN public.asistencia a
        ON e.id_evento = a.id_evento
      LEFT JOIN public.resena r
        ON e.id_evento = r.id_evento
      WHERE e.id_organizador = $1
      GROUP BY e.id_evento
      ORDER BY e.fecha DESC
      `,
      [idOrganizador]
    );

    res.json(eventos.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error obteniendo eventos.'
    });
  }
});

/* ==========================
   ELIMINAR EVENTO
========================== */

app.delete('/api/eventos/eliminar/:id', async (req, res) => {
  const idEvento = req.params.id;

  try {
    await pool.query(
      `
      DELETE FROM public.evento
      WHERE id_evento = $1
      `,
      [idEvento]
    );

    res.json({
      success: true,
      message: 'Evento eliminado correctamente.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error eliminando evento.'
    });
  }
});

/* ==========================
   MÉTRICAS ORGANIZADOR
========================== */

app.get('/api/metricas', async (req, res) => {
  const { id_organizador } = req.query;

  try {
    const queryMetricas = `
      SELECT
        COUNT(DISTINCT e.id_evento) AS total_eventos,
        COUNT(a.id_participante) AS total_asistentes,
        COALESCE(AVG(r.calificacion), 0) AS promedio_calificacion
      FROM public.evento e
      LEFT JOIN public.asistencia a
        ON e.id_evento = a.id_evento
      LEFT JOIN public.resena r
        ON e.id_evento = r.id_evento
      WHERE e.id_organizador = $1
    `;

    const resultado = await pool.query(queryMetricas, [id_organizador]);

    res.json(resultado.rows[0]);

  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: 'Error al obtener métricas.'
    });
  }
});

/* ==========================
   OWNER / ADMIN
========================== */

app.get('/api/owner/usuarios', async (req, res) => {
  try {
    const queryDueno = `
      SELECT
        u.id_usuario,
        u.nombre,
        u.email,
        CASE
          WHEN o.id_usuario IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS es_organizador
      FROM public.usuario u
      LEFT JOIN public.organizador o
        ON u.id_usuario = o.id_usuario
      ORDER BY u.id_usuario ASC
    `;

    const resultado = await pool.query(queryDueno);

    res.json(resultado.rows);

  } catch (err) {
    console.error(err.stack);
    res.status(500).json({
      error: 'Error en la consola del dueño.'
    });
  }
});

/* ==========================
   SERVER
========================== */

app.listen(PORT, () => {
  console.log(`🚀 Servidor de MANTRA corriendo en el puerto ${PORT}`);
});
