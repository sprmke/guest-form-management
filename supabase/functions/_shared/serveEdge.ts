import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { type AdminUser, verifyAdminJwt } from './auth.ts';
import { type AuthenticatedUser, verifyAuthenticatedUser } from './orgAuth.ts';
import { verifySuperAdminJwt } from './superAdminAuth.ts';
import {
  handleEdgeError,
  handleOptions,
  jsonError,
  jsonResponse,
  requireHttpMethod,
} from './httpResponse.ts';

export function serveAdmin(
  logPrefix: string,
  handler: (req: Request, admin: AdminUser) => Promise<Response>
): void {
  serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      const admin = await verifyAdminJwt(req);
      return await handler(req, admin);
    } catch (error) {
      return handleEdgeError(req, error, logPrefix);
    }
  });
}

/** Authenticated user whose email is on SUPER_ADMIN_EMAILS — platform-wide settings only. */
export function serveSuperAdmin(
  logPrefix: string,
  handler: (req: Request, user: AuthenticatedUser) => Promise<Response>
): void {
  serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      const user = await verifySuperAdminJwt(req);
      return await handler(req, user);
    } catch (error) {
      return handleEdgeError(req, error, logPrefix);
    }
  });
}

/** Any signed-in user (Google OAuth) — used for org/property management. */
export function serveAuthenticated(
  logPrefix: string,
  handler: (req: Request, user: AuthenticatedUser) => Promise<Response>
): void {
  serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      const user = await verifyAuthenticatedUser(req);
      return await handler(req, user);
    } catch (error) {
      return handleEdgeError(req, error, logPrefix);
    }
  });
}

export function servePublic(logPrefix: string, handler: (req: Request) => Promise<Response>): void {
  serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      return await handler(req);
    } catch (error) {
      return handleEdgeError(req, error, logPrefix);
    }
  });
}

export function serveCronPost(
  logPrefix: string,
  verifySecret: (req: Request) => boolean,
  run: () => Promise<Record<string, unknown>>
): void {
  serve(async (req) => {
    const options = handleOptions(req);
    if (options) return options;
    try {
      requireHttpMethod(req, 'POST');
      if (!verifySecret(req)) {
        return jsonError(req, 'Unauthorized', 401);
      }
      const result = await run();
      console.log(`[${logPrefix}]`, JSON.stringify(result));
      return jsonResponse(req, { success: true, ...result });
    } catch (error) {
      console.error(`${logPrefix}:`, error);
      return jsonError(req, (error as Error).message);
    }
  });
}
