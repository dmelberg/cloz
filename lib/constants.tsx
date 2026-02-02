import { 
  CloudSun,
  Sun,
  Snowflake,
  Thermometer,
  LayoutGrid
} from 'lucide-react';
import type { Category, Season } from '@/lib/database.types';

// Category labels
export const categoryLabels: Record<Category | 'all', string> = {
  all: 'All',
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessories: 'Accessories',
  pijama: 'Pijama',
};

// Season icons and labels
export const seasonConfig: Record<Season | 'all', { label: string; icon: React.ReactNode }> = {
  all: { label: 'All Seasons', icon: <LayoutGrid className="size-4" /> },
  'mid-season': { label: 'Mid-season', icon: <CloudSun className="size-4" /> },
  summer: { label: 'Summer', icon: <Sun className="size-4" /> },
  winter: { label: 'Winter', icon: <Snowflake className="size-4" /> },
  'all-season': { label: 'All-season', icon: <Thermometer className="size-4" /> },
};

// Helper arrays
export const categories: (Category | 'all')[] = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
export const categoriesWithoutAll: Category[] = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'pijama'];
export const seasons: (Season | 'all')[] = ['all', 'mid-season', 'summer', 'winter', 'all-season'];
export const seasonsWithoutAll: Season[] = ['mid-season', 'summer', 'winter', 'all-season'];
