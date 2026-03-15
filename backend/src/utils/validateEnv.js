// ─── Environment Validator ─────────────────────────────────────────────────────
// Validates required env vars on startup and prints actionable warnings.
// Call validateEnv() before starting the server.
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED = [
  { key: 'DATABASE_URL', hint: 'Set to postgresql://user:pass@localhost:5432/happiness_program' },
  { key: 'JWT_SECRET',   hint: 'Set to a random 32+ character string' },
];

const OPTIONAL = [
  { key: 'SMTP_HOST',         hint: 'Required for email campaigns (e.g. smtp.gmail.com)' },
  { key: 'SMTP_USER',         hint: 'Required for email campaigns' },
  { key: 'SMTP_PASS',         hint: 'Required for email campaigns (use Gmail App Password)' },
  { key: 'CANVA_CLIENT_ID',   hint: 'Optional: enables Canva integration (free at canva.com/developers)' },
  { key: 'REDIS_URL',         hint: 'Optional: enables background job queues (redis://localhost:6379)' },
];

export function validateEnv() {
  const missing   = [];
  const warnings  = [];

  for (const { key, hint } of REQUIRED) {
    if (!process.env[key]) {
      missing.push({ key, hint });
    }
  }

  for (const { key, hint } of OPTIONAL) {
    if (!process.env[key]) {
      warnings.push({ key, hint });
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    console.error('─'.repeat(55));
    for (const { key, hint } of missing) {
      console.error(`  ${key}`);
      console.error(`  → ${hint}`);
    }
    console.error('\nCopy backend/.env.example to backend/.env and fill these in.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional env vars not set (features will be limited):');
    for (const { key, hint } of warnings) {
      console.warn(`  ${key}: ${hint}`);
    }
    console.warn('');
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long for security.');
    process.exit(1);
  }

  // Warn about default values
  if (process.env.JWT_SECRET === 'change_this_to_a_long_random_string_minimum_32_chars') {
    console.error('❌ JWT_SECRET is still the default example value. Change it before running.');
    process.exit(1);
  }

  return true;
}
