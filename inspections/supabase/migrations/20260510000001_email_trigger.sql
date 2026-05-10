-- Trigger qui appelle l'Edge Function "send-inspection-email" après insertion
-- d'une inspection. Requiert l'extension pg_net (activée par défaut sur Supabase).

create extension if not exists pg_net;

create or replace function notify_inspection_created()
returns trigger as $$
declare
  function_url text;
  service_key  text;
begin
  -- Ces deux valeurs sont à définir dans Database → Settings → Custom Postgres Config:
  --   app.settings.supabase_url     = 'https://<ref>.supabase.co'
  --   app.settings.service_role_key = '<service role key>'
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-inspection-email';
  service_key  := current_setting('app.settings.service_role_key', true);

  if function_url is null or service_key is null then
    return new;
  end if;

  perform net.http_post(
    url     := function_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := jsonb_build_object('inspection_id', new.id)
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_inspections_notify
  after insert on inspections
  for each row execute function notify_inspection_created();
