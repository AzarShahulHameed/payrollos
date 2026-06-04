import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any;

  constructor(private config: ConfigService) {
    const host = this.config.get('SMTP_HOST', 'smtp.gmail.com');
    const port = parseInt(this.config.get('SMTP_PORT', '587'), 10);
    const user = this.config.get('SMTP_USER', '');
    const pass = this.config.get('SMTP_PASS', '');
    const from = this.config.get('SMTP_FROM', 'PayrollOS <noreply@payrollos.com>');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      this.logger.log(`Email service ready (${host}:${port})`);
    } else {
      // Dev mode: log emails to console
      this.logger.warn('SMTP not configured — emails will be logged to console only');
      this.transporter = null;
    }
  }

  private get fromAddress() { return this.config.get('SMTP_FROM', 'PayrollOS <noreply@payrollos.com>'); }

  async send(to: string, subject: string, html: string, attachments: any[] = []) {
    if (!this.transporter) {
      this.logger.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
      return { messageId: 'dev-mode', simulated: true };
    }
    try {
      const info = await this.transporter.sendMail({ from: this.fromAddress, to, subject, html, attachments });
      this.logger.log(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (e: any) {
      this.logger.error(`Email failed to ${to}: ${e.message}`);
      throw e;
    }
  }

  // ── Payslip released notification ──────────────────────────────
  async sendPayslipReady(emp: any, payrun: any, orgName: string) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const period = `${MONTHS[(payrun.month||1)-1]} ${payrun.year}`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e3e3e6">
        <div style="background:linear-gradient(135deg,#0a84ff,#0066cc);padding:28px 32px;color:#fff">
          <div style="font-size:22px;font-weight:700">Your payslip is ready</div>
          <div style="opacity:.8;margin-top:6px">${orgName} · ${period}</div>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#48484a;font-size:15px">Hi ${emp.firstName},</p>
          <p style="color:#48484a;font-size:14px;margin-top:12px;line-height:1.6">
            Your payslip for <strong>${period}</strong> has been processed and is now available.
            Log in to the employee portal to view and download your payslip.
          </p>
          <div style="margin-top:24px;background:#f7f9fc;border-radius:10px;padding:18px 20px">
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e3e3e6">
              <span style="color:#6e6e73;font-size:13px">Pay period</span>
              <strong style="font-size:13px">${period}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 0">
              <span style="color:#6e6e73;font-size:13px">Employee ID</span>
              <strong style="font-size:13px">${emp.employeeCode}</strong>
            </div>
          </div>
          <div style="margin-top:28px;text-align:center">
            <a href="${this.config.get('APP_URL','http://localhost:3000')}/ess/payslips" 
               style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-weight:600;font-size:14px">
              View payslip →
            </a>
          </div>
        </div>
        <div style="padding:16px 32px;background:#f7f9fc;color:#a1a1a6;font-size:12px;text-align:center">
          This is an automated email from ${orgName}'s payroll system.
        </div>
      </div>`;
    return this.send(emp.email, `Payslip for ${period} — ${orgName}`, html);
  }

  // ── Leave approved / rejected ───────────────────────────────────
  async sendLeaveUpdate(emp: any, leave: any, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const icon   = status === 'APPROVED' ? '✅' : '❌';
    const color  = status === 'APPROVED' ? '#28a745' : '#d83933';
    const from   = new Date(leave.startDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const to     = new Date(leave.endDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e3e3e6">
        <div style="background:${color};padding:24px 32px;color:#fff">
          <div style="font-size:20px;font-weight:700">${icon} Leave ${status.toLowerCase()}</div>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#48484a">Hi ${emp.firstName},</p>
          <p style="color:#48484a;line-height:1.6;margin-top:12px">
            Your <strong>${leave.leaveType?.replace('_',' ')}</strong> request from <strong>${from}</strong> to <strong>${to}</strong> (${leave.days} day${leave.days>1?'s':''}) has been <strong style="color:${color}">${status.toLowerCase()}</strong>.
            ${reason ? `<br><br>Reason: ${reason}` : ''}
          </p>
        </div>
      </div>`;
    return this.send(emp.email, `Leave request ${status.toLowerCase()} — ${leave.leaveType}`, html);
  }

  // ── Loan approved ───────────────────────────────────────────────
  async sendLoanApproved(emp: any, loan: any, currency: string) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e3e3e6">
        <div style="background:#28a745;padding:24px 32px;color:#fff">
          <div style="font-size:20px;font-weight:700">✅ Loan approved</div>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#48484a">Hi ${emp.firstName},</p>
          <p style="color:#48484a;line-height:1.6;margin-top:12px">
            Your loan of <strong>${currency} ${loan.amount?.toLocaleString()}</strong> has been approved.
            Monthly EMI of <strong>${currency} ${Math.round(loan.amount/loan.installments).toLocaleString()}</strong> will be deducted over <strong>${loan.installments} months</strong>.
          </p>
        </div>
      </div>`;
    return this.send(emp.email, `Loan approved — ${currency} ${loan.amount?.toLocaleString()}`, html);
  }

  // ── Payrun deadline reminder ────────────────────────────────────
  async sendPayrunReminder(adminEmail: string, orgName: string, period: string, daysLeft: number) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e3e3e6">
        <div style="background:#ff9500;padding:24px 32px;color:#fff">
          <div style="font-size:20px;font-weight:700">⚠️ Payrun reminder</div>
          <div style="opacity:.85;margin-top:6px">${orgName} · ${period}</div>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#48484a;line-height:1.6">
            The payrun for <strong>${period}</strong> is due in <strong>${daysLeft} day${daysLeft!==1?'s':''}</strong>.
            Please process and approve the payrun before the pay date.
          </p>
          <div style="margin-top:24px;text-align:center">
            <a href="${this.config.get('APP_URL','http://localhost:3000')}/payrun"
               style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:9px;font-weight:600;font-size:14px">
              Open payrun →
            </a>
          </div>
        </div>
      </div>`;
    return this.send(adminEmail, `Payrun reminder: ${period} due in ${daysLeft} days — ${orgName}`, html);
  }

  // ── Reimbursement update ────────────────────────────────────────
  async sendReimbursementUpdate(emp: any, reimb: any, status: string, currency: string) {
    const color = status === 'APPROVED' ? '#28a745' : '#d83933';
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e3e3e6">
        <div style="background:${color};padding:24px 32px;color:#fff">
          <div style="font-size:20px;font-weight:700">${status === 'APPROVED'?'✅':'❌'} Reimbursement ${status.toLowerCase()}</div>
        </div>
        <div style="padding:28px 32px">
          <p style="color:#48484a">Hi ${emp.firstName},</p>
          <p style="color:#48484a;line-height:1.6;margin-top:12px">
            Your reimbursement request of <strong>${currency} ${reimb.amount?.toLocaleString()}</strong> (${reimb.category}) has been <strong style="color:${color}">${status.toLowerCase()}</strong>.
            ${status === 'APPROVED' ? `It will be added to your next month's payslip.` : reimb.rejectionReason ? `Reason: ${reimb.rejectionReason}` : ''}
          </p>
        </div>
      </div>`;
    return this.send(emp.email, `Reimbursement ${status.toLowerCase()} — ${currency} ${reimb.amount?.toLocaleString()}`, html);
  }

  // ── Welcome email — Bayzat/Darwinbox style ─────────────────────
  async sendWelcome({ firstName, email, orgName, tempPassword, loginUrl }: {
    firstName: string; email: string; orgName: string; tempPassword: string; loginUrl: string;
  }) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:580px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0a84ff,#0055cc);padding:36px 40px;text-align:center">
          <div style="width:52px;height:52px;background:rgba(255,255,255,.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
            <span style="font-size:24px;font-weight:800;color:#fff">P</span>
          </div>
          <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:6px">Welcome to PayrollOS</div>
          <div style="font-size:14px;color:rgba(255,255,255,.8)">${orgName}</div>
        </div>
        <!-- Body -->
        <div style="padding:36px 40px">
          <p style="font-size:16px;font-weight:600;color:#1d1d1f;margin:0 0 8px">Hi ${firstName},</p>
          <p style="font-size:14px;color:#48484a;line-height:1.7;margin:0 0 24px">
            Your account has been created. You can now access the employee portal to view your payslips,
            apply for leave, submit loan requests, and manage your profile.
          </p>

          <!-- Credentials card -->
          <div style="background:#f7f9fc;border:1px solid #e3e3e6;border-radius:10px;padding:20px 24px;margin-bottom:24px">
            <div style="font-size:11px;font-weight:700;color:#a1a1a6;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Your login details</div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e3e3e6">
              <span style="font-size:13px;color:#6e6e73">Email address</span>
              <span style="font-size:13px;font-weight:600;color:#1d1d1f">${email}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0">
              <span style="font-size:13px;color:#6e6e73">Temporary password</span>
              <span style="font-size:14px;font-weight:700;color:#1d1d1f;font-family:monospace;letter-spacing:.04em;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e3e3e6">${tempPassword}</span>
            </div>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:24px">
            <a href="${loginUrl}" style="display:inline-block;background:#0a84ff;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">
              Log in to employee portal →
            </a>
          </div>

          <!-- Security note -->
          <div style="background:#fdf3e0;border:1px solid rgba(199,119,0,.2);border-radius:9px;padding:14px 16px">
            <p style="font-size:12.5px;color:#c77700;margin:0;line-height:1.6">
              <strong>Security:</strong> You will be prompted to change your password on first login.
              Never share your password with anyone, including IT or HR staff.
            </p>
          </div>
        </div>
        <!-- Footer -->
        <div style="padding:20px 40px;border-top:1px solid #f0f0f5;background:#fafafa;text-align:center">
          <p style="font-size:12px;color:#a1a1a6;margin:0">
            This email was sent by ${orgName} via PayrollOS. If you did not expect this, please contact your HR department.
          </p>
        </div>
      </div>
    `;
    return this.send(email, `Welcome to ${orgName} — Your account is ready`, html);
  }

}
