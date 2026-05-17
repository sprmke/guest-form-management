const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Vite dev server
  'http://localhost:4173', // Vite preview
  'http://localhost:54321', // Supabase local development
  'https://guest-form-management-ui.vercel.app', // Legacy Vercel deploy
  'https://kamehomes.space', // Production SPA
  'https://www.kamehomes.space',
];

export const corsHeaders = (req: Request) => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Max-Age': '7200',  // 2 hours - Chrome's maximum limit
});
