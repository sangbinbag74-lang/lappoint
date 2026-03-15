// 2026 F1 드라이버 코드 → 팀 컬러 매핑
export const TEAM_COLORS: Record<string, string> = {
  VER: '#3671C6', LAW: '#3671C6',   // Red Bull
  LEC: '#E8002D', HAM: '#E8002D',   // Ferrari
  RUS: '#27F4D2', ANT: '#27F4D2',   // Mercedes
  NOR: '#FF8000', PIA: '#FF8000',   // McLaren
  ALO: '#358C75', STR: '#358C75',   // Aston Martin
  GAS: '#FF87BC', DOO: '#FF87BC',   // Alpine
  TSU: '#6692FF', HAD: '#6692FF',   // Racing Bulls
  HUL: '#B6BABD', OCO: '#B6BABD',   // Haas
  BOT: '#52E252', ZHO: '#52E252',   // Kick Sauber
  ALB: '#64C4FF', SAI: '#64C4FF',   // Williams
  BEA: '#B6BABD', BOR: '#52E252',   // Haas, Kick Sauber
  COL: '#FF87BC', LIN: '#6692FF',   // Alpine, Racing Bulls
  PER: '#3671C6',                    // Red Bull
}

export function getDriverColor(option: string): string | null {
  // "VER - Max Verstappen" 형식에서 코드 추출
  const code = option.split(' - ')[0]?.trim().toUpperCase()
  return TEAM_COLORS[code] ?? null
}

const CONSTRUCTOR_NAME_COLORS: [string, string][] = [
  ['red bull',     '#3671C6'],
  ['ferrari',      '#E8002D'],
  ['mercedes',     '#27F4D2'],
  ['mclaren',      '#FF8000'],
  ['aston martin', '#358C75'],
  ['alpine',       '#FF87BC'],
  ['racing bulls', '#6692FF'],
  ['haas',         '#B6BABD'],
  ['sauber',       '#52E252'],
  ['audi',         '#BB0A21'],
  ['cadillac',     '#1B3A6B'],
  ['williams',     '#64C4FF'],
]

export function getConstructorColor(option: string): string | null {
  const lower = option.toLowerCase()
  for (const [kw, color] of CONSTRUCTOR_NAME_COLORS) {
    if (lower.includes(kw)) return color
  }
  return null
}
