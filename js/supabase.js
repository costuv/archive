/**
 * Supabase Client Configuration
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials
 * 3. Run the SQL schema below in your Supabase SQL Editor
 */

// ============================================
// CONFIGURATION - Replace with your credentials
// ============================================
const SUPABASE_URL = 'https://ogwtptuzvcugxctveutc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nd3RwdHV6dmN1Z3hjdHZldXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4OTQ5MTYsImV4cCI6MjA4MjQ3MDkxNn0.MB7I1O897siTS1xAJegYoQigRUwmf0dFoerZORnN8Fs';

// ============================================
// SQL SCHEMA - Run this in Supabase SQL Editor
// ============================================
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON public.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_type ON public.files(type);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON public.files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- To make a user admin, run:
-- UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';

-- To verify a user (add blue checkmark), run:
-- UPDATE public.profiles SET is_verified = true WHERE username = 'kaustuv';
*/

// ============================================
// Initialize Supabase Client
// ============================================

// Check if Supabase JS is loaded via CDN, otherwise use global
let supabaseClient = null;

// Load Supabase from CDN
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.onload = function() {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized');
    
    // Dispatch event to notify app that Supabase is ready
    window.dispatchEvent(new CustomEvent('supabaseReady'));
  }
};
document.head.appendChild(script);

/**
 * Get the Supabase client instance
 * @returns {Object} Supabase client
 */
function getSupabase() {
  if (!supabaseClient) {
    console.warn('Supabase client not yet initialized');
  }
  return supabaseClient;
}

/**
 * Check if Supabase is configured (not using placeholder values)
 * @returns {boolean}
 */
function isSupabaseConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && 
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}
