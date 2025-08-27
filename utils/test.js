// C:\Users\User\Desktop\Dev Quest\backend\utils\test.js
const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Failed to load .env:', result.error);
  process.exit(1);
}

const testEmail = async () => {
  console.log('Testing with port 587 (STARTTLS)...');
  console.log('Environment variables:');
  console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL);
  console.log('FROM_NAME:', process.env.FROM_NAME);
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL);
  console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'Set' : 'Missing');

  // Validate credentials
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error('Error: SMTP_EMAIL or SMTP_PASSWORD missing');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'DevQuest'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
    to: 'judeorifa28@gmail.com', // Use your email for testing
    subject: 'Test Email from DevQuest',
    text: 'This is a test email to verify SMTP configuration.',
    html: '<p>This is a test email to verify SMTP configuration.</p>',
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
    });
    return info;
  } catch (error) {
    console.error('Email send error:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
      command: error.command,
    });
    throw error;
  }
};

testEmail();