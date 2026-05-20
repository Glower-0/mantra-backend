
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
/* ==========================
   CONFIGURACIÓN IMÁGENES
========================== */

app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({

    destination: function(req, file, cb){

        cb(null, 'uploads/');
    },

    filename: function(req, file, cb){

        const uniqueName =
        Date.now() +
        path.extname(file.originalname);

        cb(null, uniqueName);
    }
});

const upload = multer({

    storage: storage,

    limits:{
        fileSize: 5 * 1024 * 1024
    },

    fileFilter:(req,file,cb)=>{

        const allowed =
        /jpg|jpeg|png|webp/;

        const ext =
        allowed.test(
            path.extname(file.originalname)
            .toLowerCase()
        );

        if(ext){
            return cb(null,true);
        }

        cb(
            new Error(
                'Solo imágenes JPG PNG WEBP'
            )
        );
    }

});

// 2. Configuración de conexión a PostgreSQL usando la variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render leerá la variable que acabas de configurar
  ssl: {
    rejectUnauthorized: false // Necesario para la conexión segura en la nube
  }
});

// Verificar conexión al arrancar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos:', err.stack);
  } else {
    console.log('✅ Conexión segura establecida con PostgreSQL en la nube (Render)');
  }
});

// 3. Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. API Login
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
      if (orgQuery.rows.length > 0) rol = 'organizador';
    }

    res.json({
      success: true,
      usuario: { id: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: rol }
    });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// 5. API Feed
app.get('/api/feed', async (req, res) => {
  const { id_usuario } = req.query;
  try {
    const queryFeed = `
      SELECT e.id_evento, e.titulo, e.fecha, e.ubicacion, c.nombre_categoria as categoria_musical
      FROM public.evento e
      JOIN public.categoria c ON e.id_categoria = c.id_categoria
      WHERE e.id_categoria IN (SELECT id_categoria FROM public.preferencia WHERE id_usuario = $1)
      ORDER BY e.fecha ASC;
    `;
    const resultado = await pool.query(queryFeed, [id_usuario]);
    res.json(resultado.rows);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Error al cargar el feed' });
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

        // verificar email existente
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

        // obtener nuevo id
        const nextId = await pool.query(
            `
            SELECT COALESCE(MAX(id_usuario),0)+1 AS id
            FROM public.usuario
            `
        );

        const idUsuario = nextId.rows[0].id;

        // guardar usuario
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
            VALUES ($1,$2,$3,$4,$5,$6)
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

        // guardar participante
        await pool.query(
            `
            INSERT INTO public.participante
            (
                id_usuario,
                intereses
            )
            VALUES ($1,$2)
            `,
            [
                idUsuario,
                intereses
            ]
        );

        res.json({
            success: true,
            message: 'Cuenta creada correctamente'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error registrando asistidor'
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

        // verificar correo
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
                error: 'Correo ya registrado'
            });
        }

        // nuevo id
        const nextId = await pool.query(
            `
            SELECT COALESCE(MAX(id_usuario),0)+1 AS id
            FROM public.usuario
            `
        );

        const idUsuario = nextId.rows[0].id;

        // guardar usuario
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
            VALUES ($1,$2,$3,$4,$5,$6)
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

        // guardar organizador
        await pool.query(
            `
            INSERT INTO public.organizador
            (
                id_usuario,
                reputacion
            )
            VALUES ($1,$2)
            `,
            [
                idUsuario,
                0.00
            ]
        );

        res.json({
            success: true,
            message: 'Organizador registrado'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: 'Error registrando organizador'
        });
    }
});
// 6. API Asistencia
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

// 7. API Métricas
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

// 8. API Crear Evento
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

// 9. API Dueño
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

// 10. Escuchar puerto
app.listen(PORT, () => {
  console.log(`🚀 Servidor de MANTRA corriendo en el puerto ${PORT}`);
});
/* ==========================
   CREAR EVENTO
========================== */

app.post(
'/api/eventos/crear',
upload.single('imagen'),
async(req,res)=>{

try{

const {
titulo,
fecha,
hora,
calle,
ciudad,
idOrganizador
}
= req.body;

const imagen_url =
req.file
? `/uploads/${req.file.filename}`
: null;

const nextId =
await pool.query(`
SELECT
COALESCE(MAX(id_evento),0)+1
AS id
FROM public.evento
`);

const idEvento =
nextId.rows[0].id;

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
VALUES
($1,$2,$3,$4,$5,$6,$7,$8)
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

res.json({
success:true,
message:
'Evento publicado'
});

}catch(error){

console.error(error);

res.status(500).json({
error:
'Error creando evento'
});

}

});
