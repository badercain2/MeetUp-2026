import { companies as seedCompanies, exceptions as seedExceptions, participants as seedParticipants } from './mockData'
import { supabase } from './supabase/client'
import type { Company, CompanyActivityState, ExceptionItem, Participant } from '../types'

let participantsState: Participant[] = []
let companiesState: Company[] = []
let localMode = false
const localStorageKey = 'meetup-2026-local-data-v1'
type PendingLocalOperation =
  | { type: 'member'; participantId: string; isChurchMember: boolean }
  | { type: 'authorization'; participantId: string; authorizationStatus: Participant['authorizationStatus'] }
  | { type: 'medical'; participantId: string; medicalInfo: string }
  | { type: 'assign'; participantId: string; companyId: string }
  | { type: 'checkin'; participantId: string; companyId: string; materials: Participant['materials'] }
  | { type: 'revert'; participantId: string }
let pendingLocalOperations: PendingLocalOperation[] = []

function persistLocalState() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(localStorageKey, JSON.stringify({ participants: participantsState, companies: companiesState, pending: pendingLocalOperations }))
}

function loadLocalState() {
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(window.localStorage.getItem(localStorageKey) ?? 'null') as { participants?: Participant[]; companies?: Company[]; pending?: PendingLocalOperation[] } | null
      if (stored?.participants?.length && stored.companies?.length) {
        participantsState = stored.participants
        companiesState = stored.companies
        pendingLocalOperations = stored.pending ?? []
        return true
      }
    } catch {
      window.localStorage.removeItem(localStorageKey)
    }
  }
  participantsState = seedParticipants.map((participant) => ({ ...participant, materials: { ...participant.materials } }))
  companiesState = seedCompanies.map((company) => ({ ...company, theme: { ...company.theme } }))
  pendingLocalOperations = []
  persistLocalState()
  return participantsState.length > 0
}

export function activateLocalMode() {
  localMode = true
  if (participantsState.length && companiesState.length) {
    persistLocalState()
    return true
  }
  return loadLocalState()
}

export const isLocalMode = () => localMode

function queueLocalOperation(operation: PendingLocalOperation) {
  pendingLocalOperations = [...pendingLocalOperations, operation]
  persistLocalState()
}

function updateLocalParticipant(participantId: string, updater: (participant: Participant) => Participant) {
  const current = participantsState.find((participant) => participant.id === participantId)
  if (!current) throw new Error('No se encontró el participante en el modo local.')
  const updated = updater(current)
  participantsState = participantsState.map((participant) => participant.id === participantId ? updated : participant)
  persistLocalState()
  return updated
}

export const participantRepository = {
  list: () => participantsState,
  replace: (items: Participant[]) => { participantsState = items; if (localMode) persistLocalState() },
  findById: (id: string) => participantsState.find((participant) => participant.id === id),
  update: (participant: Participant) => { participantsState = participantsState.map((item) => item.id === participant.id ? participant : item); if (localMode) persistLocalState() }
}
export const companyRepository = {
  list: () => companiesState,
  replace: (items: Company[]) => { companiesState = items; if (localMode) persistLocalState() },
  findById: (id: string) => companiesState.find((company) => company.id === id),
  assign: (participantId: string, companyId: string) => {
    const participant = participantsState.find((item) => item.id === participantId)
    if (!participant || participant.companyId === companyId || !companiesState.some((company) => company.id === companyId)) return participant
    if (participant.companyId) companiesState = companiesState.map((company) => company.id === participant.companyId ? { ...company, currentSize: Math.max(0, company.currentSize - 1), checkedInSize: participant.checkedIn ? Math.max(0, (company.checkedInSize ?? 0) - 1) : company.checkedInSize } : company)
    companiesState = companiesState.map((company) => company.id === companyId ? { ...company, currentSize: company.currentSize + 1, checkedInSize: participant.checkedIn ? (company.checkedInSize ?? 0) + 1 : company.checkedInSize } : company)
    const updated = { ...participant, companyId }
    participantsState = participantsState.map((item) => item.id === participantId ? updated : item)
    if (localMode) persistLocalState()
    return updated
  }
}
export const exceptionRepository = { list: (): ExceptionItem[] => seedExceptions }

