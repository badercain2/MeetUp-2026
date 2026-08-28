import type { Company, ExceptionItem, Participant } from '../types'

const companySizes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const companyThemes = ['lagoon', 'ember', 'cloud', 'gold', 'stone', 'path', 'lagoon', 'ember', 'cloud', 'gold', 'stone', 'path'] as const
const companyIcons = ['wave', 'fire', 'cloud', 'manna', 'mountain', 'path', 'star', 'fire', 'cloud', 'manna', 'mountain', 'path'] as const

export const companies: Company[] = companySizes.map((currentSize, index) => ({
  id: `c${index + 1}`,
  number: index + 1,
  name: `Compañía ${index + 1}`,
  targetSize: 20,
  currentSize,
  theme: { colorToken: companyThemes[index], icon: companyIcons[index] }
}))

export const participants: Participant[] = [{ id: 'test-001', firstName: 'Usuario', lastName: 'de Prueba', isChurchMember: true, sex: 'HOMBRE', age: 14, birthDate: '2012-01-01', stake: 'Estaca de prueba', ward: 'Barrio de prueba', authorizationStatus: 'confirmed', isYouthLeader: false, checkedIn: false, materials: { shirt: false, cardPack: false, credential: false }, isException: false, dietaryInfo: 'Sin restricciones', shirtSize: 'M', companyId: 'c1' }]

export const exceptions: ExceptionItem[] = [
  { id: 'e1', type: 'authorization', title: 'Autorización pendiente', participantName: 'Lucía Gómez', location: 'Barrio Centro · Estaca Horizonte', createdAt: '09:02', createdBy: 'Pedro', resolved: false },
  { id: 'e2', type: 'incomplete', title: 'Datos incompletos', participantName: 'Ramiro Villalba', location: 'Barrio del Sol · Estaca Amanecer', createdAt: '08:46', createdBy: 'Mariana', resolved: false },
  { id: 'e3', type: 'manual', title: 'Cambio manual de compañía', participantName: 'Martín Salvatierra', location: 'Barrio Costanera · Estaca Río Claro', createdAt: '08:21', createdBy: 'Pedro', resolved: true, resolvedBy: 'Ana', resolvedAt: '08:34' }
]
