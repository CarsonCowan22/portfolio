import path from 'node:path';
import { config } from 'dotenv';

// Standalone tsx scripts don't get Next.js's automatic .env.local loading, so load it explicitly.
config({ path: path.resolve(process.cwd(), '.env.local') });