export interface RemoteTournamentBoard {
  groupWinners: Record<string, string>
  finalPlaces: Record<string, string>
  groupAssignments: Record<string, string[]>
}

export interface RemoteGameBoard {
  statesByActivity: Record<string, CompanyActivityState[]>
  tournament: RemoteTournamentBoard | null
  pointsByCompany: Record<string, number>
}

const activityIdByOrder: Record<number, string> = { 1: 'who-am-i', 2: 'plagues', 3: 'red-sea', 4: 'desert', 5: 'masters', 6: 'music' }
const activityProgressTotals: Record<string, number> = { 'who-am-i': 1, plagues: 7, 'red-sea': 10, desert: 6, masters: 0, music: 3 }
const activityOrderById: Record<string, number> = Object.fromEntries(Object.entries(activityIdByOrder).map(([order, id]) => [id, Number(order)]))

export async function loadRemoteGameBoard(eventId: string): Promise<RemoteGameBoard> {
  const [{ data: activities, error: activitiesError }, { data: companies, error: companiesError }] = await Promise.all([
    supabase.from('activities').select('id, order_number').eq('event_id', eventId).order('order_number'),
    supabase.from('companies').select('id, number').eq('event_id', eventId).order('number')
  ])
  if (activitiesError || companiesError) throw activitiesError ?? companiesError

  const activityIds = (activities ?? []).map((activity) => activity.id)
  const [{ data: remoteStates, error: statesError }, { data: results, error: resultsError }, { data: tournaments, error: tournamentsError }] = await Promise.all([
    activityIds.length ? supabase.from('company_activity_states').select('*').in('activity_id', activityIds) : Promise.resolve({ data: [], error: null }),
    activityIds.length ? supabase.from('activity_results').select('activity_id, company_id, points, is_official, status').in('activity_id', activityIds) : Promise.resolve({ data: [], error: null }),
    supabase.from('tournaments').select('id, manual_group_winners, manual_final_places, group_assignments').eq('event_id', eventId).order('created_at', { ascending: false }).limit(1)
  ])
  if (statesError || resultsError || tournamentsError) throw statesError ?? resultsError ?? tournamentsError

  const activityKeyById = new Map((activities ?? []).map((activity) => [activity.id, activityIdByOrder[activity.order_number] ?? `activity-${activity.order_number}`]))
  const companyIds = (companies ?? []).map((company) => company.id)
  const stateByActivity = new Map<string, CompanyActivityState[]>()
  for (const activity of activities ?? []) {
    const activityKey = activityKeyById.get(activity.id)
    if (!activityKey) continue
    const states = (companies ?? []).map((company) => {
      const uiCompanyId = `c${company.number}`
      const remote = (remoteStates ?? []).find((state) => state.activity_id === activity.id && state.company_id === company.id)
      return remote ? {
        activityId: activityKey,
        companyId: uiCompanyId,
        status: remote.status as CompanyActivityState['status'],
        progressCurrent: remote.progress_current,
        progressTotal: remote.progress_total || activityProgressTotals[activityKey] || 0,
        elapsedMs: remote.elapsed_ms ?? undefined,
        officialTimeMs: remote.official_time_ms ?? undefined,
        points: remote.points === null ? undefined : Number(remote.points),
        underReview: remote.under_review,
        lastUpdate: remote.updated_at ? new Date(remote.updated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'pendiente'
      } : {
        activityId: activityKey,
        companyId: uiCompanyId,
        status: 'NOT_STARTED' as const,
        progressCurrent: 0,
        progressTotal: activityProgressTotals[activityKey] || 0,
        lastUpdate: 'pendiente'
      }
    })
    stateByActivity.set(activityKey, states)
  }

  const pointsByCompany: Record<string, number> = Object.fromEntries(companyIds.map((companyId) => [companyId, 0]))
  for (const state of remoteStates ?? []) {
    if (state.points !== null && state.points !== undefined) pointsByCompany[state.company_id] = (pointsByCompany[state.company_id] ?? 0) + Number(state.points)
  }
  if (!Object.values(pointsByCompany).some((points) => points > 0)) {
    for (const result of results ?? []) {
      if (result.company_id && result.is_official && result.points !== null && result.points !== undefined) pointsByCompany[result.company_id] = (pointsByCompany[result.company_id] ?? 0) + Number(result.points)
    }
  }

  const tournament = tournaments?.[0]
  return {
    statesByActivity: Object.fromEntries(stateByActivity),
    pointsByCompany,
    tournament: tournament ? {
      groupWinners: (tournament.manual_group_winners ?? {}) as Record<string, string>,
      finalPlaces: (tournament.manual_final_places ?? {}) as Record<string, string>,
      groupAssignments: (tournament.group_assignments ?? {}) as Record<string, string[]>
    } : null
  }
}

export async function saveRemoteGameStates(eventId: string, activityId: string, states: CompanyActivityState[]) {
  const [{ data: activity, error: activityError }, { data: companies, error: companiesError }] = await Promise.all([
    supabase.from('activities').select('id').eq('event_id', eventId).eq('order_number', activityOrderById[activityId]).single(),
    supabase.from('companies').select('id, number').eq('event_id', eventId)
  ])
  if (activityError || companiesError) throw activityError ?? companiesError
  const companyIdByUiId = new Map((companies ?? []).map((company) => [`c${company.number}`, company.id]))
  const updatedAt = new Date().toISOString()
  const rows = states.map((state) => {
    const companyId = companyIdByUiId.get(state.companyId)
    if (state.activityId !== activityId || !companyId) throw new Error(`Estado de juego inválido para ${state.companyId}.`)
    return {
      activity_id: activity.id,
      company_id: companyId,
      status: state.status,
      progress_current: state.progressCurrent,
      progress_total: state.progressTotal,
      elapsed_ms: state.elapsedMs ?? null,
      official_time_ms: state.officialTimeMs ?? null,
      points: state.points ?? null,
      under_review: state.underReview ?? false,
      updated_at: updatedAt
    }
  })
  const { error } = await supabase.from('company_activity_states').upsert(rows, { onConflict: 'activity_id,company_id' })
  if (error) throw error
}

export async function saveRemoteTournament(eventId: string, board: RemoteTournamentBoard) {
  const { data: activity, error: activityError } = await supabase.from('activities').select('id').eq('event_id', eventId).eq('order_number', 5).single()
  if (activityError) throw activityError
  const { data: current, error: currentError } = await supabase.from('tournaments').select('id').eq('event_id', eventId).order('created_at', { ascending: false }).limit(1)
  if (currentError) throw currentError
  const payload = { event_id: eventId, activity_id: activity.id, name: 'Torneo de Maestros', fixture_version: 'GROUPS_THREE_TO_FINAL', manual_group_winners: board.groupWinners, manual_final_places: board.finalPlaces, group_assignments: board.groupAssignments }
  if (current?.[0]?.id) {
    const { error } = await supabase.from('tournaments').update(payload).eq('id', current[0].id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('tournaments').insert(payload)
    if (error) throw error
  }
}

export async function saveRemoteMusicPoints(eventId: string, scores: Record<string, number>) {
  const { data: activity, error: activityError } = await supabase.from('activities').select('id').eq('event_id', eventId).eq('order_number', 6).single()
  if (activityError) throw activityError
  const rows = Object.entries(scores).map(([companyId, points]) => ({ activity_id: activity.id, company_id: companyId, status: 'NOT_STARTED', progress_current: 0, progress_total: 3, points }))
  const { error } = await supabase.from('company_activity_states').upsert(rows, { onConflict: 'activity_id,company_id' })
  if (error) throw error
}

async function hydrateRemoteRepositories(eventId: string) {
  const [{ data: remoteParticipants, error: participantError }, { data: remoteCompanies, error: companyError }, { data: memberships }, { data: checkins }, { data: materials }] = await Promise.all([
    supabase.from('participants').select('*').eq('event_id', eventId),
    supabase.from('companies').select('*').eq('event_id', eventId).order('number'),
    supabase.from('company_memberships').select('participant_id, company_id').eq('event_id', eventId).eq('is_current', true),
    supabase.from('checkins').select('participant_id, checked_in_at, checked_in_by, company_id').eq('event_id', eventId),
    supabase.from('material_deliveries').select('participant_id, shirt_delivered, card_pack_delivered, credential_delivered').eq('event_id', eventId)
  ])
  if (participantError || companyError) throw participantError ?? companyError
  if (!remoteParticipants?.length || !remoteCompanies?.length) return false

  const membershipByParticipant = new Map((memberships ?? []).map((membership) => [membership.participant_id, membership.company_id]))
  const checkinByParticipant = new Map((checkins ?? []).map((checkin) => [checkin.participant_id, checkin]))
  const checkedInParticipantIds = new Set((checkins ?? []).map((checkin) => checkin.participant_id))
  const materialsByParticipant = new Map((materials ?? []).map((delivery) => [delivery.participant_id, delivery]))
  const mappedParticipants: Participant[] = remoteParticipants.map((participant) => {
    const checkin = checkinByParticipant.get(participant.id)
    const delivery = materialsByParticipant.get(participant.id)
    return { id: participant.id, firstName: participant.first_name, lastName: participant.last_name, isChurchMember: participant.is_church_member, sex: participant.sex as Participant['sex'] ?? undefined, age: participant.age ?? undefined, birthDate: participant.birth_date ?? undefined, stake: participant.stake, ward: participant.ward, authorizationStatus: participant.authorization_status, isYouthLeader: participant.is_youth_leader, checkedIn: Boolean(participant.checking), checkedInAt: checkin?.checked_in_at ? new Date(checkin.checked_in_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : undefined, checkedInBy: checkin?.checked_in_by ?? undefined, companyId: membershipByParticipant.get(participant.id), materials: { shirt: Boolean(delivery?.shirt_delivered), cardPack: Boolean(delivery?.card_pack_delivered), credential: Boolean(delivery?.credential_delivered) }, isException: participant.is_exception, notes: participant.notes, medicalInfo: participant.medical_info ?? undefined, dietaryInfo: participant.dietary_info ?? undefined, shirtSize: participant.shirt_size ?? undefined }
  })
  const mappedCompanies: Company[] = remoteCompanies.map((company) => ({ id: company.id, number: company.number, name: company.name, targetSize: company.target_size, currentSize: (memberships ?? []).filter((membership) => membership.company_id === company.id).length, checkedInSize: (memberships ?? []).filter((membership) => membership.company_id === company.id && checkedInParticipantIds.has(membership.participant_id)).length, leaderParticipantId: company.leader_participant_id ?? undefined, theme: { colorToken: company.theme_color_token as Company['theme']['colorToken'], icon: company.theme_icon as Company['theme']['icon'] } }))
  participantRepository.replace(mappedParticipants)
  companyRepository.replace(mappedCompanies)
  persistLocalState()
  return true
}

export async function hydrateRepositories(eventId: string) {
  if (localMode) return loadLocalState()
  try {
    return await hydrateRemoteRepositories(eventId)
  } catch (error) {
    console.warn('Supabase no está disponible; se usará la copia local.', error)
    return activateLocalMode()
  }
}

export async function syncLocalChanges(eventId: string) {
  if (!localMode || pendingLocalOperations.length === 0) return false
  const operations = [...pendingLocalOperations]
  localMode = false
  try {
    for (const operation of operations) {
      if (operation.type === 'member') {
        const { error } = await supabase.from('participants').update({ is_church_member: operation.isChurchMember }).eq('id', operation.participantId)
        if (error) throw error
      } else if (operation.type === 'authorization') {
        const { error } = await supabase.from('participants').update({ authorization_status: operation.authorizationStatus, is_exception: operation.authorizationStatus !== 'confirmed' }).eq('id', operation.participantId)
        if (error) throw error
      } else if (operation.type === 'medical') {
        const { error } = await supabase.from('participants').update({ medical_info: operation.medicalInfo || null }).eq('id', operation.participantId)
        if (error) throw error
      } else if (operation.type === 'assign') {
        const { error } = await supabase.rpc('assign_participant_company', { p_participant_id: operation.participantId, p_company_id: operation.companyId })
        if (error) throw error
      } else if (operation.type === 'checkin') {
        const { error } = await supabase.rpc('register_checkin', { p_participant_id: operation.participantId, p_requested_company_id: operation.companyId, p_shirt_delivered: operation.materials.shirt, p_card_pack_delivered: operation.materials.cardPack, p_credential_delivered: operation.materials.credential })
        if (error) throw error
      } else if (operation.type === 'revert') {
        const { error } = await supabase.rpc('revert_checkin', { p_participant_id: operation.participantId })
        if (error) throw error
      }
    }
    const hydrated = await hydrateRemoteRepositories(eventId)
    if (!hydrated) throw new Error('No se pudo confirmar la sincronización local.')
    pendingLocalOperations = []
    persistLocalState()
    return true
  } catch (error) {
    localMode = true
    console.warn('Todavía no se pudieron sincronizar los cambios locales.', error)
    return false
  }
}

export async function registerCheckin(participantId: string, companyId: string | undefined, materials: Participant['materials']) {
  if (localMode) return registerLocalCheckin(participantId, companyId, materials)
  try {
    const { data, error } = await supabase.rpc('register_checkin', {
      p_participant_id: participantId,
      p_requested_company_id: companyId ?? null,
      p_shirt_delivered: materials.shirt,
      p_card_pack_delivered: materials.cardPack,
      p_credential_delivered: materials.credential
    })
    if (error) throw new Error([error.message, error.details, error.hint].filter(Boolean).join(' · '))
    return data as { company_id: string; checked_in_at: string }
  } catch (error) {
    console.warn('No se pudo registrar el check-in remoto; se guardará localmente.', error)
    activateLocalMode()
    return registerLocalCheckin(participantId, companyId, materials)
  }
}

function registerLocalCheckin(participantId: string, companyId: string | undefined, materials: Participant['materials']) {
  const participant = participantRepository.findById(participantId)
  if (!participant) throw new Error('No se encontró el participante en el modo local.')
  if (participant.checkedIn) throw new Error('Este participante ya tiene check-in.')
  const selectedCompanyId = companyId ?? participant.companyId
  if (!selectedCompanyId) throw new Error('El participante necesita una compañía para registrar el check-in.')
  if (participant.companyId !== selectedCompanyId) companyRepository.assign(participantId, selectedCompanyId)
  const checkedInAt = new Date().toISOString()
  updateLocalParticipant(participantId, (current) => ({ ...current, companyId: selectedCompanyId, checkedIn: true, checkedInAt: new Date(checkedInAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), checkedInBy: 'LOCAL', materials: { ...materials } }))
  companiesState = companiesState.map((company) => company.id === selectedCompanyId ? { ...company, checkedInSize: (company.checkedInSize ?? 0) + 1 } : company)
  queueLocalOperation({ type: 'checkin', participantId, companyId: selectedCompanyId, materials })
  persistLocalState()
  return { company_id: selectedCompanyId, checked_in_at: checkedInAt }
}

export async function revertCheckin(participantId: string) {
  if (localMode) return revertLocalCheckin(participantId)
  try {
    const { data, error } = await supabase.rpc('revert_checkin', { p_participant_id: participantId })
    if (error) {
      if (error.code === '42883' || error.message.includes('revert_checkin')) throw new Error('Supabase todavía no tiene aplicada la migración de deshacer check-in (00009/00010).')
      throw error
    }
    const { data: remainingCheckins, error: verificationError } = await supabase.from('checkins').select('id').eq('participant_id', participantId).limit(1)
    if (verificationError) throw verificationError
    if (remainingCheckins?.length) throw new Error('La base confirmó la operación, pero el check-in todavía aparece registrado. Revisá las migraciones 00009/00010 en Supabase.')
    return data as { participant_id: string; company_id: string }
  } catch (error) {
    console.warn('No se pudo revertir el check-in remoto; se guardará localmente.', error)
    activateLocalMode()
    return revertLocalCheckin(participantId)
  }
}

function revertLocalCheckin(participantId: string) {
  const participant = participantRepository.findById(participantId)
  if (!participant) throw new Error('No se encontró el participante en el modo local.')
  const companyId = participant.companyId
  if (companyId) companiesState = companiesState.map((company) => company.id === companyId ? { ...company, currentSize: Math.max(0, company.currentSize - 1), checkedInSize: participant.checkedIn ? Math.max(0, (company.checkedInSize ?? 0) - 1) : company.checkedInSize } : company)
  updateLocalParticipant(participantId, (current) => ({ ...current, companyId: undefined, checkedIn: false, checkedInAt: undefined, checkedInBy: undefined, materials: { shirt: false, cardPack: false, credential: false } }))
  queueLocalOperation({ type: 'revert', participantId })
  persistLocalState()
  return { participant_id: participantId, company_id: companyId ?? '' }
}

export async function updateParticipantAuthorization(participantId: string, authorizationStatus: Participant['authorizationStatus']) {
  if (localMode) {
    updateLocalParticipant(participantId, (participant) => ({ ...participant, authorizationStatus, isException: authorizationStatus !== 'confirmed' }))
    queueLocalOperation({ type: 'authorization', participantId, authorizationStatus })
    return
  }
  try {
    const { error } = await supabase
      .from('participants')
      .update({ authorization_status: authorizationStatus, is_exception: authorizationStatus !== 'confirmed' })
      .eq('id', participantId)
    if (error) throw error
  } catch (error) {
    console.warn('No se pudo actualizar la autorización remota; se guardará localmente.', error)
    activateLocalMode()
    updateLocalParticipant(participantId, (participant) => ({ ...participant, authorizationStatus, isException: authorizationStatus !== 'confirmed' }))
  }
}

export async function updateParticipantMemberStatus(participantId: string, isChurchMember: boolean) {
  if (localMode) {
    updateLocalParticipant(participantId, (participant) => ({ ...participant, isChurchMember }))
    queueLocalOperation({ type: 'member', participantId, isChurchMember })
    return
  }
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_church_member: isChurchMember })
      .eq('id', participantId)
    if (error) throw error
  } catch (error) {
    console.warn('No se pudo actualizar el estado de miembro remoto; se guardará localmente.', error)
    activateLocalMode()
    updateLocalParticipant(participantId, (participant) => ({ ...participant, isChurchMember }))
  }
}

