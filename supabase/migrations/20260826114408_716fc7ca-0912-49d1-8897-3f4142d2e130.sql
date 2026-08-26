-- Enums
create type public.contribution_need_type as enum ('quantity','unique','people','money');
create type public.contribution_need_status as enum ('open','closed','cancelled');
create type public.contribution_need_priority as enum ('normal','important','high');
create type public.contribution_commitment_status as enum ('active','cancelled');
create type public.contribution_unit_kind as enum ('quantity','money','none');

-- Categories
create table public.contribution_categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  icon text not null default 'Gift',
  sort_order integer not null default 0,
  active boolean not null default true,
  event_type_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.contribution_categories to authenticated;
grant insert, update, delete on public.contribution_categories to authenticated;
grant all on public.contribution_categories to service_role;
alter table public.contribution_categories enable row level security;
create policy "contribution_categories_select" on public.contribution_categories for select to authenticated using (active = true or private.has_role(auth.uid(),'admin'));
create policy "contribution_categories_admin_insert" on public.contribution_categories for insert to authenticated with check (private.has_role(auth.uid(),'admin'));
create policy "contribution_categories_admin_update" on public.contribution_categories for update to authenticated using (private.has_role(auth.uid(),'admin'));
create policy "contribution_categories_admin_delete" on public.contribution_categories for delete to authenticated using (private.has_role(auth.uid(),'admin'));
create trigger trg_contribution_categories_updated before update on public.contribution_categories for each row execute function public.update_updated_at_column();

-- Units
create table public.contribution_units (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  kind public.contribution_unit_kind not null default 'quantity',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contribution_units to authenticated;
grant all on public.contribution_units to service_role;
alter table public.contribution_units enable row level security;
create policy "contribution_units_select" on public.contribution_units for select to authenticated using (active = true or private.has_role(auth.uid(),'admin'));
create policy "contribution_units_admin_insert" on public.contribution_units for insert to authenticated with check (private.has_role(auth.uid(),'admin'));
create policy "contribution_units_admin_update" on public.contribution_units for update to authenticated using (private.has_role(auth.uid(),'admin'));
create policy "contribution_units_admin_delete" on public.contribution_units for delete to authenticated using (private.has_role(auth.uid(),'admin'));
create trigger trg_contribution_units_updated before update on public.contribution_units for each row execute function public.update_updated_at_column();

-- Suggestions
create table public.contribution_suggestions (
  id uuid primary key default gen_random_uuid(),
  event_type_key text,
  category_id uuid references public.contribution_categories(id) on delete set null,
  label text not null,
  need_type public.contribution_need_type not null default 'quantity',
  target_quantity numeric,
  unit_id uuid references public.contribution_units(id) on delete set null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contribution_suggestions to authenticated;
grant all on public.contribution_suggestions to service_role;
alter table public.contribution_suggestions enable row level security;
create policy "contribution_suggestions_select" on public.contribution_suggestions for select to authenticated using (active = true or private.has_role(auth.uid(),'admin'));
create policy "contribution_suggestions_admin_insert" on public.contribution_suggestions for insert to authenticated with check (private.has_role(auth.uid(),'admin'));
create policy "contribution_suggestions_admin_update" on public.contribution_suggestions for update to authenticated using (private.has_role(auth.uid(),'admin'));
create policy "contribution_suggestions_admin_delete" on public.contribution_suggestions for delete to authenticated using (private.has_role(auth.uid(),'admin'));
create trigger trg_contribution_suggestions_updated before update on public.contribution_suggestions for each row execute function public.update_updated_at_column();

-- Needs
create table public.contribution_needs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category_id uuid references public.contribution_categories(id) on delete set null,
  label text not null,
  description text,
  need_type public.contribution_need_type not null default 'quantity',
  target_quantity numeric not null default 1,
  unit_id uuid references public.contribution_units(id) on delete set null,
  priority public.contribution_need_priority not null default 'normal',
  allow_overcommitment boolean not null default false,
  status public.contribution_need_status not null default 'open',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contribution_needs_event_idx on public.contribution_needs(event_id);
grant select, insert, update, delete on public.contribution_needs to authenticated;
grant all on public.contribution_needs to service_role;
alter table public.contribution_needs enable row level security;
create policy "contribution_needs_organizer_select" on public.contribution_needs for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid())
      or exists (select 1 from public.event_participants p where p.event_id = contribution_needs.event_id and p.user_id = auth.uid()));
