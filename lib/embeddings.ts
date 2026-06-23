/**
 * CLIP Embeddings Service
 * 
 * Uses Jina AI's jina-clip-v2 API to generate image embeddings
 * for visual similarity matching of garments.
 */

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = 'jina-clip-v2';

/**
 * Convert a storage path to a full Supabase public URL
 */
function getFullImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
}

/**
 * Generate a CLIP embedding for an image using Jina AI
 * @param imageInput - Either a base64 string or a URL/path to the image
 * @returns 1024-dimensional embedding vector
 */
export async function generateImageEmbedding(imageInput: string): Promise<number[]> {
  const apiKey = process.env.JINA_API_KEY;
  
  if (!apiKey) {
    throw new Error('JINA_API_KEY environment variable is not set');
  }

  // Determine if input is base64 or URL/path
  const isBase64 = !imageInput.startsWith('http') && !imageInput.includes('/');
  
  let imageValue: string;
  
  if (isBase64) {
    // For base64, send as data URL
    const base64Data = imageInput.replace(/^data:image\/\w+;base64,/, '');
    imageValue = `data:image/jpeg;base64,${base64Data}`;
  } else {
    // For URLs/paths, convert to full URL
    imageValue = getFullImageUrl(imageInput);
  }

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
      input: [{ image: imageValue }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jina AI API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  // Jina API returns { data: [{ embedding: [...] }] }
  if (!result.data || !result.data[0] || !result.data[0].embedding) {
    throw new Error('Unexpected response format from Jina AI API');
  }

  const embedding = result.data[0].embedding;
  
  if (embedding.length !== 1024) {
    console.warn(`Unexpected embedding dimension: ${embedding.length}, expected 1024`);
  }

  return embedding;
}

/**
 * Generate embeddings for multiple images in batch
 * @param imageInputs - Array of base64 strings or URLs
 * @returns Array of 512-dimensional embedding vectors
 */
export async function generateBatchEmbeddings(imageInputs: string[]): Promise<number[][]> {
  // Process in parallel with a concurrency limit to avoid rate limits
  const BATCH_SIZE = 5;
  const results: number[][] = [];
  
  for (let i = 0; i < imageInputs.length; i += BATCH_SIZE) {
    const batch = imageInputs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(input => generateImageEmbedding(input))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score between 0 and 1 (higher = more similar)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimension');
  }
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }
  
  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (magnitude === 0) {
    return 0;
  }
  
  return dotProduct / magnitude;
}

/**
 * Format embedding array for Supabase pgvector storage
 * @param embedding - The embedding array
 * @returns Formatted string for pgvector
 */
export function formatEmbeddingForStorage(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

/**
 * Parse embedding from Supabase pgvector format
 * @param embeddingString - The stored embedding string
 * @returns Parsed embedding array
 */
export function parseEmbeddingFromStorage(embeddingString: string): number[] {
  // pgvector returns as string like "[0.1,0.2,...]"
  const cleaned = embeddingString.replace(/^\[|\]$/g, '');
  return cleaned.split(',').map(Number);
}
