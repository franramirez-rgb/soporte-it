# Ticker — Next.js + Supabase

Migración del portal `franramirez-rgb/ticker` desde PHP/MySQL a Next.js App Router + Supabase.

## Estado actual de Supabase

Proyecto: `franramirez-rgb's Project`
Ref: `yhsyndgcfuxphmaomgvd`
Región: `eu-west-1`

El histórico legacy ya está cargado en el proyecto y verificado:

- 9 centros de coste
- 42 usuarios
- 39 equipos
- 32 incidencias
- 54 mensajes
- 49 tareas
- 47 registros de horas
- 31,80 horas totales registradas
- 0 equipos huérfanos
- 0 incidencias huérfanas
- 0 mensajes sin incidencia
- 0 registros sin tarea

Los IDs legacy se conservan, por lo que los códigos `#INC-XXX` siguen coincidiendo con el sistema antiguo.

## Arquitectura

- Next.js App Router
- TypeScript
- Supabase Auth + SSR (`@supabase/ssr`)
- Supabase Postgres + RLS
- Supabase Realtime para mensajes/notificaciones
- Supabase Storage para adjuntos
- Nodemailer para correo operativo

La autenticación de la aplicación queda separada del mailer operativo.

### Auth

Supabase Auth es el responsable de:

- login
- logout
- recuperación de contraseña
- verificación de correo
- cambio de credenciales

El mailer del portal no envía estos correos.

### Mailer

El mailer solo envía avisos operativos, con plantillas nuevas y el aviso de protección de datos/legal corporativo:

- nuevo ticket
- respuesta de ticket
- cambio de estado
- aprobación/aviso de cuenta
- asignación de material

SMTP únicamente por variables de entorno.

## Migración de datos

`supabase/legacy-full-data-migration.sql` contiene la carga completa de datos legacy ya aplicada al proyecto actual.

Para repetirla sobre otro proyecto:

```bash
supabase db push
```

o ejecutar la migración desde el SQL Editor.

## Migración de Auth legacy

La base legacy contenía hashes bcrypt. Se mantienen fuera de las tablas públicas de aplicación en `private.usuario_credenciales` únicamente como puente de migración.

El script `scripts/migrate-legacy-users.mjs` crea los usuarios de Supabase Auth con `auth.admin.createUser({ password_hash })`, conserva el hash existente y después enlaza `usuarios.auth_user_id`.

Ejemplo:

```bash
npm install
set NEXT_PUBLIC_SUPABASE_URL=https://yhsyndgcfuxphmaomgvd.supabase.co
set SUPABASE_SECRET_KEY=sb_secret_...
npm run migrate:auth -- --input "C:\ruta\soporte_incidencias.sql"
```

Este paso necesita una clave secreta de servidor de Supabase porque usa la API Admin de Auth. No se incluye ninguna clave en el repositorio.

## Importante sobre la tabla de transición de credenciales

La tabla `private.usuario_credenciales` contiene hashes bcrypt legacy. Actualmente se conserva para completar la transición de Auth, pero el asesor de seguridad de Supabase marca que esta tabla tiene RLS desactivado.

Remediación propuesta por Supabase:

```sql
ALTER TABLE "private"."usuario_credenciales" ENABLE ROW LEVEL SECURITY;
```

No se aplica automáticamente porque, una vez activado RLS, hay que decidir explícitamente si la tabla debe tener alguna política de acceso. En el diseño final, la aplicación no debe consultar esta tabla desde el cliente.

## Adjuntos

La BD legacy solo contiene el nombre de los adjuntos (`adj_*.png`, `adj_*.jpeg`, `adj_*.pdf`, etc.). Los binarios no forman parte del SQL. Para completar la migración de archivos hay que copiar el directorio `uploads/` del servidor legacy al bucket privado `ticket-attachments`, conservando los nombres/rutas.

## Arranque local

```bash
npm install
npm run typecheck
npm run dev
```

Variables necesarias:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=
IT_EMAIL=informatica@rebios.info
MAIL_FROM_EMAIL=
MAIL_FROM_NAME=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

## GitHub

Repositorio de origen: `franramirez-rgb/ticker`.

Durante la migración el conector de GitHub permitió lectura, pero rechazó las operaciones de escritura con 403. La versión migrada queda preparada en esta carpeta para revisión y commit.
