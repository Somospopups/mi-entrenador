-- ============================================================
-- POPUPS FITNESS · Instalación de 3 niveles (v1)
-- ------------------------------------------------------------
-- Proyecto: entrenador-produccion (org Popups Fitness)
--
-- El modelo:
--   SUPERADMIN (vos)  → gestiona entrenadores y cobra membresías
--   ENTRENADOR        → gestiona SOLO sus alumnos y sus planes
--   ALUMNO            → ve SOLO su plan y escribe SOLO sus marcas
--
-- La regla de oro: la información cruza ÚNICAMENTE de entrenador
-- a alumno. Está garantizada por RLS en el servidor: aunque
-- alguien manipule la app, la base se niega a mostrar filas
-- ajenas. El superadmin NO ve planes ni marcas: solo perfiles y
-- cobros (privacidad del trabajo de cada profe).
--
-- Se pega entero en el SQL Editor y se corre UNA vez.
-- Es re-ejecutable: correrlo de nuevo no rompe nada.
-- ============================================================

-- ── 1 · Perfiles (los tres roles en una tabla) ──────────────
create table if not exists fit_perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dni text unique not null,
  nombre text not null default '',
  telefono text not null default '',
  rol text not null default 'alumno' check (rol in ('superadmin','entrenador','alumno')),
  entrenador_id uuid references auth.users(id) on delete set null, -- solo para alumnos: su profe
  activo boolean not null default true,
  debe_cambiar_password boolean not null default true,
  -- la membresía aplica a ENTRENADORES (vos les cobrás a ellos):
  membresia_tipo text not null default 'meses' check (membresia_tipo in ('meses','prueba','siempre')),
  membresia_inicio timestamptz not null default now(),
  membresia_vence timestamptz,
  creado timestamptz not null default now()
);
create index if not exists fit_perfiles_entrenador_idx on fit_perfiles (entrenador_id);
alter table fit_perfiles enable row level security;

-- ── 2 · Las preguntas de identidad (se responden en el servidor) ─
create or replace function fit_es_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from fit_perfiles
    where user_id = auth.uid() and rol = 'superadmin' and activo);
$$;

create or replace function fit_es_entrenador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from fit_perfiles
    where user_id = auth.uid() and rol = 'entrenador' and activo);
$$;

