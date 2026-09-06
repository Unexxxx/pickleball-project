-- Resolve intentional output-column/table-column name overlap in function
-- source without requiring a privileged PostgreSQL setting.
do $$
declare
  v_function regprocedure;
  v_definition text;
begin
  foreach v_function in array array[
    'private.finalize_match_result(uuid)'::regprocedure,
    'public.register_for_event(uuid,text,uuid)'::regprocedure,
    'public.submit_match_result(uuid,jsonb,uuid)'::regprocedure
  ] loop
    v_definition := pg_get_functiondef(v_function);
    v_definition := replace(
      v_definition,
      'AS $function$',
      E'AS $function$\n#variable_conflict use_column\n'
    );
    execute v_definition;
  end loop;
end
$$;
