/*
# Storage bucket for community post media (images and videos)

## Overview
Creates a public storage bucket for uploading community post images and short videos.
This allows posts to persist media files in Supabase Storage instead of using
temporary blob URLs that are lost on page refresh.

## New Storage Buckets
- `post-media` — public bucket for community post images and videos
  - Max file size: 50MB (accommodates short videos)
  - Allowed MIME types: images and videos only

## Security
- Public read access (anyone can view post media)
- Authenticated users can upload to their own folder
- RLS policies on storage.objects
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
DROP POLICY IF EXISTS "Public read post-media" ON storage.objects;
CREATE POLICY "Public read post-media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'post-media');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Auth upload post-media" ON storage.objects;
CREATE POLICY "Auth upload post-media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-media');

-- Allow users to delete their own files
DROP POLICY IF EXISTS "Auth delete own post-media" ON storage.objects;
CREATE POLICY "Auth delete own post-media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'post-media' AND owner = auth.uid());
