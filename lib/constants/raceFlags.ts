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
