import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  Injectable, UnauthorizedException, BadRequestException,
  Controller, Post, Body, Get, Patch, UseGuards, Req, HttpCode, Module,
} from '@nestjs/common';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { ConfigService, ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportModule } from '@nestjs/passport';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.module';
 
// ── Auth Service ──────────────────────────────────────────────
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}
 
  async register(dto: {
    orgName: string; email: string; password: string;
    firstName: string; lastName: string; region: string;
  }) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');
 
    const passwordHash = await bcrypt.hash(dto.password, 12);
 
    // Create org first
    const org = await this.prisma.organization.create({
      data: { name: dto.orgName, region: dto.region || 'UAE' },
    });
 
    // Create admin user
    const user = await this.prisma.user.create({
      data: {
        organizationId: org.id,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'SUPER_ADMIN',
      },
    });
 
    return this.issueTokens(user, org);
  }
 
  async login(email: string, password: string, _orgSlug?: string) {
    // Find user by email (across any org)
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { employee: true, organization: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!(await bcrypt.compare(password, user.passwordHash)))
      throw new UnauthorizedException('Invalid credentials');
 
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user, user.organization);
  }
 
  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { employee: true, organization: true } } },
    });
    if (!stored || stored.expiresAt < new Date())
      throw new UnauthorizedException('Refresh token expired');
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user, stored.user.organization);
  }
 
  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { message: 'Logged out' };
  }
 
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    if (newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await (this.prisma.user as any).update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
    return { success: true };
  }
 
  async forgotPassword(email: string, orgId: string) {
    const user = await this.prisma.user.findFirst({ where: { email, organizationId: orgId } });
    if (!user) return { success: true }; // prevent email enumeration
    const crypto = require('crypto');
    const token  = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await (this.prisma.user as any).update({ where: { id: user.id }, data: { passwordResetToken: token, passwordResetExpiry: expiry } });
    const appUrl  = process.env.APP_URL || 'http://localhost:3000';
    const org     = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const orgName = org?.name || 'PayrollOS';
    const link    = appUrl + '/reset-password?token=' + token + '&email=' + encodeURIComponent(email);
    const html = [
      '<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e3e6">',
      '<div style="background:linear-gradient(135deg,#0a84ff,#0055cc);padding:32px;text-align:center;color:#fff">',
      '<div style="font-size:22px;font-weight:700;margin-bottom:6px">Reset your password</div>',
      '<div style="opacity:.8;font-size:14px">' + orgName + '</div>',
      '</div>',
      '<div style="padding:32px">',
      '<p style="color:#48484a;font-size:14px;margin-bottom:24px;line-height:1.6">We received a request to reset your password. This link expires in 1 hour.</p>',
      '<div style="text-align:center;margin-bottom:24px">',
      '<a href="' + link + '" style="display:inline-block;background:#0a84ff;color:#fff;font-size:14px;font-weight:600;padding:13px 32px;border-radius:10px;text-decoration:none">Reset password</a>',
      '</div>',
      '<div style="background:#f7f9fc;border-radius:9px;padding:14px 16px;font-size:12.5px;color:#6e6e73">If you did not request this, ignore this email. Your password will not change.</div>',
      '</div></div>',
    ].join('');
    const nodemailer = require('nodemailer');
    const smtpUser   = process.env.SMTP_USER;
    const smtpPass   = process.env.SMTP_PASS;
    if (smtpUser && smtpPass) {
      const t = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port: 587, auth: { user: smtpUser, pass: smtpPass } });
      await t.sendMail({ from: process.env.SMTP_FROM || smtpUser, to: email, subject: 'Reset your PayrollOS password', html }).catch((e: any) => console.error('[Reset email]', e.message));
    } else {
      console.log('[Password Reset] Link for', email, ':', link);
    }
    return { success: true };
  }
 
 
  async resetPassword(token: string, email: string, newPassword: string) {
    const user = await (this.prisma.user as any).findFirst({
      where: {
        email,
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    if (newPassword.length < 8) throw new BadRequestException('Password must be at least 8 characters');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await (this.prisma.user as any).update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null, mustChangePassword: false },
    });
    return { success: true };
  }
 
  // ── 2FA / TOTP ────────────────────────────────────────────
  async setup2FA(userId: string) {
    const speakeasy = require('speakeasy');
    const qrcode    = require('qrcode');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const secret = speakeasy.generateSecret({ name: 'PayrollOS (' + user?.email + ')', length: 20 });
    // Store temp secret
    await (this.prisma.user as any).update({ where: { id: userId }, data: { totpSecret: secret.base32 } });
    const qrUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { qrCode: qrUrl, secret: secret.base32 };
  }
 
  async verify2FA(userId: string, token: string, enable = false) {
    const speakeasy = require('speakeasy');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true } });
    if (!user?.totpSecret) throw new BadRequestException('2FA not set up. Go to Security settings first.');
    const valid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token, window: 1 });
    if (!valid) throw new UnauthorizedException('Invalid verification code. Try again.');
    if (enable) {
      await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: true } });
    }
    return { verified: true };
  }
 
  async disable2FA(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Incorrect password');
    await this.prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: false, totpSecret: null } });
    return { success: true };
  }
 
  async verifyPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Incorrect password');
    return { verified: true };
  }
 
  async updatePhoto(userId: string, photoUrl: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl } as any,
    }).catch(() => {});
    await this.prisma.employee.updateMany({
      where: { userId },
      data: { photoUrl },
    }).catch(() => {});
    return { success: true, photoUrl };
  }
 
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true, organization: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.employee
        ? `${user.employee.firstName} ${user.employee.lastName}`
        : `${user.firstName} ${user.lastName}`,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      region: user.organization?.region || 'UAE',
      photoUrl: (user as any).photoUrl || user.employee?.photoUrl || null,
    };
  }
 
  async createUser(data: {
    email: string; password: string; role: any;
    organizationId: string; firstName: string; lastName: string; employeeId?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const { password, ...rest } = data;
    return this.prisma.user.create({ data: { ...rest, passwordHash } });
  }
 
 
 
  private async issueTokens(user: any, org: any) {
    const payload = {
      sub: user.id, email: user.email, role: user.role,
      orgId: org.id, region: org.region || 'UAE',
    };
    const accessToken = this.jwt.sign(payload, {
      secret: this.cfg.get('JWT_SECRET'),
      expiresIn: this.cfg.get('JWT_EXPIRES_IN', '15m'),
    });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : `${user.firstName} ${user.lastName}`,
        role: user.role,
        organizationId: org.id,
        organizationName: org.name,
        region: org.region || 'UAE',
        photoUrl: (user as any).photoUrl || user.employee?.photoUrl || null,
      },
    };
  }
}
 
