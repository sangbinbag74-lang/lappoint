export const DRIVER_NAMES_KO: Record<string, string> = {
  VER: '베르스타펜', LAW: '로슨',
  LEC: '르클레르',   HAM: '해밀턴',
  RUS: '러셀',       ANT: '안토넬리',
  NOR: '노리스',     PIA: '피아스트리',
  ALO: '알론소',     STR: '스트롤',
  GAS: '가슬리',     DOO: '두한',
  TSU: '츠노다',     HAD: '해드자르',
  HUL: '휠켄베르그', OCO: '오콘',
  BOT: '보타스',     ZHO: '저우',
  ALB: '알봉',       SAI: '사인츠',
}

export function getDriverNameKo(option: string): string | null {
  const code = option.split(' - ')[0]?.trim().toUpperCase()
  return DRIVER_NAMES_KO[code] ?? null
}
