'use client'

import { passwordChecks } from '@/lib/password'

export default function PasswordStrength({ password }: { password: string }) {
  const checks = passwordChecks(password)
  const passed = checks.filter(check => check.valid).length

  return (
    <div className="mt-2" aria-live="polite">
      <div className="mb-2 grid grid-cols-5 gap-1" aria-label={`Password strength ${passed} of 5`}>
        {checks.map((check, index) => (
          <div key={check.key} className={`h-1.5 rounded-full ${index < passed ? (passed === 5 ? 'bg-green-500' : 'bg-indigo-500') : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
        {checks.map(check => (
          <div key={check.key} className={`text-xs ${check.valid ? 'text-green-600' : 'text-gray-400'}`}>
            {check.valid ? '✓' : '○'} {check.label}
          </div>
        ))}
      </div>
    </div>
  )
}
