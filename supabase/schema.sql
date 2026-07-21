-- ============================================================
-- Benaiah International School — Parent Payment Portal
-- Run this whole file once in Supabase: Project -> SQL Editor -> New query -> Run
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES ----------
-- One row per logged-in user (parent or admin). Created automatically
-- the moment someone signs up, via the trigger below.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'parent' check (role in ('parent', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------- STUDENTS (children) ----------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  first_name text not null,
  surname text not null,
  other_name text,
  class text not null check (class in ('JSS1','JSS2','JSS3','SS1','SS2','SS3')),
  created_at timestamptz not null default now()
);

-- ---------- PAYMENT CATEGORIES ----------
-- Admin-managed list: school fees, books, levy, etc. Amounts live here so
-- they can be changed per term without touching any code.
create table if not exists payment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- PAYMENTS ----------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  parent_id uuid not null references profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'NGN',
  reference text not null unique,
  status text not null default 'pending' check (status in ('pending','success','failed')),
  receipt_number text,
  paystack_data jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ---------- PAYMENT ITEMS ----------
-- A snapshot of which categories (and at what amount) made up a payment,
-- so changing a category's price later never rewrites old receipts.
create table if not exists payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  category_id uuid references payment_categories(id) on delete set null,
  category_name text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_students_parent on students(parent_id);
create index if not exists idx_payments_parent on payments(parent_id);
create index if not exists idx_payments_student on payments(student_id);
create index if not exists idx_payments_reference on payments(reference);
create index if not exists idx_payment_items_payment on payment_items(payment_id);

-- ============================================================
-- Auto-create a profile row whenever someone signs up.
-- This runs regardless of whether email confirmation is on, so the
-- frontend never has to worry about the profile row existing yet.
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- Helper function to check admin status without recursive RLS issues.
-- ============================================================
create or replace function is_admin()
returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer stable set search_path = public;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles enable row level security;
alter table students enable row level security;
alter table payment_categories enable row level security;
alter table payments enable row level security;
alter table payment_items enable row level security;

-- PROFILES: everyone can read their own profile; admins can read everyone's.
create policy "profiles_select_own_or_admin" on profiles
  for select using (auth.uid() = id or is_admin());
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- STUDENTS: parents manage only their own children; admins can view all.
create policy "students_select_own_or_admin" on students
  for select using (auth.uid() = parent_id or is_admin());
create policy "students_insert_own" on students
  for insert with check (auth.uid() = parent_id);
create policy "students_update_own" on students
  for update using (auth.uid() = parent_id);

-- PAYMENT CATEGORIES: any logged-in user can view active categories;
-- only admins can view hidden ones or make changes.
create policy "categories_select_active_or_admin" on payment_categories
  for select using (is_active = true or is_admin());
create policy "categories_insert_admin" on payment_categories
  for insert with check (is_admin());
create policy "categories_update_admin" on payment_categories
  for update using (is_admin());

-- PAYMENTS: parents see only their own; admins see all.
-- Inserts/updates happen from Netlify Functions using the service role key
-- (which bypasses RLS entirely), so no insert/update policy is needed here
-- for the normal flow — this just governs what the browser can read directly.
create policy "payments_select_own_or_admin" on payments
  for select using (auth.uid() = parent_id or is_admin());

-- PAYMENT ITEMS: visible if you can see the parent payment row.
create policy "payment_items_select_via_payment" on payment_items
  for select using (
    exists (
      select 1 from payments
      where payments.id = payment_items.payment_id
      and (payments.parent_id = auth.uid() or is_admin())
    )
  );

-- ============================================================
-- Starter payment categories — edit amounts to match your school's actual fees,
-- or just add/hide categories from the Admin panel after deploying.
-- ============================================================
insert into payment_categories (name, description, amount, is_active) values
  ('School Fees', 'Termly tuition fee', 85000, true),
  ('Books & Materials', 'Textbooks and stationery for the term', 15000, true),
  ('Development Levy', 'Annual development and facilities levy', 10000, true)
on conflict do nothing;

-- ============================================================
-- To make a user an admin after they've signed up normally through the site:
--   1. Go to Authentication -> Users in the Supabase dashboard, copy their User UID.
--   2. Run:  update profiles set role = 'admin' where id = 'PASTE-USER-UID-HERE';
-- ============================================================
