# Módulo de Juegos · Guía de implementación y operación

## Pantallas

- `/games`: dashboard de cinco segundos. Muestra la actividad actual, cuántas compañías terminaron, top 3 oficial, premios pendientes y cronograma.
- `/games/activity/:activityId`: vista pública de progreso. No modifica resultados.
- `/games/activity/:activityId/manage`: modo juez para seleccionar compañía, iniciar/pausar el cronómetro y validar el reto actual.
- `/games/live`: modo proyector. No tiene sidebar ni controles administrativos y evita datos personales.
- `/games/rewards`: Centro de Premios. Cada recompensa avanza de Pendiente a Listo y luego a Entregado.
- `/games/tournament`: bracket del Torneo de Maestros y partidos en vivo.

## Reglas que se digitalizan

### Evita las Plagas

- Siete plagas en orden.
- La compañía no puede avanzar sin completar la actual.
- El tiempo total corre desde el inicio hasta la séptima plaga.
- El ranking oficial es `TIME_ASC`: menor tiempo final válido.
- El top 3 recibe el premio del manual.
- La recompensa general no se decide automáticamente porque el manual tiene una inconsistencia entre carta de Atributo y carta de Desafío. Debe configurarse con coordinación.
- Una impugnación conserva el tiempo original y pasa el resultado a revisión.

### Cruza el Mar Rojo

- Diez desafíos secuenciales.
- Cada desafío validado entrega un cuadrado visual del camino.
- El cronómetro es continuo.
- Una penalización repite el desafío; no agrega segundos inventados.
- Solo se considera finalizada cuando el recorrido es correcto.
- El ranking oficial es `TIME_ASC` y el top 3 recibe premio especial.

### Escape del Desierto

- Seis retos entregan las letras `C A M I N O`.
- Se registra progreso y pistas, pero no se crea podio porque el manual no define ranking.
- Al completar se crea la recompensa grupal de carta de Atributo.

### Torneo de Maestros

- Cada compañía selecciona dos representantes.
- Fixture configurable con bye para cantidades que no sean potencia de dos.
- Cada encuentro es al mejor de tres.
- El ganador de una partida debe ser reemplazado en la siguiente.
- En empate de partidas se comparan los puntos reales acumulados.
- Finalistas: sobre de Atributo y Desafío. Campeón: además sobre de Avatar.

### Sigue la Música

- Ronda 1: posiciones por participantes en el centro, con puntos oficiales `10 / 7 / 5 / 3`.
- Ronda 2: coreografía e himno/canción, `+5` por desafío completado.
- Ronda 3: se registra participación, no se suman puntos porque el manual no los define.
- Un empate de Ronda 1 queda pendiente de decisión; la interfaz no inventa desempate.

### ¿Quién soy?

- No genera ranking.
- Se registran aciertos individuales con recompensa Atributo o Desafío.
- Al finalizar, todos reciben una carta extra de Atributo.

## Puntaje general

Solo Sigue la Música suma automáticamente porque el manual define valores. Evita las Plagas, Cruza el Mar Rojo y Torneo de Maestros muestran su ganador/ranking, pero no suman al total general hasta que ADMIN configure una conversión explícita de sesión. Esa conversión debe mostrar la etiqueta `Configuración de sesión` y nunca presentarse como regla oficial.

## Roles

- `ADMIN`: único usuario operativo del MVP; gestiona actividades, correcciones, impugnaciones, puntajes globales, premios y reinicios.

## Datos y Realtime

Los componentes consumen datos de `src/data/gamesData.ts` para mock y la interfaz `GamesRepository` de `src/data/gamesRepository.ts`. Para Supabase se puede reemplazar `mockGamesRepository` por `SupabaseGamesRepository` sin modificar las pantallas. El backend futuro debe ser la fuente de verdad, usar timestamps/versiones y publicar cambios de ranking después de confirmar cada resultado.
