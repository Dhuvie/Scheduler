import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;
let etherealCredentials: { user: string; pass: string; previewUrl?: string } | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  if (config.ethereal.user && config.ethereal.pass) {
    
    etherealCredentials = {
      user: config.ethereal.user,
      pass: config.ethereal.pass,
    };
    console.log(`[Mailer] Using configured Ethereal account: ${config.ethereal.user}`);
  } else {
    
    const testAccount = await nodemailer.createTestAccount();
    etherealCredentials = {
      user: testAccount.user,
      pass: testAccount.pass,
    };
    console.log('[Mailer] Created Ethereal test account:', testAccount.user);
    console.log('[Mailer] Test account pass:', testAccount.pass);
    console.log('[Mailer] View emails at: https://ethereal.email');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealCredentials.user,
      pass: etherealCredentials.pass,
    },
  });

  return transporter;
}

export interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string; previewUrl: string | false }> {
  const t = await getTransporter();
  const mailOptions: Mail.Options = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  const info = await t.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Mailer] Email sent to ${options.to}: messageId=${info.messageId}`);
  if (previewUrl) {
    console.log(`[Mailer] Preview URL: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}
