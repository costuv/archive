# Academic Archive - Vanilla HTML/CSS/JS

A converted version of the Academic Archive application using vanilla HTML, CSS, and JavaScript with Supabase backend.

## Features

- 📁 Add, edit, and delete archive entries (documents, PDFs, images, notices)
- 📂 Organize entries into collections (folders)
- 🏷️ Tag entries with custom labels
- 🔍 Filter and search through the archive
- ⬇️ Download attached files
- 🖼️ Image thumbnail preview
- 🔐 User authentication (Sign up / Sign in)
- 👑 Admin-only upload/edit capabilities

## Project Structure

```
vanilla/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Complete stylesheet
├── js/
│   ├── icons.js        # Lucide SVG icons
│   ├── supabase.js     # Supabase client configuration
│   ├── toast.js        # Toast notification system
│   ├── auth.js         # Authentication module
│   ├── api.js          # Data CRUD operations
│   ├── components.js   # UI rendering components
│   └── app.js          # Main application logic
└── README.md           # This file
```

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned

### 2. Run the Database Schema

Go to your Supabase project's **SQL Editor** and run the following SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folders table
CREATE TABLE public.folders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE public.files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('document', 'pdf', 'image', 'notice')),
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  file_url TEXT,
  thumbnail_url TEXT,
  file_name TEXT,
  file_size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Folders policies (read: everyone, write: admin only)
CREATE POLICY "Folders are viewable by everyone"
  ON public.folders FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert folders"
  ON public.folders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update folders"
  ON public.folders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can delete folders"
  ON public.folders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Files policies (read: everyone, write: admin only)
CREATE POLICY "Files are viewable by everyone"
  ON public.files FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert files"
  ON public.files FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update files"
  ON public.files FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can delete files"
  ON public.files FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('archive-files', 'archive-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Archive files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'archive-files');

CREATE POLICY "Only admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'archive-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can update files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'archive-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Only admins can delete files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'archive-files' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON public.files(type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
```

### 3. Configure Supabase Credentials

1. Go to your Supabase project's **Settings** → **API**
2. Copy the **Project URL** and **anon public** key
3. Edit `js/supabase.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here";
```

### 4. Create an Admin User

1. Create a regular account through the app's registration form
2. Go to Supabase **Table Editor** → **profiles**
3. Find your user and set `is_admin` to `true`

Or run this SQL (replace with your email):

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';
```

### 5. Run the Application

You can serve the files using any static file server:

```bash
# Using npx serve
npx serve .

# Using Python
python -m http.server 3000

# Using PHP
php -S localhost:3000
```

Then open http://localhost:3000 in your browser.

## Demo Mode (No Supabase)

If you don't configure Supabase credentials, the app will run in **demo mode** using localStorage. Data will persist in your browser but won't sync to a server.

## Authentication & Permissions

- **Anyone** can view files and download attachments
- **Anyone** can create an account
- **Admin only** can:
  - Add new entries
  - Edit existing entries
  - Delete entries
  - Create collections/folders

Admin status is controlled via the `is_admin` column in the `profiles` database table.

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Icons**: Lucide (inline SVG)
- **Design**: Neo-brutalist style with black borders and bold shadows

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## License

MIT License
