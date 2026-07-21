
CREATE POLICY "widget_photos_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'widget-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_photos_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_photos_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_photos_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "widget_docs_owner_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'widget-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_docs_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'widget-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_docs_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'widget-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "widget_docs_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'widget-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
