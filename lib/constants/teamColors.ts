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
}

export function getDriverColor(option: string): string | null {
  // "VER - Max Verstappen" 형식에서 코드 추출
  const code = option.split(' - ')[0]?.trim().toUpperCase()
  return TEAM_COLORS[code] ?? null
}
