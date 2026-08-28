import type { CompanyActivityState, GameActivity, GameReward } from '../types'

export const gameActivities: GameActivity[] = [
  { id: 'who-am-i', order: 1, name: '¿Quién soy?', startTime: '09:30', durationMinutes: 35, scoreType: 'NONE', status: 'UPCOMING', globalPointsEnabled: false, description: 'Identidad, confianza y atributos dentro de cada compañía.', reward: 'Acierto individual: Atributo o Desafío · Final: Atributo para todos' },
  { id: 'plagues', order: 2, name: 'Evita las Plagas', startTime: '10:00', durationMinutes: 45, scoreType: 'TIME_ASC', status: 'UPCOMING', globalPointsEnabled: false, description: '7 desafíos secuenciales. Gana el menor tiempo total válido.', reward: 'Top 3: bolsa con caramelos · Participación: confirmar con coordinación', challengeCount: 7, introductionTime: '2–3 min', introductionDescription: 'Presentación de la actividad y explicación de las reglas.', challenges: ['La Tristeza — sketch', 'La Ignorancia — acertijo', 'La Indiferencia — cumpleaños', 'El Sedentarismo — encestar', 'El Ocio — torre de cartas', 'El Egoísmo — vestir compañero', 'La Desconfianza — recorrido vendado'], challengeTiming: ['2–3 min', '3–5 min', 'Sin tiempo límite; registrar cuánto tardan', 'Sin tiempo límite; todos deben encestar', 'Sin tiempo límite; mantener la torre armada 5 segundos', '2 min inicialmente; pueden seguir intentando', 'Sin tiempo límite especificado'] },
  { id: 'red-sea', order: 3, name: 'Cruza el Mar Rojo', startTime: '11:00', durationMinutes: 45, scoreType: 'TIME_ASC', status: 'UPCOMING', globalPointsEnabled: false, description: '10 desafíos en orden. Cada desafío completado da 1 bloque para avanzar por el Mar Rojo.', reward: 'Top 3: premio especial · Todos: carta de Desafío', challengeCount: 10, challenges: ['Pirámide humana — 10 personas, 3 niveles, 10 segundos', 'DNI terminado en 1 — conseguir 2 personas', 'Traer una flor — natural y fresca', 'Diario de Seminario — del año en curso', 'Saltar la cuerda — 3 saltos seguidos con cordones', 'Desayuno de Seminario — 3 ingredientes y una bebida', 'Recitar el lema — 2 integrantes, al unísono y sin errores', 'Comer una manzana sin manos — al menos 4 mordidas', 'Emboque o balero — lograr 2 embocadas', 'Memoria — nombrar en orden los 9 desafíos anteriores'] },
  { id: 'desert', order: 4, name: 'Escape del desierto', startTime: '13:00', durationMinutes: 45, scoreType: 'NONE', status: 'UPCOMING', globalPointsEnabled: false, description: '6 retos entregan las letras C-A-M-I-N-O. No hay ranking oficial.', reward: 'Carta de Atributo para todos', challengeCount: 6, challenges: ['La frase misteriosa del desierto — completar palabras usando escrituras', 'La fuerza invisible — explicar el experimento de presión atmosférica', 'PFJ y decisiones reales — relacionar casos con Para la Fortaleza de la Juventud', 'El número del maná — resolver una operación cuyo resultado es 40', 'El personaje incógnito — descubrir que es Josué', 'La llave de salida — elegir la llave correcta: Moisés'] },
  { id: 'masters', order: 5, name: 'Torneo de maestros', startTime: '14:00', durationMinutes: 60, scoreType: 'BRACKET', status: 'UPCOMING', globalPointsEnabled: false, description: 'Fixture entre compañías, 2 partidas por enfrentamiento.', reward: 'Finalistas: Atributo + Desafío · Campeón: además Avatar' },
  { id: 'music', order: 6, name: 'Sigue la música', startTime: '15:00', durationMinutes: 40, scoreType: 'POINTS_DESC', status: 'UPCOMING', globalPointsEnabled: true, description: 'Participación, identidad y celebración de compañía.', reward: 'Ronda 1: 10/7/5/3 · Ronda 2: +5 por desafío · Ronda 3: sin puntos', challengeCount: 3, challenges: ['Activación por compañía', 'Identidad: coreografía e himno', 'Celebración'] }
]

