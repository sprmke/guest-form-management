import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT ?? 3001,
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
  },
  email: {
    from: 'Guest Form <onboarding@resend.dev>',
    adminEmails: ['michaeldmanlulu@gmail.com', 'kamehome.azurenorth@gmail.com'],
  },
  cors: {
    origins: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['POST', 'GET', 'OPTIONS'],
    headers: ['Content-Type'],
  },
  paths: {
    templates: path.join(path.dirname(__dirname), 'templates'),
  },
} as const; 