#!/bin/bash

# Start Supabase in the background
echo "Starting Supabase..."
supabase start &

# Wait for Supabase to be ready (adjust sleep time if needed)
sleep 10

# Start Edge Functions in the background
echo "Starting Edge Functions..."
supabase functions serve submit-form --env-file ./supabase/.env.local &

# Start the UI
echo "Starting UI development server..."
cd ui && npm run dev
