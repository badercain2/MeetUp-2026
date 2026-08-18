# MeetUP 2026 Check-in

Frontend/PWA para registrar llegadas de forma rápida en celular, tablet y desktop. La aplicación funciona hoy con datos mock y la UI consume repositorios en `src/data/repository.ts`, listos para sustituirse por una implementación de Supabase sin acoplar componentes.

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

## Acceso MVP

- El MVP usa un único usuario real de Supabase con rol `ADMIN`.
- Ese usuario puede gestionar Check-in, juegos, resultados, compañías y administración.
- Para probar estados de conexión, toca `En línea` en la cabecera.

## Estructura

- `src/App.tsx`: shell, rutas y pantallas operativas.
- `src/data/mockData.ts`: 300 participantes, 9 compañías y excepciones.
- `src/data/repository.ts`: abstracción mock para participantes, compañías y excepciones.
- `src/data/gamesData.ts`: actividades, progreso, premios y bracket mock según el manual.
- `src/data/gamesRepository.ts`: interfaz preparada para reemplazar mocks por Supabase Realtime.
- `src/types.ts`: modelos de dominio y roles.
- `public/assets`: símbolos SVG y branding reemplazables.

## Módulo de Juegos

La navegación `Juegos` incluye dashboard, actividad en vivo, modo juez, modo proyector, premios, torneo y clasificación general. La guía completa de reglas y operación está en `GAMES_MODULE.md`. La portada real del evento está disponible en `public/assets/meetup-hero.jpg`.

No se muestran DNI, domicilios, información médica ni tokens. Las variables futuras están documentadas en `.env.example`.
