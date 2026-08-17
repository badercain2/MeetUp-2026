import { gameActivities, gameCompanyStates, gameRewards, tournamentMatches } from './gamesData'
import type { CompanyActivityState, GameActivity, GameReward } from '../types'

export interface GamesRepository {
  getActivities(): Promise<GameActivity[]>
  getActivityState(activityId: string): Promise<CompanyActivityState[]>
  updateCompanyProgress(state: CompanyActivityState): Promise<void>
  getRewards(): Promise<GameReward[]>
  updateReward(reward: GameReward): Promise<void>
  getTournament(): Promise<typeof tournamentMatches>
}

export const mockGamesRepository: GamesRepository = {
  getActivities: async () => gameActivities,
  getActivityState: async (activityId) => gameCompanyStates.filter((state) => state.activityId === activityId),
  updateCompanyProgress: async () => undefined,
  getRewards: async () => gameRewards,
  updateReward: async () => undefined,
  getTournament: async () => tournamentMatches
}
