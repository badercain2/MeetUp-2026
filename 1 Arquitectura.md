# Arquitectura del Proyecto MeetUP 2026

## Estado del documento

- Versión: `1.2`
- Tipo: arquitectura objetivo y plan técnico
- Fuente: `1 CONTEXTO CHARLA.md`, manual de actividades y frontend mock existente
- Backend actual: ninguno, frontend mock
- Backend objetivo: Supabase PostgreSQL + Auth + Realtime
- Hosting objetivo: Cloudflare Pages
- Costo de infraestructura objetivo: `$0/mes` usando únicamente planes gratuitos y sin dominio personalizado

## Resumen de la Estrategia Gratuita

El proyecto se diseña deliberadamente para no pagar servidor, hosting, base de datos ni dominio durante la primera etapa.

```text
GitHub privado
      ↓ despliegue automático
Cloudflare Pages Free
      ↓ HTTPS
React + TypeScript + PWA
      ↓ Auth, PostgreSQL y Realtime
Supabase Free
```

La computadora del organizador no necesita quedar encendida. Los celulares, tablets, notebooks y el proyector acceden a la misma aplicación publicada en internet. Excel se utiliza como archivo de importación y respaldo, no como base de datos compartida.

Esta decisión evita:

- comprar o alquilar un servidor;
- pagar un VPS para ejecutar un backend propio;
- configurar puertos o una IP pública en casa;
- pagar un dominio personalizado;
- mantener una computadora encendida durante el evento.

El costo de infraestructura puede mantenerse en `$0/mes` para este evento si se cumplen las condiciones de la sección 13. Los planes gratuitos tienen límites y pueden cambiar. Antes del evento se debe verificar que Supabase esté activo, probar los límites y descargar respaldos CSV/XLSX.

Este `$0` no incluye el costo de internet o datos móviles del lugar, ni el costo opcional de un dominio personalizado. La aplicación no necesita comprar ninguno de ellos: puede utilizar la URL gratuita `*.pages.dev` y la conexión Wi-Fi o hotspot que ya esté disponible.

Este documento convierte el contexto funcional en una arquitectura implementable. No reemplaza las reglas del manual: las actividades, premios y puntajes deben seguir la fuente de verdad del evento.

### Verificación de costo `$0`

La siguiente configuración fue contrastada con la documentación oficial el `10 de agosto de 2026`:

| Parte | Servicio/configuración | Límite gratuito relevante | Costo previsto |
|---|---|---|---:|
| Página web | Cloudflare Pages Free, sitio estático Vite | 500 builds/mes, 20.000 archivos, 25 MiB por archivo, 100 proyectos por cuenta | `$0` |
| Base de datos | Supabase Free | 500 MB de PostgreSQL, 5 GB de egress y 5 GB de egress cacheado | `$0` |
| Login | Supabase Auth Free | 50.000 usuarios activos mensuales | `$0` |
| Actualización entre dispositivos | Supabase Realtime Free | 200 conexiones simultáneas, 100 mensajes/segundo y 2 millones de mensajes/mes | `$0` |
| PWA | Frontend propio | Se entrega dentro del sitio de Cloudflare Pages | `$0` |
| CSV/XLSX | Librería ejecutada en el navegador | No requiere servidor adicional | `$0` |
| Código privado | GitHub Free | Repositorios privados y colaboradores incluidos | `$0` |
| Dominio | URL `*.pages.dev` | No se compra dominio personalizado | `$0` |
| Computadora propia | No se usa como servidor | No debe quedar encendida | `$0` |

Para este evento, con cientos de participantes y alrededor de 20 dispositivos de encargados, el uso previsto queda ampliamente por debajo de esos límites. La arquitectura no puede prometer que los planes externos serán gratuitos para siempre, pero sí queda configurada para no activar cargos por servicios adicionales.

### Reglas obligatorias para conservar `$0`

