import type { Company, ExceptionItem, Participant } from '../types'

const firstNames = ['Valentina', 'Tomás', 'Sofía', 'Mateo', 'Camila', 'Benjamín', 'Martina', 'Joaquín', 'Emilia', 'Nicolás', 'Delfina', 'Santiago', 'Agustina', 'Bruno', 'Renata', 'Lautaro', 'Julieta', 'Facundo', 'Milagros', 'Thiago']
const lastNames = ['Pereyra', 'Maidana', 'Ledesma', 'Acosta', 'Benítez', 'Ferreyra', 'Sosa', 'Cáceres', 'Vega', 'Roldán', 'Molina', 'Navarro']
const stakes = ['Estaca Horizonte', 'Estaca del Norte', 'Estaca Río Claro', 'Estaca Amanecer']
const wards = ['Barrio Centro', 'Barrio Los Álamos', 'Barrio Costanera', 'Barrio Esperanza', 'Barrio San Martín', 'Barrio La Colina', 'Barrio Las Heras', 'Barrio del Sol', 'Barrio Jardín', 'Barrio Oeste', 'Barrio Belgrano', 'Barrio Nuevo']

const companySizes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const companyThemes = ['lagoon', 'ember', 'cloud', 'gold', 'stone', 'path', 'lagoon', 'ember', 'cloud', 'gold', 'stone', 'path'] as const
const companyIcons = ['wave', 'fire', 'cloud', 'manna', 'mountain', 'path', 'star', 'fire', 'cloud', 'manna', 'mountain', 'path'] as const

export const companies: Company[] = companySizes.map((currentSize, index) => ({
  id: `c${index + 1}`,
  number: index + 1,
  name: `Compañía ${index + 1}`,
  targetSize: 20,
  currentSize,
  leaderParticipantId: `p${index + 20}`,
  theme: { colorToken: companyThemes[index], icon: companyIcons[index] }
}))

export const participants: Participant[] = Array.from({ length: 300 }, (_, index) => {
  const firstName = firstNames[index % firstNames.length]
  const lastName = lastNames[(index * 3) % lastNames.length]
  const isLeader = index >= 19 && index <= 33
  const checkedIn = false
  const companyIndex = undefined
  const authorizationStatus: Participant['authorizationStatus'] = 'pending'
  return {
    id: `p${index + 1}`,
    firstName,
    lastName,
    isChurchMember: true,
    stake: stakes[index % stakes.length],
    ward: wards[(index * 5) % wards.length],
    authorizationStatus,
    isYouthLeader: isLeader,
    checkedIn,
    checkedInAt: checkedIn ? `08:${String(18 + (index % 43)).padStart(2, '0')}` : undefined,
    checkedInBy: checkedIn ? 'Mariana' : undefined,
    companyId: companyIndex !== undefined ? companies[companyIndex].id : undefined,
    materials: { shirt: false, cardPack: false, credential: false },
    isException: false,
    notes: undefined
  }
})

// Nombres específicos para que las búsquedas de prueba se sientan naturales.
participants[0] = { ...participants[0], firstName: 'José María', lastName: 'Rodríguez', stake: 'Estaca Río Claro', ward: 'Barrio Costanera', checkedIn: false, checkedInAt: undefined, companyId: undefined }
participants[1] = { ...participants[1], firstName: 'Lucía', lastName: 'Gómez' }
participants[2] = { ...participants[2], firstName: 'Martín', lastName: 'Salvatierra' }

const testUserRows: [string, string, string, boolean, Participant['authorizationStatus'], boolean][] = [
  ['test-001', 'Ana', 'Torres', true, 'pending', false],
  ['test-002', 'Bruno', 'Mendez', true, 'confirmed', false],
  ['test-003', 'Carla', 'Ruiz', false, 'pending', false],
  ['test-004', 'Diego', 'Castro', true, 'confirmed', true],
  ['test-005', 'Elena', 'Vega', true, 'missing', false],
  ['test-006', 'Federico', 'Sosa', true, 'pending', false],
  ['test-007', 'Gabriela', 'Luna', false, 'confirmed', true],
  ['test-008', 'Hugo', 'Paz', true, 'confirmed', false],
  ['test-009', 'Ines', 'Rojas', true, 'pending', false],
  ['test-010', 'Javier', 'Molina', false, 'missing', false],
  ['test-011', 'Karen', 'Navarro', true, 'confirmed', true],
  ['test-012', 'Lucas', 'Benitez', true, 'pending', false]
]
const testUsers: Participant[] = testUserRows.map(([id, firstName, lastName, isChurchMember, authorizationStatus, checkedIn]) => ({ id, firstName, lastName, isChurchMember, stake: 'Estaca de prueba', ward: 'Barrio de prueba', authorizationStatus, isYouthLeader: false, checkedIn, checkedInAt: checkedIn ? '08:45' : undefined, checkedInBy: checkedIn ? 'Prueba' : undefined, materials: { shirt: false, cardPack: false, credential: false }, isException: false }))

participants.push(...testUsers)

const tournamentNames = ['Pablo Acosta', 'Rocio Molina', 'Sergio Vega', 'Natalia Roldan', 'Tomas Sosa', 'Marina Navarro', 'Gaston Pereyra', 'Clara Benitez', 'Martin Ledesma', 'Julieta Ferreyra', 'Nicolas Caceres', 'Paula Maidana', 'Bruno Rios', 'Agustina Castro', 'Facundo Luna', 'Milagros Paz', 'Santiago Duarte', 'Camila Torres']
const tournamentUsers: Participant[] = tournamentNames.map((fullName, index) => {
  const [firstName, lastName] = fullName.split(' ')
  return { id: `tournament-${String(index + 1).padStart(3, '0')}`, firstName, lastName, isChurchMember: true, stake: 'Estaca de torneo', ward: 'Barrio de torneo', authorizationStatus: 'confirmed', isYouthLeader: false, checkedIn: true, checkedInAt: '08:30', checkedInBy: 'Prueba', companyId: `c${Math.floor(index / 2) + 1}`, materials: { shirt: true, cardPack: true, credential: true }, isException: false }
})

participants.push(...tournamentUsers)

export const exceptions: ExceptionItem[] = [
  { id: 'e1', type: 'authorization', title: 'Autorización pendiente', participantName: 'Lucía Gómez', location: 'Barrio Centro · Estaca Horizonte', createdAt: '09:02', createdBy: 'Pedro', resolved: false },
  { id: 'e2', type: 'incomplete', title: 'Datos incompletos', participantName: 'Ramiro Villalba', location: 'Barrio del Sol · Estaca Amanecer', createdAt: '08:46', createdBy: 'Mariana', resolved: false },
  { id: 'e3', type: 'manual', title: 'Cambio manual de compañía', participantName: 'Martín Salvatierra', location: 'Barrio Costanera · Estaca Río Claro', createdAt: '08:21', createdBy: 'Pedro', resolved: true, resolvedBy: 'Ana', resolvedAt: '08:34' }
]
