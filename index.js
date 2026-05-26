const express = require('express');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
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
   CLOUDINARY + MULTER
========================== */

cloudinary.config({
  cloud_name: 'dkrubq7db'
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowed = /jpg|jpeg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());

    if (ext) return cb(null, true);

    cb(new Error('Solo se permiten imágenes JPG, JPEG, PNG o WEBP'));
  }
});

function subirACloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

/* ==========================
   POSTGRESQL
========================== */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Error PostgreSQL:', err.stack);
  } else {
    console.log('✅ PostgreSQL conectado en Render');
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
      SELECT id_usuario, nombre, email
      FROM public.usuario
      WHERE email = $1 AND password = $2
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

      if (orgQuery.rows.length > 0) rol = 'organizador';
    }

    res.json({
      success: true,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol
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
  const { nombre, email, password, edad, biografia, intereses } = req.body;

  try {
    const existe = await pool.query(
      `SELECT email FROM public.usuario WHERE email = $1`,
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        error: 'Este correo ya está registrado.'
      });
    }

    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_usuario), 0) + 1 AS id FROM public.usuario`
    );

    const idUsuario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.usuario
      (id_usuario, nombre, email, password, edad, biografia)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [idUsuario, nombre, email, password, edad, biografia]
    );

    await pool.query(
      `
      INSERT INTO public.participante
      (id_usuario, intereses)
      VALUES ($1, $2)
      `,
      [idUsuario, intereses]
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
  const { nombre, email, password, edad, biografia } = req.body;

  try {
    const existe = await pool.query(
      `SELECT email FROM public.usuario WHERE email = $1`,
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        error: 'Correo ya registrado.'
      });
    }

    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_usuario), 0) + 1 AS id FROM public.usuario`
    );

    const idUsuario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.usuario
      (id_usuario, nombre, email, password, edad, biografia)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [idUsuario, nombre, email, password, edad, biografia]
    );

    await pool.query(
      `
      INSERT INTO public.organizador
      (id_usuario, reputacion)
      VALUES ($1, $2)
      `,
      [idUsuario, 0.00]
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
   FEED EVENTOS
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
        e.id_organizador,
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
      error: 'Error cargando eventos.'
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
      (id_participante, id_evento)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [id_usuario, id_evento]
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
   CREAR EVENTO CON CLOUDINARY
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
      ? await subirACloudinary(req.file.buffer, 'mantra/eventos')
      : null;

    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_evento), 0) + 1 AS id FROM public.evento`
    );

    const idEvento = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.evento
      (id_evento, titulo, fecha, hora, calle, ciudad, imagen_url, id_organizador)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [idEvento, titulo, fecha, hora, calle, ciudad, imagen_url, idOrganizador]
    );

    if (id_categoria) {
      await pool.query(
        `
        INSERT INTO public.evento_categoria
        (id_evento, id_categoria)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        `,
        [idEvento, id_categoria]
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
      `DELETE FROM public.evento WHERE id_evento = $1`,
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
   RESEÑAS
========================== */

app.post('/api/resenas', async (req, res) => {
  const {
    calificacion,
    comentario,
    id_evento,
    id_participante
  } = req.body;

  try {
    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_resena), 0) + 1 AS id FROM public.resena`
    );

    const idResena = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.resena
      (id_resena, calificacion, comentario, fecha_publicacion, id_evento, id_participante)
      VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
      `,
      [idResena, calificacion, comentario, id_evento, id_participante]
    );

    res.json({
      success: true,
      message: 'Reseña publicada.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error creando reseña.'
    });
  }
});

app.get('/api/resenas/:idEvento', async (req, res) => {
  const idEvento = req.params.idEvento;

  try {
    const resenas = await pool.query(
      `
      SELECT
        r.calificacion,
        r.comentario,
        r.fecha_publicacion,
        u.nombre
      FROM public.resena r
      JOIN public.usuario u
        ON r.id_participante = u.id_usuario
      WHERE r.id_evento = $1
      ORDER BY r.fecha_publicacion DESC
      `,
      [idEvento]
    );

    res.json(resenas.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error obteniendo reseñas.'
    });
  }
});

/* ==========================
   PERFIL
========================== */

app.get('/api/perfil/:id', async (req, res) => {
  const idUsuario = req.params.id;

  try {
    const perfil = await pool.query(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.email,
        u.biografia,
        u.foto_perfil,
        p.intereses,
        COUNT(DISTINCT a.id_evento) AS eventos_asistidos,
        COUNT(DISTINCT r.id_resena) AS total_resenas
      FROM public.usuario u
      LEFT JOIN public.participante p
        ON u.id_usuario = p.id_usuario
      LEFT JOIN public.asistencia a
        ON u.id_usuario = a.id_participante
      LEFT JOIN public.resena r
        ON u.id_usuario = r.id_participante
      WHERE u.id_usuario = $1
      GROUP BY u.id_usuario, p.intereses
      `,
      [idUsuario]
    );

    res.json(perfil.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error obteniendo perfil.'
    });
  }
});

