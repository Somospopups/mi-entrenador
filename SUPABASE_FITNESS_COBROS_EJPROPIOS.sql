-- ═══════════════════════════════════════════════════════════════════
-- Mi Entrenador — Módulo COBROS y EJERCICIOS PROPIOS
-- Migración suplementaria (correr en el SQL editor de Supabase, una sola vez).
-- Es SEGURA y NO rompe nada: si las tablas no existen, la app sigue
-- funcionando con almacenamiento local y sincroniza sola cuando se crea.
--
-- Tablas nuevas:
--   fit_cobros           → los abonos que cada ENTRENADOR cobra a sus alumnos
--                          (distintos de fit_pagos, que es lo que el dueño
--                           cobra a los entrenadores).
--   fit_ejercicios_propios → los ejercicios con emoji que crea cada entrenador.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · COBROS de alumnos (los registra el entrenador) ──────────────
create table if not exists fit_cobros (
  id            bigint generated always as identity primary key,
  entrenador_id uuid not null references auth.users(id) on delete cascade,
  alumno_id     text not null default '',   -- user_id del alumno, o 'demo_<dni>' (prueba local no sube)
  alumno_nombre text not null default '',
  monto         numeric not null default 0,
  creado        timestamptz not null default now(),
  dedup         text not null unique         -- idempotente: evita duplicar al reintentar
);
alter table fit_cobros enable row level security;

drop policy if exists fit_cobros_entrenador on fit_cobros;
create policy fit_cobros_entrenador on fit_cobros for all
  using (entrenador_id = auth.uid())
  with check (entrenador_id = auth.uid());

drop policy if exists fit_cobros_super on fit_cobros;
create policy fit_cobros_super on fit_cobros for select
  using (public.fit_es_superadmin());

-- La inserción la hace la RPC (security definer) para no depender de la política
-- y poder pasar el dedup de forma atómica.
create or replace function fit_registrar_cobro(
  p_alumno text, p_nombre text, p_monto numeric, p_dedup text
)
returns json language plpgsql security definer set search_path = public as $$
begin
  insert into fit_cobros (entrenador_id, alumno_id, alumno_nombre, monto, dedup)
  values (auth.uid(), p_alumno, p_nombre, p_monto, p_dedup)
  on conflict (dedup) do nothing;           -- si ya existía (reintento), no duplica
  return json_build_object('ok', true);
end;
$$;
grant execute on function fit_registrar_cobro(text,text,numeric,text) to authenticated;

-- ── 2 · EJERCICIOS PROPIOS del entrenador (con emoji) ───────────────
create table if not exists fit_ejercicios_propios (
  id            bigint generated always as identity primary key,
  entrenador_id uuid not null references auth.users(id) on delete cascade,
  nombre        text not null,
  emoji         text not null default '🏋️',
  categoria     text not null default 'mios',
  creado        timestamptz not null default now(),
  unique (entrenador_id, nombre)             -- sin repetir nombre dentro del mismo profe
);
alter table fit_ejercicios_propios enable row level security;

drop policy if exists fit_ejpropios_entrenador on fit_ejercicios_propios;
create policy fit_ejpropios_entrenador on fit_ejercicios_propios for all
  using (entrenador_id = auth.uid())
  with check (entrenador_id = auth.uid());

-- RPC de alta idempotente (upsert por entrenador+nombre)
create or replace function fit_guardar_ejpropio(
  p_nombre text, p_emoji text, p_categoria text
)
returns json language plpgsql security definer set search_path = public as $$
begin
  insert into fit_ejercicios_propios (entrenador_id, nombre, emoji, categoria)
  values (auth.uid(), p_nombre, coalesce(p_emoji,'🏋️'), coalesce(p_categoria,'mios'))
  on conflict (entrenador_id, nombre)
  do update set emoji = excluded.emoji, categoria = excluded.categoria;
  return json_build_object('ok', true);
end;
$$;
grant execute on function fit_guardar_ejpropio(text,text,text) to authenticated;

-- Listo. Después de correr esto, la app detecta las tablas y empieza a
-- guardar en la nube automáticamente (mantiene además la copia local).
