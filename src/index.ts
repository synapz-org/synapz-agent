import 'dotenv/config';

const REQUIRED_ENV_VARS = [
  'DISCORD_BOT_TOKEN',
  'GITHUB_TOKEN',
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  console.log('Environment validated. All required variables present.');
  console.log('Synapz Agent starting...');
}

validateEnv();