export async function assignParticipantCompany(participantId: string, companyId: string) {
  if (localMode) {
    const updated = companyRepository.assign(participantId, companyId)
    if (!updated) throw new Error('No se encontró el participante en el modo local.')
    queueLocalOperation({ type: 'assign', participantId, companyId })
    return { participant_id: participantId, company_id: companyId }
  }
  try {
    const { data, error } = await supabase.rpc('assign_participant_company', { p_participant_id: participantId, p_company_id: companyId })
    if (error) throw new Error([error.message, error.details, error.hint].filter(Boolean).join(' · '))
    return data as { participant_id: string; company_id: string }
  } catch (error) {
    console.warn('No se pudo guardar la compañía remota; se guardará localmente.', error)
    activateLocalMode()
    const updated = companyRepository.assign(participantId, companyId)
    if (!updated) throw error
    return { participant_id: participantId, company_id: companyId }
  }
}

export async function createVisitor(eventId: string, input: { firstName: string; lastName: string; origin: string; companyId?: string }) {
  if (localMode) {
    const id = `local-${Date.now()}`
    const participant: Participant = { id, firstName: input.firstName, lastName: input.lastName, isChurchMember: false, stake: 'Visitante', ward: input.origin || 'Procedencia no registrada', authorizationStatus: 'pending', isYouthLeader: false, checkedIn: false, materials: { shirt: false, cardPack: false, credential: false }, isException: false, companyId: input.companyId }
    participantsState = [...participantsState, participant]
    companiesState = companiesState.map((company) => company.id === input.companyId ? { ...company, currentSize: company.currentSize + 1 } : company)
    persistLocalState()
    return participant
  }
  try {
    const { data, error } = await supabase
      .from('participants')
      .insert({ event_id: eventId, first_name: input.firstName, last_name: input.lastName, stake: 'Visitante', ward: input.origin || 'Procedencia no registrada', is_church_member: false, authorization_status: 'pending', is_youth_leader: false, is_exception: false, notes: 'Visitante agregado en el evento.' })
      .select('id')
      .single()
    if (error) throw error
    if (input.companyId) await assignParticipantCompany(data.id, input.companyId)
    await hydrateRepositories(eventId)
    const participant = participantRepository.findById(data.id)
    if (!participant) throw new Error('No se pudo cargar el visitante creado.')
    return participant
  } catch (error) {
    console.warn('No se pudo guardar el visitante remoto; se guardará localmente.', error)
    activateLocalMode()
    return createVisitor(eventId, input)
  }
}