app.post('/api/perfil/foto', upload.single('foto'), async (req, res) => {
  const { id_usuario } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se subió imagen.'
      });
    }

    const foto = await subirACloudinary(
      req.file.buffer,
      'mantra/perfiles'
    );

    await pool.query(
      `
      UPDATE public.usuario
      SET foto_perfil = $1
      WHERE id_usuario = $2
      `,
      [foto, id_usuario]
    );

    res.json({
      success: true,
      foto
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error subiendo foto.'
    });
  }
});

app.put('/api/perfil/:id', async (req, res) => {
  const idUsuario = req.params.id;
  const { biografia, intereses } = req.body;

  try {
    await pool.query(
      `
      UPDATE public.usuario
      SET biografia = $1
      WHERE id_usuario = $2
      `,
      [biografia, idUsuario]
    );

    await pool.query(
      `
      UPDATE public.participante
      SET intereses = $1
      WHERE id_usuario = $2
      `,
      [intereses, idUsuario]
    );

    res.json({
      success: true,
      message: 'Perfil actualizado.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error actualizando perfil.'
    });
  }
});

app.get('/api/perfil/:id/actividad', async (req, res) => {
  const idUsuario = req.params.id;

  try {
    const eventos = await pool.query(
      `
      SELECT
        e.titulo,
        e.fecha,
        e.ciudad,
        e.imagen_url
      FROM public.asistencia a
      JOIN public.evento e
        ON a.id_evento = e.id_evento
      WHERE a.id_participante = $1
      ORDER BY e.fecha DESC
      LIMIT 6
      `,
      [idUsuario]
    );

    const resenas = await pool.query(
      `
      SELECT
        r.calificacion,
        r.comentario,
        r.fecha_publicacion,
        e.titulo
      FROM public.resena r
      JOIN public.evento e
        ON r.id_evento = e.id_evento
      WHERE r.id_participante = $1
      ORDER BY r.fecha_publicacion DESC
      LIMIT 6
      `,
      [idUsuario]
    );

    res.json({
      eventos: eventos.rows,
      resenas: resenas.rows
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error cargando actividad.'
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
   SEGUIR ORGANIZADOR
========================== */

app.post('/api/seguir-organizador', async (req, res) => {
  const { id_participante, id_organizador } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO public.seguidor_organizador
      (id_participante, id_organizador)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [id_participante, id_organizador]
    );

    res.json({ success: true, message: 'Organizador seguido.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error siguiendo organizador.' });
  }
});

app.delete('/api/seguir-organizador', async (req, res) => {
  const { id_participante, id_organizador } = req.body;

  try {
    await pool.query(
      `
      DELETE FROM public.seguidor_organizador
      WHERE id_participante = $1
      AND id_organizador = $2
      `,
      [id_participante, id_organizador]
    );

    res.json({ success: true, message: 'Dejaste de seguir al organizador.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error dejando de seguir.' });
  }
});

/* ==========================
   COMENTARIOS EVENTO
========================== */

app.post('/api/comentarios', async (req, res) => {
  const { comentario, id_evento, id_participante } = req.body;

  try {
    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_comentario), 0) + 1 AS id FROM public.comentario_evento`
    );

    const idComentario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.comentario_evento
      (id_comentario, comentario, fecha_publicacion, id_evento, id_participante)
      VALUES ($1, $2, CURRENT_DATE, $3, $4)
      `,
      [idComentario, comentario, id_evento, id_participante]
    );

    res.json({ success: true, message: 'Comentario publicado.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error publicando comentario.' });
  }
});

app.get('/api/comentarios/:idEvento', async (req, res) => {
  const idEvento = req.params.idEvento;

  try {
    const comentarios = await pool.query(
      `
      SELECT
        c.id_comentario,
        c.comentario,
        c.fecha_publicacion,
        u.nombre,
        u.foto_perfil
      FROM public.comentario_evento c
      JOIN public.usuario u
        ON c.id_participante = u.id_usuario
      WHERE c.id_evento = $1
      ORDER BY c.fecha_publicacion DESC, c.id_comentario DESC
      `,
      [idEvento]
    );

    res.json(comentarios.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error obteniendo comentarios.' });
  }
});

/* ==========================
   COMUNIDAD
========================== */

app.post('/api/comunidad/publicar', async (req, res) => {
  const { contenido, id_usuario, id_evento } = req.body;

  try {
    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_publicacion), 0) + 1 AS id FROM public.publicacion_comunidad`
    );

    const idPublicacion = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.publicacion_comunidad
      (id_publicacion, contenido, fecha_publicacion, id_usuario, id_evento)
      VALUES ($1, $2, CURRENT_DATE, $3, $4)
      `,
      [idPublicacion, contenido, id_usuario, id_evento || null]
    );

    res.json({
      success: true,
      message: 'Publicación creada.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error creando publicación.'
    });
  }
});