- Mantener un solo proyecto Supabase Free activo para producción; el plan Free permite hasta 2 proyectos activos.
- No activar un plan pago, add-on, PITR, branching, dominio personalizado ni funciones que requieran facturación.
- Usar solamente el sitio estático de Cloudflare Pages; no agregar Pages Functions, Workers, R2, KV ni Durable Objects.
- Crear previamente las cuentas de encargados con email y contraseña, confirmar cada cuenta y probar el login; no usar SMS, MFA por teléfono, SMTP externo ni recuperación de contraseña durante el evento.
- No habilitar registro público. La aplicación usará `signInWithPassword` y Supabase Auth administrará las contraseñas.
- Importar y exportar CSV/XLSX en el navegador. No guardar archivos de Excel en Supabase Storage.
- Ejecutar la asignación transaccional como función PostgreSQL/RPC, no como un backend o servidor separado.
- No usar GitHub Actions para el despliegue: Cloudflare Pages se conecta directamente al repositorio privado.
- Verificar en el panel de Supabase que no se haya seleccionado Pro ni ningún add-on.

## 1. Decisión Arquitectónica

La solución recomendada es una aplicación web/PWA con esta separación:

```text
Navegador de celular, tablet, notebook o proyector
                    |
                    | HTTPS
                    v
          React + TypeScript + Vite
          Cloudflare Pages, gratuito
                    |
                    | Supabase SDK / REST / Realtime
                    v
           Supabase Auth + PostgreSQL
           Realtime; Storage no requerido
```

### Tecnologías principales

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | React + TypeScript + Vite | UI rápida, PWA y tipado estricto |
| Estilos | Tailwind CSS + CSS semántico | Responsive sin librería visual pesada |
| Navegación | React Router | Rutas protegidas y modo proyector |
| Iconos | lucide-react | Iconos consistentes y accesibles |
| PWA | vite-plugin-pwa | Instalable en celulares y tablets |
| Datos | Supabase PostgreSQL | Base central gratuita y transacciones |
| Login | Supabase Auth | Usuarios y sesiones sin backend propio |
| Tiempo real | Supabase Realtime | Cambios entre varios dispositivos |
| Hosting | Cloudflare Pages | Publicación gratuita sin dejar una PC encendida |
| Código | GitHub privado | Versionado, colaboración y despliegue |
| Importación | CSV/XLSX en frontend | Entrada y respaldo del evento sin backend adicional |
| Exportación | XLSX/CSV | Respaldo y entrega de listados |

### Enfoque Mobile-First

MeetUP 2026 se diseña principalmente como una aplicación móvil instalable (PWA). El dispositivo principal de operación será el celular del encargado durante el evento; desktop, tablet y proyector son superficies secundarias para supervisión, administración y visualización.

#### Prioridades de la interfaz móvil

- Diseñar primero para anchos de `360px` a `430px` y luego ampliar a tablet y desktop.
- Usar navegación inferior y acciones accesibles con una mano.
- Mantener objetivos táctiles de al menos `44px` para botones, selectores y filas interactivas.
- Abrir checklists, fichas y controles complejos como modales o paneles móviles, no obligar a buscar acciones al final de una pantalla larga.
- Mostrar siempre el estado crítico en el primer viewport: temporizador general, compañía seleccionada, progreso y autorización.
- Evitar tablas anchas como interfaz principal móvil; usar tarjetas, listas y selectores adaptados.
- Mantener textos breves, estados con color más etiqueta y feedback inmediato después de cada acción.
- Permitir instalación en la pantalla de inicio y conservar el último estado conocido para consulta cuando haya conectividad intermitente.

#### Superficies secundarias

```text
Celular del encargado     → check-in, checklist, temporizador y cambios rápidos
Tablet/notebook           → supervisión, compañías, participantes y administración
Desktop                   → configuración, exportaciones e informes
Proyector                 → modo lectura, ranking y estado general sin datos sensibles
```

Las decisiones de layout y navegación deben priorizar el celular sin crear una aplicación separada. React + TypeScript + PWA permite compartir la misma lógica y adaptar cada superficie mediante responsive design.

## 2. Decisión sobre C++

### Decisión definitiva: no usar C++ en este proyecto

No conviene escribir el frontend completo en C++. Los navegadores no ejecutan C++ de manera nativa como una aplicación web. Para llegar al navegador habría que compilarlo a WebAssembly, lo que complica:

- formularios y accesibilidad;
- routing;
- PWA;
- integración con Supabase Auth y Realtime;
- despliegue en Cloudflare Pages;
- mantenimiento de una UI móvil rápida.

