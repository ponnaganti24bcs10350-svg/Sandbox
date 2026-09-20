const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
// Create Nodemailer transporter using Brevo SMTP relay
const createGmailTransporter = () => {
  const user = process.env.BREVO_SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.BREVO_SMTP_PASS || process.env.GMAIL_APP_PASS;

  if (user && pass) {
    // Use Brevo SMTP relay if Brevo credentials exist, otherwise fall back to Gmail
    const isBrevo = !!process.env.BREVO_SMTP_USER;
    if (isBrevo) {
      return nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
    }
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: pass.replace(/\s+/g, "") },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return null;
};

const sendInvitationEmail = async ({
  candidateEmail,
  candidateName,
  companyName,
  challengeTitle,
}) => {
  const transporter = createGmailTransporter();
  const safeCandidateName = escapeHtml(candidateName);
const safeCompanyName = escapeHtml(companyName);
const safeChallengeTitle = escapeHtml(challengeTitle);
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sandbox Invitation</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <div
          style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            padding: 40px;
          "
        >
          <h1
            style="
              margin: 0 0 24px;
              color: #111827;
              font-size: 28px;
            "
          >
            You have a new invitation
          </h1>

          <p
            style="
              color: #374151;
              font-size: 16px;
              line-height: 1.6;
            "
          >
            Hi ${safeCandidateName},
          </p>

          <p
            style="
              color: #374151;
              font-size: 16px;
              line-height: 1.6;
            "
          >
            <strong>${safeCompanyName}</strong> has invited you
            on Sandbox.
          </p>

          ${
            challengeTitle
              ? `
                <div
                  style="
                    margin: 24px 0;
                    padding: 18px;
                    background: #f9fafb;
                    border-radius: 8px;
                  "
                >
                  <p
                    style="
                      margin: 0;
                      color: #6b7280;
                      font-size: 14px;
                    "
                  >
                    Position
                  </p>

                  <p
                    style="
                      margin: 6px 0 0;
                      color: #111827;
                      font-size: 18px;
                      font-weight: bold;
                    "
                  >
                    ${safeChallengeTitle}
                  </p>
                </div>
              `
              : ""
          }

          <p
            style="
              color: #374151;
              font-size: 16px;
              line-height: 1.6;
            "
          >
            Log in to your Sandbox account to view the
            invitation and choose whether to accept or decline it.
          </p>

          <div style="margin: 30px 0;">
            <a
              href="${process.env.CLIENT_URL || '#'}"
              style="
                display: inline-block;
                padding: 14px 24px;
                background: #111827;
                color: #ffffff;
                text-decoration: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
              "
            >
              View Invitation
            </a>
          </div>

          <p
            style="
              margin-top: 32px;
              color: #6b7280;
              font-size: 14px;
            "
          >
            This invitation was sent through Sandbox.
          </p>

          <p
            style="
              color: #111827;
              font-size: 14px;
            "
          >
            — Sandbox
          </p>
        </div>
      </body>
    </html>
  `;

  // 1. Try Gmail SMTP if configured
  if (transporter) {
    const info = await transporter.sendMail({
     from: `"Sandbox" <${process.env.BREVO_SMTP_USER || process.env.GMAIL_USER}>`,
      to: candidateEmail,
      subject: `${safeCompanyName} invited you on Sandbox`,
      html: htmlContent,
    });
    return info;
  }

  // 2. Fallback to Resend
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Sandbox <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `${safeCompanyName} invited you on Sandbox`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend email error:", error);
      throw new Error(error.message || "Failed to send email");
    }
    return data;
  }

  throw new Error("No email service configured. Please add GMAIL_USER and GMAIL_APP_PASS or RESEND_API_KEY.");
};

const sendVerificationEmail = async ({ email, code }) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Verification Code</title>
      </head>
      <body style="margin:0; padding:0; background:#f9fafb; font-family: Arial, sans-serif;">
        <div style="max-width:500px; margin:40px auto; background:#ffffff; border-radius:12px; padding:32px; border:1px solid #eaecf0;">
          <h2 style="margin:0 0 12px; color:#101828; font-size:22px;">Verify your email</h2>
          <p style="color:#475467; font-size:15px; line-height:1.5; margin-bottom:24px;">
            Your 6-digit email verification code for Sandbox is:
          </p>
          <div style="background:#f2f4f7; border-radius:8px; padding:16px; text-align:center; margin-bottom:24px;">
            <span style="font-size:32px; font-weight:bold; letter-spacing:6px; color:#101828;">${code}</span>
          </div>
          <p style="color:#475467; font-size:14px; margin:0;">
            This code will expire in 10 minutes. If you did not request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  // 1. Try Brevo HTTP API (HTTPS — works on all hosting providers)
  if (process.env.BREVO_API_KEY) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Sandbox", email: process.env.BREVO_SMTP_USER || "no-reply@sandbox.app" },
        to: [{ email }],
        subject: `${code} is your Sandbox verification code`,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Brevo API error: ${response.status} — ${errBody}`);
    }
    return await response.json();
  }

  // 2. Try SMTP transporter (Brevo SMTP relay or Gmail)
  const transporter = createGmailTransporter();
  if (transporter) {
    const fromEmail = process.env.BREVO_SMTP_USER || process.env.GMAIL_USER;
    const info = await transporter.sendMail({
      from: `"Sandbox" <${fromEmail}>`,
      to: email,
      subject: `${code} is your Sandbox verification code`,
      html: htmlContent,
    });
    return info;
  }

  // 3. Fallback to Resend
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Sandbox <onboarding@resend.dev>",
      to: [email],
      subject: `${code} is your Sandbox verification code`,
      html: htmlContent,
    });

    if (error) {
      console.error("Resend verification email error:", error);
      throw new Error(error.message || "Failed to send verification email");
    }
    return data;
  }

  throw new Error("No email service configured. Please set BREVO_API_KEY, GMAIL_USER & GMAIL_APP_PASS, or RESEND_API_KEY.");
};

module.exports = {
  sendInvitationEmail,
  sendVerificationEmail,
};