create policy "contribution_needs_organizer_insert" on public.contribution_needs for insert to authenticated
  with check (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy "contribution_needs_organizer_update" on public.contribution_needs for update to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy "contribution_needs_organizer_delete" on public.contribution_needs for delete to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create trigger trg_contribution_needs_updated before update on public.contribution_needs for each row execute function public.update_updated_at_column();

-- Commitments
create table public.contribution_commitments (
  id uuid primary key default gen_random_uuid(),
  need_id uuid not null references public.contribution_needs(id) on delete cascade,
  invitation_id uuid references public.invitations(id) on delete set null,
  user_id uuid,
  contact_id uuid,
  guest_name text,
  quantity numeric not null default 1,
  note text,
  status public.contribution_commitment_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contribution_commitments_need_idx on public.contribution_commitments(need_id);
grant select, insert, update, delete on public.contribution_commitments to authenticated;
grant all on public.contribution_commitments to service_role;
alter table public.contribution_commitments enable row level security;
create policy "contribution_commitments_select" on public.contribution_commitments for select to authenticated
  using (user_id = auth.uid()
      or exists (select 1 from public.contribution_needs n join public.events e on e.id = n.event_id
                 where n.id = need_id and e.organizer_id = auth.uid()));
create policy "contribution_commitments_insert" on public.contribution_commitments for insert to authenticated
  with check (user_id = auth.uid()
      or exists (select 1 from public.contribution_needs n join public.events e on e.id = n.event_id
                 where n.id = need_id and e.organizer_id = auth.uid()));
create policy "contribution_commitments_update" on public.contribution_commitments for update to authenticated
  using (user_id = auth.uid()
      or exists (select 1 from public.contribution_needs n join public.events e on e.id = n.event_id
                 where n.id = need_id and e.organizer_id = auth.uid()));
create policy "contribution_commitments_delete" on public.contribution_commitments for delete to authenticated
  using (user_id = auth.uid()
      or exists (select 1 from public.contribution_needs n join public.events e on e.id = n.event_id
                 where n.id = need_id and e.organizer_id = auth.uid()));
create trigger trg_contribution_commitments_updated before update on public.contribution_commitments for each row execute function public.update_updated_at_column();

-- History
create table public.contribution_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  need_id uuid,
  action text not null,
  actor_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index contribution_logs_event_idx on public.contribution_logs(event_id);
grant select on public.contribution_logs to authenticated;
grant all on public.contribution_logs to service_role;
alter table public.contribution_logs enable row level security;
create policy "contribution_logs_organizer_select" on public.contribution_logs for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));