Por eso el frontend permanecerá en `React + TypeScript` y el proyecto no incorporará C++ en producción.

Usar C++ implicaría agregar una herramienta de compilación, un servicio backend propio o una capa WebAssembly. Eso puede comprometer el objetivo de despliegue gratuito, complicar Supabase Realtime y obligar a contratar infraestructura o dejar una computadora ejecutándose.

Las reglas de negocio se implementarán en TypeScript dentro de repositorios y servicios testeables. Esta decisión reduce costos, componentes y riesgo operativo.

## 3. Principios del Sistema

1. El servidor/base de datos es la fuente de verdad.
2. Excel es entrada y respaldo, no base de datos concurrente.
3. El frontend nunca decide una asignación definitiva si aún no fue confirmada por el servidor.
4. Ningún puntaje se inventa si el manual no lo define.
5. Los resultados provisionales no se muestran como resultados oficiales.
6. Los resultados en revisión conservan su valor original y su historial.
7. Las asignaciones confirmadas quedan fijas salvo cambio manual autorizado.
8. Se guarda quién hizo cada acción importante.
9. Se minimizan los datos personales, especialmente por tratarse de jóvenes.
10. La UI debe seguir funcionando como interfaz mock antes de conectar Supabase.

## 4. Estructura del Repositorio

La estructura objetivo es:

```text
meetup-2026/
├── public/
│   └── assets/
│       ├── theme/
│       └── games/
├── src/
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── permissions.ts
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── checkin/
│   │   ├── participants/
│   │   ├── companies/
│   │   └── games/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── CheckInPage.tsx
│   │   ├── ParticipantsPage.tsx
│   │   ├── CompaniesPage.tsx
│   │   ├── ExceptionsPage.tsx
│   │   ├── AdminPage.tsx
│   │   └── games/
│   ├── data/
│   │   ├── interfaces/
│   │   ├── mock/
│   │   ├── repositories/
│   │   │   ├── participantRepository.ts
│   │   │   ├── companyRepository.ts
│   │   │   ├── checkinRepository.ts
│   │   │   ├── gamesRepository.ts
│   │   │   └── rewardRepository.ts
│   │   └── supabase/
│   ├── hooks/
│   ├── store/
│   ├── styles/
│   ├── types/
│   └── utils/
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   └── functions/
├── 1 Arquitectura.md
├── GAMES_MODULE.md
├── README.md
├── .env.example
├── package.json
└── vite.config.ts
```

La aplicación actual ya tiene `src/data/repository.ts`, `src/data/gamesRepository.ts`, tipos, mocks y PWA. Esos archivos son el punto de partida de la migración.

## 5. Módulos Funcionales

### 5.1 Autenticación y App Shell

Responsabilidades:

- login y logout;
- sesión persistente;
- usuario actual y rol;
- sidebar desktop;
- navegación inferior móvil;
- estado online, reconectando y offline;
- protección de rutas;
- ocultar acciones no autorizadas.

Rutas base:

```text
/login
/checkin
/participants
/companies
/exceptions
/admin
```

### 5.2 Check-in

Flujo normal:

```text
Buscar participante
      ↓
Abrir ficha
      ↓
Verificar autorización y materiales
      ↓
Recibir recomendación de compañía
      ↓
Confirmar check-in
      ↓
Mostrar éxito y volver al buscador
```

Requisitos:

- búsqueda tolerante a acentos, mayúsculas y orden del nombre;
- búsqueda por estaca o barrio como criterio secundario;
- autorización pendiente bloquea el flujo hasta que el ADMIN la confirme;
- remera, cartas y credencial son toggles grandes;
- una persona ya registrada no puede registrarse dos veces;
- la compañía confirmada queda fija;
- la asignación se recomienda en servidor usando una transacción.

### 5.3 Compañías

Responsabilidades:

- mostrar cantidad actual y objetivo;
- mostrar líder asignado o ausencia de líder;
- marcar baja, equilibrada, llena o excedida con texto e iconos;
- actualizar contadores en tiempo real;
- permitir modificación manual solo a roles autorizados;
- soportar temas configurables por compañía.

