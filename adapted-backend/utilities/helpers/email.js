'use strict';
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Lazy module caches
let _sesClient = null;
let _sgMail = null;

const {
  // Common "from" identity
  MAIL_FROM_EMAIL,
  MAIL_FROM_NAME,

  // AWS SES - Phase B6: standardized on AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
  // (the SDK's own convention, and what .env.example / authRoutes.ts already
  // documented) - this file and s3Service.js previously read the shorter
  // AWS_ACCESS_KEY/AWS_SECRET_KEY names instead, so setting only the
  // documented vars silently produced no credentials at all.
  AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,

  // Environment
  NODE_ENV
} = process.env;

// Proper RFC 5322 From header string
const resolveFrom = () =>
  MAIL_FROM_NAME ? `"${MAIL_FROM_NAME}" <${MAIL_FROM_EMAIL}>` : MAIL_FROM_EMAIL;


// ---------- AWS SES ----------

const getSesClient = () => {
    if (_sesClient) return _sesClient;
    const cfg = { region: AWS_REGION };
    // Phase B6: was `if (AWS_ACCESS_KEY && AWS_ACCESS_KEY)` with
    // `secretAccessKey: AWS_ACCESS_KEY` below - checked the same variable
    // twice and never actually read the secret key, so even a fully
    // configured secret was silently dropped in favor of the default AWS
    // credential chain.
    if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
        cfg.credentials = {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
        };
    }
    _sesClient = new SESClient(cfg);
    return _sesClient;
};

const sendViaSES = async ({ to, subject, text, html }) => {
    if (!MAIL_FROM_EMAIL) throw new Error('MAIL_FROM_EMAIL is required for SES');
    const client = getSesClient();
    const params = {
        Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
        Message: {
            Subject: { Data: subject, Charset: 'utf-8' },
            Body: html ? { Html: { Data: html, Charset: 'utf-8' } } : { Text: { Data: text, Charset: 'utf-8' } }
        },
        Source: resolveFrom()
    };
    return await client.send(new SendEmailCommand(params));
};

// ---------- Dev stub ----------

const devStubSend = async ({ to, subject, text, html }) => {
  console.warn('[sendEmail:dev-stub] Email provider not configured. Email not sent.');
  console.warn('To:', to);
  console.warn('Subject:', subject);
  if (text) console.warn('Text:', text);
  if (html) console.warn('HTML:', html);
  return { messageId: 'dev-stub' };
};

// sendEmail
const sendEmail = async ({ to, subject, text, html }) => {
  // In production, attempt SES and surface any misconfiguration/errors
  if (String(NODE_ENV).toLowerCase() === 'production') {
    return sendViaSES({ to, subject, text, html });
  }

  // In development: try SES; if it fails (e.g., missing env/creds), log a stub
  try {
    return await sendViaSES({ to, subject, text, html });
  } catch (error) {
    console.warn('[sendEmail:dev-stub] Falling back due to:', error.message);
    return devStubSend({ to, subject, text, html });
  }
};

module.exports = {
  sendEmail
};