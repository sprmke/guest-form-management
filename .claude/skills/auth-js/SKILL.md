---
name: auth-js
description: Auth.js authentication skill for implementing authentication, authorization, sessions, OAuth providers, and protected routes. Use when working with login, registration, permissions, or user sessions.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Auth.js Authentication Skill

This skill helps you implement authentication with Auth.js (formerly NextAuth.js).

## Tech Stack Context

- **Auth**: Auth.js v5
- **Database Adapter**: Drizzle
- **Database**: PostgreSQL on Neon
- **Session Strategy**: JWT or Database

## File Locations

- Auth config: `apps/web/src/lib/auth/config.ts`
- Auth route: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Auth middleware: `apps/web/src/middleware.ts`
- Auth hooks: `apps/web/src/lib/auth/hooks.ts`

## Auth Configuration

### Basic Setup

```typescript
// lib/auth/config.ts
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users, accounts, sessions } from '@/lib/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Implement credential validation
        const user = await validateCredentials(credentials.email, credentials.password);
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
  },
  session: {
    strategy: 'jwt',
  },
});
```

### Route Handler

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth/config';

export const { GET, POST } = handlers;
```

## Middleware for Protected Routes

```typescript
// middleware.ts
import { auth } from '@/lib/auth/config';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isOnAuth =
    req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');

  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Server-Side Auth

### Get Session in Server Component

```typescript
// In Server Component
import { auth } from '@/lib/auth/config';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <div>Welcome {session.user.name}</div>;
}
```

### Get Session in tRPC Context

```typescript
// server/trpc/context.ts
import { auth } from '@/lib/auth/config';

export async function createContext() {
  const session = await auth();

  return {
    user: session?.user ?? null,
    session,
  };
}
```

## Client-Side Auth

### Auth Hook

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signIn,
    signOut,
  };
}
```

### Session Provider

```typescript
// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

## Role-Based Access Control (RBAC)

### Permission Types

```typescript
type Permission =
  | 'organizations:read'
  | 'organizations:write'
  | 'properties:read'
  | 'properties:write'
  | 'bookings:read'
  | 'bookings:write'
  | 'payments:read'
  | 'payments:write';

type Role = 'OWNER' | 'ADMIN' | 'PROPERTY_MANAGER' | 'SUBLEASE' | 'VIEWER';
```

### Permission Check

```typescript
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ['organizations:read', 'organizations:write', 'properties:read', 'properties:write', ...],
  ADMIN: ['properties:read', 'properties:write', 'bookings:read', 'bookings:write', ...],
  PROPERTY_MANAGER: ['properties:read', 'bookings:read', 'bookings:write', ...],
  SUBLEASE: ['bookings:read', 'bookings:write'],
  VIEWER: ['properties:read', 'bookings:read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function checkPermission(
  userId: string,
  permission: Permission,
  resourceId: string
) {
  const userRole = await getUserRoleForResource(userId, resourceId);

  if (!hasPermission(userRole, permission)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action',
    });
  }
}
```

## Environment Variables

```bash
# Auth.js
NEXTAUTH_URL=http://localhost:3004
NEXTAUTH_SECRET="your-secret-key-here"
AUTH_DRIZZLE_URL= # For Drizzle adapter

# OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

## Reference Documentation

- See `docs/reference/feature-specifications.md` for auth specs
  - See `docs/product/user-flows.md` for auth flows
- See `.cursorrules` for security patterns