El tamaño objetivo debe ser configuración del evento. El manual usa compañías de 15 jóvenes como referencia, pero el sistema debe soportar 6, 10, 15 o cualquier cantidad configurada.

### 5.4 Excepciones

Tipos mínimos:

- participante no encontrado;
- autorización pendiente;
- datos incompletos;
- posible duplicado;
- cambio manual de compañía.

Cada excepción debe guardar estado, motivo, creador, resolución, usuario que resolvió y fecha.

### 5.5 Juegos

Rutas:

```text
/games
/games/live
/games/rewards
/games/overall
/games/activity/:activityId
/games/activity/:activityId/manage
/games/tournament
```

El módulo de juegos solo digitaliza progreso, cronómetros, resultados, rankings, premios y visualización. No reemplaza las actividades físicas.

Actividades y regla de ranking:

| Actividad | Regla oficial |
|---|---|
| ¿Quién soy? | Sin podio; registrar aciertos y recompensas |
| Evita las Plagas | `TIME_ASC`, 7 plagas secuenciales |
| Torneo de Maestros | 3 grupos de 3 compañías; cada grupo produce 1 ganadora; final entre las 3 ganadoras; puestos 1.º, 2.º y 3.º cargados manualmente |
| Cruza el Mar Rojo | `TIME_ASC`, 10 desafíos y cronómetro continuo |
| Escape del Desierto | Progreso `CAMINO`; sin ranking |
| Sigue la Música | `POINTS_DESC`, puntos definidos por el manual |

### Regla definitiva: Torneo de Maestros

La aplicación no usa un bracket tradicional de eliminación ni una ronda automática de clasificación.

```text
9 compañías
    ↓
3 grupos de 3 compañías
    ↓
Cada grupo registra sus enfrentamientos y produce 1 ganadora
    ↓
Final entre las 3 ganadoras de grupo
    ↓
Carga manual de 1.º, 2.º y 3.º puesto
```

- Grupo A: C1, C2 y C3.
- Grupo B: C4, C5 y C6.
- Grupo C: C7, C8 y C9.
- Dentro de cada grupo se enfrentan las tres compañías entre sí: C1 vs C2, C1 vs C3 y C2 vs C3, con la misma estructura para los grupos B y C.
- Cada grupo muestra las victorias de sus tres compañías.
- La persona responsable elige manualmente la ganadora del grupo, especialmente cuando existe empate o un criterio adicional de evaluación.
- La final recibe las tres ganadoras de grupo.
- La persona responsable carga manualmente quién ocupa el 1.º, 2.º y 3.º puesto de la final.
- La interfaz no debe inferir automáticamente la ganadora ni los puestos finales a partir de las victorias.

## 6. Roles y Permisos

Para este MVP se utiliza un único usuario operativo con rol administrador:

```ts
type UserRole = 'ADMIN';
```

Los permisos deben ser explícitos para no llenar los componentes de condiciones dispersas:

```ts
interface Permissions {
  canViewGames: boolean;
  canManageGames: boolean;
  canManageAssignedCompany: boolean;
  canManageRewards: boolean;
  canResolveDisputes: boolean;
  canConfigureScoring: boolean;
  canManageTournament: boolean;
}
```

### ADMIN

- registrar y gestionar Check-in;
- resolver excepciones;
- modificar compañías;
- administrar juegos y resultados;
- corregir resultados con motivo;
- resolver impugnaciones y empates;
- confirmar premios;
- configurar puntajes de sesión;
- importar/exportar;
- administrar usuarios y compañías;
- abrir/cerrar/reiniciar actividades;
- configurar puntaje global;
- configurar recompensas.

La interfaz debe ocultar botones no permitidos. La base de datos debe validar los permisos nuevamente con RLS y políticas de servidor.

## 7. Modelo de Datos PostgreSQL

Todas las tablas deben incluir, cuando corresponda:

```text
id uuid primary key
created_at timestamptz not null
updated_at timestamptz not null
created_by uuid nullable
updated_by uuid nullable
```

### events

```text
id
name
theme_label
date
target_company_size
company_count
status
```

### profiles

```text
id = auth.users.id
display_name
role
active
```

