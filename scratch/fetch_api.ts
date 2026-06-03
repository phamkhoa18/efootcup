import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { NextResponse } from 'next/server';

// Since we can't easily mock the Next.js API route without booting the server,
// let's just make a curl request to the dev server.
