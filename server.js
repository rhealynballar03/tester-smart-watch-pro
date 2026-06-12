// ============================================================
//  Tester Smart Watch Pro — tiny contact-form server
//  Flow:  form (index.html) → POST /submit →
//           • append row to Google Sheet
//           • insert row into Supabase
//           • send a welcome email via Resend (best effort)
//         → redirect to thankyou.html (5s) → product.html
//
//  Also: POST /webhook/resend logs EVERY Resend email event
//        (sent/delivered/opened/clicked/bounced/complained/failed +
//        inbound replies) into the email_events table, and marks a
//        replying contact as reply_status='replied' in Supabase.
// ============================================================

require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");
const { Webhook } = require("svix");

const app = express();
const PORT = process.env.PORT || 3000;

// The Google Sheet to write into (its ID comes from the sheet URL).
const SHEET_ID = process.env.SHEET_ID;
// Which tab + columns to append to. "Sheet1" is the default first tab.
const SHEET_RANGE = process.env.SHEET_RANGE || "Sheet1!A:D";

// Supabase: where submissions are also stored as a database row.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "contacts";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    : null;

// Resend: sends a welcome/confirmation email to the person who submitted.
const RESEND_FROM = process.env.RESEND_FROM || "Tester Laboratories <onboarding@resend.dev>";
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO || "";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// Secret from Resend's webhook settings — used to verify inbound events are genuine.
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

// --- middleware -------------------------------------------------
app.use(cors());                                   // allow cross-origin (harmless even same-origin)
app.use(express.urlencoded({ extended: true }));   // parse normal HTML form posts
// Parse JSON, and keep the raw bytes so we can verify webhook signatures.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.static(__dirname));                // serve index.html, css, js, etc.

// --- Google Sheets auth ----------------------------------------
// Uses the service-account key file (credentials.json) you downloaded
// from Google Cloud. The sheet must be SHARED with that account's email.
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "credentials.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function appendToSheet({ name, email, message }) {
  if (!SHEET_ID) {
    throw new Error("SHEET_ID is missing — add it to your .env file.");
  }
  const sheets = google.sheets({ version: "v4", auth });
  const timestamp = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: SHEET_RANGE,
    valueInputOption: "RAW",
    requestBody: {
      values: [[timestamp, name, email, message]],
    },
  });
}

async function insertToSupabase({ name, email, message, newsletter }) {
  if (!supabase) {
    throw new Error("Supabase is not configured — check SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.");
  }
  const { error } = await supabase
    .from(SUPABASE_TABLE)
    .insert([{ name, email, message, newsletter_subscribed: newsletter }]);
  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
}

