import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, type, title, body: emailBody, code, email: targetEmail } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Resolve the user's email if not provided
    let userEmail = targetEmail;
    if (!userEmail && user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, anti_phishing_code")
        .eq("user_id", user_id)
        .maybeSingle();
      userEmail = profile?.email;
    }

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For 2FA email codes and confirmation codes, store the code in notifications
    // and also send via Supabase auth admin send email
    let subject = title || "CEO Exchange Notification";
    let messageBody = emailBody || "";

    if (type === "2FA_EMAIL_CODE" && code) {
      subject = "Your CEO Exchange 2FA Verification Code";
      messageBody = `Your 2FA email verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, please contact support immediately.\n\nCEO Exchange - Trade Beyond Limits`;
    } else if (type === "2FA_ENABLED") {
      subject = "CEO Exchange – 2FA Enabled";
      messageBody = "Two-factor authentication has been successfully enabled on your CEO Exchange account. If you did not do this, contact support immediately.\n\nCEO Exchange - Trade Beyond Limits";
    } else if (type === "EMAIL_CONFIRMATION") {
      subject = "Confirm Your CEO Exchange Account";
      messageBody = `Welcome to CEO Exchange!\n\nPlease confirm your email to activate your account.\n\nConfirmation code: ${code}\n\nCEO Exchange - Trade Beyond Limits`;
    }

    // Store notification in the notifications table
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: user_id || null,
      type: type || "GENERAL",
      subject,
      message: messageBody,
      email_sent: true,
    });

    if (insertError) {
      console.error("Failed to store notification:", insertError.message);
    }

    // Send the actual email using Supabase's built-in email service
    // We use the admin API to send a custom email
    const emailResponse = await fetch(`${supabaseUrl}/auth/v1/admin/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({
        to: userEmail,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0e11; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f0b90b; font-size: 24px; margin: 0;">CEO Exchange</h1>
              <p style="color: #848e9c; font-size: 14px;">Trade Beyond Limits</p>
            </div>
            <div style="background: #181a20; border: 1px solid #2b2f36; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
              <h2 style="color: #eaecef; font-size: 18px; margin-top: 0;">${subject}</h2>
              <p style="color: #eaecef; font-size: 14px; line-height: 1.6; white-space: pre-line;">${messageBody}</p>
            </div>
            <p style="color: #474d57; font-size: 12px; text-align: center;">
              This is an automated message from CEO Exchange. Do not reply to this email.
            </p>
          </div>
        `,
      }),
    });

    // If the admin email endpoint isn't available, fall back to inserting
    // a notification record that the user can see in-app
    if (!emailResponse.ok) {
      console.error("Email send failed:", await emailResponse.text());
      // Still return success — the notification is stored in-app
      return new Response(JSON.stringify({
        success: true,
        sent_to: userEmail,
        email_delivered: false,
        note: "Email stored as in-app notification. Check the notifications panel.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      sent_to: userEmail,
      email_delivered: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
