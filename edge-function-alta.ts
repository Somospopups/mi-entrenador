// ============================================================
// POPUPS FITNESS · Edge Function "alta" (v1)
// ------------------------------------------------------------
// La única pieza con la llave privilegiada (service_role, que
// Supabase le inyecta sola — nunca viaja al navegador).
//
// Qué hace, según quién llama:
//   · SUPERADMIN  → crea ENTRENADORES (con membresía inicial)
//   · ENTRENADOR  → crea ALUMNOS (que quedan atados a él)
//   · ambos       → blanquear contraseña / eliminar (solo los suyos)
//
// El login de la app es por DNI: acá se fabrica el email
// sintético dni@fit.popups.invalid que usa Supabase Auth.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const DOMINIO = "fit.popups.invalid";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const responder = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function claveAleatoria(): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ", num = "23456789";
  let l = "", n = "";
  for (let i = 0; i < 3; i++) l += letras[Math.floor(Math.random() * letras.length)];
  for (let j = 0; j < 4; j++) n += num[Math.floor(Math.random() * num.length)];
  return l[0] + l.slice(1).toLowerCase() + n; // ej: Abc4729
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // — el cliente privilegiado (solo vive acá adentro) —
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // — ¿quién llama? se verifica su token de sesión —
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: quien } = await admin.auth.getUser(token);
    if (!quien?.user) return responder({ error: "Sesión inválida." }, 401);

    const { data: yo } = await admin.from("fit_perfiles")
      .select("*").eq("user_id", quien.user.id).single();
    if (!yo || !yo.activo) return responder({ error: "Tu cuenta no está activa." }, 403);
    const soySuper = yo.rol === "superadmin";
    const soyProfe = yo.rol === "entrenador";
    if (!soySuper && !soyProfe) return responder({ error: "Sin permiso." }, 403);

    const cuerpo = await req.json();
    const accion = String(cuerpo.accion || "");

    // ── CREAR (superadmin → entrenador · entrenador → alumno) ──
    if (accion === "crear") {
      const dni = String(cuerpo.dni || "").replace(/\D/g, "");
      const nombre = String(cuerpo.nombre || "").trim();
      if (dni.length < 7) return responder({ error: "Ese DNI no parece válido." }, 400);

      const rolNuevo = soySuper ? "entrenador" : "alumno";
      const { data: repetido } = await admin.from("fit_perfiles")
        .select("user_id").eq("dni", dni).maybeSingle();
      if (repetido) return responder({ error: "Ya existe una cuenta con ese DNI." }, 400);

      const password = claveAleatoria();
      const { data: creado, error: errAuth } = await admin.auth.admin.createUser({
        email: `${dni}@${DOMINIO}`,
        password,
        email_confirm: true,
      });
      if (errAuth || !creado?.user) return responder({ error: "No se pudo crear la cuenta: " + (errAuth?.message || "") }, 500);

      // membresía inicial: solo importa para entrenadores
      const mem = String(cuerpo.membresia || "1");
      const dia = 24 * 60 * 60 * 1000;
      const vence = rolNuevo === "alumno" ? null
        : mem === "siempre" ? new Date("2099-12-31").toISOString()
        : mem === "prueba" ? new Date(Date.now() + 5 * dia).toISOString()
        : new Date(Date.now() + 30 * dia).toISOString();

      const { error: errPerfil } = await admin.from("fit_perfiles").insert({
        user_id: creado.user.id,
        dni, nombre: nombre || `DNI ${dni}`,
        telefono: String(cuerpo.telefono || "").trim(),
        rol: rolNuevo,
        entrenador_id: rolNuevo === "alumno" ? yo.user_id : null,
        activo: true,
        debe_cambiar_password: true,   // contraseña propia en el primer ingreso
        membresia_tipo: rolNuevo === "alumno" ? "meses" : (mem === "siempre" ? "siempre" : mem === "prueba" ? "prueba" : "meses"),
        membresia_vence: vence,
      });
      if (errPerfil) {
        await admin.auth.admin.deleteUser(creado.user.id); // sin perfil no queda basura
        return responder({ error: "No se pudo guardar el perfil: " + errPerfil.message }, 500);
      }
      return responder({ ok: true, user_id: creado.user.id, dni, password, rol: rolNuevo });
    }

    // — permiso sobre el destinatario: el superadmin sobre entrenadores,
    //   el entrenador SOLO sobre sus alumnos —
    const destinoId = String(cuerpo.user_id || "");
    const { data: destino } = await admin.from("fit_perfiles")
      .select("*").eq("user_id", destinoId).maybeSingle();
    if (!destino) return responder({ error: "No existe esa cuenta." }, 404);
    const puedo = (soySuper && destino.rol !== "superadmin") ||
                  (soyProfe && destino.rol === "alumno" && destino.entrenador_id === yo.user_id);
    if (!puedo) return responder({ error: "Esa cuenta no es tuya." }, 403);

    // ── BLANQUEAR CONTRASEÑA ──
    if (accion === "blanquear") {
      const password = claveAleatoria();
      const { error } = await admin.auth.admin.updateUserById(destinoId, { password });
      if (error) return responder({ error: error.message }, 500);
      await admin.from("fit_perfiles").update({ debe_cambiar_password: true }).eq("user_id", destinoId);
      return responder({ ok: true, password });
    }

    // ── ELIMINAR ──
    if (accion === "eliminar") {
      const { error } = await admin.auth.admin.deleteUser(destinoId); // el perfil cae en cascada
      if (error) return responder({ error: error.message }, 500);
      return responder({ ok: true });
    }

    return responder({ error: "Acción desconocida." }, 400);
  } catch (e) {
    return responder({ error: "Error inesperado: " + (e as Error).message }, 500);
  }
});
