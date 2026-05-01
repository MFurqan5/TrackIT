const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Email transporter configuration
const createTransporter = () => {
  // For development: use ethereal.email (fake SMTP for testing)
  // if (process.env.NODE_ENV === 'development') {
  //   return nodemailer.createTransport({
  //     host: 'smtp.ethereal.email',
  //     port: 587,
  //     auth: {
  //       user: 'your-test-email@ethereal.email', // Get from https://ethereal.email
  //       pass: 'your-test-password'
  //     }
  //   });
  // }
  
  // For production: use your actual email service
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Load email template
const loadTemplate = (templateName, data) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  const template = fs.readFileSync(templatePath, 'utf8');
  const compiledTemplate = handlebars.compile(template);
  return compiledTemplate(data);
};

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  const verificationUrl = `${process.env.BACKEND_URL}/api/v1/auth/verify-email/${token}`;
  
  const html = loadTemplate('verificationEmail', {
    name,
    verificationUrl,
    year: new Date().getFullYear()
  });
  
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: `"TrackIt" <${process.env.EMAIL_FROM || 'noreply@trackit.com'}>`,
    to: email,
    subject: 'Verify Your Email Address - TrackIt',
    html
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  const html = loadTemplate('passwordReset', {
    name,
    resetUrl,
    year: new Date().getFullYear()
  });
  
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: `"TrackIt" <${process.env.EMAIL_FROM || 'noreply@trackit.com'}>`,
    to: email,
    subject: 'Reset Your Password - TrackIt',
    html
  });
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  const html = loadTemplate('welcomeEmail', {
    name,
    year: new Date().getFullYear()
  });
  
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: `"TrackIt" <${process.env.EMAIL_FROM || 'noreply@trackit.com'}>`,
    to: email,
    subject: 'Welcome to TrackIt! 🎉',
    html
  });
};

// Send login alert email
const sendLoginAlertEmail = async (email, name, ip, device, time) => {
  const html = loadTemplate('loginAlert', {
    name,
    ip,
    device,
    time,
    year: new Date().getFullYear()
  });
  
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: `"TrackIt" <${process.env.EMAIL_FROM || 'noreply@trackit.com'}>`,
    to: email,
    subject: 'New Login to Your TrackIt Account',
    html
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail
};