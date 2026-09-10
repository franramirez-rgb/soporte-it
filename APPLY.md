# Soporte IT — paquete de optimización

Este paquete contiene los cambios de aplicación preparados para `franramirez-rgb/soporte-it`.

## Cambios principales

- `lib/auth.ts`: validación con `getClaims()`, contexto cacheado y perfil tipado.
- `proxy.ts`: matcher reducido a rutas que necesitan sesión.
- `vercel.json`: región de ejecución `dub1` (Dublín), cercana a Supabase `eu-west-1`.
- `app/(portal)/loading.tsx`: feedback inmediato durante navegación.
- `app/(portal)/tasker/page.tsx`: paginación, agregaciones con `Map` y un único editor.
- `app/(portal)/material/page.tsx`: paginación y panel único de gestión.
- `app/(portal)/usuarios/page.tsx`: paginación y editor único.
- `app/(portal)/papelera/page.tsx`: paginación independiente.
- `app/actions.ts`: menos consultas redundantes, `getClaims()`, trabajo en paralelo y correo diferido con `after()`.
- `app/api/export/tasker/route.ts`: registros del mes filtrados en PostgreSQL/SDK, sin descargar todo el histórico anidado.
- `app/api/attachments/[...path]/route.ts`: autenticación con claims y consultas iniciales en paralelo.
- `components/sidebar.tsx` y `components/mobile-menu.tsx`: iconos Lucide y navegación más limpia.
- `components/ticket-live.tsx`: simplificación del componente realtime.
- `lib/mailer/index.ts`: transporte SMTP y cliente admin reutilizados.
- `app/globals.css`: interfaz más plana, compacta y consistente.

## Base de datos

Las optimizaciones de Supabase ya se aplicaron al proyecto de producción `yhsyndgcfuxphmaomgvd` y se verificaron posteriormente.

Incluidas en las migraciones del paquete:

- índices de las seis claves foráneas que carecían de índice;
- índice parcial para incidencias activas por fecha;
- eliminación del índice de incidencias por fecha que el asesor había marcado como no usado;
- RLS de `private.usuario_credenciales` activado;
- consolidación de políticas permisivas y uso de `(select auth.uid())` / `(select private.app_role())` para evitar reevaluación por fila.

## Aplicación en local

Copia los archivos manteniendo exactamente su ruta relativa dentro del repositorio.

Después ejecuta:

```bash
npm install
npm run typecheck
npm run build
```

## Vercel

La configuración incluida dirige la ejecución server-side a `dub1`. El cambio afecta a la región de las funciones, no a la región en la que Vercel realiza el build.

## Supabase

Queda pendiente como acción de configuración independiente activar **Leaked Password Protection** en Auth. El asesor de seguridad lo marca como desactivado.

## Verificación

No se pudo ejecutar un `npm run build` completo en el entorno de preparación porque no había dependencias npm descargadas ni acceso de red para instalarlas. Sí se verificó sintácticamente el TypeScript/TSX de los archivos optimizados.
