import Link from 'next/link'
import type { Metadata } from 'next'
import { pageOpenGraph } from '@/lib/seo'

const PAGE_DESCRIPTION = 'How AuraXpress collects, uses, stores, and protects your data, including voice recordings, profile information, and payment details.'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: pageOpenGraph({ url: '/privacy', title: 'Privacy Policy — AuraXpress', description: PAGE_DESCRIPTION }),
}

const LAST_UPDATED = 'July 7, 2026'

export default function PrivacyPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-16 sm:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Legal</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-indigo-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto prose-content space-y-10 text-gray-700 leading-relaxed">

          <div>
            <p>
              AuraXpress (&ldquo;AuraXpress&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI-powered communication
              coaching service accessible at auraxpress.com and related applications (the &ldquo;Service&rdquo;). This
              policy explains what information we collect, how we use it, and the choices you have. By using the
              Service, you agree to the practices described here.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account information:</strong> name, email address, and a securely hashed password when you sign up.</li>
              <li><strong>Profile and persona data:</strong> job role, industry, seniority, and communication goals — provided by filling a form or recording a voice introduction.</li>
              <li><strong>Voice recordings and transcripts:</strong> audio you record during practice sessions, and the text transcript generated from it, so your response can be evaluated and scored.</li>
              <li><strong>Practice and progress data:</strong> session scores across the six evaluation dimensions, filler word counts, speaking pace, XP, streaks, badges, and leaderboard standing.</li>
              <li><strong>Payment information:</strong> when you upgrade to a paid plan, payments are processed by Razorpay. We store the order and payment status, not your card or UPI credentials — those are handled directly by Razorpay.</li>
              <li><strong>Technical data:</strong> log data such as IP address, browser type, and device information, collected automatically to keep the Service secure and reliable.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How we use your information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To generate practice scenarios tailored to your role, industry, and stated goals.</li>
              <li>To transcribe, evaluate, and score your spoken responses, and to generate a spoken model response.</li>
              <li>To track your progress over time and power gamification features (XP, streaks, badges, leaderboards).</li>
              <li>To process payments and manage your subscription.</li>
              <li>To send account-related and, where you have opted in, product update emails.</li>
              <li>To maintain the security, integrity, and performance of the Service, and to prevent abuse.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Voice data specifically</h2>
            <p>
              Your voice recordings are processed by speech-recognition and AI evaluation systems to produce a
              transcript, a score, and a spoken model response. Recordings and transcripts are retained so you can
              review past sessions and track improvement over time. You may request deletion of your recordings at
              any time by contacting us (see Section 8).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Sharing your information</h2>
            <p>We do not sell your personal data. We share information only with:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Service providers</strong> who process data on our behalf — including speech-to-text, AI evaluation, text-to-speech, hosting, and payment processing (Razorpay) — under contractual confidentiality obligations.</li>
              <li><strong>Legal authorities,</strong> where required to comply with applicable law, regulation, or a valid legal process.</li>
              <li><strong>A successor entity,</strong> in the event of a merger, acquisition, or sale of assets, subject to the same privacy commitments described here.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data retention</h2>
            <p>
              We retain account, profile, and progress data for as long as your account is active. If you delete
              your account, we delete or anonymize your personal data within a reasonable period, except where we
              are required to retain records (for example, payment records) to meet legal or accounting obligations.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and sessions</h2>
            <p>
              We use a session cookie to keep you signed in and to protect your account. We do not use third-party
              advertising or tracking cookies.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your rights and choices</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, update, or correct your profile information at any time from your account settings.</li>
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Request deletion of your account, your voice recordings, or specific practice sessions.</li>
              <li>Opt out of non-essential product emails via the unsubscribe link in any such email.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Grievance officer and contact</h2>
            <p>
              For privacy questions, data requests, or grievances relating to this policy, contact us at{' '}
              <a href="mailto:helloaura@auraxpress.com" className="text-indigo-600 hover:underline">helloaura@auraxpress.com</a>.
              We aim to acknowledge requests within 7 business days.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. If we make material changes, we will notify you by email
              or through a notice on the Service before the change takes effect. The &ldquo;Last updated&rdquo; date
              above reflects the most recent revision.
            </p>
          </div>

          <div className="pt-6 border-t border-gray-100 text-sm text-gray-500">
            See also our <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>.
          </div>
        </div>
      </section>
    </div>
  )
}
