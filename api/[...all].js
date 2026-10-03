// Vercel Serverless Catch-All API Handler
// Handles all /api/* routes (e.g. /api/competitions, /api/auth/login, etc.)
// Environment variables must be set in Vercel Project Settings:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, JWT_SECRET

const { app } = require('../server/server');

module.exports = (req, res) => {
  return app(req, res);
};
