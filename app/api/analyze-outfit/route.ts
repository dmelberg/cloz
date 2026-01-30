import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import type { Garment, Category, Season } from '@/lib/database.types';

// Initialize OpenAI client lazily to avoid build-time errors
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

interface DetectedGarment {
  name: string;
  category: Category;
  season: Season;
  description: string;
  matchedGarment?: Garment;
  confidence: number;
}

// Helper to detect image MIME type from base64
function detectImageMimeType(base64: string): string {
  // Check the first few bytes to determine format
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  // Default to jpeg if unknown
  return 'image/jpeg';
}

// POST /api/analyze-outfit - Analyze an outfit photo to detect garments
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageUrl } = await request.json();

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: 'Either imageBase64 or imageUrl is required' },
        { status: 400 }
      );
    }

    // Log for debugging
    console.log('Analyzing outfit image...', { 
      hasBase64: !!imageBase64, 
      hasUrl: !!imageUrl,
      base64Length: imageBase64?.length 
    });

    // Fetch existing garments for matching
    const { data: existingGarments } = await supabase
      .from('garments')
      .select('*');

    // Build the image content for OpenAI with correct MIME type
    const mimeType = imageBase64 ? detectImageMimeType(imageBase64) : 'image/jpeg';
    const imageContent = imageBase64
      ? { type: 'image_url' as const, image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' as const } }
      : { type: 'image_url' as const, image_url: { url: imageUrl, detail: 'high' as const } };

    // Call OpenAI Vision API
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fashion analysis AI specialized in identifying clothing items in photos. Your task is to analyze outfit photos and identify every individual garment/clothing item visible.

IMPORTANT INSTRUCTIONS:
- Look carefully at the ENTIRE image for any clothing items
- Include items that may be partially visible
- Be thorough - it's better to identify more items than fewer
- Consider all types of clothing: shirts, pants, skirts, dresses, jackets, coats, shoes, hats, scarves, jewelry, bags, watches, belts, etc.

For EACH garment you detect, provide:
1. name: A descriptive name (e.g., "Navy blue cotton crew neck t-shirt", "Black leather ankle boots")
2. category: EXACTLY one of: tops, bottoms, dresses, outerwear, shoes, accessories, pijama
3. season: EXACTLY one of: mid-season, summer, winter, all-season
4. description: A brief description of the item's appearance (color, material, style, pattern)

You MUST return a JSON object with a "garments" key containing an array of detected items.
Example response format: {"garments": [{"name": "...", "category": "...", "season": "...", "description": "..."}]}

If you see a person wearing clothes, identify ALL visible clothing items.
Even if the image quality is not perfect, do your best to identify the clothing items.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please analyze this outfit photo and identify ALL the garments and clothing items visible. List every piece of clothing you can see, including shoes and accessories. Return your response as a JSON object with a "garments" array.' },
            imageContent,
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    console.log('OpenAI Vision response:', content);
    
    if (!content) {
      console.error('No content in OpenAI response');
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
      console.log('Parsed response:', JSON.stringify(parsedResponse, null, 2));
    } catch (parseError) {
      console.error('Failed to parse AI response:', content, parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Handle multiple possible response formats
    const detectedItems: Array<{
      name: string;
      category: string;
      season: string;
      description: string;
    }> = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : (parsedResponse.garments || parsedResponse.items || parsedResponse.clothing || parsedResponse.clothes || []);
    
    console.log(`Detected ${detectedItems.length} garments:`, detectedItems.map(i => i.name));

    // Match detected garments with existing ones
    const detectedGarments: DetectedGarment[] = detectedItems.map((item) => {
      // Try to find a matching garment in the closet
      const matchedGarment = findMatchingGarment(item, existingGarments || []);
      
      return {
        name: item.name,
        category: validateCategory(item.category),
        season: validateSeason(item.season),
        description: item.description,
        matchedGarment: matchedGarment || undefined,
        confidence: matchedGarment ? calculateMatchConfidence(item, matchedGarment) : 0,
      };
    });

    return NextResponse.json({
      detectedGarments,
      totalDetected: detectedGarments.length,
      matchedCount: detectedGarments.filter(g => g.matchedGarment).length,
    });
  } catch (error) {
    console.error('Outfit analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze outfit' },
      { status: 500 }
    );
  }
}

function validateCategory(category: string): Category {
  const validCategories: Category[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
  const normalized = category.toLowerCase() as Category;
  return validCategories.includes(normalized) ? normalized : 'tops';
}

function validateSeason(season: string): Season {
  const validSeasons: Season[] = ['mid-season', 'summer', 'winter', 'all-season'];
  const normalized = season.toLowerCase().replace(' ', '-') as Season;
  return validSeasons.includes(normalized) ? normalized : 'all-season';
}

function findMatchingGarment(
  detected: { name: string; category: string; description: string },
  existingGarments: Garment[]
): Garment | null {
  if (!existingGarments.length) return null;

  // Simple matching based on category and name similarity
  const sameCategoryGarments = existingGarments.filter(
    g => g.category === detected.category.toLowerCase()
  );

  if (!sameCategoryGarments.length) return null;

  // Find the best match by name similarity
  let bestMatch: Garment | null = null;
  let bestScore = 0;

  for (const garment of sameCategoryGarments) {
    const score = calculateSimilarity(
      detected.name.toLowerCase() + ' ' + detected.description.toLowerCase(),
      garment.name.toLowerCase()
    );
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = garment;
    }
  }

  return bestMatch;
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/).filter(w => w.length > 2);
  const words2 = str2.split(/\s+/).filter(w => w.length > 2);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }

  return matches / Math.max(words1.length, words2.length, 1);
}

function calculateMatchConfidence(
  detected: { name: string; description: string },
  matched: Garment
): number {
  const similarity = calculateSimilarity(
    detected.name.toLowerCase() + ' ' + detected.description.toLowerCase(),
    matched.name.toLowerCase()
  );
  return Math.round(similarity * 100);
}
