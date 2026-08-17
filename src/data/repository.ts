import { companies as seedCompanies, exceptions as seedExceptions, participants as seedParticipants } from './mockData'
import type { Company, ExceptionItem, Participant } from '../types'

const PARTICIPANTS_KEY = 'meetup-2026-participants-v2'
const COMPANIES_KEY = 'meetup-2026-companies-v2'

function loadState<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function saveState(key: string, value: unknown) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

const initialParticipants = seedParticipants.map((participant) => ({ ...participant, isChurchMember: participant.isChurchMember ?? true, materials: { ...participant.materials } }))
const initialCompanies = seedCompanies.map((company) => ({ ...company, theme: { ...company.theme } }))
const validCompanyIds = new Set(initialCompanies.map((company) => company.id))
const storedParticipants = loadState<Participant[]>(PARTICIPANTS_KEY, initialParticipants)
const mergedParticipants = [...storedParticipants, ...initialParticipants.filter((participant) => !storedParticipants.some((stored) => stored.id === participant.id))]
const storedCompanies = loadState<Company[]>(COMPANIES_KEY, initialCompanies)
let participantsState: Participant[] = mergedParticipants.map((participant) => ({ ...participant, companyId: participant.companyId && validCompanyIds.has(participant.companyId) ? participant.companyId : undefined }))
let companiesState: Company[] = initialCompanies.map((company) => storedCompanies.find((stored) => stored.id === company.id) ?? company)

export const participantRepository = {
  list: () => participantsState,
  findById: (id: string) => participantsState.find((participant) => participant.id === id),
  update: (participant: Participant) => { participantsState = participantsState.map((item) => item.id === participant.id ? participant : item); saveState(PARTICIPANTS_KEY, participantsState) },
  add: (participant: Omit<Participant, 'id'>) => {
    const created = { ...participant, id: `guest-${Date.now()}` }
    participantsState = [...participantsState, created]
    if (created.companyId) companyRepository.increment(created.companyId)
    saveState(PARTICIPANTS_KEY, participantsState)
    return created
  }
}
export const companyRepository = {
  list: () => companiesState,
  findById: (id: string) => companiesState.find((company) => company.id === id),
  increment: (id: string) => { companiesState = companiesState.map((company) => company.id === id ? { ...company, currentSize: company.currentSize + 1 } : company); saveState(COMPANIES_KEY, companiesState) },
  assign: (participantId: string, companyId: string) => {
    const participant = participantsState.find((item) => item.id === participantId)
    if (!participant || participant.companyId === companyId || !companiesState.some((company) => company.id === companyId)) return participant
    if (participant.companyId) companiesState = companiesState.map((company) => company.id === participant.companyId ? { ...company, currentSize: Math.max(0, company.currentSize - 1) } : company)
    companiesState = companiesState.map((company) => company.id === companyId ? { ...company, currentSize: company.currentSize + 1 } : company)
    const updated = { ...participant, companyId }
    participantsState = participantsState.map((item) => item.id === participantId ? updated : item)
    saveState(PARTICIPANTS_KEY, participantsState)
    saveState(COMPANIES_KEY, companiesState)
    return updated
  }
}
export const exceptionRepository = { list: (): ExceptionItem[] => seedExceptions }

export function recommendCompany(participant: Participant) {
  const ordered = [...companiesState].sort((a, b) => a.currentSize - b.currentSize)
  const recommended = participant.isYouthLeader ? ordered.find((company) => !company.leaderParticipantId) ?? ordered[0] : ordered[0]
  return { company: recommended, reasons: ['Mejor balance', `${recommended.targetSize - recommended.currentSize} lugares disponibles`, participant.isYouthLeader ? 'Ayuda a distribuir líderes' : 'Distribuye el grupo'] }
}
