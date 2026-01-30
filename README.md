# Cloz - Wardrobe Management App

A mobile-first Next.js app to help you track your wardrobe, log outfits, and discover which clothes to give away.

## Features

- **Closet Gallery**: View all your garments with photos, names, quantities, and wear counts. Filter by category and season.
- **Add Garment**: Upload photos and add garments with name, category, season, and quantity.
- **Add Outfit**: Upload outfit photos and use AI (OpenAI Vision) to automatically detect and match garments from your closet.
- **Outfit Calendar**: Monthly calendar view showing outfits worn on each day.
- **Analytics**: Track most/least worn garments and get suggestions for clothes to donate.
- **Settings**: Configure donation threshold (how long before suggesting items to give away).

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4o Vision API
- **Deployment**: Vercel

## Setup

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the migration from `supabase/migrations/001_initial_schema.sql`
3. Go to Storage and create a bucket named `images` with public access
4. Copy your project URL and anon key from Settings > API

### 2. OpenAI Setup

1. Get an API key from [platform.openai.com](https://platform.openai.com)

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `OPENAI_API_KEY` - Your OpenAI API key

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Deploy!

## Project Structure

```
app/
├── page.tsx                    # Analytics/Home
├── layout.tsx                  # App shell with bottom nav
├── closet/
│   ├── page.tsx               # Garment gallery
│   ├── add/page.tsx           # Add garment form
│   └── [id]/page.tsx          # Garment detail
├── outfits/
│   ├── add/page.tsx           # Upload outfit + AI matching
│   └── calendar/page.tsx      # Calendar view
├── settings/page.tsx          # Preferences
├── api/
│   ├── garments/              # CRUD garments
│   ├── outfits/               # CRUD outfits
│   ├── analyze-outfit/        # OpenAI Vision integration
│   ├── analytics/             # Analytics data
│   └── preferences/           # User preferences
└── components/
    ├── BottomNav.tsx
    ├── PageHeader.tsx
    ├── GarmentCard.tsx
    ├── GarmentForm.tsx
    ├── ImageUpload.tsx
    └── Analytics/
        ├── StatCard.tsx
        └── GarmentList.tsx
```

## Mobile Installation (PWA)

This app works as a Progressive Web App. On mobile:
1. Open the app in your browser
2. Tap "Add to Home Screen" in Safari (iOS) or Chrome menu (Android)
3. Use the app like a native app!

## License

MIT
