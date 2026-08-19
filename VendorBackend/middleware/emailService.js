// middleware/emailService.js - CLEAN PROFESSIONAL VERSION
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
    /* ==============================
       EMAIL RESET
    ============================== */

    body {
      margin: 0;
      padding: 0;
      background-color: #f5f4ef;
      font-family: Arial, Helvetica, sans-serif;
      color: #26332d;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    td {
      padding: 0;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
    }

    a {
      text-decoration: none;
    }

    /* ==============================
       OUTER WRAPPER
    ============================== */

    .email-wrapper {
      width: 100%;
      background-color: #f5f4ef;
      padding: 25px 10px;
    }

    .email-container {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e8e4da;
      border-radius: 8px;
      overflow: hidden;
    }

    /* ==============================
       TOP STATUS
    ============================== */

    .top-status {
      text-align: center;
      padding: 4px 15px 12px;
      background-color: #ffffff;
    }

    .status-number {
      display: inline-block;
      width: 25px;
      height: 25px;
      line-height: 25px;
      background-color: #073f31;
      color: #ffffff;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
      margin-right: 8px;
      vertical-align: middle;
    }

    .status-title {
      font-size: 17px;
      font-weight: 600;
      color: #242a27;
      vertical-align: middle;
    }

    /* ==============================
       HEADER
    ============================== */

    .header {
      background-color: #063f31;
      padding: 12px 20px 10px;
      text-align: center;
      position: relative;
    }

    .brand-name {
      font-family: Georgia, "Times New Roman", serif;
      color: #e5d6a6;
      font-size: 27px;
      letter-spacing: 6px;
      line-height: 1.1;
      margin: 0;
      font-weight: normal;
    }

    .brand-tagline {
      color: #d8c899;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 8px;
      letter-spacing: 2px;
      margin-top: 3px;
    }

    .leaf {
      position: absolute;
      right: 25px;
      top: 14px;
      color: #b29a61;
      font-size: 37px;
      transform: rotate(-10deg);
    }

    /* ==============================
       PROGRESS STEPS
    ============================== */

    .progress-wrapper {
      padding: 14px 25px 8px;
      background-color: #ffffff;
    }

    .progress-table {
      width: 100%;
    }

    .progress-step {
      width: 33.33%;
      text-align: center;
      position: relative;
    }

    .progress-circle {
      width: 38px;
      height: 38px;
      line-height: 38px;
      margin: 0 auto 6px;
      border-radius: 50%;
      border: 1px solid #dedbd2;
      background-color: #ffffff;
      color: #6e756f;
      font-size: 17px;
      position: relative;
      z-index: 2;
    }

    .progress-circle.completed {
      background-color: #ffffff;
      border-color: #d9d5ca;
      color: #073f31;
    }

    .progress-circle.active {
      background-color: #073f31;
      border-color: #073f31;
      color: #ffffff;
    }

    .progress-label {
      font-size: 11px;
      color: #303731;
      font-weight: 600;
    }

    /* Connecting line */

    .line {
      height: 1px;
      background-color: #ddd9cf;
      position: relative;
      top: 19px;
    }

    /* ==============================
       MAIN CONTENT
    ============================== */

    .content {
      padding: 5px 40px 15px;
    }

    .main-title {
      margin: 3px 0 4px;
      text-align: center;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 30px;
      font-weight: normal;
      color: #18382d;
      line-height: 1.2;
    }

    .gold-divider {
      width: 75px;
      height: 2px;
      background-color: #d7c18c;
      margin: 9px auto 18px;
      position: relative;
    }

    .gold-divider:after {
      content: "❧";
      position: absolute;
      left: 50%;
      top: -13px;
      transform: translateX(-50%);
      color: #b3985c;
      background-color: #ffffff;
      padding: 0 6px;
      font-size: 15px;
    }

    .greeting {
      font-size: 15px;
      color: #252d28;
      margin: 0 0 8px;
      font-weight: 500;
    }

    .paragraph {
      font-size: 14px;
      line-height: 1.55;
      color: #4d514d;
      margin: 0 0 3px;
    }

    .paragraph strong {
      color: #263a31;
    }

    /* ==============================
       DASHBOARD DETAILS
    ============================== */

    .details-box {
      margin-top: 12px;
      background-color: #fbfaf6;
      border: 1px solid #eee9df;
      border-radius: 8px;
      padding: 12px 15px;
    }

    .detail-row {
      width: 100%;
    }

    .detail-label {
      width: 38%;
      font-size: 12px;
      font-weight: bold;
      color: #555950;
      letter-spacing: 0.3px;
      padding: 4px 0;
    }

    .detail-separator {
      width: 8%;
      text-align: center;
      color: #b7b4aa;
      font-size: 12px;
    }

    .detail-value {
      width: 54%;
      font-size: 13px;
      font-weight: 600;
      color: #303a34;
      padding: 4px 0;
      word-break: break-word;
    }

    /* ==============================
       DASHBOARD BUTTON
    ============================== */

    .button-wrapper {
      text-align: center;
      padding: 12px 0 8px;
    }

    .dashboard-button {
      display: inline-block;
      width: 85%;
      max-width: 480px;
      box-sizing: border-box;
      background-color: #073f31;
      color: #ffffff !important;
      border-radius: 4px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .button-arrow {
      color: #d5bd82;
      font-size: 17px;
      padding-left: 8px;
    }

    /* ==============================
       SUPPORT SECTION
    ============================== */

    .support-section {
      border-top: 1px solid #eeeae2;
      padding: 10px 0 4px;
    }

    .support-icon {
      width: 35px;
      text-align: center;
      vertical-align: middle;
    }

    .support-mail-icon {
      display: inline-block;
      font-size: 22px;
      color: #7c776a;
    }

    .support-text {
      text-align: left;
      padding-left: 5px;
      vertical-align: middle;
    }

    .support-title {
      font-size: 12px;
      color: #555a55;
      margin-bottom: 3px;
    }

    .support-email {
      font-size: 13px;
      color: #073f31;
      font-weight: 500;
    }

    /* ==============================
       SOCIAL ICONS
    ============================== */

    .social-icons {
      text-align: right;
      white-space: nowrap;
      vertical-align: middle;
    }

    .social-icon {
      display: inline-block;
      width: 25px;
      height: 25px;
      line-height: 25px;
      text-align: center;
      border: 1px solid #d8d5cb;
      border-radius: 50%;
      color: #626861;
      font-size: 11px;
      margin-left: 7px;
    }

    /* ==============================
       FOOTER
    ============================== */

    .footer {
      text-align: center;
      padding: 8px 20px 18px;
      font-size: 9px;
      color: #999a94;
    }

    /* ==============================
       MOBILE RESPONSIVE
    ============================== */

    @media only screen and (max-width: 600px) {

      .email-wrapper {
        padding: 10px 6px;
      }

      .email-container {
        width: 100% !important;
      }

      .top-status {
        padding-top: 5px;
      }

      .status-title {
        font-size: 15px;
      }

      .header {
        padding: 13px 10px;
      }

      .brand-name {
        font-size: 22px;
        letter-spacing: 5px;
      }

      .brand-tagline {
        font-size: 7px;
        letter-spacing: 1.5px;
      }

      .leaf {
        right: 12px;
        top: 13px;
        font-size: 27px;
      }

      .progress-wrapper {
        padding: 13px 10px 7px;
      }

      .progress-label {
        font-size: 9px;
      }

      .progress-circle {
        width: 34px;
        height: 34px;
        line-height: 34px;
        font-size: 15px;
      }

      .line {
        top: 17px;
      }

      .content {
        padding: 5px 18px 15px;
      }

      .main-title {
        font-size: 25px;
      }

      .greeting {
        font-size: 14px;
      }

      .paragraph {
        font-size: 12px;
      }

      .details-box {
        padding: 10px;
      }

      .detail-label {
        width: 39%;
        font-size: 10px;
      }

      .detail-separator {
        width: 6%;
      }

      .detail-value {
        width: 55%;
        font-size: 11px;
      }

      .dashboard-button {
        width: 95%;
        font-size: 11px;
        padding: 10px 12px;
      }

      .support-title {
        font-size: 10px;
      }

      .support-email {
        font-size: 11px;
      }

      .support-icon {
        width: 30px;
      }

      .social-icon {
        width: 22px;
        height: 22px;
        line-height: 22px;
        font-size: 9px;
        margin-left: 4px;
      }
    }
  </style>
</head>

<body>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >
    <tr>
      <td class="email-wrapper">

        <!-- MAIN CONTAINER -->
        <table
          role="presentation"
          class="email-container"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          align="center"
        >

          <!-- =========================================
               TOP STATUS
          ========================================== -->

          <tr>
            <td class="top-status">

              <span class="status-number">
                5
              </span>

              <span class="status-title">
                Onboarding Completed
              </span>

            </td>
          </tr>


          <!-- =========================================
               HEADER
          ========================================== -->

          <tr>
            <td class="header">

              <div class="brand-name">
                NATIVE91
              </div>

              <div class="brand-tagline">
                RESERVED FOR THE REMARKABLE
              </div>

              <div class="leaf">
                ❧
              </div>

            </td>
          </tr>


          <!-- =========================================
               PROGRESS
          ========================================== -->

          <tr>
            <td class="progress-wrapper">

              <table
                role="presentation"
                class="progress-table"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >

                <tr>

                  <!-- STEP 1 -->

                  <td class="progress-step">

                    <div class="progress-circle completed">
                      ✓
                    </div>

                    <div class="progress-label">
                      Selected
                    </div>

                  </td>


                  <!-- STEP 2 -->

                  <td class="progress-step">

                    <div class="progress-circle completed">
                      ✓
                    </div>

                    <div class="progress-label">
                      Onboarding
                    </div>

                  </td>


                  <!-- STEP 3 -->

                  <td class="progress-step">

                    <div class="progress-circle active">
                      ▣
                    </div>

                    <div class="progress-label">
                      Completed
                    </div>

                  </td>

                </tr>

              </table>

            </td>
          </tr>


          <!-- =========================================
               CONTENT
          ========================================== -->

          <tr>
            <td class="content">

              <h1 class="main-title">
                You're all set!
              </h1>

              <div class="gold-divider"></div>


              <p class="greeting">
                Hello ${name || "Vendor"},
              </p>


              <p class="paragraph">
                Your onboarding is complete and your brand
                is now registered with Native91.
              </p>


              <p class="paragraph">
                <strong>
                  Here are your dashboard access details:
                </strong>
              </p>


              <!-- =====================================
                   DASHBOARD DETAILS
              ====================================== -->

              <table
                role="presentation"
                class="details-box"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >

                <tr class="detail-row">

                  <td class="detail-label">
                    DASHBOARD URL
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${"https://vendor.native91.com/"}
                  </td>

                </tr>


                <tr class="detail-row">

                  <td class="detail-label">
                    USER ID
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${email || "N/A"}
                  </td>

                </tr>


                <tr class="detail-row">

                  <td class="detail-label">
                    PASSWORD
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${password || "N/A"}
                  </td>

                </tr>

                ${plan ? `
                <tr class="detail-row">

                  <td class="detail-label">
                    PLAN
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${plan}
                  </td>

                </tr>
                ` : ''}

                ${commissionRate !== undefined && commissionRate !== null ? `
                <tr class="detail-row">

                  <td class="detail-label">
                    COMMISSION
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${commissionRate}%
                  </td>

                </tr>
                ` : ''}

                ${adminName ? `
                <tr class="detail-row">

                  <td class="detail-label">
                    APPROVED BY
                  </td>

                  <td class="detail-separator">
                    :
                  </td>

                  <td class="detail-value">
                    ${adminName}
                  </td>

                </tr>
                ` : ''}

              </table>


              <!-- =====================================
                   DASHBOARD BUTTON
              ====================================== -->

              <div class="button-wrapper">

                <a
                  href="${'https://vendor.native91.com/'}"
                  target="_blank"
                  class="dashboard-button"
                >
                  ACCESS YOUR DASHBOARD

                  <span class="button-arrow">
                    →
                  </span>
                </a>

              </div>


              <!-- =====================================
                   SUPPORT
              ====================================== -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                class="support-section"
              >

                <tr>

                  <td class="support-icon">

                    <span class="support-mail-icon">
                      ✉
                    </span>

                  </td>


                  <td class="support-text">

                    <div class="support-title">
                      Need help? We're here for you.
                    </div>

                    <div class="support-email">
                      support@native91.com
                    </div>

                  </td>


                  <td class="social-icons">

                    <a
                      href="#"
                      class="social-icon"
                    >
                      ◎
                    </a>

                    <a
                      href="#"
                      class="social-icon"
                    >
                      in
                    </a>

                    <a
                      href="#"
                      class="social-icon"
                    >
                      ✉
                    </a>

                  </td>

                </tr>

              </table>

            </td>
          </tr>


          <!-- =========================================
               FOOTER
          ========================================== -->

          <tr>
            <td class="footer">
              © ${currentYear} Native91. All rights reserved.
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

    // --------------------------------------------------------
    // Safe HTML escaping
    // --------------------------------------------------------
    const escapeHtml = (value = "") =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const vendorName = escapeHtml(name || "Seller");
    const vendorCompany = escapeHtml(company || "your brand");
    const rejectionReason = escapeHtml(
      reason ||
        "This decision is based on our current curation requirements and marketplace mix."
    );

    const currentYear = new Date().getFullYear();

    // --------------------------------------------------------
    // Social links
    // --------------------------------------------------------
    const instagramUrl =
      process.env.NATIVE91_INSTAGRAM ||
      "https://www.instagram.com/native91";

    const linkedinUrl =
      process.env.NATIVE91_LINKEDIN ||
      "https://www.linkedin.com/company/native91";

    const supportEmail =
      process.env.SUPPORT_EMAIL || "support@native91.com";

    // --------------------------------------------------------
    // HTML EMAIL
    // --------------------------------------------------------
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="color-scheme"
    content="light"
  >

  <meta
    name="supported-color-schemes"
    content="light"
  >

  <title>Thank you for considering Native91</title>

  <style>

    /* -----------------------------------------
       RESET
    ----------------------------------------- */

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f7f4ef;
    }

    body {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #172d27;
    }

    table {
      border-spacing: 0;
      /* border-collapse: collapse; */
    }

    td {
      padding: 0;
    }

    img {
      border: 0;
      outline: none;
      text-decoration: none;
      display: block;
    }

    a {
      text-decoration: none;
    }

    /* -----------------------------------------
       MAIN
    ----------------------------------------- */

    .email-wrapper {
      width: 100%;
      background-color: #f7f4ef;
      padding: 0;
    }

    .email-container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      background-color: #fbfaf8;
    }

    /* -----------------------------------------
       HEADER
    ----------------------------------------- */

    .header {
      background-color: #092b21;
      height: 180px;
    }

    .header-inner {
      padding: 0 50px;
    }

    .brand {
      color: #e1bd7b;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-size: 48px;
      line-height: 1;
      letter-spacing: 5px;
      font-weight: 400;
    }

    .tagline {
      color: #e3c58f;
      font-size: 14px;
      letter-spacing: 4px;
      margin-top: 16px;
      text-transform: uppercase;
    }

    .gold-line {
      height: 4px;
      background-color: #c8a15b;
      width: 100%;
    }

    /* -----------------------------------------
       CONTENT
    ----------------------------------------- */

    .content {
      padding: 45px 70px 35px;
    }

    .check-circle {
      width: 90px;
      height: 90px;
      border: 2px solid #d2bd96;
      border-radius: 50%;
      margin: 0 auto;
      text-align: center;
      vertical-align: middle;
    }

    .cross {
      color: #b28a4c;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 48px;
      font-weight: 200;
      line-height: 86px;
    }

    .main-title {
      margin: 25px 0 25px;
      text-align: center;
      color: #092b21;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-size: 48px;
      line-height: 1.15;
      font-weight: 400;
    }

    /* -----------------------------------------
       DECORATIVE DIVIDER
    ----------------------------------------- */

    .divider {
      text-align: center;
      padding: 0 0 30px;
    }

    .divider-line {
      display: inline-block;
      width: 75px;
      height: 1px;
      background-color: #c9ad78;
      vertical-align: middle;
    }

    .divider-leaf {
      display: inline-block;
      margin: 0 14px;
      color: #b28a4c;
      font-size: 23px;
      vertical-align: middle;
    }

    /* -----------------------------------------
       TEXT
    ----------------------------------------- */

    .greeting {
      font-size: 21px;
      line-height: 1.6;
      color: #111111;
      margin-bottom: 22px;
    }

    .paragraph {
      font-size: 18px;
      line-height: 1.85;
      color: #222222;
      margin: 0 0 22px;
    }

    /* -----------------------------------------
       REJECTION CARD
    ----------------------------------------- */

    .rejection-card {
      background-color: #f6f2eb;
      border: 1px solid #e5dccd;
      border-radius: 14px;
      margin: 30px 0;
    }

    .rejection-card-inner {
      padding: 38px 40px;
    }

    .leaf-circle {
      width: 110px;
      height: 110px;
      border-radius: 55px;
      background-color: #eee9df;
      text-align: center;
      vertical-align: middle;
    }

    .leaf-icon {
      font-size: 50px;
      line-height: 110px;
      color: #172d27;
    }

    .rejection-text {
      padding-left: 30px;
    }

    .rejection-title {
      font-size: 20px;
      line-height: 1.55;
      color: #222222;
      margin: 0;
    }

    .highlight {
      color: #9b753d;
      font-weight: 700;
    }

    .small-gold-line {
      width: 55px;
      height: 1px;
      background-color: #b28a4c;
      margin: 18px 0;
    }

    .rejection-description {
      font-size: 16px;
      line-height: 1.8;
      color: #333333;
      margin: 0;
    }

    /* -----------------------------------------
       REASON
    ----------------------------------------- */

    .reason-label {
      color: #9b753d;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-size: 16px;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .reason {
      color: #333333;
      font-size: 16px;
      line-height: 1.7;
      font-style: italic;
    }

    /* -----------------------------------------
       SOCIAL CARD
    ----------------------------------------- */

    .social-divider {
      padding: 15px 0 30px;
      text-align: center;
    }

    .social-card {
      background-color: #f5f1ea;
      border-radius: 4px;
    }

    .social-card-inner {
      padding: 24px 28px;
    }

    .mail-circle {
      width: 72px;
      height: 72px;
      border: 1px solid #d8c8aa;
      border-radius: 50%;
      text-align: center;
      vertical-align: middle;
    }

    .mail-icon {
      font-size: 30px;
      line-height: 70px;
      color: #172d27;
    }

    .social-content {
      padding-left: 25px;
    }

    .social-title {
      color: #9b753d;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .social-text {
      color: #333333;
      font-size: 15px;
      line-height: 1.7;
      margin: 0;
    }

    .social-icons {
      text-align: right;
      white-space: nowrap;
    }

    .social-icon {
      display: inline-block;
      width: 42px;
      height: 42px;
      border: 1px solid #17342c;
      border-radius: 50%;
      margin-left: 8px;
      text-align: center;
      color: #17342c;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      font-weight: bold;
      line-height: 42px;
    }

    /* -----------------------------------------
       SIGNATURE
    ----------------------------------------- */

    .signature {
      padding-top: 30px;
      padding-bottom: 20px;
    }

    .warm-regards {
      color: #222222;
      font-size: 17px;
      line-height: 1.7;
    }

    .team {
      color: #111111;
      font-size: 18px;
      font-weight: 700;
      line-height: 1.6;
    }

    .reserved {
      color: #a17b42;
      font-family:
        Georgia,
        "Times New Roman",
        serif;
      font-size: 17px;
      font-style: italic;
    }

    /* -----------------------------------------
       FOOTER
    ----------------------------------------- */

    .footer {
      border-top: 1px solid #ded6ca;
      padding: 25px 30px 30px;
      text-align: center;
      background-color: #fbfaf8;
    }

    .lock {
      font-size: 18px;
      color: #a17b42;
      vertical-align: middle;
    }

    .automated {
      color: #777777;
      font-size: 14px;
      line-height: 1.7;
    }

    .copyright {
      color: #777777;
      font-size: 14px;
      margin-top: 12px;
    }

    .footer-icons {
      margin-top: 20px;
    }

    .footer-icon {
      display: inline-block;
      width: 36px;
      height: 36px;
      border: 1px solid #17342c;
      border-radius: 50%;
      color: #17342c;
      font-size: 14px;
      font-weight: bold;
      line-height: 36px;
      margin: 0 5px;
    }

    /* -----------------------------------------
       MOBILE
    ----------------------------------------- */

    @media only screen and (max-width: 600px) {

      .header {
        height: auto;
      }

      .header-inner {
        padding: 30px 25px;
      }

      .brand {
        font-size: 34px;
        letter-spacing: 4px;
      }

      .tagline {
        font-size: 10px;
        letter-spacing: 2px;
      }

      .content {
        padding: 35px 22px 25px;
      }

      .main-title {
        font-size: 34px;
      }

      .greeting {
        font-size: 18px;
      }

      .paragraph {
        font-size: 16px;
      }

      .rejection-card-inner {
        padding: 25px 20px;
      }

      .rejection-text {
        padding-left: 18px;
      }

      .rejection-title {
        font-size: 17px;
      }

      .rejection-description {
        font-size: 14px;
      }

      .social-card-inner {
        padding: 20px 15px;
      }

      .social-content {
        padding-left: 15px;
      }

      .social-title {
        font-size: 16px;
      }

      .social-text {
        font-size: 13px;
      }

      .social-icons {
        display: none;
      }
    }

  </style>
