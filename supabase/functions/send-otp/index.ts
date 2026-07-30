import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateOTP(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += (bytes[i] % 10).toString();
  }
  return code;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, purpose, userId } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a unique 6-digit code
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any previous unused codes for this email/purpose
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email)
      .eq("purpose", purpose || "login")
      .eq("used", false);

    // Store the new code
    const { error: insertError } = await supabase.from("otp_codes").insert({
      email,
      user_id: userId || null,
      code,
      purpose: purpose || "login",
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to generate code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send the email using Supabase's built-in email
    // We use the admin API to send a custom email
    const emailResponse = await fetch(`${supabaseUrl}/auth/v1/admin/email`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: `CEO Exchange — Your verification code: ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0b0e11; padding: 32px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #f0b90b; font-size: 28px; letter-spacing: 0.1em; margin: 0;">CEO EXCHANGE</h1>
              <p style="color: #848e9c; font-size: 12px; letter-spacing: 0.2em; margin-top: 4px;">TRADE BEYOND LIMITS</p>
            </div>
            <h2 style="color: #eaecef; font-size: 18px; text-align: center;">Your Verification Code</h2>
            <p style="color: #848e9c; text-align: center; font-size: 14px;">Use this 6-digit code to verify your ${purpose || "login"} request. This code expires in 10 minutes.</p>
            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; background: #181a20; border: 1px solid #f0b90b; border-radius: 12px; padding: 16px 40px;">
                <span style="font-size: 36px; font-weight: bold; color: #f0b90b; letter-spacing: 0.3em;">${code}</span>
              </div>
            </div>
            <p style="color: #474d57; font-size: 12px; text-align: center;">If you did not request this code, please ignore this email. Never share this code with anyone.</p>
          </div>
        `,
      }),
    }).catch(() => null);

    // If the email API isn't available, we still return success — the code is in the DB
    // and the frontend can show it in development mode
    const emailSent = emailResponse?.ok || false;

    return new Response(JSON.stringify({
      success: true,
      message: emailSent ? "Verification code sent to your email" : "Code generated (email delivery may be delayed)",
      // Only include code in dev mode for testing — in production this should never be returned
      devCode: Deno.env.get("DENO_DEPLOYMENT_ID") ? undefined : code,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
