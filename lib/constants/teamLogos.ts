const DRIVER_TEAM: Record<string, string> = {
  VER: 'redbull',      LAW: 'redbull',
  LEC: 'ferrari',      HAM: 'ferrari',
  RUS: 'mercedes',     ANT: 'mercedes',
  NOR: 'mclaren',      PIA: 'mclaren',
  ALO: 'astonmartin',  STR: 'astonmartin',
  GAS: 'alpine',       DOO: 'alpine',
  TSU: 'racingbulls',  HAD: 'racingbulls',
  HUL: 'haas',         OCO: 'haas',
  BOT: 'sauber',       ZHO: 'sauber',
  ALB: 'williams',     SAI: 'williams',
}

export function getDriverTeamLogo(option: string): string | null {
  const code = option.split(' - ')[0]?.trim().toUpperCase()
  const team = DRIVER_TEAM[code]
  return team ? `/logos/${team}.svg` : null
}
