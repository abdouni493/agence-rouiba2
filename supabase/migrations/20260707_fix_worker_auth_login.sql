-- ═══════════════════════════════════════════════════════════════════════════
-- Fix worker creation + authentication (Team / Équipe interface)
-- ═══════════════════════════════════════════════════════════════════════════
-- Symptoms this fixes:
--   • Creating a worker from the Team page failed on Supabase with
--       "function gen_salt(text) does not exist" / "function crypt(...) ..."
--     because admin_create_worker() and login_worker() were created with
--     search_path = public (and auth), but pgcrypto's crypt()/gen_salt() live
--     in the `extensions` schema, so they could not be resolved.
--   • Workers created from the Team page could not log in:
--       POST /auth/v1/token → 400 "Invalid login credentials" or
--       "Email not confirmed", because they were created as UNCONFIRMED auth
--       users (client-side auth.signUp) or only inserted into public.workers.
--   • admin_create_worker() dropped username / date_of_birth / address entered
--     in the Team form (they were never stored).
--   • login_worker() fallback rejected valid workers because login_enabled
--     defaulted to false and was never set to true.
--
-- Going forward the app calls admin_create_worker() (below): it creates a REAL,
-- EMAIL-CONFIRMED Supabase Auth user + the HR worker row + permissions in a
-- single server-side call WITHOUT disturbing the admin's session. Each worker
-- (including admin-role ones) then signs in with signInWithPassword() directly.
-- login_worker() stays as a fallback for workers created before this fix.
-- ---------------------------------------------------------------------------

-- 1) Make sure pgcrypto (crypt / gen_salt / gen_random_uuid) is available. On
--    Supabase it is installed in the `extensions` schema.
create extension if not exists pgcrypto with schema extensions;

-- 2) Make sure every column the app writes exists.
alter table public.workers
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.workers
  add column if not exists login_enabled boolean not null default false;
alter table public.workers
  add column if not exists active boolean not null default true;
alter table public.workers
  add column if not exists date_of_birth date;
alter table public.workers
  add column if not exists address text;
alter table public.workers
  add column if not exists username text;
alter table public.workers
  add column if not exists password text;

-- ---------------------------------------------------------------------------
-- 3) admin_create_worker() — create a worker FROM THE TEAM INTERFACE.
--    Creates a real, EMAIL-CONFIRMED auth.users account (so the worker can log
--    in immediately with signInWithPassword), the HR worker row (with ALL the
--    fields entered in the form), and his interface/action permissions — all in
--    one call, WITHOUT switching the admin's session.
--
--    The old 10-arg signature is dropped first so PostgREST doesn't see two
--    overloads (which would make rpc('admin_create_worker', …) ambiguous).
-- ---------------------------------------------------------------------------
drop function if exists public.admin_create_worker(
  text, text, text, text, text, uuid, text, numeric, text, jsonb);
drop function if exists public.admin_create_worker(
  text, text, text, text, text, date, text, text, uuid, text, numeric, text, jsonb);

create or replace function public.admin_create_worker(
  p_email         text,
  p_password      text,
  p_full_name     text,
  p_username      text  default null,
  p_phone         text  default null,
  p_date_of_birth date  default null,
  p_address       text  default null,
  p_type          text  default 'worker',
  p_role_id       uuid  default null,
  p_photo_url     text  default null,
  p_base_salary   numeric default null,
  p_payment_type  text  default null,
  p_permissions   jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_uid       uuid := gen_random_uuid();
  v_worker_id uuid;
  v_perm      jsonb;
  v_email     text := lower(trim(p_email));
begin
  -- Only an admin may create workers (blocks anonymous privilege escalation).
  if not public.is_admin() then
    raise exception 'ONLY_ADMIN_CAN_CREATE_WORKER';
  end if;

  if v_email is null or length(v_email) = 0 then
    raise exception 'EMAIL_REQUIRED';
  end if;
  if p_password is null or length(p_password) = 0 then
    raise exception 'PASSWORD_REQUIRED';
  end if;
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'EMAIL_ALREADY_EXISTS';
  end if;

  -- 1) Create the Supabase Auth account (email confirmed → can log in now).
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_email, crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', p_type,
      'full_name', p_full_name,
      'username', coalesce(p_username, p_full_name)
    ),
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email),
    'email', v_uid::text,
    now(), now(), now()
  );

  -- (the on_auth_user_created trigger already inserted the profile with
  --  role = p_type, from the metadata above)

  -- 2) Create the HR worker row (with EVERY field from the form), linked to
  --    the auth account. login_enabled/password kept for the legacy fallback.
  insert into public.workers (
    user_id, full_name, date_of_birth, phone, email, address, profile_photo,
    type, role_id, base_salary, payment_type, username, password,
    login_enabled, active
  ) values (
    v_uid, p_full_name, p_date_of_birth, p_phone, v_email, p_address, p_photo_url,
    p_type, p_role_id, p_base_salary, p_payment_type,
    coalesce(p_username, split_part(v_email, '@', 1)), p_password,
    true, true
  )
  returning id into v_worker_id;

  -- 3) Store his permissions (which interfaces + which action buttons).
  for v_perm in select * from jsonb_array_elements(coalesce(p_permissions, '[]'::jsonb))
  loop
    insert into public.worker_permissions (worker_id, interface_id, actions)
    values (
      v_worker_id,
      v_perm->>'interfaceId',
      coalesce(
        (select array_agg(value::text) from jsonb_array_elements_text(v_perm->'actions') as value),
        '{}'
      )
    )
    on conflict (worker_id, interface_id)
    do update set actions = excluded.actions;
  end loop;

  return v_worker_id;
end $$;

grant execute on function public.admin_create_worker(
  text, text, text, text, text, date, text, text, uuid, text, numeric, text, jsonb
) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) login_worker() — LEGACY fallback used by Login.tsx for workers that do NOT
--    have a Supabase Auth account yet. Fixes vs. the previous version:
--      • search_path now includes `extensions`, so crypt() resolves.
--      • crypt() is only evaluated for bcrypt-hashed passwords ('$2...'), so a
--        plaintext password never triggers the missing-function error.
-- ---------------------------------------------------------------------------
create or replace function public.login_worker(
  p_email_or_username text,
  p_password          text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare w public.workers%rowtype;
begin
  select * into w
  from public.workers
  where active = true
    and login_enabled = true
    and (lower(email) = lower(p_email_or_username) or username = p_email_or_username)
    and (
      password = p_password
      or (password like '$2%' and password = crypt(p_password, password))
    )
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  return jsonb_build_object(
    'success', true,
    'worker', jsonb_build_object(
      'id',            w.id,
      'full_name',     w.full_name,
      'email',         w.email,
      'type',          w.type,
      'profile_photo', w.profile_photo
    )
  );
end $$;

grant execute on function public.login_worker(text, text) to anon, authenticated;

-- 5) Let workers created before this fix actually log in through the fallback
--    (they were saved with login_enabled = false).
update public.workers
set login_enabled = true
where login_enabled is distinct from true;
