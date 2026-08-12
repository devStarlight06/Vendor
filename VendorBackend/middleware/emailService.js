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
const sendVendorCreationEmail = async (email, name, company, password, plan, commissionRate, loginUrl, adminName) => {
  try {
    console.log(`📧 Sending vendor credentials email to: ${email}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: "Email not configured" };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vendor Account Credentials - Native91</title>
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
            background-color: #1a2a3a;
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
          .header p {
            color: #a0b4c8;
            margin: 5px 0 0;
            font-size: 14px;
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
            margin-bottom: 25px;
          }
          .credentials-box {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 20px 25px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .credentials-box h3 {
            color: #007bff;
            margin: 0 0 15px;
            font-size: 16px;
            font-weight: 600;
          }
          .credential-row {
            padding: 6px 0;
            font-size: 14px;
          }
          .credential-label {
            font-weight: 600;
            color: #555555;
            display: inline-block;
            width: 80px;
          }
          .credential-value {
            color: #1a2a3a;
            font-weight: 500;
          }
          .password-value {
            background-color: #fff3cd;
            padding: 2px 10px;
            border-radius: 3px;
            color: #856404;
            font-weight: 600;
            font-size: 15px;
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
          .next-steps {
            margin: 25px 0 20px;
          }
          .next-steps h4 {
            color: #1a2a3a;
            font-size: 15px;
            margin-bottom: 10px;
          }
          .next-steps ul {
            padding-left: 20px;
            margin: 0;
          }
          .next-steps ul li {
            padding: 4px 0;
            font-size: 14px;
            color: #444444;
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
          .note {
            font-size: 13px;
            color: #6c757d;
            margin-top: 15px;
            padding: 10px 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
          }
          @media only screen and (max-width: 480px) {
            .container {
              margin: 10px;
            }
            .content {
              padding: 20px;
            }
            .credentials-box {
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Vendor Account Credentials</h1>
            <p>Native91 - Your Account is Ready</p>
          </div>
          <div class="content">
            <div class="greeting">
              Dear <strong>${name || "Vendor"}</strong>,
            </div>
            
            <div class="message">
              Congratulations! Your documents have been verified and your vendor account has been created successfully. You can now login to your vendor dashboard using the credentials below.
            </div>

            <div class="credentials-box">
              <h3>Login Credentials</h3>
              <div class="credential-row">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-row">
                <span class="credential-label">Password:</span>
                <span class="password-value">${password}</span>
              </div>
              <div style="margin-top: 12px; font-size: 13px; color: #6c757d;">
                <strong>Important:</strong> Please change your password after your first login for security.
              </div>
            </div>

            <div class="button-container">
              <a href="${loginUrl}" class="button">Login to Vendor Panel</a>
            </div>

            <div class="next-steps">
              <h4>What's Next?</h4>
              <ul>
                <li>Login to your vendor dashboard using the credentials above</li>
                <li>Add your products to start selling on Native91</li>
                <li>Manage your store and track orders</li>
                <li>Monitor analytics to grow your business</li>
              </ul>
            </div>

            <div class="support-box">
              <strong>Need Help?</strong>
              <p>If you have any questions, please contact our support team at <a href="mailto:support@native91.com">support@native91.com</a></p>
            </div>

            <div class="note">
              <strong>Security Note:</strong> This email contains sensitive login credentials. Please keep this information secure and do not share it with anyone.
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
      subject: "Vendor Account Credentials - Native91",
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Credentials email sent to: ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Credentials email error:", error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// SEND REJECTION EMAIL
// ============================================================
const sendRejectionEmail = async (email, name, company, reason) => {
  try {
    console.log(`📧 Sending rejection email to: ${email}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: "Email not configured" };
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update - Native91</title>
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
            background-color: #dc3545;
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
            margin-bottom: 15px;
          }
          .reason-box {
            background-color: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .reason-box strong {
            color: #721c24;
            font-size: 14px;
          }
          .reason-box p {
            margin: 8px 0 0;
            color: #721c24;
            font-size: 14px;
          }
          .next-steps {
            margin: 25px 0 20px;
          }
          .next-steps h4 {
            color: #1a2a3a;
            font-size: 15px;
            margin-bottom: 10px;
          }
          .next-steps ul {
            padding-left: 20px;
            margin: 0;
          }
          .next-steps ul li {
            padding: 4px 0;
            font-size: 14px;
            color: #444444;
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
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Dear <strong>${name || "Seller"}</strong>,
            </div>
            
            <div class="message">
              Thank you for submitting your application to become a vendor on Native91. After careful review, we regret to inform you that we are unable to approve your application at this time.
            </div>

            <div class="reason-box">
              <strong>Reason for Rejection:</strong>
              <p>${reason || "No specific reason provided"}</p>
            </div>

            <div class="next-steps">
              <h4>What You Can Do Next:</h4>
              <ul>
                <li>Review the reason provided above carefully</li>
                <li>Update and correct the mentioned issues</li>
                <li>Contact our support team for clarification if needed</li>
                <li>You can re-apply after addressing the issues</li>
              </ul>
            </div>

            <div class="support-box">
              <strong>Need Help?</strong>
              <p>If you have any questions or need clarification, please contact our support team at <a href="mailto:support@native91.com">support@native91.com</a></p>
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
      subject: "Application Update - Native91",
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Rejection email sent to: ${email}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Rejection email error:", error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// SEND APPROVAL EMAIL (DOCUMENT LINK - DEPRECATED)
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Approved - Native91</title>
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
          .next-steps {
            margin: 25px 0 20px;
          }
          .next-steps h4 {
            color: #1a2a3a;
            font-size: 15px;
            margin-bottom: 10px;
          }
          .next-steps ol {
            padding-left: 20px;
            margin: 0;
          }
          .next-steps ol li {
            padding: 4px 0;
            font-size: 14px;
            color: #444444;
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
          .link-text {
            word-break: break-all;
            color: #007bff;
            font-size: 13px;
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
            <h1>Application Approved</h1>
          </div>
          <div class="content">
            <div class="greeting">
              Congratulations <strong>${name || "Vendor"}</strong>,
            </div>
            
            <div class="message">
              We are pleased to inform you that your seller application for <strong>${company || "your business"}</strong> has been approved. To complete the verification process, please submit your documents using the link below.
            </div>

            <div class="button-container">
              <a href="${documentLink}" class="button">Upload Documents</a>
            </div>

            <div class="tracking-box">
              <strong>Tracking ID:</strong> ${trackingId}
            </div>

            <div style="font-size: 13px; color: #6c757d; text-align: center; margin-bottom: 20px;">
              <span class="link-text">${documentLink}</span>
            </div>

            <div class="next-steps">
              <h4>Next Steps:</h4>
              <ol>
                <li>Click the "Upload Documents" button above</li>
                <li>Fill in all required information</li>
                <li>Submit your documents for verification</li>
                <li>After verification, you will receive your login credentials</li>
              </ol>
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
      subject: "Application Approved - Submit Your Documents - Native91",
      html: htmlContent,
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
// MODULE EXPORTS
// ============================================================
module.exports = {
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVendorCreationEmail,
};