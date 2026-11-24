-- 0004_storage.sql · Fotos de modelos (HU-04). Lectura pública, escritura solo gerencia.
insert into storage.buckets (id, name, public) values ('modelos', 'modelos', true)
on conflict (id) do nothing;

create policy fotos_modelos_lectura on storage.objects for select
  using (bucket_id = 'modelos');
create policy fotos_modelos_subida on storage.objects for insert to authenticated
  with check (bucket_id = 'modelos' and public.es_gerencia());
create policy fotos_modelos_edicion on storage.objects for update to authenticated
  using (bucket_id = 'modelos' and public.es_gerencia());
create policy fotos_modelos_borrado on storage.objects for delete to authenticated
  using (bucket_id = 'modelos' and public.es_gerencia());
