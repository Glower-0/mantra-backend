# 🎉 MANTRA - Plataforma Inteligente de Gestión de Eventos y Comunidad

## 📖 Descripción General

MANTRA es una plataforma web diseñada para conectar personas a través de eventos, intereses y comunidades digitales. El sistema permite a los usuarios descubrir actividades relevantes según sus preferencias, interactuar con otros participantes y establecer conexiones mediante herramientas sociales integradas.

La propuesta surge a partir de la necesidad de contar con una solución que centralice la organización de eventos y facilite la interacción entre asistentes y organizadores dentro de un mismo entorno digital. A diferencia de las plataformas tradicionales de eventos, MANTRA incorpora funcionalidades sociales como comunidades, publicaciones y mensajería en tiempo real, permitiendo que la experiencia del usuario continúe antes, durante y después de cada evento.

Dentro de la plataforma existen dos perfiles principales: organizadores y asistentes. Los organizadores pueden crear eventos, administrar información relacionada con sus actividades, monitorear la participación de los usuarios y gestionar su reputación mediante las reseñas recibidas. Por otro lado, los asistentes pueden explorar eventos personalizados, registrarse en actividades de interés, compartir experiencias con la comunidad y comunicarse directamente con otros usuarios.

Desde el punto de vista técnico, el proyecto fue diseñado utilizando un modelo de datos robusto basado en PostgreSQL, aplicando principios de normalización, integridad referencial y control de acceso mediante roles. El sistema garantiza la consistencia de la información mediante restricciones de dominio, validaciones de negocio y mecanismos de seguridad que protegen los datos almacenados.

MANTRA representa la integración de conceptos de análisis de requerimientos, modelado de bases de datos, diseño relacional, implementación de restricciones DDL, gestión de permisos DCL y desarrollo de una interfaz moderna orientada a la experiencia del usuario. El resultado es una solución escalable, segura y preparada para entornos reales donde la gestión de eventos y la interacción social son elementos fundamentales.

---

# 🎯 Objetivo General

Diseñar e implementar una plataforma digital para la gestión inteligente de eventos denominada MANTRA, capaz de conectar organizadores y asistentes mediante herramientas de administración, comunicación e interacción social, apoyándose en una base de datos relacional segura, consistente y escalable.

El proyecto busca aplicar de manera práctica los conocimientos adquiridos en la asignatura de Bases de Datos mediante la construcción de un sistema completo que permita almacenar, consultar y administrar información relacionada con usuarios, eventos, categorías, preferencias, asistencias y reseñas. Asimismo, se pretende garantizar la integridad de los datos mediante restricciones de dominio, claves foráneas, acciones referenciales y mecanismos de control de acceso basados en roles.

Además de satisfacer los requerimientos funcionales del caso de estudio, el sistema tiene como propósito ofrecer una experiencia intuitiva para los usuarios finales, incorporando funcionalidades modernas como recomendaciones de eventos, espacios comunitarios para compartir contenido y comunicación mediante chat en tiempo real.

---

# 📌 Objetivos Específicos

- Analizar los requerimientos del negocio para identificar entidades, atributos y relaciones relevantes.
- Diseñar un modelo Entidad–Relación Extendido (EER) que represente correctamente el dominio del problema.
- Transformar el modelo conceptual a un modelo relacional normalizado.
- Implementar la base de datos utilizando PostgreSQL y pgAdmin.
- Aplicar restricciones de integridad mediante claves primarias, claves foráneas, CHECK, UNIQUE, DEFAULT y NOT NULL.
- Implementar mecanismos de seguridad utilizando sentencias DCL, roles y permisos específicos.
- Desarrollar funcionalidades para la gestión de eventos, asistencia, categorías y reseñas.
- Incorporar herramientas de interacción social como comunidad y chat entre usuarios.
- Realizar pruebas de validación para garantizar el correcto funcionamiento de las reglas de negocio.
- Documentar el proceso completo de análisis, diseño, implementación y validación del sistema.

---

# 🛠️ Tecnologías Implementadas

### Base de Datos
- PostgreSQL 18
- pgAdmin 4

### Backend
- Node.js
- Express.js

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap

### Seguridad
- Roles y permisos mediante DCL
- Restricciones de integridad
- Control de acceso basado en usuarios

### Herramientas
- Git
- GitHub
- Visual Studio Code

---

# ⚙️ Funcionalidades Principales

## 👤 Gestión de Usuarios

- Registro de usuarios.
- Inicio de sesión.
- Gestión de perfil.
- Diferenciación entre asistentes y organizadores.

## 🎉 Gestión de Eventos

- Creación de eventos.
- Edición de eventos.
- Eliminación de eventos.
- Consulta de eventos.
- Clasificación por categorías.

## ⭐ Sistema de Reseñas

- Calificación de eventos.
- Comentarios de participantes.
- Cálculo de reputación de organizadores.

## 🤝 Comunidad

- Publicaciones entre usuarios.
- Compartir experiencias.
- Interacción social.

## 💬 Chat en Tiempo Real