No guardar contraseñas propias. Supabase Auth es responsable de la autenticación.

### participants

```text
id
event_id
first_name
last_name
stake
ward
is_youth_leader
authorization_status
notes
is_exception
```

No guardar DNI, domicilio, información médica ni campos que no sean necesarios para logística.

### companies

```text
id
event_id
number
name
target_size
theme_color_token
theme_icon
leader_participant_id
active
```

### company_memberships

```text
id
event_id
participant_id
company_id
assigned_by
assigned_at
assignment_source -- PREASSIGNED, RECOMMENDED, MANUAL
is_current
```

Restricciones:

- un participante puede tener una sola asignación actual por evento;
- una asignación confirmada no cambia automáticamente;
- un cambio manual requiere usuario autorizado y motivo.

### checkins

```text
id
event_id
participant_id unique within event
company_id
checked_in_at
checked_in_by
authorization_verified_at
```

### material_deliveries

```text
id
event_id
participant_id
shirt_delivered
card_pack_delivered
credential_delivered
updated_by
```

### exceptions

```text
id
event_id
participant_id nullable
type
status -- OPEN, UNDER_REVIEW, RESOLVED, CANCELLED
title
description
created_by
resolved_by
resolved_at
resolution
```

### activities

```text
id
event_id
order_number
name
start_time
duration_minutes
score_type -- NONE, TIME_ASC, POINTS_DESC, BRACKET
status -- UPCOMING, READY, LIVE, FINISHED, CANCELLED
global_points_enabled
manual_reference
```

### company_activity_states

```text
id
activity_id
company_id
status
progress_current
progress_total
started_at
finished_at
elapsed_ms
official_time_ms
points
under_review
last_result_version
```

Restricción recomendada: `unique(activity_id, company_id)`.

### challenge_progress

```text
id
activity_id
company_id
challenge_number
name
status -- LOCKED, ACTIVE, COMPLETED, REPEAT
started_at
completed_at
split_ms
validated_by
review_reason
```

El backend debe impedir validar el desafío `N+1` si `N` no está completado.

### activity_results

```text
id
activity_id
company_id nullable
participant_id nullable
rank nullable
points nullable
is_official
status -- PROVISIONAL, OFFICIAL, UNDER_REVIEW, VOID
confirmed_by
confirmed_at
correction_reason
```

### rewards

```text
id
reward_key unique
activity_id nullable
company_id nullable
participant_id nullable
reason
quantity
status -- PENDING, READY, DELIVERED, CANCELLED
delivered_at
delivered_by
```

El `reward_key` evita duplicar premios si una actividad se reabre o se recalcula.

### tournaments

```text
id
event_id
activity_id
name
status
fixture_version
format -- GROUPS_THREE_TO_FINAL
manual_group_winners jsonb
manual_final_places jsonb -- { first, second, third }
```

### tournament_matches

```text
id
tournament_id
round_number
company_a_id
company_b_id
winner_company_id
round_type -- GROUP, FINAL
group_key nullable -- A, B, C
status -- PENDING, LIVE, FINISHED
```

### tournament_representatives

```text
id
match_id
company_id
participant_id
part_number
score
is_winner
```

La aplicación conserva los datos de representantes si se necesitan para la operación, pero la clasificación del Torneo de Maestros se define manualmente: una ganadora por grupo y los puestos 1.º, 2.º y 3.º de la final. No se debe inferir la clasificación automáticamente por cantidad de victorias.

### scoring_configurations

```text
id
event_id
activity_id
configuration_type
configuration_json
is_official_manual_value
configured_by
configured_at
```

Todo valor configurado por la sesión debe aparecer en UI con el badge `Configuración de sesión`.

### audit_logs

```text
id
event_id
actor_id
action
entity_type
entity_id
old_value_json
new_value_json
reason
created_at
```

Acciones mínimas:

- iniciar cronómetro;
- pausar una actividad permitida;
- validar desafío;
- registrar penalización;
- confirmar resultado;
- corregir tiempo;
- resolver impugnación;
- entregar premio;
- modificar compañía.

## 8. Asignación de Compañía sin Colisiones

Nunca asignar una compañía definitiva únicamente con el contador que leyó el navegador.

