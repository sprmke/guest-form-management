import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import { config } from './config';
import guestFormRoutes from './routes/guestFormRoutes';

const app = express();

// Middleware
app.use(cors({
  origin: [...config.cors.origins],
  methods: [...config.cors.methods],
  allowedHeaders: [...config.cors.headers]
}));

app.use(express.json({ limit: '10mb' }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api', guestFormRoutes);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
}); 