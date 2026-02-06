import "dotenv/config";

import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.PROJECT_URL, process.env.PUBLISHABLE_API_KEY)

export default supabase;