import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { fullName, docNumber, dobDay, dobMonth, dobYear, docType, frontPhotoBase64, backPhotoBase64 } = await req.json();

    if (!fullName || !docNumber || !dobDay || !dobMonth || !dobYear || !frontPhotoBase64) {
      return new Response(JSON.stringify({ verified: false, reason: "Missing required fields." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { check: string; passed: boolean; detail: string }[] = [];
    let confidence = 0;
    let rejected = false;
    let rejectReason = "";

    // ─── Check 1: Document number format validation ───
    // Each document type has specific format requirements
    const docNumUpper = docNumber.toUpperCase().replace(/\s/g, "");
    let docFormatValid = false;

    if (docType === "PASSPORT") {
      // Most passports: 8-9 alphanumeric chars
      docFormatValid = /^[A-Z0-9]{6,12}$/.test(docNumUpper);
    } else if (docType === "DRIVERS_LICENSE") {
      // Driver's licenses vary by country: 5-20 alphanumeric
      docFormatValid = /^[A-Z0-9]{5,20}$/.test(docNumUpper);
    } else {
      // National ID: varies, typically 6-20 alphanumeric
      docFormatValid = /^[A-Z0-9]{6,20}$/.test(docNumUpper);
    }

    if (!docFormatValid) {
      rejected = true;
      rejectReason = `Document number format is invalid for a ${docType.toLowerCase().replace(/_/g, " ")}. Please check your document number.`;
      results.push({ check: "Document Number Format", passed: false, detail: `Invalid format: ${docNumUpper}` });
    } else {
      confidence += 15;
      results.push({ check: "Document Number Format", passed: true, detail: "Valid format" });
    }

    // ─── Check 2: Date of birth validation ───
    const day = parseInt(dobDay);
    const month = parseInt(dobMonth);
    const year = parseInt(dobYear);
    const dob = new Date(year, month - 1, day);
    const now = new Date();
    const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    if (isNaN(dob.getTime()) || day < 1 || day > 31 || month < 1 || month > 12) {
      rejected = true;
      rejectReason = "Invalid date of birth. Please check your date of birth.";
      results.push({ check: "Date of Birth", passed: false, detail: "Invalid date" });
    } else if (age < 18) {
      rejected = true;
      rejectReason = "You must be at least 18 years old to use this platform.";
      results.push({ check: "Date of Birth", passed: false, detail: `Age: ${Math.floor(age)}` });
    } else if (age > 120) {
      rejected = true;
      rejectReason = "Invalid date of birth. Please check your date of birth.";
      results.push({ check: "Date of Birth", passed: false, detail: `Age: ${Math.floor(age)}` });
    } else {
      confidence += 10;
      results.push({ check: "Date of Birth", passed: true, detail: `Age: ${Math.floor(age)}` });
    }

    // ─── Check 3: Name validation ───
    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      rejected = true;
      rejectReason = "Please enter your full name (first name and last name) exactly as it appears on your document.";
      results.push({ check: "Name Validation", passed: false, detail: "Need at least first and last name" });
    } else if (fullName.length < 4) {
      rejected = true;
      rejectReason = "Name is too short. Please enter your full legal name.";
      results.push({ check: "Name Validation", passed: false, detail: "Name too short" });
    } else {
      confidence += 10;
      results.push({ check: "Name Validation", passed: true, detail: `${nameParts.length} name parts` });
    }

    // ─── Check 4: Image validation (base64 analysis) ───
    // Decode base64 and check image properties
    try {
      const frontBytes = base64ToBytes(frontPhotoBase64);
      // Check file size (min 20KB, max 10MB)
      if (frontBytes.length < 20000) {
        rejected = true;
        rejectReason = "Front photo is too small. The image must be at least 20KB. Please take a clearer, higher-resolution photo of your document.";
        results.push({ check: "Image Size", passed: false, detail: `${frontBytes.length} bytes` });
      } else if (frontBytes.length > 10 * 1024 * 1024) {
        rejected = true;
        rejectReason = "Front photo is too large. Maximum size is 10MB.";
        results.push({ check: "Image Size", passed: false, detail: `${(frontBytes.length / 1024 / 1024).toFixed(1)}MB` });
      } else {
        confidence += 15;
        results.push({ check: "Image Size", passed: true, detail: `${(frontBytes.length / 1024).toFixed(0)}KB` });
      }

      // Check image format (JPEG, PNG, WebP, HEIC)
      const isJpeg = frontBytes[0] === 0xFF && frontBytes[1] === 0xD8;
      const isPng = frontBytes[0] === 0x89 && frontBytes[1] === 0x50;
      const isWebp = frontBytes.length > 12 && frontBytes.slice(8, 12).some((b, i) => b === [0x57, 0x45, 0x42, 0x50][i]);
      const isHeic = frontBytes[4] === 0x66 && frontBytes[5] === 0x74 && frontBytes[6] === 0x79 && frontBytes[7] === 0x70;

      if (!isJpeg && !isPng && !isWebp && !isHeic) {
        rejected = true;
        rejectReason = "Invalid image format. Please upload a JPEG, PNG, or WebP image of your document.";
        results.push({ check: "Image Format", passed: false, detail: "Unknown format" });
      } else {
        confidence += 10;
        results.push({ check: "Image Format", passed: true, detail: isJpeg ? "JPEG" : isPng ? "PNG" : "WebP/HEIC" });
      }
    } catch {
      rejected = true;
      rejectReason = "Could not process the uploaded image. Please try again with a different photo.";
      results.push({ check: "Image Processing", passed: false, detail: "Decode error" });
    }

    // ─── Check 5: Back photo validation (for non-passport) ───
    if (docType !== "PASSPORT" && backPhotoBase64) {
      try {
        const backBytes = base64ToBytes(backPhotoBase64);
        if (backBytes.length < 20000) {
          rejected = true;
          rejectReason = "Back photo is too small. The image must be at least 20KB.";
          results.push({ check: "Back Photo Size", passed: false, detail: `${backBytes.length} bytes` });
        } else {
          confidence += 5;
          results.push({ check: "Back Photo Size", passed: true, detail: `${(backBytes.length / 1024).toFixed(0)}KB` });
        }
      } catch {
        results.push({ check: "Back Photo", passed: false, detail: "Decode error" });
      }
    }

    // ─── Check 6: Entropy analysis on image data ───
    // Real photos have high entropy; flat/fake images have low entropy
    try {
      const frontBytes = base64ToBytes(frontPhotoBase64);
      const sample = frontBytes.slice(0, Math.min(4096, frontBytes.length));
      const counts = new Array(256).fill(0);
      for (const b of sample) counts[b]++;
      let entropy = 0;
      for (const c of counts) {
        if (c > 0) {
          const p = c / sample.length;
          entropy -= p * Math.log2(p);
        }
      }
      if (entropy < 3.0) {
        rejected = true;
        rejectReason = "Image appears to be a flat or solid color (possibly a screenshot or generated image). Please photograph your actual physical document.";
        results.push({ check: "Image Entropy", passed: false, detail: `Entropy: ${entropy.toFixed(2)}` });
      } else if (entropy < 4.5) {
        confidence += 5;
        results.push({ check: "Image Entropy", passed: true, detail: `Low entropy: ${entropy.toFixed(2)}` });
      } else {
        confidence += 10;
        results.push({ check: "Image Entropy", passed: true, detail: `Entropy: ${entropy.toFixed(2)}` });
      }
    } catch {
      results.push({ check: "Image Entropy", passed: false, detail: "Analysis error" });
    }

    // ─── Check 7: Duplicate document check via database ───
    // Query the database for existing documents with the same document number
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    try {
      const dupRes = await fetch(`${supabaseUrl}/rest/v1/kyc_documents?select=id,user_id&document_number=eq.${encodeURIComponent(docNumUpper)}&user_id=neq.${encodeURIComponent(req.headers.get("x-user-id") || "")}`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      });
      if (dupRes.ok) {
        const dupData = await dupRes.json();
        if (Array.isArray(dupData) && dupData.length > 0) {
          rejected = true;
          rejectReason = "This document number is already registered to another account. Using the same document for multiple accounts is strictly prohibited.";
          results.push({ check: "Duplicate Document", passed: false, detail: "Document number already exists" });
        } else {
          confidence += 20;
          results.push({ check: "Duplicate Document", passed: true, detail: "No duplicates found" });
        }
      }
    } catch {
      results.push({ check: "Duplicate Document", passed: true, detail: "Check skipped (DB unavailable)" });
    }

    // ─── Final Decision ───
    // Require minimum confidence of 50 to pass
    if (!rejected && confidence < 50) {
      rejected = true;
      rejectReason = "Document verification confidence too low. Please ensure the document is clearly visible, well-lit, and all text is readable. Take a photo of the actual physical document.";
    }

    return new Response(JSON.stringify({
      verified: !rejected,
      confidence,
      reason: rejected ? rejectReason : "Document passed all automated verification checks.",
      checks: results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      verified: false,
      reason: "Verification failed due to a technical error. Please try again.",
      error: err.message,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function base64ToBytes(b64: string): Uint8Array {
  const base64 = b64.includes(",") ? b64.split(",")[1] : b64;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
