create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.club_role as enum ('owner','organizer','score_official','staff','member');
create type public.membership_status as enum ('invited','active','suspended','left');
create type public.subscription_status as enum ('trialing','active','past_due','canceled','expired');
create type public.record_class as enum ('ranked','unranked');

create or replace function private.set_updated_at() returns trigger language plpgsql
set search_path = pg_catalog, public, private as $$ begin new.updated_at = now(); new.version = old.version + 1; return new; end $$;
