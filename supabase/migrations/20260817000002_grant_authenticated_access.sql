-- RLS controls the rows; these grants allow authenticated users to reach the tables.

grant usage on schema public to authenticated;

grant select on public.events,
  public.profiles,
  public.participants,
  public.companies,
  public.company_memberships,
  public.checkins,
  public.material_deliveries,
  public.exceptions,
  public.activities,
  public.company_activity_states,
  public.challenge_progress,
  public.activity_results,
  public.rewards,
  public.tournaments,
  public.tournament_matches,
  public.tournament_representatives,
  public.scoring_configurations
to authenticated;

grant insert, update, delete on public.participants,
  public.companies,
  public.company_memberships,
  public.material_deliveries,
  public.exceptions,
  public.activities,
  public.company_activity_states,
  public.challenge_progress,
  public.activity_results,
  public.rewards,
  public.tournaments,
  public.tournament_matches,
  public.tournament_representatives,
  public.scoring_configurations
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
