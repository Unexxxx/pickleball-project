import "server-only";
export const cacheTags = {
  club: (id: string) => `club:${id}`,
  event: (id: string) => `event:${id}`,
  player: (id: string) => `player:${id}`,
  leaderboard: (scope: string) => `leaderboard:${scope}`,
} as const;