export async function importParticipants(eventId: string, participants: Participant[]) {
  if (localMode) return importParticipantsLocally(participants)
  const [{ data: existing, error: existingError }, { data: remoteCompanies, error: companyError }] = await Promise.all([
    supabase
    .from('participants')
    .select('id, first_name, last_name, birth_date, age, stake, ward')
    .eq('event_id', eventId),
    supabase.from('companies').select('id, number').eq('event_id', eventId).eq('active', true)
  ])
  if (existingError) throw existingError
  if (companyError) throw companyError
  const participantKey = (participant: Pick<Participant, 'firstName' | 'lastName' | 'birthDate' | 'age' | 'stake' | 'ward'>) => [participant.firstName, participant.lastName, participant.birthDate ?? '', participant.age ?? '', participant.stake, participant.ward].map((value) => String(value).trim().toLocaleLowerCase('es')).join('|')
  const existingByKey = new Map((existing ?? []).map((participant) => [`${participant.first_name}|${participant.last_name}|${participant.birth_date ?? ''}|${participant.age ?? ''}|${participant.stake}|${participant.ward}`.trim().toLocaleLowerCase('es'), participant]))
  const rows = participants
    .filter((participant) => !existingByKey.has(participantKey(participant)))
    .map((participant) => ({
      event_id: eventId,
      first_name: participant.firstName,
      last_name: participant.lastName,
      stake: participant.stake,
      ward: participant.ward,
      sex: participant.sex ?? null,
      age: participant.age ?? null,
      birth_date: participant.birthDate ?? null,
      is_youth_leader: participant.isYouthLeader,
      is_church_member: participant.isChurchMember,
      authorization_status: participant.authorizationStatus,
      is_exception: participant.isException,
      notes: participant.notes ?? null,
      medical_info: participant.medicalInfo ?? null,
      dietary_info: participant.dietaryInfo ?? null,
      shirt_size: participant.shirtSize ?? null
    }))
  const { data: inserted, error: insertError } = rows.length
    ? await supabase.from('participants').insert(rows).select('id, first_name, last_name, birth_date, age, stake, ward')
    : { data: [], error: null }
  if (insertError) throw insertError
  const participantIdByKey = new Map<string, string>()
  for (const participant of existing ?? []) participantIdByKey.set(`${participant.first_name}|${participant.last_name}|${participant.birth_date ?? ''}|${participant.age ?? ''}|${participant.stake}|${participant.ward}`.trim().toLocaleLowerCase('es'), participant.id)
  for (const participant of inserted ?? []) participantIdByKey.set(`${participant.first_name}|${participant.last_name}|${participant.birth_date ?? ''}|${participant.age ?? ''}|${participant.stake}|${participant.ward}`.trim().toLocaleLowerCase('es'), participant.id)
  const updates = participants
    .map((participant) => ({ participant, id: participantIdByKey.get(participantKey(participant)) }))
    .filter((item): item is { participant: Participant; id: string } => Boolean(item.id))
    .map(({ participant, id }) => supabase.from('participants').update({ first_name: participant.firstName, last_name: participant.lastName, stake: participant.stake, ward: participant.ward, sex: participant.sex ?? null, age: participant.age ?? null, birth_date: participant.birthDate ?? null, is_youth_leader: participant.isYouthLeader, is_church_member: participant.isChurchMember, notes: participant.notes ?? null, medical_info: participant.medicalInfo ?? null, dietary_info: participant.dietaryInfo ?? null, shirt_size: participant.shirtSize ?? null }).eq('id', id))
  const updateResults = await Promise.all(updates)
  const updateError = updateResults.find((result) => result.error)?.error
  if (updateError) throw updateError
  const companyIdByNumber = new Map((remoteCompanies ?? []).map((company) => [company.number, company.id]))
  const membershipRows = participants.flatMap((participant) => {
    const participantId = participantIdByKey.get(participantKey(participant))
    const companyId = participant.companyNumber ? companyIdByNumber.get(participant.companyNumber) : undefined
    return participantId && companyId ? [{ event_id: eventId, participant_id: participantId, company_id: companyId, assignment_source: 'PREASSIGNED', is_current: true }] : []
  })
  if (membershipRows.length) {
    const participantIds = membershipRows.map((membership) => membership.participant_id)
    const { error: closeError } = await supabase.from('company_memberships').update({ is_current: false }).eq('event_id', eventId).eq('is_current', true).in('participant_id', participantIds)
    if (closeError) throw closeError
    const { error: membershipError } = await supabase.from('company_memberships').insert(membershipRows)
    if (membershipError) throw membershipError
  }
  await hydrateRepositories(eventId)
  return rows.length
}