La operación debe ser una función transaccional en PostgreSQL:

```text
register_checkin(participant_id, materials, requested_company_id nullable)
```

Flujo de la transacción:

1. Verificar que el participante pertenece al evento.
2. Verificar que no exista un check-in previo.
3. Verificar autorización.
4. Bloquear las filas de compañías relevantes.
5. Calcular tamaños actuales.
6. Priorizar compañía con menor cantidad.
7. Usar líder, estaca y barrio como criterios secundarios configurables.
8. Crear la asignación.
9. Crear el check-in.
10. Guardar materiales y auditoría.
11. Confirmar toda la transacción.

La UI puede mostrar una recomendación previa, pero debe aclarar que queda confirmada solamente después de la respuesta del servidor.

## 9. Importación y Exportación

Flujo de importación:

```text
CSV/XLSX inicial
      ↓
Previsualización y validación
      ↓
Errores por fila
      ↓
Confirmación ADMIN
      ↓
Inserción/upsert en participantes
```

Columnas mínimas:

```text
Nombre
Apellido
Estaca
Barrio
Autorización
Es líder joven
```

No aceptar DNI como campo requerido.

Exportaciones mínimas:

- asistentes;
- lista completa;
- compañías;
- excepciones;
- premios;
- auditoría para Supervisor/Admin.

Antes y durante el evento descargar respaldos en distintos momentos. Supabase Free puede pausar proyectos inactivos y no debe ser el único respaldo.

### Plan de continuidad sin costo

### Datos de participantes pendientes

La lista real de participantes y sus datos logísticos llegará pocos días antes del evento. Hasta ese momento, el desarrollo y las pruebas utilizarán datos ficticios claramente identificados como prueba.

- Los datos mock actuales sirven para probar búsqueda, Check-in, compañías, juegos, torneo y proyector.
- Los participantes ficticios no deben mezclarse con la carga real del evento.
- Cuando llegue el archivo definitivo, ADMIN debe validarlo y cargarlo mediante importación CSV/XLSX.
- La importación debe mostrar una previsualización, errores por fila y una confirmación antes de insertar.
- Antes de la carga real se debe limpiar cualquier participante de prueba del evento de producción.
- Los datos originales deben conservar el mismo `event_id` de producción y no requieren cambiar el código de la aplicación.
- Después de importar, se debe verificar cantidad total, nombres, estacas, barrios, autorizaciones y líderes antes de abrir el Check-in.

La recomendación es mantener ahora los datos ficticios para probar el sistema y realizar una carga limpia de los participantes reales cuando coordinación entregue el archivo definitivo.

Antes de abrir el check-in:

- descargar la lista inicial en la notebook y en otro dispositivo;
- probar el login desde varios celulares/tablets;
- verificar que el proyecto Supabase esté activo;
- probar la URL `*.pages.dev` desde la red del lugar;
- tener disponible un hotspot existente como alternativa de conectividad.

Durante el evento:

- exportar CSV/XLSX en momentos definidos;
- guardar cada respaldo en dos dispositivos locales;
- no confirmar operaciones si el servidor no respondió;
- si se pierde internet, pasar temporalmente al listado local y repetir los registros pendientes cuando vuelva la conexión.

Este plan no agrega servicios pagos. La aplicación no puede garantizar escritura concurrente offline sin riesgo de duplicados; por eso el modo offline es consulta y respaldo, no un segundo servidor.

## 10. Realtime y Concurrencia

El frontend debe depender de interfaces, no de Supabase directamente:

```ts
interface ParticipantRepository { /* list, search, getById */ }
interface CompanyRepository { /* list, balance, recommend */ }
interface CheckinRepository { /* register transaction result */ }
interface GamesRepository { /* activities, progress, results */ }
interface RewardRepository { /* list and transition state */ }
```

Suscripciones futuras:

```text
event:{eventId}:checkins
event:{eventId}:companies
event:{eventId}:activities
event:{eventId}:rewards
event:{eventId}:tournament
```

Cuando llegue un cambio:

1. validar que la versión sea más nueva;
2. actualizar el store local;
3. recalcular solamente el ranking permitido;
4. mostrar actualización suave;
5. si hay conflicto, mostrar la versión del servidor;
6. nunca sobrescribir silenciosamente una corrección.

