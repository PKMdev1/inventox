# Shelf Inventory Tracker

A production-quality, offline-capable web application for shelf-based inventory tracking with barcode scanning and movement history.

## Features

- 🔐 **Authentication** - Email/password login via Supabase Auth
- 📷 **Barcode Scanning** - Camera-based scanning for shelves and items
- 📦 **Check-In/Check-Out** - Track items moving in and out of shelves
- 📊 **Movement History** - Complete audit trail of all item movements
- 🔄 **Offline Support** - Queue actions when offline, sync when back online
- 📈 **Reports & Export** - CSV export for all data
- 🏷️ **Barcode Generator** - Generate and print shelf barcode labels
- 📱 **Mobile-First** - Optimized for both mobile and desktop use

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + APIs)
- **Barcode Scanning**: html5-qrcode
- **Barcode Generation**: jsbarcode
- **Notifications**: react-hot-toast

## Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

#### Create Database Tables

Run the following SQL in your Supabase SQL Editor:

```sql
-- Shelves table
CREATE TABLE shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE NOT NULL,
  current_shelf_id UUID REFERENCES shelves(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Movements table (audit trail)
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  from_shelf_id UUID REFERENCES shelves(id) ON DELETE SET NULL,
  to_shelf_id UUID REFERENCES shelves(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'MOVE')),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_items_serial_number ON items(serial_number);
CREATE INDEX idx_items_current_shelf ON items(current_shelf_id);
CREATE INDEX idx_movements_item_id ON movements(item_id);
CREATE INDEX idx_movements_timestamp ON movements(timestamp);
CREATE INDEX idx_shelves_barcode ON shelves(barcode);

-- Enable Row Level Security (RLS)
ALTER TABLE shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your needs)
-- Allow authenticated users to read all data
CREATE POLICY "Users can read shelves" ON shelves
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read items" ON items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read movements" ON movements
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert/update
CREATE POLICY "Users can insert shelves" ON shelves
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update shelves" ON shelves
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert items" ON items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update items" ON items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete shelves" ON shelves
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete items" ON items
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert movements" ON movements
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

#### Set Up Authentication

1. In Supabase Dashboard, go to Authentication > Users
2. Create users manually (or enable email signup if preferred)
3. Users can now log in with email/password

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/       # Reusable React components
│   ├── BarcodeScanner.tsx
│   └── ProtectedRoute.tsx
├── hooks/           # Custom React hooks
│   ├── useAuth.tsx
│   └── useOnlineStatus.ts
├── lib/             # Third-party library configs
│   └── supabase.ts
├── pages/           # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── ScanShelf.tsx
│   ├── CheckIn.tsx
│   ├── CheckOut.tsx
│   ├── SearchItem.tsx
│   ├── Reports.tsx
│   ├── BarcodeGenerator.tsx
│   └── Shelves.tsx
├── services/         # Business logic services
│   └── offlineQueue.ts
├── types/           # TypeScript type definitions
│   └── index.ts
├── App.tsx          # Main app component with routing
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Usage Guide

### 1. Login

- Navigate to the login page
- Enter your email and password (created in Supabase)

### 2. Scan Shelf

- Click "Scan Shelf" on the dashboard
- Use your device camera to scan a shelf barcode
- View shelf information and items

### 3. Check-In Item

- After scanning a shelf, click "Check-In Item"
- Enter or scan an item serial number
- The item will be associated with the current shelf

### 4. Check-Out Item

- After scanning a shelf, click "Check-Out Item"
- Enter or scan an item serial number
- Choose to remove from shelf or move to another shelf

### 5. Search Item

- Click "Search Item" on the dashboard
- Enter a serial number
- View current status and movement history

### 6. Generate Barcodes

- Go to "Barcode Generator"
- Create new shelves with name and location
- Barcodes are automatically generated
- Print labels for physical shelves

### 7. Reports & Export

- View all items, movements, or shelves
- Export data as CSV for Excel/Google Sheets

## Offline Support

The app automatically queues actions when offline:

- Actions are stored in localStorage
- A banner shows "Offline" status
- When connection is restored, actions sync automatically
- Toast notification confirms successful sync

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

### Other Platforms

The app is a standard Vite React app and can be deployed to:
- Netlify
- AWS Amplify
- Cloudflare Pages
- Any static hosting service

Build command: `npm run build`
Output directory: `dist`

## Browser Compatibility

- Modern browsers with camera API support
- Mobile: iOS Safari, Chrome Android
- Desktop: Chrome, Firefox, Safari, Edge

## Security Notes

- RLS policies control data access
- All API calls go through Supabase with authentication
- Offline queue is stored locally (not encrypted by default)
- Consider additional security measures for production

## Troubleshooting

### Camera not working
- Ensure HTTPS (required for camera API)
- Check browser permissions for camera access
- Try a different browser

### Supabase connection errors
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify RLS policies allow your user

### Offline sync not working
- Check browser console for errors
- Verify localStorage is enabled
- Ensure user is authenticated when coming back online

## License

MIT