// Welcome email — warm, on-brand, and explicitly invites a reply.
async function sendWelcomeEmail({ name, email }) {
  if (!resend) {
    throw new Error("Resend is not configured — add RESEND_API_KEY to .env.");
  }
  const firstName = name.split(" ")[0] || "there";

  const html = `
  <div style="background:#000;padding:40px 0;font-family:Arial,Helvetica,sans-serif;color:#efe9dd;">
    <div style="max-width:520px;margin:0 auto;padding:0 24px;">
      <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#d8b981;margin:0 0 18px;">
        Tester Laboratories
      </p>
      <h1 style="font-size:30px;font-weight:300;line-height:1.2;margin:0 0 18px;color:#fff;">
        Thanks, ${firstName}. <span style="color:#d8b981;">You're on the list.</span>
      </h1>
      <p style="font-size:16px;line-height:1.7;color:#b6ad9c;margin:0 0 18px;">
        We've received your message and a real person will read it shortly. You'll be
        first to hear about the Smart Watch Pro.
      </p>
      <p style="font-size:16px;line-height:1.7;color:#b6ad9c;margin:0 0 28px;">
        <strong style="color:#efe9dd;">We'd genuinely love to hear back from you.</strong>
        Just hit <em>reply</em> to this email and tell us what drew you in, or ask us
        anything — we read and answer every reply.
      </p>
      <a href="http://localhost:3000/product.html"
         style="display:inline-block;font-size:13px;letter-spacing:2px;text-transform:uppercase;
                color:#d8b981;text-decoration:none;border:1px solid #d8b981;border-radius:3px;
                padding:14px 28px;">
        Explore the watch →
      </a>
      <p style="font-size:12px;color:#7e766a;margin:34px 0 0;">
        Tester Laboratories · Est. 2026
      </p>
    </div>
  </div>`;

  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: email,
    replyTo: RESEND_REPLY_TO || undefined,
    subject: `Thanks for reaching out, ${firstName} — reply anytime`,
    html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message || JSON.stringify(error)}`);
  }
}

// Record every email interaction in Supabase (best effort — never throws).
async function logEvent(email, type, status, detail) {
  if (!supabase) return;
  const { error } = await supabase
    .from("email_events")
    // text column has no real limit; cap generously so full replies are kept.
    .insert([{ email, type, status, detail: (detail || "").slice(0, 8000) }]);
  if (error) console.warn(`   (event-log failed: ${error.message})`);
}

// Pull a bare email address out of a "Name <email@x.com>" string (or object).
function extractEmail(from) {
  if (!from) return null;
  const str = typeof from === "string" ? from : from.email || from.address || "";
  const match = str.match(/<([^>]+)>/);
  return (match ? match[1] : str).trim() || null;
}

// Outbound Resend events put the recipient in data.to (usually an array).
function firstRecipient(to) {
  if (Array.isArray(to)) to = to[0];
  return extractEmail(to);
}

// Map a Resend event type to a short status word for the log.
function statusFor(type) {
  return (
    {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.delivery_delayed": "delayed",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.bounced": "bounced",
      "email.complained": "complained",
      "email.failed": "failed",
      "email.scheduled": "scheduled",
      "email.suppressed": "suppressed",
      "email.received": "received",
    }[type] || type.replace("email.", "")
  );
}

// --- routes -----------------------------------------------------
app.post("/submit", async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim();
  const message = (req.body.message || "").trim();
  // Unchecked checkboxes aren't sent at all; checked ones send their value.
  const newsletter = Boolean(req.body.newsletter);

  if (!name || !email) {
    return res.status(400).send("Name and email are required. Go back and try again.");
  }

  try {
    // Save to both destinations: Google Sheet + Supabase table.
    await Promise.all([
      appendToSheet({ name, email, message }),
      insertToSupabase({ name, email, message, newsletter }),
    ]);

    // Send the welcome email — BEST EFFORT. A delivery failure (e.g. no
    // verified domain yet) must NOT break the submission, so we don't await it.
    sendWelcomeEmail({ name, email })
      .then(() => {
        console.log(`✉️  Welcome email sent to ${email}`);
        logEvent(email, "welcome", "sent", "welcome email");
      })
      .catch((e) => {
        console.warn(`⚠️  Welcome email not sent: ${e.message}`);
        logEvent(email, "welcome", "failed", e.message);
      });

    // Success → show the thank-you page (which then redirects to product.html).
    res.redirect("/thankyou.html");
  } catch (err) {
    console.error("\n❌ Could not save the submission:");
    console.error("   " + err.message);
    console.error("   Sheets causes: sheet not shared with service account / wrong SHEET_ID.");
    console.error("   Supabase causes: table doesn't exist / wrong table name / bad key.\n");
    res.status(500).send(
      "Sorry — we couldn't save your submission. Check the server terminal for details."
    );
  }
});

// Resend posts here for EVERY email event: outbound lifecycle
// (sent/delivered/opened/clicked/bounced/complained/failed) and inbound
// replies (email.received). We log each one to email_events, and an inbound
// reply additionally marks the contact as engaged.
app.post("/webhook/resend", async (req, res) => {
  // If a signing secret is configured, verify the event is genuinely from Resend.
  if (RESEND_WEBHOOK_SECRET) {
    try {
      new Webhook(RESEND_WEBHOOK_SECRET).verify(req.rawBody, {
        "svix-id": req.header("svix-id"),
        "svix-timestamp": req.header("svix-timestamp"),
        "svix-signature": req.header("svix-signature"),
      });
    } catch (e) {
      console.warn(`⚠️  Rejected webhook (bad signature): ${e.message}`);
      return res.status(401).json({ error: "invalid signature" });
    }
  }

  // Acknowledge immediately so Resend doesn't retry, then process.
  res.status(200).json({ ok: true });

  const event = req.body || {};
  const type = event.type || "";
  const data = event.data || {};

  // We only track email.* events (ignore domain.*/contact.* events).
  if (!type.startsWith("email.")) return;
  if (!supabase) return;

  // For inbound replies the contact is the sender; otherwise it's the recipient.
  const contactEmail =
    type === "email.received" ? extractEmail(data.from) : firstRecipient(data.to);
  if (!contactEmail) {
    console.warn(`⚠️  ${type}: could not determine contact email.`);
    return;
  }

  // Build a useful detail string for the log.
  let detail = data.subject || "";
  if (type === "email.clicked" && data.click && data.click.link) {
    detail = `clicked: ${data.click.link}`;
  } else if (type === "email.received") {
    const body = (data.text || data.html || "").trim();
    detail = `Subject: ${data.subject || "(none)"}\n\n${body}`.trim();
  }

  // An inbound reply is engagement: mark the contact replied + subscribed.
  if (type === "email.received") {
    const { data: rows, error } = await supabase
      .from(SUPABASE_TABLE)
      .update({ reply_status: "replied", newsletter_subscribed: true })
      .ilike("email", contactEmail)
      .select("id");
    if (error) console.warn(`⚠️  Could not mark reply for ${contactEmail}: ${error.message}`);
    else console.log(`✅ Reply from ${contactEmail} — marked ${rows ? rows.length : 0} row(s) engaged`);
  }

  // Log the interaction itself (covers every email.* event type).
  await logEvent(contactEmail, type, statusFor(type), detail);
  console.log(`🗂️  Logged ${type} for ${contactEmail}`);
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running → http://localhost:${PORT}`);
  console.log(`   Open that address, scroll under the hero, and submit the form.\n`);
});