const redSeaProgress = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const redSeaTimes = [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
export const gameCompanyStates: CompanyActivityState[] = gameActivities.flatMap((activity): CompanyActivityState[] => {
  if (activity.id === 'red-sea') return redSeaProgress.map((progress, index) => ({ activityId: activity.id, companyId: `c${index + 1}`, status: progress === 10 ? 'FINISHED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED', progressCurrent: progress, progressTotal: 10, officialTimeMs: redSeaTimes[index] ? redSeaTimes[index] * 1000 : undefined, elapsedMs: progress ? (redSeaTimes[index] ?? 1300) * 1000 : undefined, underReview: false, lastUpdate: 'pendiente' }))
  if (activity.id === 'plagues') return Array.from({ length: 12 }, (_, index) => ({ activityId: activity.id, companyId: `c${index + 1}`, status: 'NOT_STARTED' as const, progressCurrent: 0, progressTotal: 7, lastUpdate: 'pendiente' }))
  if (activity.id === 'desert') return Array.from({ length: 12 }, (_, index) => ({ activityId: activity.id, companyId: `c${index + 1}`, status: 'NOT_STARTED' as const, progressCurrent: 0, progressTotal: 6, lastUpdate: 'pendiente' }))
  if (activity.id === 'who-am-i') return Array.from({ length: 12 }, (_, index) => ({ activityId: activity.id, companyId: `c${index + 1}`, status: 'NOT_STARTED' as const, progressCurrent: 0, progressTotal: 1, lastUpdate: 'pendiente' }))
  return Array.from({ length: 12 }, (_, index) => ({ activityId: activity.id, companyId: `c${index + 1}`, status: 'NOT_STARTED' as const, progressCurrent: 0, progressTotal: 1, lastUpdate: 'pendiente' }))
})

export const gameRewards: GameReward[] = [
  { id: 'r1', rewardKey: 'plagues-1-c4', activityId: 'plagues', companyId: 'c4', title: 'Bolsa con caramelos', reason: 'Evita las Plagas · 1.º mejor tiempo', status: 'PENDING' },
  { id: 'r2', rewardKey: 'redsea-1-c1', activityId: 'red-sea', companyId: 'c1', title: 'Premio especial', reason: 'Cruza el Mar Rojo · 1.º mejor tiempo', status: 'PENDING' },
  { id: 'r3', rewardKey: 'redsea-all', activityId: 'red-sea', title: 'Carta de DESAFÍO', reason: 'Cruza el Mar Rojo · Participación general', quantity: 15, status: 'PENDING' },
  { id: 'r4', rewardKey: 'who-am-i-c3', activityId: 'who-am-i', companyId: 'c3', title: '15 cartas de ATRIBUTO', reason: 'Participación final ¿Quién soy?', quantity: 15, status: 'PENDING' },
  { id: 'r6', rewardKey: 'overall-avatar', title: 'Sobre especial AVATAR mejoradas', reason: 'Ganador general del día · pendiente de configuración', status: 'PENDING' }
]

export const tournamentMatches: Array<{ id: string; round: string; companyAId: string; companyBId: string; status: 'PENDING' | 'LIVE' | 'FINISHED'; winnerCompanyId?: string }> = [
  { id: 'm1', round: 'Cuartos', companyAId: 'c1', companyBId: 'c8', status: 'PENDING' },
  { id: 'm2', round: 'Cuartos', companyAId: 'c4', companyBId: 'c5', status: 'PENDING' },
  { id: 'm3', round: 'Cuartos', companyAId: 'c2', companyBId: 'c7', status: 'PENDING' },
  { id: 'm4', round: 'Cuartos', companyAId: 'c3', companyBId: 'c6', status: 'PENDING' },
  { id: 'm5', round: 'Semifinal', companyAId: 'c1', companyBId: 'c4', status: 'PENDING' },
  { id: 'm6', round: 'Semifinal', companyAId: 'c2', companyBId: 'c3', status: 'PENDING' },
  { id: 'm7', round: 'Final', companyAId: 'c1', companyBId: 'c2', status: 'PENDING' }
]
