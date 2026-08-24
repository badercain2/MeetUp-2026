# MeetUP 2026 Check-in

Frontend/PWA para registrar llegadas de forma rápida en celular, tablet y desktop. La aplicación usa Supabase para persistir participantes, check-in, compañías, juegos y reportes.

## Ejecutar

```bash
npm install
npm run dev
```

Verificación de tipos y build de producción:

```bash
npm run lint
npm run build
```

## Acceso

- La aplicación requiere un usuario autenticado de Supabase.
- `ADMIN` y `SUPERVISOR` pueden gestionar operaciones; `CHECKIN` tiene acceso operativo limitado según las políticas de la base.
- Nunca se guardan correos ni contraseñas en el repositorio. Las cuentas se crean y administran desde Supabase Auth.
- Para probar estados de conexión, toca `En línea` en la cabecera.

## Estructura

- `src/App.tsx`: shell, rutas y pantallas operativas.
- `src/data/mockData.ts`: datos de respaldo para estados sin conexión y contenido de la interfaz.
- `src/data/repository.ts`: lectura y escritura de participantes, compañías, check-in y juegos en Supabase.
- `src/data/gamesData.ts`: actividades, progreso, premios y bracket mock según el manual.
- `src/data/gamesRepository.ts`: interfaz preparada para reemplazar mocks por Supabase Realtime.
- `src/types.ts`: modelos de dominio y roles.
- `public/assets`: símbolos SVG y branding reemplazables.

## Módulo de Juegos

La navegación `Juegos` incluye dashboard, actividad en vivo, modo juez, modo proyector, premios, torneo y clasificación general. La guía completa de reglas y operación está en `GAMES_MODULE.md`. La portada real del evento está disponible en `public/assets/meetup-hero.jpg`.

## Seguridad y privacidad

- GitHub Pages publica el frontend y sus assets; no debe publicar datos de participantes.
- La URL de Supabase, la publishable key y el ID del evento llegan al navegador y no son secretos. El acceso a datos depende de Auth y RLS en Supabase.
- No incluir en GitHub `.env`, service-role keys, contraseñas de base de datos, JWT secrets, exportaciones de participantes, capturas con datos personales ni credenciales de usuarios.
- `medical_info`, nombres, edad, sexo, estaca, barrio y estado de check-in son datos operativos privados y solo deben consultarse con una sesión autorizada.
- Las credenciales de producción deben rotarse si alguna vez fueron compartidas o escritas en el código.

Las variables de despliegue están documentadas en `.env.example` y se configuran en GitHub Actions.