Estados globales:

```ts
```

En offline se puede consultar el último estado conocido, pero no mostrar una asignación como confirmada si el servidor no respondió.

## 11. Seguridad y Privacidad

- Supabase Auth para login.
- RLS en todas las tablas con `event_id`.
- Usuarios solo ven eventos autorizados.
- ADMIN es el único rol operativo del MVP y puede configurar o corregir toda la información.
- No poner nombres, barrios ni datos personales en URLs.
- No registrar tokens en consola.
- No enviar secretos, contraseñas ni tokens al modo proyector.
- Para este evento reducido, el proyector puede mostrar nombres de personas si coordinación lo necesita; no se mostrarán datos sensibles adicionales.
- Validar permisos en UI y en base de datos.
- No usar claves secretas en variables `VITE_*`; las variables expuestas al navegador no son secretos.

## 12. Modo Proyector

Ruta: `/games/live`.

Características:

- sin sidebar;
- solo lectura;
- tipografía grande para 1920x1080;
- actividad actual;
- reloj y estado de conexión;
- top 3 oficial;
- compañías aún en juego con progreso;
- sin datos personales sensibles;
- compatible con autoactualización Realtime.

El modo proyector no debe depender de acciones de administrador ni presentar rankings provisionales como finales.

## 13. Configuración Gratuita

### GitHub

- repositorio privado;
- ramas `main` y `develop` opcionales;
- pull requests para cambios importantes;
- no depende de GitHub Actions para publicar;
- nunca guardar claves secretas en el repositorio.

### Cloudflare Pages

- conectar el repositorio;
- build command: `npm run build`;
- output directory: `dist`;
- variables públicas solamente para URL y anon key de Supabase;
- no requiere servidor encendido en casa;
- usar la URL gratuita `*.pages.dev`;
- mantener el despliegue como sitio estático, sin Pages Functions, Workers ni otros productos pagos.

### Supabase Free

- crear un proyecto;
- guardar URL y anon key en el panel de despliegue;
- ejecutar migraciones SQL;
- activar Auth;
- crear políticas RLS;
- habilitar Realtime solo para tablas necesarias;
- revisar límites y condiciones actuales antes del evento;
- mantener un solo proyecto de producción activo;
- no contratar SMTP externo: crear las cuentas previamente y usar email/contraseña;
- no depender del servicio de correo predeterminado para altas o recuperaciones: tiene disponibilidad best-effort y límite de 2 emails por hora;
- no habilitar autenticación por teléfono/SMS;
- no contratar backups automáticos, PITR, branching ni add-ons;
- aceptar que el proyecto puede pausarse después de 1 semana de inactividad;
- aceptar que Free no incluye backups automáticos descargables desde Supabase.

Fuentes oficiales revisadas:

- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Pages Git Integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [GitHub Plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)

Los precios, límites y condiciones de planes gratuitos pueden cambiar. La arquitectura no debe prometer capacidad comercial permanente; debe verificarse antes de usarla en producción.

## 14. Variables de Entorno

`.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_EVENT_ID=
```

No incluir:

```env
SUPABASE_SERVICE_ROLE_KEY
DATABASE_PASSWORD
JWT_SECRET
```

Las claves privadas solo pueden existir en funciones/server-side protegidos.

## 15. Fases de Implementación

### Fase 0: Base y seguridad

- fijar proyecto Git;
- definir variables y entornos;
- crear migraciones;
- configurar Auth y RLS;
- crear datos seed de prueba;
- crear repositorios mock y Supabase con la misma interfaz.

### Fase 1: MVP de Check-in

- login;
- importación CSV/XLSX;
- búsqueda tolerante;
- ficha;
- autorización;
- materiales;
- asignación recomendada;
- transacción de check-in;
- dashboard de compañías;
- excepciones;
- exportación.

### Fase 2: Juegos operativos

- navegación Juegos;
- dashboard;
- actividad genérica;
- modo proyector;
- estados de compañía;
- Realtime mock;
- Evita las Plagas;
- Cruza el Mar Rojo;
- Centro de Premios.

### Fase 3: Torneos

