import type { ScheduleRules } from '@/types/request';

/** The attendance rules a new schedule starts with, the same as the web's. */
export const DEFAULT_SCHEDULE_RULES: ScheduleRules = {
  horizonDays: 30,
  rosterLeadMinutes: 120,
  leaveCutoffMinutes: 60,
  lateGraceMinutes: 15,
  noShowMinutes: 30,
  geofenceMeters: 200,
};

/** The ranges the server accepts for each rule (RequestScheduleUpsertPayload); outside them it answers 422. */
export const SCHEDULE_RULE_LIMITS: Record<keyof ScheduleRules, { min: number; max: number }> = {
  horizonDays: { min: 1, max: 90 },
  rosterLeadMinutes: { min: 0, max: 1440 },
  leaveCutoffMinutes: { min: 0, max: 1440 },
  lateGraceMinutes: { min: 0, max: 240 },
  noShowMinutes: { min: 0, max: 480 },
  geofenceMeters: { min: 25, max: 5000 },
};
