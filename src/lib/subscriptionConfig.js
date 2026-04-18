export const TIER_CONFIG = {
  free: {
    name: 'Free',
    maxProjects: 3,
    maxRefreshesPerDay: 5,
    forecastDays: 7,
    maxMembers: 1,
  },
  small_team: {
    name: 'Small Team',
    maxProjects: 10,
    maxRefreshesPerDay: 999,
    forecastDays: 16,
    maxMembers: 2,
    monthlyPrice: 29,
    yearlyPrice: 269,
  },
  large_team: {
    name: 'Large Team',
    maxProjects: 30,
    maxRefreshesPerDay: 999,
    forecastDays: 16,
    maxMembers: 6,
    monthlyPrice: 69,
    yearlyPrice: 659,
  },
  enterprise: {
    name: 'Enterprise',
    maxProjects: 999,
    maxRefreshesPerDay: 999,
    forecastDays: 16,
    maxMembers: 999,
  },
};