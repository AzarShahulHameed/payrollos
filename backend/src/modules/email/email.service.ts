import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
 
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;
  private readonly useResend: boolean;
 
  constructor(private config: ConfigService) {
    this.apiKey = this.config.get('SMTP_PASS', '');
    this.from   = this.config.get('SMTP_FROM', 'PayrollOS <onboarding@resend.dev>');
    // Use Resend HTTP API if host is smtp.resend.com or RESEND_API_KEY is set
    const host  = this.config.get('SMTP_HOST', '');
    this.useResend = host.includes('resend') || this.apiKey.startsWith('re_');
    if (this.useResend && this.apiKey) {
      this.logger.log('Email service ready (Resend HTTP API)');
    } else if (this.apiKey) {
      this.logger.log(`Email service ready (SMTP: ${host})`);
    } else {
      this.logger.warn('Email not configured — emails logged to console only');
    }
  }
 
  async send(to: string, subject: string, html: string, attachments: any[] = []) {
    if (!this.apiKey) {
      this.logger.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
      return { messageId: 'dev-mode', simulated: true };
    }
 
    // ── Resend HTTP API (works on Render free tier) ─────────
    if (this.useResend) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from: this.from, to, subject, html }),
        });
 
        if (!res.ok) {
          const err = await res.text();
          this.logger.error(`Resend API error to ${to}: ${res.status} ${err}`);
          throw new Error(`Resend API ${res.status}: ${err}`);
        }
 
        const data: any = await res.json();
        this.logger.log(`Email sent via Resend to ${to}: ${data.id}`);
        return { messageId: data.id };
      } catch (e: any) {
        this.logger.error(`Email failed to ${to}: ${e.message}`);
        throw e;
      }
    }
 
    // ── Fallback: SMTP via nodemailer ────────────────────────
    const nodemailer = require('nodemailer');
    const host = this.config.get('SMTP_HOST', 'smtp.gmail.com');
    const port = parseInt(this.config.get('SMTP_PORT', '587'), 10);
    const user = this.config.get('SMTP_USER', '');
 
    try {
      const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass: this.apiKey } });
      const info = await t.sendMail({ from: this.from, to, subject, html, attachments });
      this.logger.log(`Email sent via SMTP to ${to}: ${info.messageId}`);
      return info;
    } catch (e: any) {
      this.logger.error(`Email failed to ${to}: ${e.message}`);
      throw e;
    }
  }
 
  // ── Convenience methods ───────────────────────────────────
  async sendWelcome(params: { firstName: string; email: string; orgName: string; tempPassword: string; loginUrl: string }) {
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6">
        <div style="background:linear-gradient(135deg,#0a84ff,#0055cc);padding:32px;text-align:center;color:#fff">
          <div style="font-size:22px;font-weight:700;margin-bottom:6px">Welcome to PayrollOS</div>
          <div style="opacity:.8;font-size:14px">${params.orgName}</div>
        </div>
        <div style="padding:32px">
          <p style="color:#48484a;font-size:14px;margin-bottom:16px;line-height:1.6">Hi ${params.firstName}, your account has been created.</p>
          <div style="background:#f7f9fc;border-radius:9px;padding:16px;margin-bottom:24px">
            <div style="font-size:12px;color:#6e6e73;margin-bottom:4px">EMAIL</div>
            <div style="font-size:14px;font-weight:600;color:#1d1d1f">${params.email}</div>
            <div style="font-size:12px;color:#6e6e73;margin-top:12px;margin-bottom:4px">TEMPORARY PASSWORD</div>
            <div style="font-size:16px;font-weight:700;color:#0a84ff;font-family:monospace">${params.tempPassword}</div>
          </div>
          <p style="color:#6e6e73;font-size:13px;margin-bottom:24px">You will be asked to change your password on first login.</p>
          <div style="text-align:center">
            <a href="${params.loginUrl}" style="display:inline-block;background:#0a84ff;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">Sign in to PayrollOS</a>
          </div>
        </div>
      </div>`;
    return this.send(params.email, `Welcome to ${params.orgName} — PayrollOS`, html);
  }
 
  async sendPayslipReady(employee: any, payrun: any, orgName: string) {
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6">
        <div style="background:linear-gradient(135deg,#28a745,#1e7e34);padding:32px;text-align:center;color:#fff">
          <div style="font-size:22px;font-weight:700;margin-bottom:6px">Your payslip is ready</div>
          <div style="opacity:.8;font-size:14px">${orgName}</div>
        </div>
        <div style="padding:32px">
          <p style="color:#48484a;font-size:14px;line-height:1.6;margin-bottom:24px">
            Hi ${employee.firstName}, your payslip for <strong>${payrun.name || `${payrun.month}/${payrun.year}`}</strong> is now available.
          </p>
          <div style="text-align:center">
            <a href="${this.config.get('APP_URL', 'http://localhost:3000')}/ess/payslips" style="display:inline-block;background:#28a745;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">View payslip</a>
          </div>
        </div>
      </div>`;
    return this.send(employee.email, `Your payslip is ready — ${orgName}`, html);
  }
 
  async sendPasswordReset(to: string, resetLink: string, orgName: string) {
    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6">
        <div style="background:linear-gradient(135deg,#0a84ff,#0055cc);padding:32px;text-align:center;color:#fff">
          <div style="font-size:22px;font-weight:700;margin-bottom:6px">Reset your password</div>
          <div style="opacity:.8;font-size:14px">${orgName}</div>
        </div>
        <div style="padding:32px">
          <p style="color:#48484a;font-size:14px;margin-bottom:24px;line-height:1.6">Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${resetLink}" style="display:inline-block;background:#0a84ff;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">Reset password</a>
          </div>
          <div style="background:#f7f9fc;border-radius:9px;padding:14px 16px;font-size:12.5px;color:#6e6e73">If you did not request this, ignore this email.</div>
        </div>
      </div>`;
    return this.send(to, 'Reset your PayrollOS password', html);
  }
 
  async sendPayrunReminder(to: string, orgName: string, period: string, daysLeft: number) {
    const appUrl = this.config.get('APP_URL', 'http://localhost:3000');
    const subject = 'Payrun reminder: ' + period + ' — ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + ' left';
    const html = '<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6">'
      + '<div style="background:linear-gradient(135deg,#ff9500,#c77700);padding:32px;text-align:center;color:#fff">'
      + '<div style="font-size:22px;font-weight:700;margin-bottom:6px">Payrun reminder</div>'
      + '<div style="opacity:.8;font-size:14px">' + orgName + '</div></div>'
      + '<div style="padding:32px">'
      + '<p style="color:#48484a;font-size:14px;line-height:1.6;margin-bottom:24px">The payrun for <strong>' + period + '</strong> is due in <strong>' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</strong>. Please process it before the pay date.</p>'
      + '<div style="text-align:center">'
      + '<a href="' + appUrl + '/payrun" style="display:inline-block;background:#ff9500;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">Go to Payrun</a>'
      + '</div></div></div>';
    return this.send(to, subject, html);
  }
 
}