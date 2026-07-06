import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/dashboard/:path*', '/practice/:path*', '/learning-guides/:path*', '/progress/:path*', '/onboarding/:path*', '/billing/:path*', '/profile/:path*', '/superadmin/:path*'],
}