-- ¿Quién es el entrenador de este alumno?
create or replace function fit_entrenador_de(p_alumno uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select entrenador_id from fit_perfiles where user_id = p_alumno;
$$;

-- ── 3 · Políticas de perfiles ───────────────────────────────
-- Cada uno se ve a sí mismo; el entrenador ve SOLO a sus alumnos;
-- el superadmin ve todos los perfiles (para gestionar y cobrar).
drop policy if exists fit_perfil_ver on fit_perfiles;
create policy fit_perfil_ver on fit_perfiles for select using (
  user_id = auth.uid()
  or fit_es_superadmin()
  or (fit_es_entrenador() and entrenador_id = auth.uid())
);
-- Editar: el superadmin todo; el entrenador SOLO a sus alumnos.
drop policy if exists fit_perfil_editar on fit_perfiles;
create policy fit_perfil_editar on fit_perfiles for update using (
  fit_es_superadmin()
  or (fit_es_entrenador() and entrenador_id = auth.uid())
);
-- Altas y bajas de cuentas: SOLO la Edge Function (service_role,
-- que salta el RLS). Nadie más inserta ni borra perfiles.

-- ── 4 · Planes (el profe escribe, el alumno lee) ────────────
create table if not exists fit_planes (
  alumno_id uuid primary key references auth.users(id) on delete cascade,
  entrenador_id uuid not null references auth.users(id) on delete cascade,
  plan jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);
create index if not exists fit_planes_entrenador_idx on fit_planes (entrenador_id);
alter table fit_planes enable row level security;

drop policy if exists fit_plan_ver on fit_planes;
create policy fit_plan_ver on fit_planes for select using (
  alumno_id = auth.uid()                                        -- el alumno, su plan
  or (fit_es_entrenador() and entrenador_id = auth.uid())       -- el profe, los suyos
);
drop policy if exists fit_plan_escribir on fit_planes;
create policy fit_plan_escribir on fit_planes for all using (
  fit_es_entrenador() and entrenador_id = auth.uid()
) with check (
  fit_es_entrenador()
  and entrenador_id = auth.uid()
  and fit_entrenador_de(alumno_id) = auth.uid()  -- solo A SUS alumnos, a nadie más
);

-- ── 5 · Marcas diarias ✓/✗ (el alumno escribe, su profe lee) ─
create table if not exists fit_marcas (
  alumno_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null,
  marcas jsonb not null default '{}'::jsonb,   -- { "idEjercicio": true|false }
  actualizado timestamptz not null default now(),
  primary key (alumno_id, fecha)
);
alter table fit_marcas enable row level security;

drop policy if exists fit_marcas_alumno on fit_marcas;
create policy fit_marcas_alumno on fit_marcas for all using (
  alumno_id = auth.uid()
) with check (alumno_id = auth.uid());
drop policy if exists fit_marcas_ve_profe on fit_marcas;
create policy fit_marcas_ve_profe on fit_marcas for select using (
  fit_es_entrenador() and fit_entrenador_de(alumno_id) = auth.uid()
);

-- ── 6 · Pagos de los entrenadores (tu caja) ─────────────────
create table if not exists fit_pagos (
  id bigint generated always as identity primary key,
  entrenador_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default '',
  meses int not null check (meses in (1,3,6)),
  monto numeric not null default 0,
  fecha timestamptz not null default now()
);
alter table fit_pagos enable row level security;
drop policy if exists fit_pagos_super on fit_pagos;
create policy fit_pagos_super on fit_pagos for all using (fit_es_superadmin())
  with check (fit_es_superadmin());

-- ── 7 · RPCs de administración ──────────────────────────────
-- Registrar el pago de un entrenador y correr su vencimiento.
create or replace function fit_registrar_pago(p_entrenador uuid, p_meses int, p_monto numeric)
returns void language plpgsql security definer set search_path = public as $$
declare v_base timestamptz;
begin
  if not fit_es_superadmin() then raise exception 'Solo el superadmin registra pagos'; end if;
  select case when membresia_tipo = 'meses' and membresia_vence > now()
              then membresia_vence else now() end
    into v_base from fit_perfiles where user_id = p_entrenador and rol = 'entrenador';
  if v_base is null then raise exception 'Ese perfil no es un entrenador'; end if;
  update fit_perfiles
     set membresia_tipo = 'meses', membresia_vence = v_base + (p_meses * interval '30 days')
   where user_id = p_entrenador;
  insert into fit_pagos (entrenador_id, nombre, meses, monto)
  select user_id, nombre, p_meses, p_monto from fit_perfiles where user_id = p_entrenador;
end; $$;
grant execute on function fit_registrar_pago(uuid,int,numeric) to authenticated;

-- Prueba de 5 días o membresía para siempre (solo entrenadores).
create or replace function fit_cambiar_membresia(p_entrenador uuid, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not fit_es_superadmin() then raise exception 'Solo el superadmin cambia membresías'; end if;
  if p_tipo = 'siempre' then
    update fit_perfiles set membresia_tipo = 'siempre', membresia_vence = '2099-12-31'
     where user_id = p_entrenador and rol = 'entrenador';
  elsif p_tipo = 'prueba' then
    update fit_perfiles set membresia_tipo = 'prueba',
           membresia_inicio = now(), membresia_vence = now() + interval '5 days'
     where user_id = p_entrenador and rol = 'entrenador';
  else
    raise exception 'Tipo inválido (prueba o siempre)';
  end if;
end; $$;
grant execute on function fit_cambiar_membresia(uuid,text) to authenticated;

-- Activar/desactivar: el superadmin a entrenadores; el profe a SUS alumnos.
create or replace function fit_set_activo(p_user uuid, p_activo boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if fit_es_superadmin() then
    update fit_perfiles set activo = p_activo where user_id = p_user;
  elsif fit_es_entrenador() then
    update fit_perfiles set activo = p_activo
     where user_id = p_user and entrenador_id = auth.uid() and rol = 'alumno';
    if not found then raise exception 'Ese alumno no es tuyo'; end if;
  else
    raise exception 'Sin permiso';
  end if;
end; $$;
grant execute on function fit_set_activo(uuid,boolean) to authenticated;

-- El usuario ya eligió su contraseña propia: se apaga la marca.
create or replace function fit_password_cambiada()
returns void language sql security definer set search_path = public as $$
  update fit_perfiles set debe_cambiar_password = false where user_id = auth.uid();
$$;
grant execute on function fit_password_cambiada() to authenticated;

-- ¿Puede entrar este usuario? (lo consulta la app en cada ingreso)
-- Contempla la cadena: alumno bloqueado si SU ENTRENADOR venció.
create or replace function fit_estado_acceso()
returns text language plpgsql stable security definer set search_path = public as $$
declare yo fit_perfiles%rowtype; profe fit_perfiles%rowtype;
begin
  select * into yo from fit_perfiles where user_id = auth.uid();
  if yo is null then return 'sin_perfil'; end if;
  if not yo.activo then return 'inactivo'; end if;
  if yo.rol = 'superadmin' then return 'ok'; end if;
  if yo.rol = 'entrenador' then
    if yo.membresia_vence is not null and yo.membresia_vence < now() then
      return case when yo.membresia_tipo = 'prueba' then 'prueba_vencida' else 'membresia_vencida' end;
    end if;
    return 'ok';
  end if;
  -- alumno: depende de su entrenador
  select * into profe from fit_perfiles where user_id = yo.entrenador_id;
  if profe is null or not profe.activo then return 'entrenador_inactivo'; end if;
  if profe.membresia_vence is not null and profe.membresia_vence < now() then
    return 'entrenador_vencido';
  end if;
  return 'ok';
end; $$;
grant execute on function fit_estado_acceso() to authenticated;

-- ============================================================
-- LISTO. Después de correr esto queda 1 paso a mano:
-- crear TU cuenta de superadmin (instrucciones en el chat).
-- ============================================================
