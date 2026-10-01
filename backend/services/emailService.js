const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }
  return transporter;
};

const sendOtpEmail = async (toEmail, otp) => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const isDev = process.env.NODE_ENV !== 'production';

  if (emailUser && emailPass) {
    try {
      const mailTransporter = getTransporter();
      const mailOptions = {
        from: `"RideShare" <${emailUser}>`,
        to: toEmail,
        subject: `${otp} is your RideShare verification code`,
        text: `Your RideShare verification code is: ${otp}. It will expire in 5 minutes.`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">RideShare Verification</h2>
            <p style="color: #334155;">Use the following 6-digit code to verify your account:</p>
            <div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 6px; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f766e;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 16px;">This code is valid for 5 minutes.</p>
          </div>
        `,
      };

      await mailTransporter.sendMail(mailOptions);
      return { delivered: true };
    } catch (err) {
      if (isDev) {
        console.log(`[Dev OTP Fallback] ${toEmail}: ${otp}`);
        return { delivered: false, devLogged: true };
      }
      throw new Error('Failed to send verification email.');
    }
  }

  // Development console fallback when email credentials are not configured
  if (isDev) {
    console.log(`[Dev OTP Fallback] ${toEmail}: ${otp}`);
    return { delivered: false, devLogged: true };
  }

  throw new Error('Email service is not configured.');
};

module.exports = {
  sendOtpEmail,
};
