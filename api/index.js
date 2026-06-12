// Vercel serverless entry point. It re-uses the same Express app from
// server.js. vercel.json routes /submit and /webhook/resend here; everything
// else (the HTML/CSS/JS/video) is served straight from the CDN as static files.
module.exports = require("../server.js");
