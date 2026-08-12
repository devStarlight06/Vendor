// middleware/emailService.js - MODIFIED VERSION
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
// SEND APPROVAL EMAIL (ONLY DOCUMENT LINK - NO PASSWORD)
// ============================================================
// middleware/emailService.js - COMPLETE UPDATED VERSION

const sendApprovalEmail = async (email, name, company, vendorId, trackingId) => {
  try {
    console.log(`📧 Sending approval email to: ${email}`);
    console.log(`📄 Tracking ID: ${trackingId}`);
    
    const transporter = createTransporter();

    if (!transporter) {
      console.error("❌ Transporter creation failed");
      return { success: false, error: "Email not configured" };
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const documentLink = trackingId ? `${frontendUrl}/document-upload/${trackingId}` : null;

    if (!documentLink) {
      console.error("❌ No tracking ID provided - cannot generate document link");
      return { success: false, error: "Missing tracking ID for document link" };
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
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #f4f4f4; 
            margin: 0;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          }
          .header { 
            background: #28a745; 
            padding: 30px; 
            text-align: center; 
            color: white; 
            border-radius: 10px 10px 0 0; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
          }
          .header p {
            margin: 5px 0 0;
            opacity: 0.9;
          }
          .content { 
            padding: 30px; 
          }
          .success-box { 
            background: #d4edda; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 15px 0; 
            border-left: 4px solid #28a745; 
          }
          .document-link-box { 
            background: #e9ecef; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            border-left: 4px solid #17a2b8; 
            text-align: center;
          }
          .button { 
            display: inline-block; 
            padding: 16px 40px; 
            background: #28a745; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 15px 0; 
            font-weight: bold;
            font-size: 16px;
            border: none;
            cursor: pointer;
          }
          .button:hover { 
            background: #218838; 
          }
          .tracking-id-box {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-size: 14px;
          }
          .footer { 
            margin-top: 30px; 
            text-align: center; 
            color: #6c757d; 
            font-size: 12px; 
            border-top: 1px solid #e9ecef; 
            padding-top: 20px; 
          }
          ul { 
            padding-left: 20px; 
          }
          ul li { 
            padding: 5px 0; 
          }
          .note-box { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 15px 0; 
            border-left: 4px solid #ffc107; 
          }
          .link-text {
            word-break: break-all;
            color: #17a2b8;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Application Approved!</h1>
            <p>Congratulations ${name || "Vendor"}!</p>
          </div>
          <div class="content">
            <p>We are pleased to inform you that your seller application for <strong>${company || "your business"}</strong> has been <strong>approved</strong>!</p>
            
            <div class="success-box">
              <strong>✅ Your Application is Approved</strong>
              <p style="margin-top: 10px; margin-bottom: 0;">
                Please complete your document submission using the link below.
              </p>
            </div>

            <div class="document-link-box">
              <h3 style="margin-top: 0; color: #17a2b8;">📄 Submit Your Documents</h3>
              <p style="margin-bottom: 5px;">Click the button below to upload your documents:</p>
              <div style="text-align: center;">
                <a href="${documentLink}" class="button">📤 Upload Documents</a>
              </div>
              <div class="tracking-id-box">
                <strong>Tracking ID:</strong> ${trackingId}
              </div>
              <p style="margin-bottom: 0; font-size: 13px; color: #6c757d;">
                <span class="link-text">${documentLink}</span>
              </p>
            </div>

            <div class="note-box">
              <strong>📝 Important Next Steps:</strong>
              <ol style="margin: 10px 0 0; padding-left: 20px;">
                <li>📄 Click the <strong>"Upload Documents"</strong> button above</li>
                <li>📋 Fill in all required information</li>
                <li>✅ Submit your documents for verification</li>
                <li>🔐 After verification, you will receive your login credentials</li>
              </ol>
            </div>

            <p style="margin-top: 20px;">
              <strong>🚀 What Happens Next?</strong>
            </p>
            <ul>
              <li>📄 <strong>Upload Documents</strong> using the link above</li>
              <li>✅ Our team will <strong>verify your documents</strong></li>
              <li>🔐 You will receive <strong>login credentials</strong> after verification</li>
              <li>🛍️ Start <strong>selling your products</strong> on Native91</li>
            </ul>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6c757d;">
              <strong>📞 Need Help?</strong>
              <p style="margin: 10px 0 0;">
                If you have any questions, please contact our support team at 
                <a href="mailto:support@native91.com">support@native91.com</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Native91. All rights reserved.</p>
            <p style="margin: 5px 0 0;">This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "✅ Application Approved - Submit Your Documents - Native91",
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    console.log("📤 Sending approval email with document link...");
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to: ${email}`);
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`🔗 Document Link: ${documentLink}`);
    
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Upload Link</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; padding: 20px; text-align: center; color: white; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .tracking-id { background: #e9ecef; padding: 10px; border-radius: 5px; text-align: center; }
          .footer { margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Document Upload Required</h1>
          </div>
          <div class="content">
            <h2>Hello, ${company || "Seller"}!</h2>
            <p>To complete your verification process, please upload the required documents using the link below:</p>
            
            <div style="text-align: center;">
              <a href="${link}" class="button">📤 Upload Documents</a>
            </div>
            
            <div class="tracking-id">
              <strong>Your Tracking ID:</strong> ${trackingId}
            </div>
            
            <p style="margin-top: 20px;"><strong>Documents Required:</strong></p>
            <ul>
              <li>✅ Aadhaar Card (Front & Back)</li>
              <li>✅ PAN Card</li>
              <li>✅ Bank Account Details</li>
              <li>✅ Contact Information</li>
              <li>📋 GST Certificate (Optional)</li>
              <li>📋 Business Registration (Optional)</li>
            </ul>
            
            <p style="margin-top: 20px;">
              <strong>📝 Important:</strong><br>
              • This link is unique to you<br>
              • Your data is auto-saved as you fill the form<br>
              • You can return to the link anytime to continue<br>
              • After submission, our team will review your documents
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Native91. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "📄 Complete Your Seller Verification - Native91",
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
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #dc3545; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .reason-box { background: #f8d7da; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .footer { margin-top: 30px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; padding-top: 20px; }
          ul { padding-left: 20px; }
          ul li { padding: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Application Update</h1>
          </div>
          <div class="content">
            <h2>Dear ${name || "Seller"},</h2>
            <p>Your application for <strong>${company || "your business"}</strong> has been reviewed.</p>
            <p>Unfortunately, we are unable to approve your application at this time.</p>
            
            <div class="reason-box">
              <strong>Reason for Rejection:</strong>
              <p style="margin-top: 10px; margin-bottom: 0;">${reason || "No reason provided"}</p>
            </div>

            <p style="margin-top: 20px;">
              <strong>📝 What can you do next?</strong>
            </p>
            <ul>
              <li>📋 Review the reason provided above</li>
              <li>📄 Update your documents if needed</li>
              <li>📧 Contact our support team for clarification</li>
              <li>🔄 You can re-apply after addressing the issues</li>
            </ul>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6c757d;">
              <strong>📞 Need Help?</strong>
              <p style="margin: 10px 0 0;">
                If you have any questions, please contact our support team at 
                <a href="mailto:support@native91.com">support@native91.com</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Native91. All rights reserved.</p>
            <p style="margin: 5px 0 0;">This is an automated message, please do not reply.</p>
          </div>
        </div>
      </html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "📋 Update on Your Seller Application - Native91",
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
        <title>Welcome to Native91 - Your Vendor Credentials</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #2c3e50; padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .credentials-box { background: #e9ecef; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #007bff; }
          .credentials-box .label { font-weight: bold; color: #555; display: inline-block; width: 80px; }
          .credentials-box .value { font-weight: bold; color: #333; background: #fff; padding: 2px 10px; border-radius: 4px; }
          .password-value { background: #fff3cd; padding: 2px 10px; border-radius: 4px; font-weight: bold; color: #856404; }
          .button { display: inline-block; padding: 14px 35px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
          .button:hover { background: #218838; }
          .footer { margin-top: 30px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; padding-top: 20px; }
          ul { padding-left: 20px; }
          ul li { padding: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Native91!</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Your Vendor Account is Ready</p>
          </div>
          <div class="content">
            <h2>Dear ${name || "Vendor"},</h2>
            <p>Congratulations! Your documents have been <strong>verified</strong> and your vendor account has been created.</p>
            
            <div class="credentials-box">
              <h4 style="margin-top: 0; color: #007bff;">🔑 Your Login Credentials</h4>
              <p><span class="label">Email:</span> <span class="value">${email}</span></p>
              <p><span class="label">Password:</span> <span class="password-value">${password}</span></p>
              <p style="margin-top: 10px; font-size: 14px; color: #6c757d;">
                <strong>Important:</strong> Please change your password after your first login.
              </p>
            </div>

            <p style="margin-top: 20px;">
              <strong>🚀 What's Next?</strong>
            </p>
            <ul>
              <li>🔐 <strong>Login</strong> to your vendor dashboard using the credentials above</li>
              <li>🛍️ <strong>Add your products</strong> to start selling</li>
              <li>📊 <strong>Manage your store</strong> and track orders</li>
              <li>📈 <strong>Monitor analytics</strong> to grow your business</li>
            </ul>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${loginUrl}" class="button">🔐 Login to Your Vendor Panel</a>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6c757d;">
              <strong>📞 Need Help?</strong>
              <p style="margin: 10px 0 0;">
                If you have any questions, please contact our support team at 
                <a href="mailto:support@native91.com">support@native91.com</a>
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Native91. All rights reserved.</p>
            <p style="margin: 5px 0 0;">This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Native91" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "🎉 Welcome to Native91 - Your Vendor Credentials",
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

// Add to module exports
module.exports = {
  sendDocumentLinkEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendVendorCreationEmail,  // ✅ ADD THIS
 
};