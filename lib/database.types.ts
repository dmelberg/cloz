export type Category = 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories' | 'pijama';
export type Season = 'mid-season' | 'summer' | 'winter' | 'all-season';

export interface Garment {
  id: string;
  name: string;
  photo_url: string;
  quantity: number;
  use_count: number;
  category: Category;
  season: Season;
  created_at: string;
  user_id: string;
}

export interface Outfit {
  id: string;
  photo_url: string;
  worn_date: string;
  created_at: string;
  user_id: string;
}

export interface OutfitGarment {
  id: string;
  outfit_id: string;
  garment_id: string;
}

export interface Preferences {
  id: string;
  donation_threshold_months: number;
  user_id: string;
}

// Supabase Database schema type
export type Database = {
  public: {
    Tables: {
      garments: {
        Row: Garment;
        Insert: {
          id?: string;
          name: string;
          photo_url: string;
          quantity?: number;
          use_count?: number;
          category: Category;
          season: Season;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          photo_url?: string;
          quantity?: number;
          use_count?: number;
          category?: Category;
          season?: Season;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      outfits: {
        Row: Outfit;
        Insert: {
          id?: string;
          photo_url: string;
          worn_date: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          photo_url?: string;
          worn_date?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      outfit_garments: {
        Row: OutfitGarment;
        Insert: {
          id?: string;
          outfit_id: string;
          garment_id: string;
        };
        Update: {
          id?: string;
          outfit_id?: string;
          garment_id?: string;
        };
        Relationships: [];
      };
      preferences: {
        Row: Preferences;
        Insert: {
          id?: string;
          donation_threshold_months?: number;
          user_id: string;
        };
        Update: {
          id?: string;
          donation_threshold_months?: number;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Extended types for queries with relations
export interface OutfitWithGarments extends Outfit {
  garments: Garment[];
}

export interface GarmentWithOutfits extends Garment {
  outfits: Outfit[];
}