- mini torneos;
- Torneo de Maestros con 3 grupos de 3 compañías;
- carga manual de una ganadora por grupo;
- final entre las 3 ganadoras;
- carga manual de puestos 1.º, 2.º y 3.º;
- premios según los puestos configurados.

### Fase 4: Puntajes definidos

- Sigue la Música;
- Ronda 1 `10/7/5/3`;
- Ronda 2 `+5` por desafío;
- detectar empates sin inventar resolución;
- clasificación general solo con valores configurados.

### Fase 5: Operación avanzada

- ¿Quién soy? con aciertos y recompensas;
- Escape del Desierto con `CAMINO`;
- auditoría completa;
- correcciones con motivo;
- resolver conflictos de versión;
- respaldo automático manual guiado.

## 16. Implementación sin C++

La aplicación no incorpora C++ ni WebAssembly. Las reglas de asignación, validación, ranking y puntajes se implementarán en TypeScript y en funciones PostgreSQL/RPC cuando necesiten transacciones.

Esta decisión evita toolchains, servidores propios y componentes adicionales. Mantiene el despliegue compatible con el sitio estático gratuito de Cloudflare Pages y con Supabase Free.

## 17. Pruebas Obligatorias

### Check-in

- búsqueda con acentos y sin acentos;
- nombre parcial en cualquier orden;
- doble check-in bloqueado;
- autorización pendiente bloqueada hasta confirmación del ADMIN;
- persona no encontrada crea excepción;
- compañía recomendada queda fija después de confirmar;
- dos registros simultáneos no duplican ni desbalancean por carrera;
- líder ausente visible;
- materiales registrables;
- exportación correcta.

### Juegos

- dos tiempos finales con pocos segundos de diferencia;
- compañía en revisión conserva tiempo;
- penalización repite desafío sin sumar segundos ficticios;
- desafío futuro no visible para juez;
- Escape completa `CAMINO` sin podio;
- mini torneo advierte representante repetido;
- tres grupos del Torneo de Maestros muestran sus victorias;
- empate de grupo permite elegir manualmente la ganadora;
- final muestra las 3 ganadoras de grupo;
- puestos 1.º, 2.º y 3.º de la final se cargan manualmente;
- Sigue la Música calcula `10/7/5/3` y `+5`;
- empate de Sigue la Música requiere resolución;
- premio transita `PENDING → READY → DELIVERED`;
- `rewardKey` no duplica premio;
- clasificación general bloqueada si falta configuración;
- proyector no muestra información sensible;
- cambios de dos dispositivos actualizan sin refrescar.

### Responsive

Probar manualmente:

```text
360x800
390x844
768x1024
1024x768
1440x900
1920x1080
```

## 18. Definition of Done

El sistema puede considerarse listo para una prueba real cuando:

- `npm install` y `npm run dev` funcionan;
- `npm run lint` y `npm run build` pasan;
- las rutas protegidas requieren login;
- la base usa RLS;
- el check-in es transaccional;
- las compañías se actualizan entre dispositivos;
- ningún ranking inventa puntajes globales;
- premios y auditoría tienen trazabilidad;
- el modo proyector no expone datos sensibles;
- existe un plan de respaldo CSV/XLSX;
- Supabase puede reemplazar los mocks sin reescribir componentes;
- las reglas críticas tienen pruebas de TypeScript y PostgreSQL;
- se hace una prueba completa con varios celulares antes del evento.

## 19. Decisiones Pendientes

Estas decisiones deben confirmarse con la coordinación antes de producción:

1. Recompensa general de participación de `Evita las Plagas`: Atributo, Desafío u otra.
2. Si alguna actividad sin puntaje oficial tendrá conversión global de sesión.
3. Cantidad real de compañías y objetivo por compañía.
4. Líder joven preasignado por compañía.
5. Usuarios responsables y sus roles.
6. Política exacta de autorización pendiente.
7. Recompensas físicas disponibles y cantidad.
8. Conectividad del lugar y hotspot de respaldo.
9. Responsable de descargar respaldos durante el evento.
La recomendación es resolver primero las decisiones 1, 2, 3, 5 y 8. Sin ellas, la UI puede funcionar en mock, pero no debe declarar resultados oficiales del evento.
