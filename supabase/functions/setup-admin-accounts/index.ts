import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const accounts = [
      { email: "ceo.exchange.web@gmail.com", password: "ceoadmin@852", role: "admin" as const },
      { email: "gojoexpresscom@gmail.com", password: "Tech469339$", role: "owner" as const },
    ];

    const results: string[] = [];

    for (const account of accounts) {
      // Check if user already exists
      const { data: existing } = await supabase.auth.admin.listUsers();
      const found = existing.users.find(u => u.email === account.email);

      if (found) {
        // Update password to ensure correct credentials
        await supabase.auth.admin.updateUserById(found.id, {
          password: account.password,
          email_confirm: true,
        });
        results.push(`${account.email}: password updated`);
      } else {
        // Create new admin/owner account
        const { data: created, error } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
        });

        if (error) {
          results.push(`${account.email}: error - ${error.message}`);
          continue;
        }

        // Create profile entry
        if (created.user) {
          await supabase.from("profiles").upsert({
            user_id: created.user.id,
            email: account.email,
            nickname: account.role === "owner" ? "Owner" : "Admin",
            role: account.role,
            kyc_status: "VERIFIED",
            security_level: "High",
            vip_level: 999,
            is_banned: false,
            warning_count: 0,
          }, { onConflict: "user_id" });
          results.push(`${account.email}: created with ${account.role} role`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