function importParticipantsLocally(items: Participant[]) {
  const key = (participant: Participant) => [participant.firstName, participant.lastName, participant.birthDate ?? '', participant.age ?? '', participant.stake, participant.ward].map((value) => String(value).trim().toLocaleLowerCase('es')).join('|')
  const existing = new Set(participantsState.map(key))
  let imported = 0
  for (const item of items) {
    if (existing.has(key(item))) continue
    const company = item.companyNumber ? companiesState.find((candidate) => candidate.number === item.companyNumber) : undefined
    const participant = { ...item, id: `local-import-${Date.now()}-${imported}`, companyId: company?.id }
    participantsState = [...participantsState, participant]
    if (company) companiesState = companiesState.map((candidate) => candidate.id === company.id ? { ...candidate, currentSize: candidate.currentSize + 1 } : candidate)
    existing.add(key(item))
    imported += 1
  }
  persistLocalState()
  return imported
}

export async function updateParticipantMedicalInfo(participantId: string, medicalInfo: string) {
  if (localMode) {
    updateLocalParticipant(participantId, (participant) => ({ ...participant, medicalInfo: medicalInfo || undefined }))
    queueLocalOperation({ type: 'medical', participantId, medicalInfo })
    return
  }
  try {
    const { error } = await supabase.from('participants').update({ medical_info: medicalInfo || null }).eq('id', participantId)
    if (error) throw error
  } catch (error) {
    console.warn('No se pudo actualizar la información médica remota; se guardará localmente.', error)
    activateLocalMode()
    updateLocalParticipant(participantId, (participant) => ({ ...participant, medicalInfo: medicalInfo || undefined }))
  }
}

export function recommendCompany(participant: Participant) {
  const ordered = [...companiesState].sort((a, b) => a.currentSize - b.currentSize)
  const recommended = participant.isYouthLeader ? ordered.find((company) => !company.leaderParticipantId) ?? ordered[0] : ordered[0]
  return { company: recommended, reasons: ['Mejor balance', `${recommended.targetSize - recommended.currentSize} lugares disponibles`, participant.isYouthLeader ? 'Ayuda a distribuir líderes' : 'Distribuye el grupo'] }
}
