/**
 * Backfill Embeddings Script
 * 
 * This script generates CLIP embeddings for all existing garments that don't have one.
 * Run this after applying the 007_add_embeddings.sql migration.
 * 
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 * 
 * Requirements:
 *   - JINA_API_KEY in .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local  
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (for admin access)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-clip-v2';

// Configuration - Jina free tier: 1M tokens/min, images use ~175K tokens each
// So we can only do ~5-6 images per minute safely
const DELAY_BETWEEN_ITEMS = 12000; // 12 seconds between items (~5 per minute)
const MAX_RETRIES = 3; // Retry up to 3 times on rate limit
const RATE_LIMIT_WAIT = 90000; // Wait 90 seconds on rate limit to let quota reset

/**
 * Convert a storage path to a full Supabase public URL
 */
function getFullImageUrl(path: string, supabaseUrl: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

async function generateImageEmbedding(imageUrl: string, apiKey: string): Promise<number[]> {
  // Call Jina AI API
  const response = await fetch(JINA_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      input: [{ image: imageUrl }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jina AI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (!result.data || !result.data[0] || !result.data[0].embedding) {
    throw new Error('Unexpected response format from Jina AI API');
  }

  return result.data[0].embedding;
}

function formatEmbeddingForStorage(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting embedding backfill...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jinaKey = process.env.JINA_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Required:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!jinaKey) {
    console.error('❌ Missing JINA_API_KEY');
    console.error('   Get a free API key at: https://jina.ai/ (click Log in, then API Dashboard)');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin access
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch garments without embeddings
  console.log('📋 Fetching garments without embeddings...');
  const { data: garments, error: fetchError } = await supabase
    .from('garments')
    .select('id, name, photo_url')
    .is('embedding', null);

  if (fetchError) {
    console.error('❌ Failed to fetch garments:', fetchError.message);
    process.exit(1);
  }

  if (!garments || garments.length === 0) {
    console.log('✅ All garments already have embeddings!');
    process.exit(0);
  }

  console.log(`📦 Found ${garments.length} garments to process\n`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process one at a time with retries
  for (const garment of garments) {
    processed++;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] Processing ${processed}/${garments.length}: ${garment.name}`);

    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        const fullImageUrl = getFullImageUrl(garment.photo_url, supabaseUrl);
        console.log(`   → Generating embedding...`);
        const embedding = await generateImageEmbedding(fullImageUrl, jinaKey);
        
        console.log(`   → Saving to database...`);
        const embeddingStr = formatEmbeddingForStorage(embedding);

        const { error: updateError } = await supabase
          .from('garments')
          .update({ embedding: embeddingStr })
          .eq('id', garment.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        console.log(`   ✅ Success! (${embedding.length} dimensions)`);
        succeeded++;
        success = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for rate limit error
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          retries++;
          if (retries < MAX_RETRIES) {
            console.log(`   ⏳ Rate limited (attempt ${retries}/${MAX_RETRIES}), waiting 60s...`);
            await sleep(RATE_LIMIT_WAIT);
          } else {
            console.log(`   ❌ Failed: Rate limited after ${MAX_RETRIES} retries`);
            failed++;
          }
        } else {
          console.log(`   ❌ Failed: ${errorMessage.substring(0, 80)}`);
          failed++;
          break;
        }
      }
    }

    // Delay between items to avoid rate limits
    if (processed < garments.length) {
      const nextTime = new Date(Date.now() + DELAY_BETWEEN_ITEMS).toLocaleTimeString();
      console.log(`   ⏱️  Waiting ${DELAY_BETWEEN_ITEMS/1000}s before next item (next at ${nextTime})...`);
      await sleep(DELAY_BETWEEN_ITEMS);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Backfill Complete!');
  console.log(`   ✅ Succeeded: ${succeeded}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${garments.length}`);
  console.log('='.repeat(50));
}

main().catch(console.error);