-- Atomic commitment (server-side quantity check)
create or replace function public.commit_contribution(
  _need_id uuid,
  _invitation_id uuid,
  _quantity numeric,
  _note text default null,
  _commitment_id uuid default null,
  _guest_name text default null,
  _user_id uuid default null,
  _contact_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n record;
  committed numeric;
  own numeric := 0;
  remaining numeric;
  new_id uuid;
begin
  select * into n from public.contribution_needs where id = _need_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if n.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;

  select coalesce(sum(quantity), 0) into committed
  from public.contribution_commitments where need_id = _need_id and status = 'active';

  if _commitment_id is not null then
    select coalesce(quantity, 0) into own from public.contribution_commitments
    where id = _commitment_id and need_id = _need_id and status = 'active';
  end if;

  remaining := n.target_quantity - (committed - coalesce(own, 0));
  if not n.allow_overcommitment and _quantity > remaining then
    return jsonb_build_object('ok', false, 'error', 'taken', 'remaining', greatest(remaining, 0));
  end if;
  if _quantity <= 0 then return jsonb_build_object('ok', false, 'error', 'invalid_quantity'); end if;

  if _commitment_id is not null then
    update public.contribution_commitments
      set quantity = _quantity, note = _note
      where id = _commitment_id and need_id = _need_id
      returning id into new_id;
  else
    insert into public.contribution_commitments (need_id, invitation_id, user_id, contact_id, guest_name, quantity, note)
    values (_need_id, _invitation_id, _user_id, _contact_id, _guest_name, _quantity, _note)
    returning id into new_id;
  end if;

  insert into public.contribution_logs (event_id, need_id, action, actor_label, metadata)
  values (n.event_id, _need_id, case when _commitment_id is null then 'commitment_created' else 'commitment_updated' end,
          _guest_name, jsonb_build_object('quantity', _quantity));

  return jsonb_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.commit_contribution(uuid, uuid, numeric, text, uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.commit_contribution(uuid, uuid, numeric, text, uuid, text, uuid, uuid) to service_role;

-- Seed catalogue
insert into public.contribution_units (key, label, kind, sort_order) values
  ('none','Sans unité','none',0),
  ('unit','unité','quantity',1),
  ('bottle','bouteille','quantity',2),
  ('pack','paquet','quantity',3),
  ('tray','plateau','quantity',4),
  ('portion','portion','quantity',5),
  ('piece','pièce','quantity',6),
  ('person','personne','quantity',7),
  ('vehicle','véhicule','quantity',8),
  ('hour','heure','quantity',9),
  ('eur','€','money',10);

insert into public.contribution_categories (key, label, icon, sort_order) values
  ('food','Alimentation & boissons','Utensils',1),
  ('equipment','Matériel','Armchair',2),
  ('help','Aide & organisation','HandHeart',3),
  ('gifts','Cadeaux','Gift',4),
  ('other','Autre','Package',5);

insert into public.contribution_suggestions (event_type_key, category_id, label, need_type, target_quantity, unit_id, sort_order)
select s.event_type_key, c.id, s.label, s.need_type::public.contribution_need_type, s.qty, u.id, s.ord
from (values
  ('diner','food','Vin','quantity',6,'bottle',1),
  ('diner','food','Dessert','quantity',2,'portion',2),
  ('diner','food','Pain','quantity',2,'unit',3),
  ('cremaillere','food','Boissons','quantity',6,'bottle',1),
  ('cremaillere','equipment','Chaises','quantity',10,'unit',2),
  ('cremaillere','help','Aide à l''installation','people',3,'person',3),
  ('cremaillere','equipment','Décoration','quantity',1,'none',4),
  ('anniversaire-enfant','food','Gâteau','unique',1,'none',1),
  ('anniversaire-enfant','food','Boissons','quantity',6,'bottle',2),
  ('anniversaire-enfant','equipment','Décoration','quantity',1,'none',3),
  ('anniversaire-enfant','help','Aide à l''installation','people',2,'person',4),
  ('professionnel','equipment','Vidéoprojecteur','unique',1,'none',1),
  ('professionnel','equipment','Écran','unique',1,'none',2),
  ('professionnel','equipment','Chaises','quantity',10,'unit',3),
  ('professionnel','help','Installation','people',3,'person',4),
  ('professionnel','food','Boissons','quantity',6,'bottle',5)
) as s(event_type_key, cat_key, label, need_type, qty, unit_key, ord)
join public.contribution_categories c on c.key = s.cat_key
join public.contribution_units u on u.key = s.unit_key;

insert into public.invitation_settings (key, settings)
values ('contributions', jsonb_build_object(
  'eventTypeKeys', '[]'::jsonb,
  'allowMultipleCommitments', true,
  'allowOvercommitmentDefault', false,
  'participantVisibility', 'transparent',
  'allowGuestEdit', true,
  'remindersEnabled', false,
  'notifyOrganizer', true,
  'prioritiesEnabled', true,
  'needTypes', '["quantity","unique","people","money"]'::jsonb
))
on conflict (key) do nothing;