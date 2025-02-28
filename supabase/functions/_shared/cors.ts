const ALLOWED_ORIGINS = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  'http://localhost:54321', // Supabase local development
  'https://guest-form-management-ui.vercel.app'  // Production
];

export const corsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'apikey, content-type',
    'Access-Control-Max-Age': '7200',  // 2 hours
  };
};
