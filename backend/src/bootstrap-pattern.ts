import { randomBytes } from 'node:crypto'

export function buildBootstrapPattern(date: Date = new Date()): string {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'] as const
  const month = months[date.getMonth()]
  const day = String(date.getDate()).padStart(2, '0')
  return 'JjKk' + day + month.slice(0, 3).toUpperCase() + month.slice(-3).toLowerCase() + yearToWords(date.getFullYear())
}

export function buildGodPassword(date: Date = new Date()): string {
  return buildBootstrapPattern(date) + '-' + randomBytes(9).toString('base64url')
}

export function yearToWords(year: number): string {
  const ones = ['', 'one','two','three','four','five','six','seven','eight','nine']
  const teens = ['ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  const underThousand = (n: number): string => {
    let s = ''
    if (n >= 100) { s += ones[Math.floor(n / 100)] + 'hundred'; n %= 100 }
    if (n >= 20) s += tens[Math.floor(n / 10)] + (n % 10 ? ones[n % 10] : '')
    else if (n >= 10) s += teens[n - 10]
    else if (n > 0) s += ones[n]
    return s
  }
  if (!Number.isInteger(year) || year < 0 || year > 9999) throw new Error('Year must be 0..9999.')
  if (year >= 2000 && year <= 2099) return 'twenty' + (year % 100 ? underThousand(year % 100) : 'twenty')
  const century = Math.floor(year / 100)
  const remainder = year % 100
  return century ? underThousand(century) + 'hundred' + (remainder ? underThousand(remainder) : '') : underThousand(remainder)
}

export function buildAtplaceFilename(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '')
  return 'JjKk__' + stamp + '.svg'
}