</head>


<body>

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    class="email-wrapper"
  >

    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          class="email-container"
        >

          <!-- =====================================
               HEADER
          ====================================== -->

          <tr>
            <td class="header">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
              >

                <tr>
                  <td class="header-inner">

                    <div class="brand">
                      NATIVE91
                    </div>

                    <div class="tagline">
                      RESERVED FOR THE REMARKABLE
                    </div>

                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <tr>
            <td class="gold-line"></td>
          </tr>


          <!-- =====================================
               MAIN CONTENT
          ====================================== -->

          <tr>
            <td class="content">


              <!-- CROSS ICON -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
              >

                <tr>
                  <td align="center">

                    <table
                      cellpadding="0"
                      cellspacing="0"
                    >

                      <tr>

                        <td class="check-circle">
                          <span class="cross">×</span>
                        </td>

                      </tr>

                    </table>

                  </td>
                </tr>

              </table>


              <!-- TITLE -->

              <h1 class="main-title">
                Thank you for considering Native91.
              </h1>


              <!-- DIVIDER -->

              <div class="divider">

                <span class="divider-line"></span>

                <span class="divider-leaf">
                  ❧
                </span>

                <span class="divider-line"></span>

              </div>


              <!-- GREETING -->

              <div class="greeting">
                Hello ${vendorName},
              </div>


              <!-- INTRO -->

              <p class="paragraph">
                Thank you for taking the time to introduce your brand
                to Native91.
              </p>

              <p class="paragraph">
                We carefully review every application to ensure that
                the brands we bring together align with the quality,
                originality and character of our marketplace.
              </p>


              <!-- =====================================
                   REJECTION CARD
              ====================================== -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                class="rejection-card"
              >

                <tr>

                  <td class="rejection-card-inner">

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                    >

                      <tr>

                        <!-- LEAF -->

                        <td
                          width="120"
                          valign="middle"
                          align="center"
                        >

                          <table
                            cellpadding="0"
                            cellspacing="0"
                          >

                            <tr>

                              <td class="leaf-circle">

                                <span class="leaf-icon">
                                  ♧
                                </span>

                              </td>

                            </tr>

                          </table>

                        </td>


                        <!-- TEXT -->

                        <td
                          valign="middle"
                          class="rejection-text"
                        >

                          <p class="rejection-title">

                            After careful consideration,
                            we're unable to

                            <span class="highlight">
                              move forward with your application
                              at this time.
                            </span>

                          </p>

                          <div class="small-gold-line"></div>

                          <p class="rejection-description">

                            This decision is based on our current
                            curation requirements and marketplace mix,
                            and is not a reflection of the value or
                            quality of your brand.

                          </p>

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

              </table>


              <!-- OPTIONAL REASON -->

              ${
                reason
                  ? `
              <div style="
                margin: 25px 0;
                padding: 20px 24px;
                background:#faf8f4;
                border-left:3px solid #b28a4c;
              ">

                <div class="reason-label">
                  Application Review Note
                </div>

                <div class="reason">
                  ${rejectionReason}
                </div>

              </div>
              `
                  : ""
              }


              <!-- CLOSING -->

              <p class="paragraph">

                We truly appreciate your interest in Native91
                and wish you continued success in your journey.

              </p>


              <!-- DIVIDER -->

              <div class="social-divider">

                <span class="divider-line"></span>

                <span class="divider-leaf">
                  ❧
                </span>

                <span class="divider-line"></span>

              </div>


              <!-- =====================================
                   SOCIAL CARD
              ====================================== -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                class="social-card"
              >

                <tr>

                  <td class="social-card-inner">

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                    >

                      <tr>

                        <!-- MAIL ICON -->

                        <td
                          width="80"
                          valign="middle"
                        >

                          <table
                            cellpadding="0"
                            cellspacing="0"
                          >

                            <tr>

                              <td class="mail-circle">

                                <span class="mail-icon">
                                  ✉
                                </span>

                              </td>

                            </tr>

                          </table>

                        </td>


                        <!-- SOCIAL TEXT -->

                        <td
                          valign="middle"
                          class="social-content"
                        >

                          <div class="social-title">
                            Stay connected with Native91
                          </div>

                          <p class="social-text">

                            Follow us on Instagram and LinkedIn
                            for updates, resources and opportunities
                            for incredible homegrown brands.

                          </p>

                        </td>


                        <!-- SOCIAL LINKS -->

                        <td
                          width="105"
                          valign="middle"
                          class="social-icons"
                        >

                          <a
                            href="${instagramUrl}"
                            class="social-icon"
                            target="_blank"
                          >
                            ◎
                          </a>

                          <a
                            href="${linkedinUrl}"
                            class="social-icon"
                            target="_blank"
                          >
                            in
                          </a>

                        </td>

                      </tr>

                    </table>

                  </td>

                </tr>

              </table>


              <!-- =====================================
                   SIGNATURE
              ====================================== -->

              <div class="signature">

                <div class="warm-regards">
                  Warm regards,
                </div>

                <div class="team">
                  Team Native91
                </div>

                <div class="reserved">
                  Reserved for the Remarkable.
                </div>

              </div>

            </td>
          </tr>


          <!-- =====================================
               FOOTER
          ====================================== -->

          <tr>

            <td class="footer">

              <div class="automated">

                <span class="lock">♧</span>

                &nbsp;

                This is an automated email.
                Please do not reply to this message.

              </div>


              <div class="copyright">

                © ${currentYear} Native91.
                All rights reserved.

              </div>


              <div class="footer-icons">

                <a
                  href="${instagramUrl}"
                  class="footer-icon"
                  target="_blank"
                >
                  ◎
                </a>

                <a
                  href="${linkedinUrl}"
                  class="footer-icon"
                  target="_blank"
                >
                  in
                </a>

                <a
                  href="mailto:${supportEmail}"
                  class="footer-icon"
                >
                  ✉
                </a>

              </div>

            </td>

          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
