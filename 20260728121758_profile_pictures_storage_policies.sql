-- Storage policies for profile-pictures bucket
-- Allow authenticated users to upload to their own folder (user_id/avatar-*.png)
CREATE POLICY "upload_own_profile_picture" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read of profile pictures
CREATE POLICY "read_profile_pictures" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'profile-pictures');

-- Allow users to update/delete their own pictures
CREATE POLICY "update_own_profile_picture" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "delete_own_profile_picture" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-pictures' AND (storage.foldername(name))[1] = auth.uid()::text);
