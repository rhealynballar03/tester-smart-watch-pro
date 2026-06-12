// ============================================================
//  Tester Smart Watch Pro — automated follow-up sequence
//
//  Run this on a schedule (daily is ideal). Each run finds contacts
//  who are "due" (>= FOLLOWUP_INTERVAL_DAYS since their last touch),
//  sends them the NEXT email in the sequence, advances their stage,
//  and logs the interaction in the email_events table.
//
//  Usage:  node followups.js
//  Test:   set FOLLOWUP_INTERVAL_DAYS=0 in .env to send immediately.
// ============================================================

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const TABLE = process.env.SUPABASE_TABLE || "form_submissions";
const FROM = process.env.RESEND_FROM || "Tester Laboratories <onboarding@resend.dev>";
const REPLY_TO = process.env.RESEND_REPLY_TO || undefined;
const INTERVAL_DAYS = Number(process.env.FOLLOWUP_INTERVAL_DAYS || 5);
const ONLY_SUBSCRIBERS = String(process.env.FOLLOWUP_ONLY_SUBSCRIBERS || "false") === "true";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const resend = new Resend(process.env.RESEND_API_KEY);

// --- shared branded wrapper ------------------------------------
function shell(inner) {
  return `
  <div style="background:#000;padding:40px 0;font-family:Arial,Helvetica,sans-serif;color:#efe9dd;">
    <div style="max-width:520px;margin:0 auto;padding:0 24px;">
      <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d8b981;margin:0 0 18px;">
        Tester Laboratories
      </p>
      ${inner}
      <a href="http://localhost:3000/product.html"
         style="display:inline-block;margin-top:8px;font-size:13px;letter-spacing:2px;text-transform:uppercase;
                color:#d8b981;text-decoration:none;border:1px solid #d8b981;border-radius:3px;padding:14px 28px;">
        Explore the watch →
      </a>
      <p style="font-size:12px;color:#7e766a;margin:34px 0 0;">
        Tester Laboratories · Est. 2026 — reply anytime, a real person reads every message.
      </p>
    </div>
  </div>`;
}

const h1 = (t) => `<h1 style="font-size:26px;font-weight:300;line-height:1.25;margin:0 0 16px;color:#fff;">${t}</h1>`;
const p = (t) => `<p style="font-size:16px;line-height:1.7;color:#b6ad9c;margin:0 0 16px;">${t}</p>`;

// --- the sequence ----------------------------------------------
// Stage 0 → step[0] sent first, then stage 1 → step[1], etc.
const FOLLOWUPS = [
  {
    type: "followup_1_value",
    subject: (n) => `${n}, here's what makes the Smart Watch Pro different`,
    html: (n) =>
      shell(
        h1(`Engineered to the micron, ${n}.`) +
        p("Aerospace-grade titanium. A sapphire crystal you can't scratch. Sealed to dive depths most watches never see.") +
        p("It's not a smartwatch with a luxury skin — it's a precision instrument that happens to be smart. Built to outlast trends, and your next three phones.")
      ),
  },
  {
    type: "followup_2_testimonials",
    subject: () => `What early wearers are saying`,
    html: (n) =>
      shell(
        h1("Don't take our word for it.") +
        p("“Three months of daily wear, zero scratches. It feels like it was machined for my wrist.” — <em>A. Reyes</em>") +
        p("“The build quality embarrasses watches twice the price.” — <em>M. Tan</em>") +
        p(`We'd love for you to join them, ${n}.`)
      ),
  },
  {
    type: "followup_3_updates",
    subject: () => `What's new at Tester Laboratories`,
    html: (n) =>
      shell(
        h1("Fresh from the lab.") +
        p("We've just opened early reservations and added two new finishes. Subscribers get first access before public launch.") +
        p(`You're on the list, ${n} — and you'll hear it here first.`)
      ),
  },
];

// --- interaction logging ---------------------------------------
async function logEvent(email, type, status, detail) {
  const { error } = await supabase
    .from("email_events")
    .insert([{ email, type, status, detail: (detail || "").slice(0, 500) }]);
  if (error) console.warn(`   (event-log failed: ${error.message})`);
}

// --- main ------------------------------------------------------
async function run() {
  const cutoffMs = Date.now() - INTERVAL_DAYS * 24 * 60 * 60 * 1000;

  const { data: users, error } = await supabase
    .from(TABLE)
    .select("id, name, email, followup_stage, last_followup_at, created_at, reply_status, newsletter_subscribed");

  if (error) {
    console.error("❌ Could not read contacts: " + error.message);
    if (/followup_stage|last_followup_at/.test(error.message)) {
      console.error("   → Looks like the follow-up columns don't exist yet. Run the SQL from setup first.");
    }
    process.exit(1);
  }

  let sent = 0, failed = 0, skipped = 0;

  for (const u of users) {
    // Skip: sequence complete, already engaged, (optionally) not subscribed, or not due yet.
    if ((u.followup_stage || 0) >= FOLLOWUPS.length) { skipped++; continue; }
    if (u.reply_status === "replied") { skipped++; continue; }
    if (ONLY_SUBSCRIBERS && !u.newsletter_subscribed) { skipped++; continue; }
    const lastTouch = new Date(u.last_followup_at || u.created_at).getTime();
    if (lastTouch > cutoffMs) { skipped++; continue; }

    const stage = u.followup_stage || 0;
    const step = FOLLOWUPS[stage];
    const firstName = (u.name || "there").split(" ")[0];

    try {
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: u.email,
        replyTo: REPLY_TO,
        subject: step.subject(firstName),
        html: step.html(firstName),
      });
      if (sendErr) throw new Error(sendErr.message || JSON.stringify(sendErr));

      // Only advance the stage if the send actually succeeded.
      await supabase
        .from(TABLE)
        .update({ followup_stage: stage + 1, last_followup_at: new Date().toISOString() })
        .eq("id", u.id);

      await logEvent(u.email, step.type, "sent", step.subject(firstName));
      sent++;
      console.log(`✉️  ${step.type} → ${u.email}`);
    } catch (e) {
      await logEvent(u.email, step.type, "failed", e.message);
      failed++;
      console.warn(`⚠️  ${step.type} FAILED → ${u.email}: ${e.message}`);
    }
  }

  console.log(`\nFollow-up run complete. sent=${sent}  failed=${failed}  skipped=${skipped} (of ${users.length} contacts)\n`);
}

run();
