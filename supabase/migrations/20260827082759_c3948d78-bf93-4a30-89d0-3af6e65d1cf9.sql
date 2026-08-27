CREATE TYPE public.event_photo_status AS ENUM ('processing','published','hidden','deleted');
CREATE TYPE public.photo_report_status AS ENUM ('pending','reviewed','hidden','rejected','deleted');

CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid,
  invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  author_label text,
  original_storage_path text,
  thumbnail_storage_path text NOT NULL,
  medium_storage_path text NOT NULL,
  large_storage_path text NOT NULL,
  original_retention_until timestamptz,
  mime_type text NOT NULL DEFAULT 'image/webp',
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  original_file_size bigint NOT NULL DEFAULT 0,
  optimized_file_size bigint NOT NULL DEFAULT 0,
  description text,
  status public.event_photo_status NOT NULL DEFAULT 'published',
  moderation_status text NOT NULL DEFAULT 'ok',
  is_cover boolean NOT NULL DEFAULT false,
  crop_x numeric,
  crop_y numeric,
  crop_width numeric,
  crop_height numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX event_photos_event_idx ON public.event_photos (event_id, status, created_at DESC);
CREATE INDEX event_photos_author_idx ON public.event_photos (uploaded_by_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_photos TO authenticated;
GRANT ALL ON public.event_photos TO service_role;
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage their event album"
  ON public.event_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_photos.event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Confirmed participants read published photos"
  ON public.event_photos FOR SELECT TO authenticated
  USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM public.event_participants p
      WHERE p.event_id = event_photos.event_id
        AND p.user_id = auth.uid()
        AND p.rsvp_status = 'accepted'
    )
  );

CREATE POLICY "Authors read their own photos"
  ON public.event_photos FOR SELECT TO authenticated
  USING (uploaded_by_user_id = auth.uid());

CREATE POLICY "Authors delete their own photos"
  ON public.event_photos FOR UPDATE TO authenticated
  USING (uploaded_by_user_id = auth.uid())
  WITH CHECK (uploaded_by_user_id = auth.uid());

CREATE TRIGGER trg_event_photos_updated
  BEFORE UPDATE ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.photo_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.event_photos(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reported_by uuid,
  reporter_label text,
  reason text NOT NULL,
  comment text,
  status public.photo_report_status NOT NULL DEFAULT 'pending',
  moderated_by uuid,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photo_reports_event_idx ON public.photo_reports (event_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.photo_reports TO authenticated;
GRANT ALL ON public.photo_reports TO service_role;
ALTER TABLE public.photo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers manage reports of their events"
  ON public.photo_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = photo_reports.event_id AND e.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = photo_reports.event_id AND e.organizer_id = auth.uid()));

CREATE POLICY "Users read their own reports"
  ON public.photo_reports FOR SELECT TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "Authenticated users can report"
  ON public.photo_reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE TRIGGER trg_photo_reports_updated
  BEFORE UPDATE ON public.photo_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
