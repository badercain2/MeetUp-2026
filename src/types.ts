export type UserRole = 'ADMIN'
export type SyncState = 'online' | 'reconnecting' | 'offline'
export type AuthorizationStatus = 'confirmed' | 'pending' | 'missing'
export type ParticipantSex = 'HOMBRE' | 'MUJER'
export type CompanyIcon = 'wave' | 'fire' | 'cloud' | 'manna' | 'mountain' | 'path' | 'staff' | 'star'
export type ScoreType = 'NONE' | 'TIME_ASC' | 'POINTS_DESC' | 'BRACKET'
export type ActivityStatus = 'NOT_STARTED' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED' | 'REALIZED' | 'UNDER_REVIEW' | 'DISQUALIFIED'
export type RewardStatus = 'PENDING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface Participant {
  id: string
  firstName: string
  lastName: string
  isChurchMember: boolean
  sex?: ParticipantSex
  age?: number
  stake: string
  ward: string
  authorizationStatus: AuthorizationStatus
  isYouthLeader: boolean
  checkedIn: boolean
  checkedInAt?: string
  checkedInBy?: string
  companyId?: string
  materials: { shirt: boolean; cardPack: boolean; credential: boolean }
  isException: boolean
  notes?: string
  medicalInfo?: string
  shirtSize?: string
}

export interface CompanyTheme { colorToken: string; icon: CompanyIcon }
export interface Company {
  id: string
  number: number
  name: string
  targetSize: number
  currentSize: number
  leaderParticipantId?: string
  theme: CompanyTheme
}

export interface CompanyRecommendation { companyId: string; reasons: string[]; score?: number }
export interface CheckInResult { participant: Participant; assignedCompany: Company; timestamp: string }
export interface GameActivity {
  id: string
  order: number
  name: string
  startTime: string
  durationMinutes: number
  scoreType: ScoreType
  status: 'UPCOMING' | 'READY' | 'LIVE' | 'FINISHED'
  globalPointsEnabled: boolean
  description: string
  reward: string
  challengeCount?: number
  challenges?: string[]
  challengeTiming?: string[]
  introductionTime?: string
  introductionDescription?: string
}
export interface ScheduleItem {
  id: string
  startTime: string
  endTime?: string
  title: string
  description: string
  icon: 'arrival' | 'icebreaker' | 'plagues' | 'cards' | 'red-sea' | 'lunch' | 'desert' | 'masters' | 'music' | 'rotation' | 'snack' | 'photo' | 'devotional' | 'closing'
  kind: 'activity' | 'break' | 'arrival' | 'closing'
  rotations?: { title: string; companies: string; icon: ScheduleItem['icon'] }[]
}
export interface CompanyActivityState {
  activityId: string
  companyId: string
  status: ActivityStatus
  progressCurrent: number
  progressTotal: number
  elapsedMs?: number
  officialTimeMs?: number
  points?: number
  underReview?: boolean
  lastUpdate: string
}
export interface GameReward {
  id: string
  rewardKey: string
  activityId?: string
  companyId?: string
  title: string
  reason: string
  quantity?: number
  status: RewardStatus
  deliveredAt?: string
  deliveredBy?: string
}
export interface ExceptionItem {
  id: string
  type: 'authorization' | 'incomplete' | 'duplicate' | 'manual' | 'not_found'
  title: string
  participantName: string
  location: string
  createdAt: string
  createdBy: string
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: string
}
