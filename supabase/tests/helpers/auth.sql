create schema if not exists tests;
create or replace function tests.authenticate_as(p_user_id uuid)
returns void language sql as $$ select set_config('request.jwt.claim.sub', p_user_id::text, true) $$;

create or replace function tests.clear_authentication()
returns void language sql as $$ select set_config('request.jwt.claim.sub', '', true) $$;

select plan(1);
select has_function('tests', 'authenticate_as', array['uuid']);
select * from finish();
