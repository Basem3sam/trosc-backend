const nodemailer = require('nodemailer');

// Splits "Trosc Club <troscscu2@gmail.com>" into Brevo's {name, email} shape.
// Falls back to treating the whole string as a bare address.
function parseFromAddress(fromString) {
  const match = fromString.match(/^(.*)<(.+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, ''),
      email: match[2].trim(),
    };
  }
  return { email: fromString.trim() };
}

// Render blocks outbound SMTP (ports 25/465/587) on free-tier services as
// of Sept 2025, so nodemailer -> Gmail hangs until the platform proxy times
// out and returns 502. Brevo's API runs over HTTPS (443), which isn't
// blocked. This exposes the same sendMail(mailOptions) shape nodemailer
// uses, so Email.js needs no changes.
const createBrevoTransport = () => ({
  async sendMail({ from, to, subject, html, text, replyTo }) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseFromAddress(from),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        ...(replyTo && { replyTo: { email: replyTo } }),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Brevo API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return { messageId: data.messageId };
  },
});

const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    return createBrevoTransport();
  }

  // Development: use mailtrap or local smtp
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 2525, // Default to 2525 if not set and ensure it's a number
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

module.exports = createTransporter;
