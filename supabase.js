// supabase.js - Updated for your exact setup
export const SUPABASE_URL = 'https://lvpvhbpqlymxcsevgbvs.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2cHZoYnBxbHlteGNzZXZnYnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODY5MTIsImV4cCI6MjA3ODM2MjkxMn0.5LoscTHgquex5lvz8VAEjCo02uLJvVlGAipOP5DbrZw';

// Create client using the same CDN approach
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);