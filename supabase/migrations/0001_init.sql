-- Fizzy: insurance broking app — initial schema
-- Run this once in Supabase: Dashboard → SQL Editor → paste → Run.

-- ---------------------------------------------------------------------------
-- Users and roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role text not null default 'sales'
    check (role in ('admin', 'manager', 'sales', 'ops', 'accounts')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Creates a profile for every new login. The very first user becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from public.profiles) then 'sales' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------
create table public.insurers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_code text,
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_type text not null default 'individual' check (client_type in ('individual', 'company')),
  name text not null,
  contact_person text,
  phone text,
  email text,
  pan text,
  gstin text,
  address text,
  city text,
  state text,
  pincode text,
  parent_id uuid references public.clients (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_name_idx on public.clients (lower(name));
create index clients_phone_idx on public.clients (phone);

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  city text,
  line text not null default 'motor'
    check (line in ('motor', 'commercial', 'health', 'life', 'other')),
  product text,
  source text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'requirement', 'quoted', 'won', 'lost')),
  expected_premium numeric(14, 2),
  current_insurer text,
  current_expiry date,
  next_follow_up date,
  lost_reason text,
  notes text,
  owner_id uuid references public.profiles (id) on delete set null default auth.uid(),
  client_id uuid references public.clients (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_stage_idx on public.leads (stage);
create index leads_follow_up_idx on public.leads (next_follow_up);

-- ---------------------------------------------------------------------------
-- Policies (Motor and Commercial line details live in the `details` JSON)
-- ---------------------------------------------------------------------------
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  insurer_id uuid references public.insurers (id) on delete set null,
  line text not null default 'motor'
    check (line in ('motor', 'commercial', 'health', 'life', 'other')),
  product text,
  policy_no text,
  start_date date,
  end_date date,
  sum_insured numeric(16, 2),
  net_premium numeric(14, 2),
  gst numeric(14, 2),
  total_premium numeric(14, 2),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'partial')),
  status text not null default 'active'
    check (status in ('active', 'renewed', 'expired', 'cancelled')),
  commission_pct numeric(6, 2),
  commission_amount numeric(14, 2),
  commission_received boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  -- renewal tracking for THIS policy's upcoming expiry
  renewal_stage text not null default 'pending'
    check (renewal_stage in ('pending', 'contacted', 'quoted', 'renewed', 'lost')),
  renewal_quote numeric(14, 2),
  renewal_lost_reason text,
  renewed_policy_id uuid references public.policies (id) on delete set null,
  previous_policy_id uuid references public.policies (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null default auth.uid(),
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index policies_end_date_idx on public.policies (end_date);
create index policies_client_idx on public.policies (client_id);
create index policies_policy_no_idx on public.policies (policy_no);

-- ---------------------------------------------------------------------------
-- Activities (calls, notes, follow-ups) on any record
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead', 'client', 'policy')),
  entity_id uuid not null,
  kind text not null default 'note' check (kind in ('call', 'whatsapp', 'email', 'meeting', 'note')),
  note text not null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index activities_entity_idx on public.activities (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Documents (files live in the private `documents` storage bucket)
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead', 'client', 'policy')),
  entity_id uuid not null,
  file_path text not null,
  file_name text not null,
  doc_type text not null default 'other'
    check (doc_type in ('policy_copy', 'kyc', 'quote', 'rc', 'proposal', 'claim', 'other')),
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index documents_entity_idx on public.documents (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();
create trigger policies_touch before update on public.policies
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security: only active staff can see anything.
-- Small firm (about 5 users), so all active staff share one book of business.
-- Only admins manage users and delete records.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.insurers enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.policies enable row level security;
alter table public.activities enable row level security;
alter table public.documents enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (public.is_active_user() or id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid())
              and active = (select p.active from public.profiles p where p.id = auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['insurers', 'clients', 'leads', 'policies', 'activities', 'documents'] loop
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (public.is_active_user())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (public.is_active_user())', t);
    execute format('create policy %1$s_update on public.%1$s for update to authenticated using (public.is_active_user()) with check (public.is_active_user())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for documents (private; signed links only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_bucket_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_active_user());
create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_active_user());
create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Common insurers in India (edit freely in the app)
-- ---------------------------------------------------------------------------
insert into public.insurers (name, short_code) values
  ('ICICI Lombard General Insurance', 'ICICI'),
  ('HDFC ERGO General Insurance', 'HDFC'),
  ('Bajaj Allianz General Insurance', 'BAJAJ'),
  ('Tata AIG General Insurance', 'TATA'),
  ('The New India Assurance', 'NIA'),
  ('United India Insurance', 'UIIC'),
  ('The Oriental Insurance', 'OIC'),
  ('National Insurance', 'NIC'),
  ('Reliance General Insurance', 'RGI'),
  ('SBI General Insurance', 'SBI'),
  ('Digit General Insurance', 'DIGIT'),
  ('Future Generali India Insurance', 'FGII'),
  ('Cholamandalam MS General Insurance', 'CHOLA'),
  ('IFFCO Tokio General Insurance', 'IFFCO'),
  ('Royal Sundaram General Insurance', 'RSGI'),
  ('Universal Sompo General Insurance', 'USGI'),
  ('Liberty General Insurance', 'LIBERTY'),
  ('Shriram General Insurance', 'SHRIRAM'),
  ('Magma General Insurance', 'MAGMA'),
  ('Zurich Kotak General Insurance', 'ZKGI')
on conflict (name) do nothing;
