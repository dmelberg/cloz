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

    // Fetch existing garments for matching
    const { data: existingGarments } = await supabase
      .from('garments')
      .select('*');

    // Build the image content for OpenAI
    const imageContent = imageBase64
      ? { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: 'image_url' as const, image_url: { url: imageUrl } };

    // Call OpenAI Vision API
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a fashion analysis AI. Analyze outfit photos and identify individual garments/clothing items worn.

For each garment you detect, provide:
1. A descriptive name (e.g., "Navy blue cotton crew neck t-shirt")
2. Category: exactly one of: tops, bottoms, dresses, outerwear, shoes, accessories, pijama
3. Season: exactly one of: mid-season, summer, winter, all-season
4. A brief description of the item's appearance (color, material, style)

Return your response as a JSON array of objects with keys: name, category, season, description.
Only include actual clothing/accessory items visible in the photo. Do not include the person or background elements.`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this outfit photo and identify all the garments/clothing items visible. Return as JSON array.' },
            imageContent,
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the AI response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Handle both { garments: [...] } and direct array responses
    const detectedItems: Array<{
      name: string;
      category: string;
      season: string;
      description: string;
    }> = Array.isArray(parsedResponse) 
      ? parsedResponse 
      : (parsedResponse.garments || parsedResponse.items || []);

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
