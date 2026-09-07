// middleware/emailService.js - COMPLETE FIXED VERSION

const nodemailer = require("nodemailer");

const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log("📧 SMTP Config:", {
    host,
    port,
    secure,
    user: user || 'missing',
    pass: pass ? '****' : 'missing'
  });

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials missing - email will be disabled");
    return null;
  }

  const config = {
    host: host,
    port: port,
    secure: secure,
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    requireTLS: true,
    debug: true,
    logger: true
  };

  if (port === 587) {
    config.secure = false;
    config.requireTLS = true;
  }

  if (port === 465) {
    config.secure = true;
  }

  try {
    const transporter = nodemailer.createTransport(config);
    
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ SMTP Connection Error:", error.message);
      } else {
        console.log("✅ SMTP Connected Successfully to Hostinger");
      }
    });
    
    return transporter;
  } catch (error) {
    console.error("❌ Failed to create transporter:", error.message);
    return null;
  }
};

// ============================================================
// SEND VENDOR CREATION EMAIL (CREDENTIALS)
// ============================================================
const sendVendorCreationEmail = async (
  email,
  name,
  company,
  password,
  plan,
  commissionRate,
  loginUrl,
  adminName
) => {
  try {
    console.log(`📧 Sending Native91 welcome email to: ${email}`);

    const transporter = createTransporter();

    if (!transporter) {
      return {
        success: false,
        error: "Email not configured",
      };
    }

    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Native91 - Onboarding Completed</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f4ef; font-family: Arial, Helvetica, sans-serif; color: #26332d; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-spacing: 0; border-collapse: collapse; }
    td { padding: 0; }
    img { border: 0; display: block; max-width: 100%; }
    a { text-decoration: none; }
    .email-wrapper { width: 100%; background-color: #f5f4ef; padding: 25px 10px; }
    .email-container { width: 100%; max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e8e4da; border-radius: 8px; overflow: hidden; }
    .top-status { text-align: center; padding: 4px 15px 12px; background-color: #ffffff; }
    .status-number { display: inline-block; width: 25px; height: 25px; line-height: 25px; background-color: #073f31; color: #ffffff; border-radius: 50%; font-size: 12px; font-weight: bold; margin-right: 8px; vertical-align: middle; }
    .status-title { font-size: 17px; font-weight: 600; color: #242a27; vertical-align: middle; }
    .header { background-color: #063f31; padding: 12px 20px 10px; text-align: center; position: relative; }
    .brand-name { font-family: Georgia, "Times New Roman", serif; color: #e5d6a6; font-size: 27px; letter-spacing: 6px; line-height: 1.1; margin: 0; font-weight: normal; }
    .brand-tagline { color: #d8c899; font-family: Georgia, "Times New Roman", serif; font-size: 8px; letter-spacing: 2px; margin-top: 3px; }
    .leaf { position: absolute; right: 25px; top: 14px; color: #b29a61; font-size: 37px; transform: rotate(-10deg); }
    .progress-wrapper { padding: 14px 25px 8px; background-color: #ffffff; }
    .progress-table { width: 100%; }
    .progress-step { width: 33.33%; text-align: center; position: relative; }
    .progress-circle { width: 38px; height: 38px; line-height: 38px; margin: 0 auto 6px; border-radius: 50%; border: 1px solid #dedbd2; background-color: #ffffff; color: #6e756f; font-size: 17px; position: relative; z-index: 2; }
    .progress-circle.completed { background-color: #ffffff; border-color: #d9d5ca; color: #073f31; }
    .progress-circle.active { background-color: #073f31; border-color: #073f31; color: #ffffff; }
    .progress-label { font-size: 11px; color: #303731; font-weight: 600; }
    .content { padding: 5px 40px 15px; }
    .main-title { margin: 3px 0 4px; text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 30px; font-weight: normal; color: #18382d; line-height: 1.2; }
    .gold-divider { width: 75px; height: 2px; background-color: #d7c18c; margin: 9px auto 18px; position: relative; }
    .gold-divider:after { content: "❧"; position: absolute; left: 50%; top: -13px; transform: translateX(-50%); color: #b3985c; background-color: #ffffff; padding: 0 6px; font-size: 15px; }
    .greeting { font-size: 15px; color: #252d28; margin: 0 0 8px; font-weight: 500; }
    .paragraph { font-size: 14px; line-height: 1.55; color: #4d514d; margin: 0 0 3px; }
    .paragraph strong { color: #263a31; }
    .details-box { margin-top: 12px; background-color: #fbfaf6; border: 1px solid #eee9df; border-radius: 8px; padding: 12px 15px; }
    .detail-row { width: 100%; }
    .detail-label { width: 38%; font-size: 12px; font-weight: bold; color: #555950; letter-spacing: 0.3px; padding: 4px 0; }
    .detail-separator { width: 8%; text-align: center; color: #b7b4aa; font-size: 12px; }
    .detail-value { width: 54%; font-size: 13px; font-weight: 600; color: #303a34; padding: 4px 0; word-break: break-word; }
    .button-wrapper { text-align: center; padding: 12px 0 8px; }
    .dashboard-button { display: inline-block; width: 85%; max-width: 480px; box-sizing: border-box; background-color: #073f31; color: #ffffff !important; border-radius: 4px; padding: 10px 20px; font-size: 13px; font-weight: bold; letter-spacing: 0.4px; text-transform: uppercase; }
    .button-arrow { color: #d5bd82; font-size: 17px; padding-left: 8px; }
    .support-section { border-top: 1px solid #eeeae2; padding: 10px 0 4px; }
    .support-icon { width: 35px; text-align: center; vertical-align: middle; }
    .support-mail-icon { display: inline-block; font-size: 22px; color: #7c776a; }
    .support-text { text-align: left; padding-left: 5px; vertical-align: middle; }
    .support-title { font-size: 12px; color: #555a55; margin-bottom: 3px; }
    .support-email { font-size: 13px; color: #073f31; font-weight: 500; }
    .social-icons { text-align: right; white-space: nowrap; vertical-align: middle; }
    .social-icon { display: inline-block; width: 25px; height: 25px; line-height: 25px; text-align: center; border: 1px solid #d8d5cb; border-radius: 50%; color: #626861; font-size: 11px; margin-left: 7px; }
    .footer { text-align: center; padding: 8px 20px 18px; font-size: 9px; color: #999a94; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 10px 6px; }
      .email-container { width: 100% !important; }
      .top-status { padding-top: 5px; }
      .status-title { font-size: 15px; }
      .header { padding: 13px 10px; }
      .brand-name { font-size: 22px; letter-spacing: 5px; }
      .brand-tagline { font-size: 7px; letter-spacing: 1.5px; }
      .leaf { right: 12px; top: 13px; font-size: 27px; }
      .progress-wrapper { padding: 13px 10px 7px; }
      .progress-label { font-size: 9px; }
      .progress-circle { width: 34px; height: 34px; line-height: 34px; font-size: 15px; }
      .content { padding: 5px 18px 15px; }
      .main-title { font-size: 25px; }
      .greeting { font-size: 14px; }
      .paragraph { font-size: 12px; }
      .details-box { padding: 10px; }
      .detail-label { width: 39%; font-size: 10px; }
      .detail-separator { width: 6%; }
      .detail-value { width: 55%; font-size: 11px; }
      .dashboard-button { width: 95%; font-size: 11px; padding: 10px 12px; }
      .support-title { font-size: 10px; }
      .support-email { font-size: 11px; }
      .support-icon { width: 30px; }
      .social-icon { width: 22px; height: 22px; line-height: 22px; font-size: 9px; margin-left: 4px; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td class="email-wrapper">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
          <tr>
            <td class="top-status">
              <span class="status-number">5</span>
              <span class="status-title">Onboarding Completed</span>
            </td>
          </tr>
          <tr>
            <td class="header">
              <div class="brand-name">NATIVE91</div>
              <div class="brand-tagline">RESERVED FOR THE REMARKABLE</div>
              <div class="leaf">❧</div>
            </td>
          </tr>
          <tr>
            <td class="progress-wrapper">
              <table role="presentation" class="progress-table" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="progress-step">
                    <div class="progress-circle completed">✓</div>
                    <div class="progress-label">Selected</div>
                  </td>
                  <td class="progress-step">
                    <div class="progress-circle completed">✓</div>
                    <div class="progress-label">Onboarding</div>
                  </td>
                  <td class="progress-step">
                    <div class="progress-circle active">▣</div>
                    <div class="progress-label">Completed</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h1 class="main-title">You're all set!</h1>
              <div class="gold-divider"></div>
              <p class="greeting">Hello ${name || "Vendor"},</p>
              <p class="paragraph">Your onboarding is complete and your brand is now registered with Native91.</p>
              <p class="paragraph"><strong>Here are your dashboard access details:</strong></p>
              <table role="presentation" class="details-box" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr class="detail-row">
                  <td class="detail-label">DASHBOARD URL</td>
                  <td class="detail-separator">:</td>
                  <td class="detail-value">${"https://vendor.native91.com/"}</td>
                </tr>
                <tr class="detail-row">
                  <td class="detail-label">USER ID</td>
                  <td class="detail-separator">:</td>
                  <td class="detail-value">${email || "N/A"}</td>
                </tr>
                <tr class="detail-row">
                  <td class="detail-label">PASSWORD</td>
                  <td class="detail-separator">:</td>
                  <td class="detail-value">${password || "N/A"}</td>
                </tr>
                ${plan ? `<tr class="detail-row"><td class="detail-label">PLAN</td><td class="detail-separator">:</td><td class="detail-value">${plan}</td></tr>` : ''}
                ${commissionRate !== undefined && commissionRate !== null ? `<tr class="detail-row"><td class="detail-label">COMMISSION</td><td class="detail-separator">:</td><td class="detail-value">${commissionRate}%</td></tr>` : ''}
                ${adminName ? `<tr class="detail-row"><td class="detail-label">APPROVED BY</td><td class="detail-separator">:</td><td class="detail-value">${adminName}</td></tr>` : ''}
              </table>
              <div class="button-wrapper">
                <a href="${'https://vendor.native91.com/'}" target="_blank" class="dashboard-button">
                  ACCESS YOUR DASHBOARD
                  <span class="button-arrow">→</span>
                </a>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="support-section">
                <tr>
                  <td class="support-icon"><span class="support-mail-icon">✉</span></td>
                  <td class="support-text">
                    <div class="support-title">Need help? We're here for you.</div>
                    <div class="support-email">support@native91.com</div>
                  </td>
                  <td class="social-icons">
                    <a href="#" class="social-icon">◎</a>
                    <a href="#" class="social-icon">in</a>
                    <a href="#" class="social-icon">✉</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer">© ${currentYear} Native91. All rights reserved.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to Native91 — Your Brand Has Been Selected",
      html: htmlContent,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Native91 welcome email sent successfully to: ${email}`);

    return {
      success: true,
      messageId: info.messageId,
    };

  } catch (error) {
    console.error("❌ Native91 welcome email error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ============================================================
// SEND REJECTION EMAIL - FIXED WITH const
// ============================================================
const sendRejectionEmail = async (email, name, company, reason) => {
  try {
    console.log(`📧 Sending rejection email to: ${email}`);

    const transporter = createTransporter();

    if (!transporter) {
      return {
        success: false,
        error: "Email not configured"
      };
    }

    const currentYear = new Date().getFullYear();

    // HTML content for rejection email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Native91 - Application Update</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f4ef; font-family:Arial,Helvetica,sans-serif; color:#172d27;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f4ef; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
          <tr>
            <td style="background-color:#092b21; padding:30px 40px; text-align:center;">
              <div style="color:#e1bd7b; font-family:Georgia,'Times New Roman',serif; font-size:36px; letter-spacing:4px;">NATIVE91</div>
              <div style="color:#e3c58f; font-size:11px; letter-spacing:3px; margin-top:10px;">RESERVED FOR THE REMARKABLE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px 25px;">
              <div style="width:70px; height:70px; border:2px solid #c0392b; border-radius:50%; margin:0 auto; text-align:center; line-height:66px; font-size:36px; color:#c0392b;">✕</div>
              <h1 style="text-align:center; color:#092b21; font-family:Georgia,'Times New Roman',serif; font-size:32px; margin:20px 0 15px; font-weight:normal;">Thank you for considering Native91.</h1>
              <div style="text-align:center; margin:10px 0 20px;">
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ad78;"></span>
                <span style="display:inline-block; margin:0 12px; color:#b28a4c; font-size:18px;">❧</span>
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ad78;"></span>
              </div>
              <p style="font-size:18px; color:#111; margin:0 0 15px;">Hello ${name || "Seller"},</p>
              <p style="font-size:16px; line-height:1.7; color:#333; margin:0 0 15px;">Thank you for taking the time to introduce your brand to Native91.</p>
              <p style="font-size:16px; line-height:1.7; color:#333; margin:0 0 15px;">We carefully review every application to ensure that the brands we bring together align with the quality, originality and character of our marketplace.</p>
              <div style="background-color:#fdf0f0; border-left:4px solid #c0392b; padding:15px 20px; margin:15px 0; border-radius:4px;">
                <div style="font-size:12px; color:#c0392b; font-weight:700; text-transform:uppercase; margin:0 0 5px;">⏺ Application Review Note</div>
                <p style="font-size:14px; color:#333; margin:0; line-height:1.6;">${reason || "This decision is based on our current curation requirements."}</p>
              </div>
              <p style="font-size:16px; line-height:1.7; color:#333; margin:0 0 15px;">We truly appreciate your interest in Native91 and wish you continued success in your journey.</p>
              <div style="text-align:center; margin:10px 0 20px;">
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ad78;"></span>
                <span style="display:inline-block; margin:0 12px; color:#b28a4c; font-size:18px;">❧</span>
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ad78;"></span>
              </div>
              <p style="font-size:15px; color:#333; line-height:1.7;">Warm regards,<br><strong style="color:#092b21;">Team Native91</strong><br><span style="color:#a17b42; font-style:italic;">Reserved for the Remarkable.</span></p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #ddd; text-align:center; padding:20px 30px 25px; background-color:#faf8f4;">
              <p style="font-size:12px; color:#777; margin:0;">This is an automated email. Please do not reply to this message.</p>
              <p style="font-size:11px; color:#999; margin-top:10px;">© ${currentYear} Native91. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "Thank You for Considering Native91",
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Rejection email sent to: ${email}`);

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {
    console.error("❌ Rejection email error:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================================================
// SEND APPROVAL EMAIL (DOCUMENT LINK WITH ONBOARDING)
// ============================================================
const sendApprovalEmail = async (email, name, company, vendorId, trackingId) => {
  try {
    console.log(`📧 Sending approval email to: ${email}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      console.error("❌ Transporter creation failed");
      return { success: false, error: "Email not configured" };
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const documentLink = trackingId ? `${frontendUrl}/document-upload/${trackingId}` : null;

    if (!documentLink) {
      console.error("❌ No tracking ID provided");
      return { success: false, error: "Missing tracking ID" };
    }

    const currentYear = new Date().getFullYear();

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved - Native91</title>
</head>
<body style="margin:0; padding:0; background-color:#f7f3ed; font-family:Arial,Helvetica,sans-serif; color:#17221d;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f3ed; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffdfa; border-radius:8px; overflow:hidden; max-width:600px; width:100%;">
          <tr>
            <td style="background-color:#092d22; padding:30px 40px; text-align:center;">
              <div style="color:#d6b56b; font-family:Georgia,'Times New Roman',serif; font-size:36px; letter-spacing:4px;">NATIVE91</div>
              <div style="color:#e5d5ae; font-size:11px; letter-spacing:3px; margin-top:10px;">RESERVED FOR THE REMARKABLE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px 25px;">
              <div style="width:70px; height:70px; border:2px solid #28a745; border-radius:50%; margin:0 auto; text-align:center; line-height:66px; font-size:36px; color:#28a745;">✓</div>
              <h1 style="text-align:center; color:#0b3528; font-family:Georgia,'Times New Roman',serif; font-size:32px; margin:20px 0 15px; font-weight:normal;">Application Approved!</h1>
              <div style="text-align:center; margin:10px 0 20px;">
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ab72;"></span>
                <span style="display:inline-block; margin:0 12px; color:#c9a55e; font-size:18px;">❧</span>
                <span style="display:inline-block; width:50px; height:1px; background-color:#c9ab72;"></span>
              </div>
              <p style="font-size:18px; color:#171717; margin:0 0 15px;">Hello <strong>${name || "Vendor"}</strong>,</p>
              <p style="font-size:16px; line-height:1.7; color:#222; margin:0 0 15px;">We are pleased to inform you that your seller application for <strong>${company || "your business"}</strong> has been <span style="color:#28a745; font-weight:bold;">approved!</span></p>
              <p style="font-size:16px; line-height:1.7; color:#222; margin:0 0 15px;">To complete the onboarding process and become a vendor on Native91, please upload the required documents using the link below.</p>
              <div style="text-align:center; margin:25px 0;">
                <a href="${documentLink}" style="display:inline-block; background-color:#28a745; color:#ffffff; padding:14px 35px; border-radius:5px; font-size:16px; font-weight:600; text-decoration:none; border:1px solid #1e7e34;">Upload Documents →</a>
              </div>
              <div style="background-color:#f8f9fa; padding:12px 20px; text-align:center; margin:15px 0; border-radius:4px; font-size:14px; color:#555;">
                <strong style="color:#1a2a3a;">Tracking ID:</strong> ${trackingId}
              </div>
              <div style="margin:20px 0;">
                <h4 style="color:#1a2a3a; font-size:15px;">Documents Required:</h4>
                <ul style="padding-left:20px; margin:0;">
                  <li style="padding:4px 0; font-size:14px; color:#444;">Aadhaar Card (Front and Back)</li>
                  <li style="padding:4px 0; font-size:14px; color:#444;">PAN Card</li>
                  <li style="padding:4px 0; font-size:14px; color:#444;">Bank Account Details</li>
                  <li style="padding:4px 0; font-size:14px; color:#444;">Contact Information</li>
                  <li style="padding:4px 0; font-size:14px; color:#444;">GST Certificate (Optional)</li>
                </ul>
              </div>
              <div style="background-color:#f8f9fa; border-left:4px solid #6c757d; padding:15px 20px; margin:25px 0 10px; border-radius:4px;">
                <strong style="color:#1a2a3a; font-size:14px;">Need Help?</strong>
                <p style="margin:5px 0 0; font-size:13px; color:#555;">Contact us at <a href="mailto:support@native91.com" style="color:#007bff; text-decoration:none;">support@native91.com</a></p>
              </div>
              <div style="margin-top:30px; border-top:1px solid #dfcfb1; padding-top:25px;">
                <span style="color:#c59b4e; font-size:24px;">♡</span>
                <span style="font-size:17px; color:#292929; margin-left:8px;">We're excited to have you with us.</span>
              </div>
              <p style="font-size:16px; line-height:1.7; color:#222; margin-top:20px;">
                Warm regards,<br>
                <strong>Team Native91</strong><br>
                <span style="color:#a47d3b; font-style:italic;">Reserved for the Remarkable.</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #ddd; text-align:center; padding:20px 30px 25px; background-color:#f4eee5;">
              <p style="font-size:12px; color:#777; margin:0 0 10px;">This is an automated email. Please do not reply to this message.</p>
              <p style="font-size:12px; color:#777; margin:0;">© ${currentYear} Native91. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "Application Approved - Complete Your Onboarding - Native91",
      html: htmlContent,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "high",
      },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to: ${email}`);
    
    return { 
      success: true, 
      messageId: info.messageId,
      link: documentLink 
    };
  } catch (error) {
    console.error("❌ Approval email error:", error.message);
    return { 
      success: false, 
      error: error.message,
      link: null
    };
  }
};

// ============================================================
// SEND DOCUMENT LINK EMAIL
// ============================================================
const sendDocumentLinkEmail = async (email, trackingId, company) => {
  try {
    console.log(`📧 Sending document link email to: ${email}`);
    
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const link = `${frontendUrl}/document-upload/${trackingId}`;

    const transporter = createTransporter();

    if (!transporter) {
      return {
        success: true,
        messageId: 'mock-' + Date.now(),
        mock: true,
        link: link,
        message: "Mock mode - Link generated (email not sent)"
      };
    }

    // Simple HTML for document link email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Upload Required - Native91</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial,Helvetica,sans-serif; color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:560px; width:100%;">
          <tr>
            <td style="background-color:#28a745; padding:25px 20px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px;">Document Upload Required</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 20px;">
              <p style="font-size:16px; margin-bottom:20px;">Dear <strong>${company || "Seller"}</strong>,</p>
              <p style="font-size:15px; line-height:1.8; color:#444; margin-bottom:20px;">To complete your verification process and become a vendor on Native91, please upload the required documents using the link below.</p>
              <div style="text-align:center; margin:30px 0 20px;">
                <a href="${link}" style="display:inline-block; padding:12px 35px; background-color:#28a745; color:#ffffff; text-decoration:none; border-radius:5px; font-weight:600; font-size:15px;">Upload Documents</a>
              </div>
              <div style="background-color:#f8f9fa; padding:12px 20px; text-align:center; margin:15px 0; border-radius:4px; font-size:14px; color:#555;">
                <strong style="color:#1a2a3a;">Tracking ID:</strong> ${trackingId}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px; text-align:center; border-top:1px solid #e9ecef; font-size:12px; color:#6c757d;">
              <p style="margin:3px 0;">&copy; ${new Date().getFullYear()} Native91. All rights reserved.</p>
              <p style="margin:3px 0;">This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "Document Upload Required - Native91",
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Document link email sent to: ${email}`);
    
    return {
      success: true,
      messageId: info.messageId,
      link: link
    };
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const link = `${frontendUrl}/document-upload/${trackingId}`;
    
    return {
      success: false,
      error: error.message,
      link: link,
      message: "Email failed, but link is available"
    };
  }
};

// ============================================================
// SEND DOCUMENT REJECTION EMAIL
// ============================================================
const sendDocumentRejectionEmail = async (email, company, documentName, reason) => {
  try {
    console.log(`📧 Sending document rejection email to: ${email}`);
    console.log(`📧 Document: ${documentName}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: "Email not configured" };
    }

    const currentYear = new Date().getFullYear();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const uploadLink = `${frontendUrl}/document-upload/`;

    // Find the document to get tracking ID
    const SellerDocument = require("../models/SellerDocument");
    const document = await SellerDocument.findOne({ email });
    const trackingId = document?.trackingId || '';
    const fullLink = `${uploadLink}${trackingId}`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Correction Required - Native91</title>
</head>
<body style="margin:0; padding:0; background-color:#f5f4ef; font-family:Arial,Helvetica,sans-serif; color:#26332d;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f4ef; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:560px; width:100%;">
          <tr>
            <td style="background-color:#063f31; padding:25px 30px; text-align:center; position:relative;">
              <div style="color:#e4ce94; font-family:Georgia,'Times New Roman',serif; font-size:30px; letter-spacing:5px;">NATIVE91</div>
              <div style="color:#d8c28a; font-size:9px; letter-spacing:2px; margin-top:5px;">RESERVED FOR THE REMARKABLE</div>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 30px 20px;">
              <div style="text-align:center; padding-bottom:10px;">
                <div style="width:60px; height:60px; line-height:60px; margin:0 auto; border-radius:50%; background-color:#f8f1df; color:#0b3f32; font-size:28px; text-align:center;">📄</div>
              </div>
              <h1 style="text-align:center; color:#0a392e; font-family:Georgia,'Times New Roman',serif; font-size:30px; font-weight:normal; margin:5px 0 10px;">Document Correction Required</h1>
              <div style="text-align:center; margin:5px 0 20px;">
                <span style="display:inline-block; width:40px; height:1px; background-color:#cdb47c;"></span>
                <span style="display:inline-block; margin:0 10px; color:#b08e50; font-size:16px;">❧</span>
                <span style="display:inline-block; width:40px; height:1px; background-color:#cdb47c;"></span>
              </div>
              <p style="font-size:16px; color:#242a26; margin:0 0 15px;">Hello ${company || "Vendor"},</p>
              <p style="font-size:15px; line-height:1.6; color:#343936; margin:0 0 15px;">Thank you for completing your Native91 onboarding.</p>
              <p style="font-size:15px; line-height:1.6; color:#343936; margin:0 0 15px;">We've reviewed your submitted documents and found that <strong style="color:#171c19;">one document needs to be corrected</strong> before we can continue with your onboarding.</p>
              <div style="background-color:#fff5df; border-left:4px solid #e8ad22; border-radius:6px; padding:15px 18px; margin:10px 0;">
                <div style="font-size:12px; color:#856404; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">Document Requiring Attention</div>
                <div style="font-family:Georgia,'Times New Roman',serif; font-size:18px; font-weight:bold; color:#1d2420;">${documentName || "Document"}</div>
              </div>
              <div style="background-color:#fff0f0; border-left:4px solid #b9333d; border-radius:6px; padding:15px 18px; margin:10px 0 20px;">
                <div style="font-size:12px; color:#9e3038; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px;">What Needs To Be Corrected?</div>
                <div style="font-size:13px; color:#252a27; font-weight:bold; margin-bottom:5px;">Reason:</div>
                <div style="font-size:14px; color:#343936; line-height:1.5;">${reason || "No specific reason provided"}</div>
              </div>
              <p style="font-size:15px; line-height:1.6; color:#303632; margin:0 0 15px;">Please correct the issue mentioned above and resubmit only this document. There is no need to upload your other documents again.</p>
              <div style="text-align:center; margin:15px 0 20px;">
                <a href="${fullLink}" style="display:inline-block; background-color:#073f31; color:#ffffff; padding:12px 30px; border-radius:5px; font-size:14px; font-weight:bold; text-decoration:none;">Resubmit Document →</a>
              </div>
              <div style="margin:15px 0 0;">
                <div style="background-color:#eef6f2; border-radius:6px; padding:12px 15px; margin:10px 0;">
                  <span style="color:#173c31; font-size:22px; vertical-align:middle;">♢</span>
                  <span style="color:#26332d; font-size:13px; line-height:1.5; vertical-align:middle; padding-left:10px;">Once the document is approved, you can continue with the remaining Native91 onboarding process.</span>
                </div>
              </div>
              <div style="border:1px solid #e6e1d7; border-radius:6px; padding:12px 15px; margin:15px 0;">
                <div style="text-align:center;">
                  <div style="font-family:Georgia,'Times New Roman',serif; font-size:15px; font-weight:bold; color:#1d3c32; margin-bottom:5px;">NEED HELP?</div>
                  <div style="font-size:13px; color:#454a46;">If you have any questions, please reach out to us at</div>
                  <div style="font-size:14px; color:#a1782e; font-weight:bold;">support@native91.com</div>
                </div>
              </div>
              <div style="padding:5px 0;">
                <p style="font-size:14px; color:#333936; margin:0;">Warm regards,</p>
                <p style="font-size:15px; font-weight:bold; color:#1d2f28; margin:5px 0;">Team Native91</p>
                <p style="font-size:13px; color:#a6813e; font-style:italic; margin:0;">Reserved for the Remarkable.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #ddd8cd; text-align:center; padding:15px 20px 20px; background-color:#ffffff;">
              <div style="margin-bottom:10px;">
                <a href="#" style="display:inline-block; width:30px; height:30px; line-height:30px; border:1px solid #cfd1cc; border-radius:50%; color:#183b31; font-size:13px; margin:0 5px; text-align:center; text-decoration:none;">◎</a>
                <a href="#" style="display:inline-block; width:30px; height:30px; line-height:30px; border:1px solid #cfd1cc; border-radius:50%; color:#183b31; font-size:13px; margin:0 5px; text-align:center; text-decoration:none;">in</a>
              </div>
              <div style="color:#999b96; font-size:10px; font-style:italic; margin-bottom:10px;">This is an automated email. Please do not reply to this message.</div>
              <div style="color:#999b96; font-size:10px;">© ${currentYear} Native91. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `Document Rejected: ${documentName} - Native91`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Document rejection email sent to: ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Document rejection email error:", error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// SEND DOCUMENT RESUBMISSION EMAIL (To Admin)
// ============================================================
const sendDocumentResubmissionEmail = async (email, company, documentName, trackingId) => {
  try {
    console.log(`📧 Sending resubmission notification to admin for: ${email}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: "Email not configured" };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'support@native91.com';
    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Resubmitted - Native91</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f4; font-family:Arial,Helvetica,sans-serif; color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4; padding:30px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; max-width:560px; width:100%;">
          <tr>
            <td style="background-color:#17a2b8; padding:25px 20px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:24px;">Document Resubmitted</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 30px 20px;">
              <p style="font-size:16px; margin-bottom:20px;">Dear <strong>Admin</strong>,</p>
              <p style="font-size:15px; line-height:1.8; color:#444; margin-bottom:15px;">A vendor has resubmitted a document for review.</p>
              <div style="background-color:#d1ecf1; border-left:4px solid #17a2b8; padding:15px 20px; margin:20px 0; border-radius:4px;">
                <strong style="color:#0c5460; font-size:14px;">Resubmission Details:</strong>
                <div style="color:#0c5460; font-size:16px; font-weight:600; margin-top:5px;">Document: ${documentName}</div>
                <div style="color:#0c5460; font-size:14px; margin-top:8px;">Vendor: ${company || "N/A"}</div>
                <div style="color:#0c5460; font-size:14px;">Email: ${email}</div>
                <div style="color:#0c5460; font-size:14px;">Tracking ID: ${trackingId || "N/A"}</div>
              </div>
              <p style="font-size:15px; line-height:1.8; color:#444; margin-bottom:15px;">Please review the resubmitted document and verify it.</p>
              <div style="text-align:center; margin:30px 0 20px;">
                <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin/documents'}" style="display:inline-block; padding:12px 35px; background-color:#17a2b8; color:#ffffff; text-decoration:none; border-radius:5px; font-weight:600; font-size:15px;">Review Documents</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px; text-align:center; border-top:1px solid #e9ecef; font-size:12px; color:#6c757d;">
              <p style="margin:3px 0;">&copy; ${currentYear} Native91. All rights reserved.</p>
              <p style="margin:3px 0;">This is an automated message, please do not reply.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `Document Resubmitted: ${documentName} - Native91`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Resubmission notification sent to admin`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Resubmission email error:", error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// EXPORT ALL FUNCTIONS
// ============================================================
module.exports = {
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVendorCreationEmail,
  sendDocumentRejectionEmail,
  sendDocumentResubmissionEmail
};