- Comunicación directa entre usuarios.
- Mensajería privada.
- Interacción entre asistentes y organizadores.

## 📊 Dashboard de Organizador

- Administración de eventos.
- Visualización de estadísticas.
- Gestión de asistentes.
- Control de publicaciones.

---

# 🗄️ Diseño de Base de Datos

La estructura de la base de datos fue diseñada siguiendo las reglas de transformación del Modelo Entidad-Relación Extendido hacia el Modelo Relacional.

Las principales entidades implementadas son:

- Usuario
- Organizador
- Participante
- Evento
- Categoría
- Reseña
- Asistencia
- Preferencia

Además, se implementaron relaciones de especialización, relaciones N:M y mecanismos de integridad referencial para asegurar la consistencia de la información almacenada.

---

# 🔒 Restricciones Implementadas

## Restricciones de Dominio

- NOT NULL
- UNIQUE
- CHECK
- DEFAULT

## Integridad Referencial

- ON DELETE CASCADE
- ON DELETE RESTRICT
- ON UPDATE CASCADE

## Validaciones

- Edad mínima de usuario.
- Correos únicos.
- Calificaciones válidas.
- Eventos con títulos válidos.
- Comentarios obligatorios.
- Fechas válidas.

---

# 👥 Roles del Sistema

| Rol | Descripción |
|------|------------|
| Organizador | Gestión de eventos |
| Participante | Asistencia y reseñas |


---

# 📊 Diagramas del Proyecto

<details>
<summary><b>📊 Ver Diagramas</b></summary>

<br>

<table>
<tr>
<td align="center">
<b>Diagrama Relacional</b><br><br>
<img src="https://github.com/user-attachments/assets/6a5e9428-c32a-4034-b162-d5340e1357b9" width="500">
</td>

<td align="center">
<b>Diagrama EER</b><br><br>
<img src="https://github.com/user-attachments/assets/ae83f892-5ab9-4c1b-8d89-c92a39e6c2df" width="500">


</td>
</tr>
</table>

</details>

---

# 🖼️ Capturas de Pantalla

<details>
<summary><b>🖼️ Ver capturas de pantalla</b></summary>

<br>

<table>
<tr>
<td align="center">
<b>Landing Page</b><br><br>
<a href="https://github.com/user-attachments/assets/42a1b548-17ca-46eb-aeef-fc862a6ce4c0">
<img src="https://github.com/user-attachments/assets/42a1b548-17ca-46eb-aeef-fc862a6ce4c0" width="450">
</a>
</td>

<td align="center">
<b>Feed de Eventos</b><br><br>
<a href="https://github.com/user-attachments/assets/6c369928-ee59-4f45-bce8-97b4a5c7edde">
<img src="https://github.com/user-attachments/assets/6c369928-ee59-4f45-bce8-97b4a5c7edde" width="450">
</a>
</td>
</tr>

<tr>
<td align="center">
<b>Dashboard Organizador</b><br><br>
<a href="https://github.com/user-attachments/assets/873197d9-57de-4f03-9024-a659d2f122a4">
<img src="https://github.com/user-attachments/assets/873197d9-57de-4f03-9024-a659d2f122a4" width="450">
</a>
</td>

<td align="center">
<b>Comunidad</b><br><br>
<a href="https://github.com/user-attachments/assets/6ef71a19-5c95-4625-8077-2fa7774410f2">
<img src="https://github.com/user-attachments/assets/6ef71a19-5c95-4625-8077-2fa7774410f2" width="450">
</a>
</td>
</tr>

<tr>
<td colspan="2" align="center">
<b>Chat en Tiempo Real</b><br><br>
<a href="https://github.com/user-attachments/assets/be749db0-1f92-4e3f-9688-544ce48c7792">
<img src="https://github.com/user-attachments/assets/be749db0-1f92-4e3f-9688-544ce48c7792" width="700">
</a>
</td>
</tr>
</table>

</details>

---

# 🎥 Entrevista


📄 Documento de entrevista:

[Ver Entrevista](Entrevista_MANTRA.pdf)
---

# 🚀 Demo

🔗 Demo en línea:

https://mantra-backend-24g1.onrender.com/

---

# 👨‍💻 Autores

**Julio Milan y Armenta Misael**

Proyecto desarrollado para la asignatura de Bases de Datos.

---

# 📚 Conclusiones

El desarrollo de MANTRA permitió aplicar de manera integral los conceptos fundamentales de análisis, diseño e implementación de bases de datos relacionales. Durante el proyecto se construyó un sistema capaz de gestionar usuarios, eventos, comunidades, reseñas y comunicaciones entre participantes, manteniendo siempre la integridad y seguridad de la información.

La utilización de PostgreSQL permitió implementar restricciones avanzadas, relaciones complejas y mecanismos de control de acceso mediante roles, garantizando la consistencia de los datos y el cumplimiento de las reglas de negocio definidas durante el levantamiento de requerimientos.

Finalmente, el proyecto demuestra cómo una adecuada planeación de la arquitectura de datos puede convertirse en la base de una aplicación moderna, escalable y preparada para escenarios reales de uso.
