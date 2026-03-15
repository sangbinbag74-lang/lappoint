// 레이스 이름 → ISO 2자리 국가 코드 매핑
const NAME_TO_CODE: [string, string][] = [
  ['bahrain', 'bh'],
  ['saudi', 'sa'],
  ['australian', 'au'],
  ['japanese', 'jp'],
  ['chinese', 'cn'],
  ['miami', 'us'],
  ['emilia', 'it'],
  ['romagna', 'it'],
  ['monaco', 'mc'],
  ['canadian', 'ca'],
  ['spanish', 'es'],
  ['barcelona', 'es'],
  ['austrian', 'at'],
  ['british', 'gb'],
  ['hungarian', 'hu'],
  ['belgian', 'be'],
  ['dutch', 'nl'],
  ['italian', 'it'],
  ['azerbaijan', 'az'],
  ['singapore', 'sg'],
  ['las vegas', 'us'],
  ['united states', 'us'],
  ['mexico', 'mx'],
  ['são paulo', 'br'],
  ['sao paulo', 'br'],
  ['brazil', 'br'],
  ['qatar', 'qa'],
  ['abu dhabi', 'ae'],
]

export function getRaceCountryCode(raceName: string): string {
  const lower = raceName.toLowerCase()
  for (const [kw, code] of NAME_TO_CODE) {
    if (lower.includes(kw)) return code
  }
  return ''
}

const COUNTRY_COLORS: Record<string, string> = {
  bh: '#CE1126', sa: '#006C35', au: '#00008B', jp: '#BC002D',
  cn: '#DE2910', us: '#B22234', it: '#009246', mc: '#CE1126',
  ca: '#FF0000', es: '#C60B1E', at: '#ED2939', gb: '#012169',
  hu: '#CE2939', be: '#F9BE00', nl: '#FF6600', az: '#0092BC',
  sg: '#EF3340', mx: '#006847', br: '#009C3B', qa: '#8D1B3D',
  ae: '#00732F',
}

export function getRaceCountryColor(raceName: string): string | null {
  const code = getRaceCountryCode(raceName)
  return code ? (COUNTRY_COLORS[code] ?? null) : null
}
