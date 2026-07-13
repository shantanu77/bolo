export const PASSWORD_MIN_LENGTH = 10

export interface PasswordCheck {
  key: string
  label: string
  valid: boolean
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { key: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, valid: password.length >= PASSWORD_MIN_LENGTH },
    { key: 'lowercase', label: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { key: 'uppercase', label: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { key: 'number', label: 'One number', valid: /\d/.test(password) },
    { key: 'symbol', label: 'One special character', valid: /[^A-Za-z0-9]/.test(password) },
  ]
}

export function validatePassword(password: string) {
  if (password.length > 128) return 'Password must not exceed 128 characters'
  const missing = passwordChecks(password).filter(check => !check.valid)
  return missing.length ? `Password must include: ${missing.map(check => check.label.toLowerCase()).join(', ')}` : null
}
