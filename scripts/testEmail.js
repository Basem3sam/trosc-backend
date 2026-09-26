const createTransporter = require('./src/config/mailer.config');
require('./src/config/loadEnv')();

// ── Color helpers ──────────────────────────────────────────
const green = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const red = (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`);
const yellow = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const blue = (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
const divider = () => console.log(`\x1b[90m${'─'.repeat(60)}\x1b[0m`);

// ── Check environment variables ──────────────────────────
// Mirrors mailer.config.js: production uses Brevo's HTTP API,
// everything else uses SMTP via nodemailer.
function checkEnv() {
  divider();
  console.log('📋 ENVIRONMENT VARIABLES CHECK');
  divider();

  const required = {
    dev: ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'],
    prod: ['BREVO_API_KEY', 'EMAIL_FROM'],
  };

  const isProd = process.env.NODE_ENV === 'production';
  const vars = isProd ? required.prod : required.dev;

  let allOk = true;
  vars.forEach((key) => {
    const val = process.env[key];
    if (val) {
      // Mask sensitive values
      const display = key.includes('KEY') || key.includes('PASS')
        ? `${val.substring(0, 3)}***`
        : val;
      green(`${key} = ${display}`);
    } else {
      red(`${key} = MISSING`);
      allOk = false;
    }
  });

  // Optional vars
  ['NODE_ENV', 'FRONTEND_URL'].forEach((key) => {
    const val = process.env[key];
    if (val) {
      blue(`${key} = ${val}`);
    } else {
      yellow(`${key} = not set (optional)`);
    }
  });

  return allOk;
}

// ── Verify connection / credentials ────────────────────────
// The Brevo transport (production) has no SMTP handshake to verify,
// so instead we do a lightweight call to Brevo's account endpoint to
// confirm the API key is valid. In dev, we still use nodemailer's
// real SMTP verify().
async function verifyConnection(transporter) {
  divider();
  console.log('🔌 CONNECTION TEST');
  divider();

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        green('Brevo API key is valid and account is reachable');
        return true;
      }
      const body = await res.text().catch(() => '');
      red(`Brevo API rejected the key (HTTP ${res.status})`);
      if (body) console.error('   Response:', body);
      return false;
    } catch (err) {
      red('Could not reach Brevo API');
      console.error('   Error:', err.message);
      return false;
    }
  }

  try {
    const verify = await transporter.verify();
    if (verify) {
      green('SMTP server is reachable and accepting connections');
      return true;
    }
    red('SMTP verify returned false — server may be rejecting');
    return false;
  } catch (err) {
    red('SMTP connection failed');
    console.error('   Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      yellow('   → Connection refused. Check EMAIL_HOST and EMAIL_PORT.');
    } else if (err.code === 'EAUTH') {
      yellow('   → Authentication failed. Check EMAIL_USER and EMAIL_PASS.');
    } else if (err.code === 'ETIMEDOUT') {
      yellow('   → Connection timed out. Check firewall/network or use VPN.');
    }
    return false;
  }
}

// ── Send test email ────────────────────────────────────────
async function sendTestEmail(transporter, toEmail) {
  divider();
  console.log('📧 SENDING TEST EMAIL');
  divider();
  console.log('To:', toEmail);
  console.log(
    'From:',
    process.env.EMAIL_FROM || 'Trosc Club <troscscu2@gmail.com>',
  );

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Trosc Club <troscscu2@gmail.com>',
    to: toEmail,
    subject: `Trosc Email Test — ${new Date().toLocaleString()}`,
    text: `Hello!\n\nThis is a test email from your Trosc backend.\n\nIf you received this, your email configuration is working correctly.\n\nTimestamp: ${new Date().toISOString()}\nEnvironment: ${process.env.NODE_ENV || 'development'}\n\nHappy coding! 🚀`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #667eea;">📧 Trosc Email Test</h2>
        <p>Hello!</p>
        <p>This is a test email from your <strong>Trosc backend</strong>.</p>
        <p style="background: #f0f0f0; padding: 12px; border-radius: 4px;">
          <strong>Status:</strong> ✅ Working<br>
          <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
          <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
        </p>
        <p>If you received this, your email configuration is correct!</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Trosc Student Club — Automated Test</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    green('Email sent successfully!');
    if (info.messageId) blue(`Message ID: ${info.messageId}`);
    if (info.accepted && info.accepted.length > 0) {
      green(`Accepted by: ${info.accepted.join(', ')}`);
    }
    if (info.rejected && info.rejected.length > 0) {
      red(`Rejected: ${info.rejected.join(', ')}`);
    }
    return true;
  } catch (err) {
    red('Failed to send email');
    console.error('   Error:', err.message);
    if (err.response) {
      yellow(`   Server response: ${err.response}`);
    }
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 TROSC EMAIL DIAGNOSTIC TOOL\n');

  // Check env vars
  const envOk = checkEnv();
  if (!envOk) {
    divider();
    red('Missing required environment variables. Aborting.');
    yellow('Make sure your .env file is set up correctly.');
    divider();
    process.exit(1);
  }

  // Create transporter — same one src/utils/Email.js uses in prod/dev
  const transporter = createTransporter();

  // Verify connection / credentials
  const connected = await verifyConnection(transporter);
  if (!connected) {
    divider();
    red('Cannot connect. Check your settings.');
    divider();
    process.exit(1);
  }

  // Send test email
  const testEmail =
    process.argv[2] || process.env.TEST_EMAIL || process.env.EMAIL_USER;
  if (!testEmail) {
    divider();
    yellow('No recipient email provided.');
    console.log('Usage: node testEmail.js <your-email@example.com>');
    console.log('Or set TEST_EMAIL in your .env file');
    divider();
    process.exit(1);
  }

  const sent = await sendTestEmail(transporter, testEmail);

  // Summary
  divider();
  console.log('📊 SUMMARY');
  divider();
  if (sent) {
    green('All checks passed! Email is working correctly.');
  } else {
    red('Email sending failed. Review the errors above.');
    process.exit(1);
  }
  divider();
}

main().catch((err) => {
  red('Unexpected error');
  console.error(err);
  process.exit(1);
});
