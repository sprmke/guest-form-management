const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'https://guest-form-management-ui.vercel.app'  // Production
];

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(Deno.env.get('ORIGIN') || '*') 
    ? Deno.env.get('ORIGIN') 
    : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'Authorization',
    'X-Client-Info'
  ].join(', '),
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400' // 24 hours
}
