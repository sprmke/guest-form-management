/**
 * Auth page configuration per audience (host vs guest).
 * Used by reusable auth page components so routes can share the same UI with different copy and links.
 */

export type AuthAudience = 'host' | 'guest';

export interface AuthPageConfig {
  audience: AuthAudience;
  login: {
    badge: string;
    title: string;
    subtitle: string;
    forgotPasswordHref: string;
    registerHref: string;
    otherRoleLabel: string;
    otherRoleHref: string;
    successRedirect: string;
  };
  register: {
    title: string;
    subtitle: string;
    loginHref: string;
    verifyEmailRedirect: string; // path or path + query; use {{email}} if needed
  };
  forgotPassword: {
    backToLoginHref: string;
    loginHref: string;
  };
  resetPassword: {
    backToLoginHref: string;
    forgotPasswordHref: string;
    loginHref: string;
    successLoginHref: string;
  };
  verifyEmail: {
    registerHref: string;
    loginHref: string;
    successRedirect: string;
  };
}

const hostBase = '/for-hosts';
const guestBase = '/for-guests';

export const AUTH_PAGE_CONFIG: Record<AuthAudience, AuthPageConfig> = {
  host: {
    audience: 'host',
    login: {
      badge: 'Host / Property Manager',
      title: 'Welcome back',
      subtitle: 'Sign in to manage your properties and bookings',
      forgotPasswordHref: `${hostBase}/forgot-password`,
      registerHref: `${hostBase}/register`,
      otherRoleLabel: 'Sign in as guest',
      otherRoleHref: '/',
      successRedirect: '/dashboard',
    },
    register: {
      title: 'Create an account',
      subtitle: 'Start managing your properties in minutes',
      loginHref: `${hostBase}/login`,
      verifyEmailRedirect: `${hostBase}/verify-email`,
    },
    forgotPassword: {
      backToLoginHref: `${hostBase}/login`,
      loginHref: `${hostBase}/login`,
    },
    resetPassword: {
      backToLoginHref: `${hostBase}/login`,
      forgotPasswordHref: `${hostBase}/forgot-password`,
      loginHref: `${hostBase}/login`,
      successLoginHref: `${hostBase}/login`,
    },
    verifyEmail: {
      registerHref: `${hostBase}/register`,
      loginHref: `${hostBase}/login`,
      successRedirect: '/dashboard',
    },
  },
  guest: {
    audience: 'guest',
    login: {
      badge: 'Guest / Explore',
      title: 'Welcome back',
      subtitle: 'Sign in to browse and book your next stay',
      forgotPasswordHref: `${guestBase}/forgot-password`,
      registerHref: `${guestBase}/register`,
      otherRoleLabel: 'Sign in as host',
      otherRoleHref: '/for-hosts/login',
      successRedirect: '/',
    },
    register: {
      title: 'Create an account',
      subtitle: 'Sign up to browse and book your next stay',
      loginHref: `${guestBase}/login`,
      verifyEmailRedirect: `${guestBase}/verify-email`,
    },
    forgotPassword: {
      backToLoginHref: `${guestBase}/login`,
      loginHref: `${guestBase}/login`,
    },
    resetPassword: {
      backToLoginHref: `${guestBase}/login`,
      forgotPasswordHref: `${guestBase}/forgot-password`,
      loginHref: `${guestBase}/login`,
      successLoginHref: `${guestBase}/login`,
    },
    verifyEmail: {
      registerHref: `${guestBase}/register`,
      loginHref: `${guestBase}/login`,
      successRedirect: '/',
    },
  },
};
