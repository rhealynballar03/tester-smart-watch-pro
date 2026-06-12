// Populate the submissions table with 20 realistic test entries so the
// dashboard shows lifelike data.  Run:  node seed-submissions.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});
const TABLE = process.env.SUPABASE_TABLE || "form_submissions";

const people = [
  ["Olivia Bennett", "olivia.bennett@gmail.com", "Is the titanium case hypoallergenic? I have sensitive skin."],
  ["Marcus Chen", "m.chen@outlook.com", "When does the Pro ship to Singapore?"],
  ["Sofia Rossi", "sofia.rossi@gmail.com", "Love the design. Any chance of a smaller 40mm version?"],
  ["James O'Brien", "james.obrien@yahoo.com", "What's the battery life under heavy GPS use?"],
  ["Aisha Khan", "aisha.k@gmail.com", "Do you offer student discounts?"],
  ["Liam Murphy", "liam.murphy@gmail.com", "Is the sapphire crystal really scratch-proof in daily wear?"],
  ["Emma Schmidt", "emma.schmidt@web.de", "Can I pre-order now and pay on shipping?"],
  ["Noah Williams", "noah.w@gmail.com", "How deep can it dive? I freedive to about 30m."],
  ["Priya Patel", "priya.patel@gmail.com", "Does it sync with Android, not just iPhone?"],
  ["Lucas Silva", "lucas.silva@gmail.com", "Interested in a bulk order for my dive shop — about 12 units."],
  ["Hannah Kim", "hannah.kim@gmail.com", "Will there be a rose gold finish at launch?"],
  ["Daniel Cohen", "daniel.cohen@gmail.com", "What material is the strap, and are extras sold separately?"],
  ["Grace Thompson", "grace.t@gmail.com", "Is there a warranty, and how long does it run?"],
  ["Mohammed Ali", "m.ali@gmail.com", "What's the shipping cost to Dubai?"],
  ["Isabella Garcia", "bella.garcia@gmail.com", "Can the watch face be customized with my own photo?"],
  ["Ethan Nguyen", "ethan.nguyen@gmail.com", "Does it track sleep stages and continuous heart rate?"],
  ["Chloe Martin", "chloe.martin@gmail.com", "When exactly is the public launch date?"],
  ["Benjamin Lee", "ben.lee@gmail.com", "Is the lume long-lasting? The photos look incredible."],
  ["Mia Andersson", "mia.andersson@gmail.com", "Do you ship to Sweden, and are there import fees?"],
  ["William Brown", "will.brown@gmail.com", "Can I see the watch in person anywhere before buying?"],
];

const DAY = 24 * 60 * 60 * 1000;

const rows = people.map((p, i) => ({
  name: p[0],
  email: p[1],
  message: p[2],
  reply_status: i % 3 === 0 ? "replied" : "pending",
  newsletter_subscribed: i % 2 === 0,
  followup_stage: i % 4, // 0..3
  created_at: new Date(Date.now() - (i + 1) * 1.4 * DAY).toISOString(),
}));

(async () => {
  const { data, error } = await supabase.from(TABLE).insert(rows).select("id");
  if (error) {
    console.error("Seed failed: " + error.message);
    process.exit(1);
  }
  console.log(`✅ Inserted ${data.length} test submissions into "${TABLE}".`);
})();