`;

    // --------------------------------------------------------
    // SEND MAIL
    // --------------------------------------------------------

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,

      subject:
        "Thank You for Considering Native91",

      html: htmlContent,

      headers: {
        "X-Priority": "3",
        "X-MSMail-Priority": "Normal",
        "Importance": "Normal"
      }
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(
      `✅ Premium rejection email sent to: ${email}`
    );

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {

    console.error(
      "❌ Rejection email error:",
      error.message
    );

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

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Application Approved - Native91</title>
  <style>
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f7f3ed;
      font-family: Arial, Helvetica, sans-serif;
      color: #17221d;
    }
    table {
     
      border-spacing: 0;
    }
    img {
      border: 0;
      display: block;
      max-width: 100%;
    }
    a {
      text-decoration: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #f7f3ed;
      padding: 30px 0;
    }
    .email-container {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      background-color: #fffdfa;
    }
    .header {
      background-color: #092d22;
      padding: 42px 50px;
    }
    .brand {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 48px;
      letter-spacing: 5px;
      color: #d6b56b;
      margin: 0;
      line-height: 1;
    }
    .tagline {
      margin-top: 14px;
      color: #e5d5ae;
      font-size: 14px;
      letter-spacing: 4px;
      text-transform: uppercase;
    }
    .content {
      padding: 32px 70px 45px;
    }
    .check-circle {
      width: 72px;
      height: 72px;
      border: 2px solid #28a745;
      border-radius: 50%;
      margin: 0 auto;
      text-align: center;
      vertical-align: middle;
    }
    .check {
      color: #28a745;
      font-size: 39px;
      line-height: 68px;
      font-family: Arial, sans-serif;
    }
    .main-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 43px;
      font-weight: normal;
      color: #0b3528;
      text-align: center;
      margin: 25px 0 18px;
    }
    .gold-divider {
      text-align: center;
      margin: 10px 0 30px;
    }
    .gold-divider-line {
      display: inline-block;
      width: 60px;
      height: 1px;
      background-color: #c9ab72;
      vertical-align: middle;
    }
    .gold-leaf {
      display: inline-block;
      margin: 0 12px;
      color: #c9a55e;
      font-size: 18px;
      vertical-align: middle;
    }
    .greeting {
      font-size: 20px;
      line-height: 1.7;
      margin: 0 0 14px;
      color: #171717;
    }
    .body-text {
      font-size: 18px;
      line-height: 1.75;
      color: #222;
      margin: 0 0 22px;
    }
    .highlight {
      color: #28a745;
      font-weight: bold;
    }
    .onboarding-card {
      background-color: #fbf7f1;
      border: 1px solid #e6dccb;
      border-radius: 12px;
      margin-top: 28px;
      margin-bottom: 30px;
    }
    .card-inner {
      padding: 28px;
    }
    .store-icon-wrapper {
      width: 115px;
      height: 115px;
      background-color: #f4eee4;
      border-radius: 50%;
      text-align: center;
      vertical-align: middle;
    }
    .store-icon {
      font-size: 46px;
      line-height: 115px;
    }
    .card-content {
      padding-left: 28px;
    }
    .card-label {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      letter-spacing: 1px;
      color: #a27b37;
      text-transform: uppercase;
      margin: 0 0 8px;
    }
    .card-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 30px;
      color: #0b3528;
      margin: 0 0 12px;
      font-weight: normal;
    }
    .card-text {
      font-size: 17px;
      line-height: 1.7;
      color: #242424;
      margin: 0;
    }
    .button-container {
      text-align: center;
      margin: 30px 0 38px;
    }
    .cta-button {
      display: inline-block;
      background-color: #28a745;
      color: #ffffff !important;
      padding: 18px 42px;
      border-radius: 7px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      letter-spacing: 1px;
      text-transform: uppercase;
      border: 1px solid #1e7e34;
    }
    .cta-button:hover {
      background-color: #1e7e34;
    }
    .cta-arrow {
      font-size: 23px;
      margin-left: 10px;
      vertical-align: middle;
    }
    .tracking-box {
      background-color: #f8f9fa;
      padding: 12px 20px;
      text-align: center;
      margin: 15px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #555555;
    }
    .tracking-box strong {
      color: #1a2a3a;
    }
    .document-list {
      margin: 20px 0;
    }
    .document-list h4 {
      color: #1a2a3a;
      font-size: 15px;
      margin-bottom: 10px;
    }
    .document-list ul {
      padding-left: 20px;
      margin: 0;
    }
    .document-list ul li {
      padding: 4px 0;
      font-size: 14px;
      color: #444444;
    }
    .closing {
      margin-top: 42px;
      border-top: 1px solid #dfcfb1;
      padding-top: 25px;
    }
    .heart {
      color: #c59b4e;
      font-size: 27px;
      vertical-align: middle;
      margin-right: 8px;
    }
    .closing-text {
      font-size: 18px;
      color: #292929;
      vertical-align: middle;
    }
    .regards {
      font-size: 17px;
      line-height: 1.7;
      color: #222;
      margin-top: 24px;
    }
    .team-name {
      font-weight: bold;
    }
    .reserved {
      color: #a47d3b;
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
    }
    .social-wrapper {
      text-align: center;
      padding: 18px 0 8px;
    }
    .social-icon {
      display: inline-block;
      width: 38px;
      height: 38px;
      border: 1px solid #172b24;
      border-radius: 50%;
      margin: 0 10px;
      color: #132a23 !important;
      font-size: 15px;
      line-height: 38px;
      text-align: center;
    }
    .footer {
      background-color: #f4eee5;
      text-align: center;
      padding: 20px 30px 25px;
    }
    .footer-note {
      font-size: 13px;
      color: #777;
      margin: 0 0 13px;
    }
    .lock {
      color: #b18a45;
      margin-right: 7px;
    }
    .copyright {
      font-size: 12px;
      color: #777;
      margin: 0;
    }
    .support-box {
      background-color: #f8f9fa;
      border-left: 4px solid #6c757d;
      padding: 15px 20px;
      margin: 25px 0 10px;
      border-radius: 4px;
    }
    .support-box strong {
      color: #1a2a3a;
      font-size: 14px;
    }
    .support-box p {
      margin: 5px 0 0;
      font-size: 13px;
      color: #555;
    }
    .support-box a {
      color: #007bff;
      text-decoration: none;
    }
    .support-box a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0; }
      .header { padding: 32px 24px; }
      .brand { font-size: 35px; }
      .tagline { font-size: 9px; letter-spacing: 2px; }
      .content { padding: 28px 20px 40px; }
      .main-title { font-size: 31px; }
      .greeting { font-size: 17px; }
      .body-text { font-size: 15px; }
      .card-inner { padding: 20px; }
      .store-icon-wrapper { width: 78px; height: 78px; }
      .store-icon { line-height: 78px; font-size: 32px; }
      .card-content { padding-left: 16px; }
      .card-label { font-size: 12px; }
      .card-title { font-size: 23px; }
      .card-text { font-size: 14px; }
      .cta-button { padding: 16px 24px; font-size: 14px; }
      .social-icon { margin: 0 6px; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrapper">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container">
          <!-- HEADER -->
          <tr>
            <td class="header">
              <div class="brand">NATIVE91</div>
              <div class="tagline">RESERVED FOR THE REMARKABLE</div>
            </td>
          </tr>
          <!-- CONTENT -->
          <tr>
            <td class="content">
              <!-- Check Icon -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td class="check-circle">
                          <span class="check">✓</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Title -->
              <h1 class="main-title">Application Approved!</h1>
              <!-- Divider -->
              <div class="gold-divider">
                <span class="gold-divider-line"></span>
                <span class="gold-leaf">❧</span>
                <span class="gold-divider-line"></span>
              </div>
              <!-- Greeting -->
              <p class="greeting">Hello <strong>${name || "Vendor"}</strong>,</p>
              <p class="body-text">We are pleased to inform you that your seller application for <strong>${company || "your business"}</strong> has been <span class="highlight">approved!</span></p>
              <p class="body-text">To complete the onboarding process and become a vendor on Native91, please upload the required documents using the link below.</p>

              <!-- ONBOARDING CARD -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="onboarding-card">
                <tr>
                  <td class="card-inner">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="125" valign="middle" align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td class="store-icon-wrapper">
                                <span class="store-icon">📋</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td class="card-content" valign="middle">
                          <p class="card-label">Complete Your Onboarding</p>
                          <h2 class="card-title">Document Upload</h2>
                          <p class="card-text">Please submit the required documents to complete your verification and get your store ready to go live.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- BUTTON -->
              <div class="button-container">
                <a href="${documentLink}" target="_blank" class="cta-button">
                  Upload Documents
                  <span class="cta-arrow">→</span>
                </a>
              </div>

              <!-- Tracking ID -->
              <div class="tracking-box">
                <strong>Tracking ID:</strong> ${trackingId}
              </div>

              <!-- Documents List -->
              <div class="document-list">
                <h4>Documents Required:</h4>
                <ul>
                  <li>Aadhaar Card (Front and Back)</li>
                  <li>PAN Card</li>
                  <li>Bank Account Details</li>
                  <li>Contact Information</li>
                  <li>GST Certificate (Optional)</li>
                  <li>Business Registration (Optional)</li>
                </ul>
              </div>

              <!-- Support Box -->
              <div class="support-box">
                <strong>Need Help?</strong>
                <p>If you have any questions, please contact our support team at <a href="mailto:support@native91.com">support@native91.com</a></p>
              </div>

              <!-- CLOSING -->
              <div class="closing">
                <span class="heart">♡</span>
                <span class="closing-text">We're excited to have you with us.</span>
              </div>
              <div class="regards">
                Warm regards,<br>
                <span class="team-name">Team Native91</span><br>
                <span class="reserved">Reserved for the Remarkable.</span>
              </div>

              <!-- SOCIAL -->
              <div class="social-wrapper">
                <a href="https://instagram.com/native91" target="_blank" class="social-icon">◎</a>
                <a href="https://linkedin.com/company/native91" target="_blank" class="social-icon">in</a>
                <a href="mailto:support@native91.com" class="social-icon">✉</a>
              </div>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td class="footer">
              <p class="footer-note">
                <span class="lock">♧</span>
                This is an automated email. Please do not reply to this message.
              </p>
              <p class="copyright">© ${currentYear} Native91. All rights reserved.</p>
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
// SEND DOCUMENT LINK EMAIL (DEPRECATED)
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Upload Required - Native91</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 0;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #28a745;
            padding: 30px 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px 30px 20px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .greeting strong {
            color: #1a2a3a;
          }
          .message {
            font-size: 15px;
            line-height: 1.8;
            color: #444444;
            margin-bottom: 20px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 35px;
            background-color: #28a745;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            font-size: 15px;
          }
          .button:hover {
            background-color: #218838;
          }
          .tracking-box {
            background-color: #f8f9fa;
            padding: 12px 20px;
            text-align: center;
            margin: 15px 0;
            border-radius: 4px;
            font-size: 14px;
            color: #555555;
          }
          .tracking-box strong {
            color: #1a2a3a;
          }
          .documents-list {
            margin: 20px 0;
          }
          .documents-list h4 {
            color: #1a2a3a;
            font-size: 15px;
            margin-bottom: 10px;
          }
          .documents-list ul {
            padding-left: 20px;
            margin: 0;
          }
          .documents-list ul li {
            padding: 4px 0;
            font-size: 14px;
            color: #444444;
          }
          .important-notes {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .important-notes strong {
            color: #856404;
            font-size: 14px;
          }
          .important-notes ul {
            padding-left: 20px;
            margin: 5px 0 0;
          }
          .important-notes ul li {
            padding: 3px 0;
            font-size: 13px;
            color: #856404;
          }
          .support-box {
            background-color: #f8f9fa;
            border-left: 4px solid #6c757d;
            padding: 15px 20px;
            margin: 25px 0 10px;
            border-radius: 4px;
          }
          .support-box strong {
            color: #1a2a3a;
            font-size: 14px;
          }
          .support-box p {
            margin: 5px 0 0;
            font-size: 13px;
            color: #555555;
          }
          .support-box a {
            color: #007bff;
            text-decoration: none;
          }
          .support-box a:hover {
            text-decoration: underline;
          }
          .footer {
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
          }
          .footer p {
            margin: 3px 0;
          }
          @media only screen and (max-width: 480px) {
            .container {
              margin: 10px;
            }
            .content {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Upload Required</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Dear <strong>${company || "Seller"}</strong>,
            </div>
            
            <div class="message">
              To complete your verification process and become a vendor on Native91, please upload the required documents using the link below.
            </div>

            <div class="button-container">
              <a href="${link}" class="button">Upload Documents</a>
            </div>

            <div class="tracking-box">
              <strong>Tracking ID:</strong> ${trackingId}
            </div>

            <div class="documents-list">
              <h4>Documents Required:</h4>
              <ul>
                <li>Aadhaar Card (Front and Back)</li>
                <li>PAN Card</li>
                <li>Bank Account Details</li>
                <li>Contact Information</li>
                <li>GST Certificate (Optional)</li>
                <li>Business Registration (Optional)</li>
              </ul>
            </div>

            <div class="important-notes">
              <strong>Important Notes:</strong>
              <ul>
                <li>This link is unique to you and should not be shared</li>
                <li>Your data is automatically saved as you fill the form</li>
                <li>You can return to the link anytime to continue</li>
                <li>After submission, our team will review your documents</li>
              </ul>
            </div>

            <div class="support-box">
              <strong>Need Help?</strong>
              <p>If you have any questions, please contact our support team at <a href="mailto:support@native91.com">support@native91.com</a></p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Native91. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
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

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Native91 - Document Correction Required</title>

  <style>
    /* =====================================================
       EMAIL RESET
    ====================================================== */

    body {
      margin: 0;
      padding: 0;
      background-color: #f5f4ef;
      font-family: Arial, Helvetica, sans-serif;
      color: #26332d;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    td {
      padding: 0;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
    }

    a {
      text-decoration: none;
    }

    /* =====================================================
       MAIN WRAPPER
    ====================================================== */

    .email-wrapper {
      width: 100%;
      background-color: #f5f4ef;
      padding: 30px 10px;
    }

    .email-container {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e7e3da;
      border-radius: 6px;
      overflow: hidden;
    }

    /* =====================================================
       HEADER
    ====================================================== */

    .header {
      background-color: #063f31;
      padding: 28px 45px 25px;
      position: relative;
    }

    .brand-name {
      margin: 0;
      color: #e4ce94;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 38px;
      font-weight: normal;
      letter-spacing: 7px;
      line-height: 1;
    }

    .brand-tagline {
      margin-top: 10px;
      color: #d8c28a;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 11px;
      letter-spacing: 2.2px;
      text-transform: uppercase;
    }

    .header-decoration {
      position: absolute;
      right: 25px;
      top: 12px;
      color: #b79c5d;
      font-family: Georgia, serif;
      font-size: 65px;
      line-height: 1;
      transform: rotate(-12deg);
      opacity: 0.9;
    }

    /* =====================================================
       MAIN CONTENT
    ====================================================== */

    .content {
      padding: 28px 48px 30px;
    }

    /* =====================================================
       TOP ICON
    ====================================================== */

    .top-icon-wrapper {
      text-align: center;
      padding-bottom: 10px;
    }

    .top-icon {
      width: 70px;
      height: 70px;
      line-height: 70px;
      margin: 0 auto;
      border-radius: 50%;
      background-color: #f8f1df;
      color: #0b3f32;
      font-size: 31px;
      text-align: center;
    }

    /* =====================================================
       TITLE
    ====================================================== */

    .main-title {
      margin: 4px 0 12px;
      text-align: center;
      color: #0a392e;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 38px;
      font-weight: normal;
      line-height: 1.2;
    }

    /* =====================================================
       GOLD DIVIDER
    ====================================================== */

    .divider {
      text-align: center;
      margin: 8px auto 25px;
    }

    .divider-line {
      display: inline-block;
      width: 50px;
      height: 1px;
      background-color: #cdb47c;
      vertical-align: middle;
    }

    .divider-icon {
      display: inline-block;
      margin: 0 12px;
      color: #b08e50;
      font-size: 18px;
      vertical-align: middle;
    }

    /* =====================================================
       TEXT
    ====================================================== */

    .greeting {
      margin: 0 0 15px;
      color: #242a26;
      font-size: 16px;
      line-height: 1.6;
    }

    .paragraph {
      margin: 0 0 15px;
      color: #343936;
      font-size: 15px;
      line-height: 1.65;
    }

    .paragraph strong {
      color: #171c19;
      font-weight: 700;
    }

    /* =====================================================
       CORRECTION BOXES
    ====================================================== */

    .cards-table {
      width: 100%;
      margin: 22px 0 23px;
    }

    .card-left {
      width: 48%;
      background-color: #fff5df;
      border-left: 4px solid #e8ad22;
      border-radius: 6px;
      padding: 22px 20px;
      vertical-align: top;
    }

    .card-gap {
      width: 4%;
    }

    .card-right {
      width: 48%;
      background-color: #fff0f0;
      border-left: 4px solid #b9333d;
      border-radius: 6px;
      padding: 22px 20px;
      vertical-align: top;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 50%;
      background-color: #fff9e9;
      color: #173b31;
      text-align: center;
      font-size: 23px;
      margin-bottom: 12px;
    }

    .card-right .card-icon {
      background-color: #ffe5e5;
      color: #a92f38;
    }

    .card-title {
      color: #214036;
      font-size: 13px;
      line-height: 1.4;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 10px;
    }

    .card-right .card-title {
      color: #9e3038;
    }

    .card-line {
      width: 28px;
      height: 1px;
      background-color: #758177;
      margin: 8px 0 15px;
    }

    .card-value {
      color: #1d2420;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 21px;
      font-weight: bold;
    }

    .reason-label {
      color: #252a27;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 7px;
    }

    .reason-text {
      color: #343936;
      font-size: 14px;
      line-height: 1.5;
    }

    /* =====================================================
       RESUBMIT BUTTON
    ====================================================== */

    .instruction-text {
      color: #303632;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 18px;
    }

    .button-wrapper {
      text-align: center;
      margin: 5px 0 25px;
    }

    .resubmit-button {
      display: inline-block;
      background-color: #073f31;
      color: #ffffff !important;
      padding: 14px 35px;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
      text-transform: none;
      min-width: 245px;
    }

    .button-arrow {
      color: #d7bd7e;
      font-size: 19px;
      margin-left: 10px;
    }

    /* =====================================================
       SECOND DIVIDER
    ====================================================== */

    .section-divider {
      text-align: center;
      margin: 8px 0 25px;
    }

    /* =====================================================
       WHAT HAPPENS NEXT
    ====================================================== */

    .next-section {
      margin-bottom: 20px;
    }

    .next-icon-cell {
      width: 105px;
      vertical-align: top;
      text-align: center;
    }

    .next-icon {
      width: 66px;
      height: 66px;
      line-height: 66px;
      border-radius: 50%;
      background-color: #f8f1df;
      color: #123c31;
      font-size: 28px;
      margin: 0 auto;
    }

    .next-content {
      vertical-align: top;
      padding-left: 15px;
    }

    .next-title {
      margin: 0 0 12px;
      color: #193a30;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 18px;
      font-weight: bold;
    }

    /* =====================================================
       STEPS
    ====================================================== */

    .step-row {
      margin-bottom: 9px;
    }

    .step-number {
      width: 22px;
      height: 22px;
      line-height: 22px;
      background-color: #073f31;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      font-size: 11px;
      font-weight: bold;
      vertical-align: top;
    }

    .step-text {
      padding-left: 10px;
      color: #333936;
      font-size: 14px;
      line-height: 1.5;
      vertical-align: top;
    }

    /* =====================================================
       APPROVAL NOTE
    ====================================================== */

    .approval-box {
      width: 100%;
      background-color: #eef6f2;
      border-radius: 6px;
      padding: 14px 18px;
      margin: 18px 0;
    }

    .approval-icon {
      width: 45px;
      color: #173c31;
      font-size: 27px;
      vertical-align: middle;
    }

    .approval-text {
      color: #26332d;
      font-size: 14px;
      line-height: 1.55;
      vertical-align: middle;
      padding-left: 10px;
    }

    /* =====================================================
       NEED HELP BOX
    ====================================================== */

    .help-box {
      width: 100%;
      border: 1px solid #e6e1d7;
      border-radius: 7px;
      padding: 14px 15px;
      margin-bottom: 20px;
    }

    .help-icon-cell {
      width: 65px;
      vertical-align: middle;
      text-align: center;
    }

    .help-icon {
      width: 48px;
      height: 48px;
      line-height: 48px;
      border-radius: 50%;
      background-color: #f8f1df;
      color: #173c31;
      font-size: 24px;
      margin: auto;
    }

    .help-content {
      vertical-align: middle;
      padding-left: 10px;
    }

    .help-title {
      color: #1d3c32;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      font-weight: bold;
      margin-bottom: 7px;
    }

    .help-text {
      color: #454a46;
      font-size: 14px;
      line-height: 1.5;
    }

    .help-email {
      color: #a1782e;
      font-weight: bold;
      font-size: 14px;
    }

    /* =====================================================
       SIGNATURE
    ====================================================== */

    .signature {
      padding: 0 15px 5px;
    }

    .warm-regards {
      color: #333936;
      font-size: 14px;
      margin-bottom: 5px;
    }

    .team-name {
      color: #1d2f28;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .signature-tagline {
      color: #a6813e;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 14px;
      font-style: italic;
    }

    /* =====================================================
       FOOTER
    ====================================================== */

    .footer {
      border-top: 1px solid #ddd8cd;
      text-align: center;
      padding: 22px 20px 28px;
      background-color: #ffffff;
    }

    .social-icons {
      margin-bottom: 22px;
    }

    .social-icon {
      display: inline-block;
      width: 34px;
      height: 34px;
      line-height: 34px;
      border: 1px solid #cfd1cc;
      border-radius: 50%;
      color: #183b31;
      font-size: 15px;
      margin: 0 8px;
      text-align: center;
    }

    .automated-message {
      color: #999b96;
      font-size: 11px;
      font-style: italic;
      margin-bottom: 14px;
    }

    .copyright {
      color: #999b96;
      font-size: 11px;
    }

    /* =====================================================
       MOBILE RESPONSIVE
    ====================================================== */

    @media only screen and (max-width: 600px) {

      .email-wrapper {
        padding: 10px 5px;
      }

      .header {
        padding: 22px 20px;
      }

      .brand-name {
        font-size: 28px;
        letter-spacing: 5px;
      }

      .brand-tagline {
        font-size: 8px;
        letter-spacing: 1.5px;
      }

      .header-decoration {
        right: 10px;
        font-size: 42px;
      }

      .content {
        padding: 22px 18px 25px;
      }

      .top-icon {
        width: 58px;
        height: 58px;
        line-height: 58px;
        font-size: 26px;
      }

      .main-title {
        font-size: 27px;
      }

      .greeting,
      .paragraph,
      .instruction-text {
        font-size: 13px;
      }

      /* Stack cards */

      .cards-table,
      .card-left,
      .card-right,
      .card-gap {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }

      .card-gap {
        height: 12px;
      }

      .card-left,
      .card-right {
        padding: 17px 15px;
      }

      .card-value {
        font-size: 18px;
      }

      .reason-text {
        font-size: 13px;
      }

      .resubmit-button {
        width: 90%;
        min-width: 0;
        box-sizing: border-box;
        font-size: 13px;
      }

      /* Next section */

      .next-icon-cell {
        width: 70px;
      }

      .next-icon {
        width: 52px;
        height: 52px;
        line-height: 52px;
        font-size: 22px;
      }

      .next-content {
        padding-left: 8px;
      }

      .next-title {
        font-size: 16px;
      }

      .step-text {
        font-size: 12px;
      }

      /* Approval */

      .approval-text {
        font-size: 12px;
      }

      /* Help */

      .help-icon-cell {
        width: 55px;
      }

      .help-icon {
        width: 43px;
        height: 43px;
        line-height: 43px;
        font-size: 21px;
      }

      .help-content {
        padding-left: 5px;
      }

      .help-title {
        font-size: 15px;
      }

      .help-text,
      .help-email {
        font-size: 12px;
      }

      .social-icon {
        width: 30px;
        height: 30px;
        line-height: 30px;
        margin: 0 5px;
      }
    }
  </style>
</head>

<body>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >
    <tr>
      <td class="email-wrapper">

        <!-- =================================================
             MAIN EMAIL CONTAINER
        ================================================== -->

        <table
          role="presentation"
          class="email-container"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          align="center"
        >

          <!-- =================================================
               HEADER
          ================================================== -->

          <tr>
            <td class="header">

              <div class="brand-name">
                NATIVE91
              </div>

              <div class="brand-tagline">
                RESERVED FOR THE REMARKABLE
              </div>

              <div class="header-decoration">
                ❧
              </div>

            </td>
          </tr>


          <!-- =================================================
               CONTENT
          ================================================== -->

          <tr>
            <td class="content">

              <!-- TOP ICON -->

              <div class="top-icon-wrapper">

                <div class="top-icon">
                  📄
                </div>

              </div>


              <!-- TITLE -->

              <h1 class="main-title">
                A quick update is needed
              </h1>


              <!-- DIVIDER -->

              <div class="divider">

                <span class="divider-line"></span>

                <span class="divider-icon">
                  ❧
                </span>

                <span class="divider-line"></span>

              </div>


              <!-- GREETING -->

              <p class="greeting">
                Hello ${company || "Vendor"},
              </p>


              <p class="paragraph">
                Thank you for completing your Native91 onboarding.
              </p>


              <p class="paragraph">
                We've reviewed your submitted documents and found that
                <strong>
                  one document needs to be corrected
                </strong>
                before we can continue with your onboarding.
              </p>


              <!-- =================================================
                   CORRECTION CARDS
              ================================================== -->

              <table
                role="presentation"
                class="cards-table"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >

                <tr>

                  <!-- LEFT CARD -->

                  <td class="card-left">

                    <div class="card-icon">
                      ♙
                    </div>

                    <div class="card-title">
                      Document Requiring<br>
                      Attention
                    </div>

                    <div class="card-line"></div>

                    <div class="card-value">
                      ${documentName || "Document"}
                    </div>

                  </td>


                  <!-- GAP -->

                  <td class="card-gap">
                  </td>


                  <!-- RIGHT CARD -->

                  <td class="card-right">

                    <div class="card-icon">
                      !
                    </div>

                    <div class="card-title">
                      What Needs To Be Corrected?
                    </div>

                    <div class="card-line"></div>

                    <div class="reason-label">
                      Reason:
                    </div>

                    <div class="reason-text">
                      ${reason || "No specific reason provided"}
                    </div>

                  </td>

                </tr>

              </table>


              <!-- INSTRUCTION -->

              <p class="instruction-text">
                Please correct the issue mentioned above and resubmit only
                this document. There is no need to upload your other
                documents again.
              </p>


              <!-- BUTTON -->

              <div class="button-wrapper">

                <a
                  href="${fullLink}"
                  target="_blank"
                  class="resubmit-button"
                >
                  Resubmit Document

                  <span class="button-arrow">
                    →
                  </span>
                </a>

              </div>


              <!-- =================================================
                   SECTION DIVIDER
              ================================================== -->

              <div class="section-divider">

                <span class="divider-line"></span>

                <span class="divider-icon">
                  ❧
                </span>

                <span class="divider-line"></span>

              </div>


              <!-- =================================================
                   WHAT HAPPENS NEXT
              ================================================== -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                class="next-section"
              >

                <tr>

                  <td class="next-icon-cell">

                    <div class="next-icon">
                      ☑
                    </div>

                  </td>


                  <td class="next-content">

                    <div class="next-title">
                      WHAT HAPPENS NEXT?
                    </div>


                    <!-- STEP 1 -->

                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      class="step-row"
                    >
                      <tr>

                        <td class="step-number">
                          1
                        </td>

                        <td class="step-text">
                          Review the reason mentioned above.
                        </td>

                      </tr>
                    </table>


                    <!-- STEP 2 -->

                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      class="step-row"
                    >
                      <tr>

                        <td class="step-number">
                          2
                        </td>

                        <td class="step-text">
                          Correct the ${documentName || "document"}.
                        </td>

                      </tr>
                    </table>


                    <!-- STEP 3 -->

                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      class="step-row"
                    >
                      <tr>

                        <td class="step-number">
                          3
                        </td>

                        <td class="step-text">
                          Click "Resubmit Document" and upload the
                          corrected version.
                        </td>

                      </tr>
                    </table>


                    <!-- STEP 4 -->

                    <table
                      role="presentation"
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                      class="step-row"
                    >
                      <tr>

                        <td class="step-number">
                          4
                        </td>

                        <td class="step-text">
                          Our team will review the document again.
                        </td>

                      </tr>
                    </table>

                  </td>

                </tr>

              </table>


              <!-- =================================================
                   APPROVAL NOTE
              ================================================== -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                class="approval-box"
              >

                <tr>

                  <td class="approval-icon">
                    ♢
                  </td>

                  <td class="approval-text">
                    Once the document is approved, you can continue
                    with the remaining Native91 onboarding process.
                  </td>

                </tr>

              </table>


              <!-- =================================================
                   NEED HELP
              ================================================== -->

              <table
                role="presentation"
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                class="help-box"
              >

                <tr>

                  <td class="help-icon-cell">

                    <div class="help-icon">
                      ♧
                    </div>

                  </td>


                  <td class="help-content">

                    <div class="help-title">
                      NEED HELP?
                    </div>

                    <div class="help-text">
                      If you have any questions, please reach out to us at
                    </div>

                    <div class="help-email">
                      support@native91.com
                    </div>

                  </td>

                </tr>

              </table>


              <!-- =================================================
                   SIGNATURE
              ================================================== -->

              <div class="signature">

                <div class="warm-regards">
                  Warm regards,
                </div>

                <div class="team-name">
                  Team Native91
                </div>

                <div class="signature-tagline">
                  Reserved for the Remarkable.
                </div>

              </div>

            </td>
          </tr>


          <!-- =================================================
               FOOTER
          ================================================== -->

          <tr>
            <td class="footer">

              <!-- SOCIAL -->

              <div class="social-icons">

                <a
                  href="#"
                  class="social-icon"
                  target="_blank"
                >
                  ◎
                </a>

                <a
                  href="#"
                  class="social-icon"
                  target="_blank"
                >
                  in
                </a>

            
              </div>


              <!-- AUTOMATED MESSAGE -->

              <div class="automated-message">
                This is an automated email. Please do not reply to this message.
              </div>


              <!-- COPYRIGHT -->

              <div class="copyright">
                © ${currentYear} Native91. All rights reserved.
              </div>

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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Resubmitted - Native91</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; padding: 0; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background-color: #17a2b8; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
          .content { padding: 30px 30px 20px; }
          .greeting { font-size: 16px; margin-bottom: 20px; }
          .message { font-size: 15px; line-height: 1.8; color: #444444; margin-bottom: 15px; }
          .info-box { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
          .info-box strong { color: #0c5460; font-size: 14px; }
          .info-box .doc-name { color: #0c5460; font-size: 16px; font-weight: 600; }
          .info-box .vendor-info { color: #0c5460; font-size: 14px; margin-top: 8px; }
          .button-container { text-align: center; margin: 30px 0 20px; }
          .button { display: inline-block; padding: 12px 35px; background-color: #17a2b8; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 15px; }
          .button:hover { background-color: #138496; }
          .footer { padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d; }
          .footer p { margin: 3px 0; }
          @media only screen and (max-width: 480px) { .container { margin: 10px; } .content { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Document Resubmitted</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Dear <strong>Admin</strong>,
            </div>
            
            <div class="message">
              A vendor has resubmitted a document for review.
            </div>

            <div class="info-box">
              <strong>Resubmission Details:</strong>
              <div class="doc-name">Document: ${documentName}</div>
              <div class="vendor-info">Vendor: ${company || "N/A"}</div>
              <div class="vendor-info">Email: ${email}</div>
              <div class="vendor-info">Tracking ID: ${trackingId || "N/A"}</div>
            </div>

            <div class="message">
              Please review the resubmitted document and verify it.
            </div>

            <div class="button-container">
              <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin/documents'}" class="button">Review Documents</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Native91. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
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

module.exports = {
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVendorCreationEmail,
  sendDocumentRejectionEmail,
  sendDocumentResubmissionEmail
};