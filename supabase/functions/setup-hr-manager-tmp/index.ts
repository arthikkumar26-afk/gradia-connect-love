import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (_req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);
  const email = "hr.manager@gradiaa.com";
  const password = "Test@12345";
  const full_name = "HR Manager";

  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: "hr_manager", full_name },
  });
  if (error || !created.user) {
    return new Response(JSON.stringify({ error: error?.message }), { status: 400 });
  }
  const id = created.user.id;
  const { error: pe } = await admin.from("profiles").upsert(
    { id, email, full_name, role: "hr_manager" },
    { onConflict: "id" }
  );
  const { error: re } = await admin.from("user_roles").upsert(
    { user_id: id, role: "hr_manager" } as any,
    { onConflict: "user_id,role" }
  );
  return new Response(JSON.stringify({ ok: true, id, profile_err: pe?.message, role_err: re?.message }), {
    headers: { "Content-Type": "application/json" },
  });
});