// ── Auth Controller ───────────────────────────────────────────
class RegisterDto {
  @IsString() orgName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() region: string;
}
class LoginDto   { @IsEmail() email: string; @IsString() @MinLength(6) password: string; @IsOptional() @IsString() orgSlug?: string; }
class RefreshDto { @IsString() refreshToken: string; }
class TwoFADto   { @IsString() token: string; }
 
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}
 
  @Post('register') @HttpCode(201)
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
 
  @Post('login') @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
 
  @Post('refresh') @HttpCode(200)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
 
  @Post('logout') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @HttpCode(200)
  logout(@Req() req: any) { return this.auth.logout(req.user.sub); }
 
  @Get('me') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @SkipThrottle()
  me(@Req() req: any) { return this.auth.me(req.user.sub); }
 
  @Post('verify-password') @UseGuards(JwtAuthGuard)
  verifyPassword(@Req() req: any, @Body() body: { password: string }) {
    return this.auth.verifyPassword(req.user.sub || req.user.id, body.password);
  }
 
  @Post('2fa/setup') @UseGuards(JwtAuthGuard)
  setup2FA(@Req() req: any) {
    return this.auth.setup2FA(req.user.sub || req.user.id);
  }
 
  @Post('2fa/verify') @UseGuards(JwtAuthGuard)
  verify2FA(@Req() req: any, @Body() body: { token: string; enable?: boolean }) {
    return this.auth.verify2FA(req.user.sub || req.user.id, body.token, body.enable);
  }
 
  @Post('2fa/disable') @UseGuards(JwtAuthGuard)
  disable2FA(@Req() req: any, @Body() body: { password: string }) {
    return this.auth.disable2FA(req.user.sub || req.user.id, body.password);
  }
 
  @Post('change-password') @UseGuards(JwtAuthGuard)
  changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.sub || req.user.id, body.currentPassword, body.newPassword);
  }
 
  @Post('forgot-password')
  @Throttle({ short: { ttl: 3600000, limit: 3 }, medium: { ttl: 3600000, limit: 3 } })
  forgotPassword(@Body() body: { email: string; orgId: string }) {
    return this.auth.forgotPassword(body.email, body.orgId);
  }
 
  @Post('reset-password')
  resetPassword(@Body() body: { token: string; email: string; newPassword: string }) {
    return this.auth.resetPassword(body.token, body.email, body.newPassword);
  }
 
  @Patch('me/photo') @ApiBearerAuth() @UseGuards(JwtAuthGuard)
  updatePhoto(@Req() req: any, @Body() body: { photoUrl: string }) {
    return this.auth.updatePhoto(req.user.sub || req.user.id, body.photoUrl);
  }
 
}
 
// ── JWT Strategy ──────────────────────────────────────────────
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.get('JWT_SECRET'),
    });
  }
  validate(payload: any) { return payload; }
}
 
// ── Auth Module ───────────────────────────────────────────────
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}