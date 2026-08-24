import { exceptions as seedExceptions } from './mockData'
import { supabase } from './supabase/client'
import type { Company, CompanyActivityState, ExceptionItem, Participant } from '../types'

let participantsState: Participant[] = []
let companiesState: Company[] = []

export const participantRepository = {
  list: () => participantsState,
  replace: (items: Participant[]) => { participantsState = items },
  findById: (id: string) => participantsState.find((participant) => participant.id === id),
  update: (participant: Participant) => { participantsState = participantsState.map((item) => item.id === participant.id ? participant : item) }
}
export const companyRepository = {
  list: () => companiesState,
  replace: (items: Company[]) => { companiesState = items },
  findById: (id: string) => companiesState.find((company) => company.id === id),
  assign: (participantId: string, companyId: string) => {
    const participant = participantsState.find((item) => item.id === participantId)
    if (!participant || participant.companyId === companyId || !companiesState.some((company) => company.id === companyId)) return participant
    if (participant.companyId) companiesState = companiesState.map((company) => company.id === participant.companyId ? { ...company, currentSize: Math.max(0, company.currentSize - 1) } : company)
    companiesState = companiesState.map((company) => company.id === companyId ? { ...company, currentSize: company.currentSize + 1 } : company)
    const updated = { ...participant, companyId }
    participantsState = participantsState.map((item) => item.id === participantId ? updated : item)
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
  const rows = states.map((state) => ({
    activity_id: activity.id,
    company_id: companyIdByUiId.get(state.companyId) ?? state.companyId,
    status: state.status,
    progress_current: state.progressCurrent,
    progress_total: state.progressTotal,
    elapsed_ms: state.elapsedMs ?? null,
    official_time_ms: state.officialTimeMs ?? null,
    points: state.points ?? null,
    under_review: state.underReview ?? false
  }))
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

export async function hydrateRepositories(eventId: string) {
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
  const materialsByParticipant = new Map((materials ?? []).map((delivery) => [delivery.participant_id, delivery]))
  const mappedParticipants: Participant[] = remoteParticipants.map((participant) => {
    const checkin = checkinByParticipant.get(participant.id)
    const delivery = materialsByParticipant.get(participant.id)
    return { id: participant.id, firstName: participant.first_name, lastName: participant.last_name, isChurchMember: participant.is_church_member, sex: participant.sex as Participant['sex'] ?? undefined, age: participant.age ?? undefined, stake: participant.stake, ward: participant.ward, authorizationStatus: participant.authorization_status, isYouthLeader: participant.is_youth_leader, checkedIn: Boolean(participant.checking), checkedInAt: checkin?.checked_in_at ? new Date(checkin.checked_in_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : undefined, checkedInBy: checkin?.checked_in_by ?? undefined, companyId: membershipByParticipant.get(participant.id), materials: { shirt: Boolean(delivery?.shirt_delivered), cardPack: Boolean(delivery?.card_pack_delivered), credential: Boolean(delivery?.credential_delivered) }, isException: participant.is_exception, notes: participant.notes, medicalInfo: participant.medical_info ?? undefined, shirtSize: participant.shirt_size ?? undefined }
  })
  const mappedCompanies: Company[] = remoteCompanies.map((company) => ({ id: company.id, number: company.number, name: company.name, targetSize: company.target_size, currentSize: (memberships ?? []).filter((membership) => membership.company_id === company.id).length, leaderParticipantId: company.leader_participant_id ?? undefined, theme: { colorToken: company.theme_color_token as Company['theme']['colorToken'], icon: company.theme_icon as Company['theme']['icon'] } }))
  participantRepository.replace(mappedParticipants)
  companyRepository.replace(mappedCompanies)
  return true
}

export async function registerCheckin(participantId: string, companyId: string | undefined, materials: Participant['materials']) {
  const { data, error } = await supabase.rpc('register_checkin', {
    p_participant_id: participantId,
    p_requested_company_id: companyId ?? null,
    p_shirt_delivered: materials.shirt,
    p_card_pack_delivered: materials.cardPack,
    p_credential_delivered: materials.credential
  })
  if (error) throw new Error([error.message, error.details, error.hint].filter(Boolean).join(' · '))
  return data as { company_id: string; checked_in_at: string }
}

export async function revertCheckin(participantId: string) {
  const { data, error } = await supabase.rpc('revert_checkin', { p_participant_id: participantId })
  if (error) {
    if (error.code === '42883' || error.message.includes('revert_checkin')) throw new Error('Supabase todavía no tiene aplicada la migración de deshacer check-in (00009/00010).')
    throw error
  }
  const { data: remainingCheckins, error: verificationError } = await supabase.from('checkins').select('id').eq('participant_id', participantId).limit(1)
  if (verificationError) throw verificationError
  if (remainingCheckins?.length) throw new Error('La base confirmó la operación, pero el check-in todavía aparece registrado. Revisá las migraciones 00009/00010 en Supabase.')
  return data as { participant_id: string; company_id: string }
}

export async function updateParticipantAuthorization(participantId: string, authorizationStatus: Participant['authorizationStatus']) {
  const { error } = await supabase
    .from('participants')
    .update({ authorization_status: authorizationStatus, is_exception: authorizationStatus !== 'confirmed' })
    .eq('id', participantId)
  if (error) throw error
}

export async function assignParticipantCompany(participantId: string, companyId: string) {
  const { data, error } = await supabase.rpc('assign_participant_company', { p_participant_id: participantId, p_company_id: companyId })
  if (error) throw new Error([error.message, error.details, error.hint].filter(Boolean).join(' · '))
  return data as { participant_id: string; company_id: string }
}

export async function createVisitor(eventId: string, input: { firstName: string; lastName: string; origin: string }) {
  const { data, error } = await supabase
    .from('participants')
    .insert({ event_id: eventId, first_name: input.firstName, last_name: input.lastName, stake: 'Visitante', ward: input.origin || 'Procedencia no registrada', is_church_member: false, authorization_status: 'pending', is_youth_leader: false, is_exception: false, notes: 'Visitante agregado en el evento.' })
    .select('id')
    .single()
  if (error) throw error
  await hydrateRepositories(eventId)
  const participant = participantRepository.findById(data.id)
  if (!participant) throw new Error('No se pudo cargar el visitante creado.')
  return participant
}

export async function importParticipants(eventId: string, participants: Participant[]) {
  const { data: existing, error: existingError } = await supabase
    .from('participants')
    .select('first_name, last_name, stake, ward')
    .eq('event_id', eventId)
  if (existingError) throw existingError
  const existingKeys = new Set((existing ?? []).map((participant) => `${participant.first_name}|${participant.last_name}|${participant.stake}|${participant.ward}`.toLocaleLowerCase('es')))
  const rows = participants
    .filter((participant) => !existingKeys.has(`${participant.firstName}|${participant.lastName}|${participant.stake}|${participant.ward}`.toLocaleLowerCase('es')))
    .map((participant) => ({
      event_id: eventId,
      first_name: participant.firstName,
      last_name: participant.lastName,
      stake: participant.stake,
      ward: participant.ward,
      sex: participant.sex ?? null,
      age: participant.age ?? null,
      is_youth_leader: participant.isYouthLeader,
      is_church_member: participant.isChurchMember,
      authorization_status: participant.authorizationStatus,
      is_exception: participant.isException,
      notes: participant.notes ?? null,
      medical_info: participant.medicalInfo ?? null,
      shirt_size: participant.shirtSize ?? null
    }))
  if (rows.length) {
    const { error } = await supabase.from('participants').insert(rows)
    if (error) throw error
  }
  await hydrateRepositories(eventId)
  return rows.length
}

export async function updateParticipantMedicalInfo(participantId: string, medicalInfo: string) {
  const { error } = await supabase.from('participants').update({ medical_info: medicalInfo || null }).eq('id', participantId)
  if (error) throw error
}

export function recommendCompany(participant: Participant) {
  const ordered = [...companiesState].sort((a, b) => a.currentSize - b.currentSize)
  const recommended = participant.isYouthLeader ? ordered.find((company) => !company.leaderParticipantId) ?? ordered[0] : ordered[0]
  return { company: recommended, reasons: ['Mejor balance', `${recommended.targetSize - recommended.currentSize} lugares disponibles`, participant.isYouthLeader ? 'Ayuda a distribuir líderes' : 'Distribuye el grupo'] }
}
