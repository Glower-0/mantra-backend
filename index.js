const express = require('express');
const { Pool } = require('pg');
const path = require('path');
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
   CONEXIÓN POSTGRES
========================== */

const pool = new Pool({
    user: 'prueba_user',
    host: 'dpg-cv0p9f0gph6c73eqg8ug-a.oregon-postgres.render.com',
    database: 'prueba',
    password: 'A6O4L906bOn9BInyVcoT6Sg2D7hK1g3C',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.query('SELECT NOW()', (err) => {
    if (err) {
        console.error('❌ Error DB:', err.stack);
    } else {
        console.log('✅ PostgreSQL conectado');
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

            const organizador = await pool.query(
                `
                SELECT id_usuario
                FROM public.organizador
                WHERE id_usuario = $1
                `,
                [usuario.id_usuario]
            );

            if (organizador.rows.length > 0) {
                rol = 'organizador';
            }
        }

        res.json({
            success: true,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                email: usuario.email,
                rol
            }
        });

    } catch (error) {
        console.error(error);
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
                error: 'Ese correo ya está registrado.'
            });
        }

        const nextId = await pool.query(
            `
            SELECT COALESCE(MAX(id_usuario),0)+1 AS id
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
            message: 'Asistidor registrado correctamente.'
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
            SELECT COALESCE(MAX(id_usuario),0)+1 AS id
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

        await pool.query(
            `
            INSERT INTO public.organizador
            (
                id_usuario,
                reputacion
            )
            VALUES ($1,0)
            `,
            [idUsuario]
        );

        res.json({
            success: true,
            message: 'Organizador registrado correctamente.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error registrando organizador.'
        });
    }
});

/* ==========================
   FEED PERSONALIZADO
========================== */

app.get('/api/feed', async (req, res) => {

    const { id_usuario } = req.query;

    try {

        const query = `
        SELECT DISTINCT
            e.id_evento,
            e.titulo,
            e.fecha,
            e.hora,
            e.calle,
            e.ciudad,
            c.nombre_cat AS categoria_musical
        FROM public.evento e
        INNER JOIN public.evento_categoria ec
            ON e.id_evento = ec.id_evento
        INNER JOIN public.categoria c
            ON ec.id_categoria = c.id_categoria
        INNER JOIN public.preferencia p
            ON p.id_categoria = c.id_categoria
        WHERE p.id_participante = $1
        ORDER BY e.fecha ASC
        `;

        const resultado = await pool.query(
            query,
            [id_usuario]
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error cargando feed.'
        });
    }
});

/* ==========================
   CONFIRMAR ASISTENCIA
========================== */

app.post('/api/asistencia', async (req, res) => {

    const {
        id_usuario,
        id_evento
    } = req.body;

    try {

        await pool.query(
            `
            INSERT INTO public.asistencia
            (
                id_participante,
                id_evento
            )
            VALUES ($1,$2)
            ON CONFLICT DO NOTHING
            `,
            [
                id_usuario,
                id_evento
            ]
        );

        res.json({
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error registrando asistencia.'
        });
    }
});

/* ==========================
   CREAR EVENTO
========================== */

app.post('/api/evento', async (req, res) => {

    const {
        titulo,
        fecha,
        hora,
        calle,
        ciudad,
        id_categoria,
        id_organizador
    } = req.body;

    try {

        const nextId = await pool.query(
            `
            SELECT COALESCE(MAX(id_evento),0)+1 AS id
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
                id_organizador
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7)
            `,
            [
                idEvento,
                titulo,
                fecha,
                hora,
                calle,
                ciudad,
                id_organizador
            ]
        );

        await pool.query(
            `
            INSERT INTO public.evento_categoria
            (
                id_evento,
                id_categoria
            )
            VALUES ($1,$2)
            `,
            [
                idEvento,
                id_categoria
            ]
        );

        res.json({
            success: true,
            id_evento: idEvento
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error creando evento.'
        });
    }
});

/* ==========================
   MÉTRICAS ORGANIZADOR
========================== */

app.get('/api/metricas', async (req, res) => {

    const { id_organizador } = req.query;

    try {

        const query = `
        SELECT
            e.titulo,
            e.ciudad,
            COUNT(a.id_participante) AS asistentes,
            COALESCE(AVG(r.calificacion),0)
                AS promedio_calificacion
        FROM public.evento e
        LEFT JOIN public.asistencia a
            ON e.id_evento = a.id_evento
        LEFT JOIN public.resena r
            ON e.id_evento = r.id_evento
        WHERE e.id_organizador = $1
        GROUP BY e.id_evento
        `;

        const resultado = await pool.query(
            query,
            [id_organizador]
        );

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error obteniendo métricas.'
        });
    }
});

/* ==========================
   OWNER
========================== */

app.get('/api/owner/usuarios', async (req, res) => {

    try {

        const usuarios = await pool.query(`
        SELECT
            u.id_usuario,
            u.nombre,
            u.email,
            CASE
                WHEN o.id_usuario
                IS NOT NULL
                THEN TRUE
                ELSE FALSE
            END AS es_organizador
        FROM public.usuario u
        LEFT JOIN public.organizador o
        ON u.id_usuario = o.id_usuario
        ORDER BY u.id_usuario ASC
        `);

        res.json(usuarios.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error owner dashboard.'
        });
    }
});

/* ==========================
   SERVER
========================== */

app.listen(PORT, () => {
    console.log(
        `🚀 MANTRA corriendo en puerto ${PORT}`
    );
});
