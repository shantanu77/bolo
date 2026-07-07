import Link from 'next/link'
import type { Metadata } from 'next'
import { pageOpenGraph } from '@/lib/seo'

const PAGE_DESCRIPTION = 'The terms that govern your use of AuraXpress, including subscriptions, billing, acceptable use, and account termination.'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: pageOpenGraph({ url: '/terms', title: 'Terms of Service — AuraXpress', description: PAGE_DESCRIPTION }),
}

const LAST_UPDATED = 'July 7, 2026'

export default function TermsPage() {
  return (
    <div className="bg-white text-gray-900">

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-950 to-indigo-800 text-white py-16 sm:py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-4">Legal</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Terms of Service</h1>
          <p className="text-indigo-200">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-10 text-gray-700 leading-relaxed">

          <div>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of AuraXpress, an AI-powered
              communication coaching service (the &ldquo;Service&rdquo;). By creating an account or using the Service,
              you agree to these Terms. If you do not agree, please do not use the Service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Eligibility and accounts</h2>
            <p>
              You must be at least 16 years old to use AuraXpress. You are responsible for maintaining the
              confidentiality of your login credentials and for all activity under your account. Notify us
              immediately if you suspect unauthorized access.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. The Service</h2>
            <p>
              AuraXpress generates practice scenarios, evaluates your spoken responses using speech recognition and
              AI models, and provides scores, feedback, and model responses. Feedback and scores are generated
              automatically and are intended as coaching guidance, not a certified or professional assessment of
              your English proficiency.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Plans, billing, and cancellation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>The Free plan is available at no cost, subject to the usage limits described on our <Link href="/pricing" className="text-indigo-600 hover:underline">Pricing</Link> page.</li>
              <li>Pro and Teams plans are billed in INR on a recurring basis via Razorpay. Prices shown are exclusive of applicable taxes (e.g. GST) unless stated otherwise.</li>
              <li>You may cancel a paid subscription at any time from your account settings. Cancellation stops future billing; access continues until the end of the current billing period.</li>
              <li>Fees already paid are non-refundable except where required by law or expressly stated at the time of purchase.</li>
              <li>We may change plan pricing with advance notice; changes apply from your next billing cycle.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Use the Service for any unlawful purpose or in violation of any applicable regulation.</li>
              <li>Attempt to reverse-engineer, scrape, or interfere with the Service or its underlying models.</li>
              <li>Upload or submit content that is defamatory, abusive, or infringes another person&rsquo;s rights.</li>
              <li>Share your account credentials with, or resell access to, third parties.</li>
              <li>Circumvent usage limits associated with your plan.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your content</h2>
            <p>
              You retain ownership of the voice recordings, transcripts, and profile information you submit
              (&ldquo;Your Content&rdquo;). You grant AuraXpress a limited license to process Your Content solely to
              provide and improve the Service — for example, generating scenarios, transcription, evaluation, and
              progress tracking. See our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link> for
              details on how this data is handled.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual property</h2>
            <p>
              The Service, including its software, scenario library, evaluation methodology, and branding, is owned
              by AuraXpress and protected by intellectual property laws. These Terms do not grant you any rights to
              our trademarks or proprietary technology beyond what is necessary to use the Service as intended.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of any kind. AI-generated scores, feedback,
              and model responses may contain inaccuracies. AuraXpress does not guarantee any specific outcome, score
              improvement, or job or interview result from using the Service.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, AuraXpress will not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service. Our total liability for any claim relating
              to the Service is limited to the amount you paid us in the 3 months preceding the claim.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Termination</h2>
            <p>
              You may stop using the Service and delete your account at any time. We may suspend or terminate
              accounts that violate these Terms, engage in abuse, or pose a security risk to the Service or other
              users.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Governing law</h2>
            <p>
              These Terms are governed by the laws of India, without regard to conflict-of-law principles. Disputes
              arising from these Terms will be subject to the exclusive jurisdiction of the courts of Bangalore,
              Karnataka.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to these Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be notified by email or through a
              notice on the Service. Continued use of the Service after changes take effect constitutes acceptance
              of the revised Terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Contact</h2>
            <p>
              Questions about these Terms can be sent to{' '}
              <a href="mailto:helloaura@auraxpress.com" className="text-indigo-600 hover:underline">helloaura@auraxpress.com</a>.
            </p>
          </div>

        </div>
      </section>
    </div>
  )
}