app.get('/api/comunidad/feed', async (req, res) => {
  try {
    const publicaciones = await pool.query(
      `
      SELECT
        p.id_publicacion,
        p.contenido,
        p.fecha_publicacion,
        p.id_usuario,
        u.nombre,
        u.foto_perfil,
        e.titulo AS evento_titulo,
        e.imagen_url AS evento_imagen,
        CASE
          WHEN o.id_usuario IS NOT NULL THEN 'organizador'
          ELSE 'asistidor'
        END AS rol
      FROM public.publicacion_comunidad p
      JOIN public.usuario u
        ON p.id_usuario = u.id_usuario
      LEFT JOIN public.organizador o
        ON u.id_usuario = o.id_usuario
      LEFT JOIN public.evento e
        ON p.id_evento = e.id_evento
      ORDER BY p.id_publicacion DESC
      `
    );

    res.json(publicaciones.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error cargando comunidad.'
    });
  }
});

app.post('/api/comunidad/comentar', async (req, res) => {
  const { comentario, id_publicacion, id_usuario } = req.body;

  try {
    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_comentario), 0) + 1 AS id FROM public.comentario_publicacion`
    );

    const idComentario = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.comentario_publicacion
      (id_comentario, comentario, fecha_publicacion, id_publicacion, id_usuario)
      VALUES ($1, $2, CURRENT_DATE, $3, $4)
      `,
      [idComentario, comentario, id_publicacion, id_usuario]
    );

    res.json({
      success: true,
      message: 'Comentario publicado.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error comentando publicación.'
    });
  }
});

app.get('/api/comunidad/comentarios/:idPublicacion', async (req, res) => {
  const idPublicacion = req.params.idPublicacion;

  try {
    const comentarios = await pool.query(
      `
      SELECT
        c.id_comentario,
        c.comentario,
        c.fecha_publicacion,
        u.nombre,
        u.foto_perfil
      FROM public.comentario_publicacion c
      JOIN public.usuario u
        ON c.id_usuario = u.id_usuario
      WHERE c.id_publicacion = $1
      ORDER BY c.id_comentario DESC
      `,
      [idPublicacion]
    );

    res.json(comentarios.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error cargando comentarios.'
    });
  }
});
/* ==========================
   PUBLICACIÓN CON IMAGEN
========================== */

app.post('/api/comunidad/publicar-imagen', upload.single('imagen'), async (req, res) => {
  const { contenido, id_usuario, id_evento } = req.body;

  try {
    const imagen_url = req.file
      ? await subirACloudinary(req.file.buffer, 'mantra/comunidad')
      : null;

    const nextId = await pool.query(
      `SELECT COALESCE(MAX(id_publicacion), 0) + 1 AS id FROM public.publicacion_comunidad`
    );

    const idPublicacion = nextId.rows[0].id;

    await pool.query(
      `
      INSERT INTO public.publicacion_comunidad
      (id_publicacion, contenido, fecha_publicacion, id_usuario, id_evento, imagen_url)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
      `,
      [idPublicacion, contenido, id_usuario, id_evento || null, imagen_url]
    );

    res.json({ success: true, message: 'Publicación creada.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando publicación.' });
  }
});

/* ==========================
   LIKES
========================== */

app.post('/api/comunidad/like', async (req, res) => {
  const { id_publicacion, id_usuario } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO public.like_publicacion
      (id_publicacion, id_usuario)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [id_publicacion, id_usuario]
    );

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error dando like.' });
  }
});

app.delete('/api/comunidad/like', async (req, res) => {
  const { id_publicacion, id_usuario } = req.body;

  try {
    await pool.query(
      `
      DELETE FROM public.like_publicacion
      WHERE id_publicacion = $1
      AND id_usuario = $2
      `,
      [id_publicacion, id_usuario]
    );

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error quitando like.' });
  }
});

/* ==========================
   NOTIFICACIONES
========================== */

app.get('/api/notificaciones/:idUsuario', async (req, res) => {
  const idUsuario = req.params.idUsuario;

  try {
    const resultado = await pool.query(
      `
      SELECT *
      FROM public.notificacion
      WHERE id_usuario_destino = $1
      ORDER BY id_notificacion DESC
      `,
      [idUsuario]
    );

    res.json(resultado.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error cargando notificaciones.' });
  }
});

/* ==========================
   SERVER
========================== */

app.listen(PORT, () => {
  console.log(`🚀 Servidor de MANTRA corriendo en el puerto ${PORT}`);
});
