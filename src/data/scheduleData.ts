import type { ScheduleItem } from '../types'

export const scheduleItems: ScheduleItem[] = [
  { id: 'check-in', startTime: '08:30', endTime: '09:30', title: 'Check-in, bienvenida y video “Anda conmigo”', description: 'Recepción de participantes y comienzo del encuentro.', icon: 'arrival', kind: 'arrival' },
  { id: 'who-am-i', startTime: '09:30', endTime: '10:00', title: 'Rompehielo · ¿Quién soy?', description: 'Actividad para conocerse y entrar en clima.', icon: 'icebreaker', kind: 'activity' },
  { id: 'rotation-1', startTime: '10:00', endTime: '10:45', title: 'Ronda 1 · Actividades en paralelo', description: 'Tres actividades simultáneas. Cada grupo comienza en un espacio diferente.', icon: 'rotation', kind: 'activity', rotations: [{ title: 'Evita las Plagas', companies: 'Compañías 1 · 2 · 3', icon: 'plagues' }, { title: 'Cruza el Mar Rojo', companies: 'Compañías 4 · 5 · 6', icon: 'red-sea' }, { title: 'Escape del Desierto', companies: 'Compañías 7 · 8 · 9', icon: 'desert' }] },
  { id: 'cards-1', startTime: '10:45', endTime: '11:00', title: 'Mini Torneo de Cartas', description: 'Ronda breve del mini torneo de cartas.', icon: 'cards', kind: 'activity' },
  { id: 'rotation-2', startTime: '11:00', endTime: '11:45', title: 'Ronda 2 · Rotación', description: 'Cada grupo cambia de actividad.', icon: 'rotation', kind: 'activity', rotations: [{ title: 'Cruza el Mar Rojo', companies: 'Compañías 1 · 2 · 3', icon: 'red-sea' }, { title: 'Escape del Desierto', companies: 'Compañías 4 · 5 · 6', icon: 'desert' }, { title: 'Evita las Plagas', companies: 'Compañías 7 · 8 · 9', icon: 'plagues' }] },
  { id: 'cards-2', startTime: '11:45', endTime: '12:00', title: 'Mini Torneo de Cartas', description: 'Segunda ronda breve del mini torneo de cartas.', icon: 'cards', kind: 'activity' },
  { id: 'lunch', startTime: '12:00', endTime: '13:00', title: 'Almuerzo · Maná', description: 'Pausa para compartir el almuerzo.', icon: 'lunch', kind: 'break' },
  { id: 'rotation-3', startTime: '13:00', endTime: '14:00', title: 'Ronda 3 · Rotación final', description: 'Última rotación: las 9 compañías completan las tres actividades.', icon: 'rotation', kind: 'activity', rotations: [{ title: 'Escape del Desierto', companies: 'Compañías 1 · 2 · 3', icon: 'desert' }, { title: 'Evita las Plagas', companies: 'Compañías 4 · 5 · 6', icon: 'plagues' }, { title: 'Cruza el Mar Rojo', companies: 'Compañías 7 · 8 · 9', icon: 'red-sea' }] },
  { id: 'masters', startTime: '14:00', endTime: '15:00', title: 'Torneo de maestros de cartas MeetUP', description: 'Fixture entre compañías, 2 partidas por enfrentamiento.', icon: 'masters', kind: 'activity' },
  { id: 'music', startTime: '15:00', endTime: '16:00', title: 'Sigue la música', description: 'Actividad de compañía con identidad y celebración.', icon: 'music', kind: 'activity' },
  { id: 'snack', startTime: '16:00', endTime: '17:00', title: 'Merienda', description: 'Pausa para compartir y recargar energías.', icon: 'snack', kind: 'break' },
  { id: 'photo', startTime: '17:00', endTime: '17:30', title: 'Foto de sesión', description: 'Registro fotográfico de todo el encuentro.', icon: 'photo', kind: 'activity' },
  { id: 'devotional', startTime: '17:30', endTime: '18:30', title: 'Devocional', description: 'Actividad de sesión y cierre espiritual.', icon: 'devotional', kind: 'activity' },
  { id: 'closing', startTime: '18:30', title: 'Salida', description: 'Finalización del MeetUP 2026.', icon: 'closing', kind: 'closing' }
]
