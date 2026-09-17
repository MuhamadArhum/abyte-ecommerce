import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private get saltRounds(): number {
    return this.config.get<number>('bcryptSaltRounds') ?? 12;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const customerRole = await this.prisma.role.findUnique({ where: { name: RoleName.CUSTOMER } });
    if (!customerRole) {
      throw new BadRequestException('Default customer role is not configured. Run the database seed.');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roleId: customerRole.id,
        cart: { create: {} },
        wishlist: { create: {} },
      },
      include: { role: true },
    });

    return this.issueTokens(user.id, user.email, user.role.name);
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account temporarily locked due to too many failed login attempts');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.issueTokens(user.id, user.email, user.role.name, meta);
  }

  async refresh(rawRefreshToken: string, meta: { ip?: string; userAgent?: string }) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const matched = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: { include: { role: true } } },
    });

    if (!matched) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: revoke the used token immediately
    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revoked: true },
    });

    return this.issueTokens(matched.user.id, matched.user.email, matched.user.role.name, meta);
  }

  async logout(userId: number, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashRefreshToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revoked: false },
        data: { revoked: true },
      });
    }
    return { loggedOut: true };
  }

  async logoutAll(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
    return { loggedOut: true };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.logoutAll(userId);
    return { changed: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always respond the same way to avoid user enumeration
    if (!user) return { sent: true };

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // In production this token would be emailed to the user rather than returned.
    return { sent: true, devToken: process.env.NODE_ENV !== 'production' ? token : undefined };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: tokenHash, passwordResetExpires: { gt: new Date() } },
    });
    if (!user) {
      throw new BadRequestException('Password reset token is invalid or has expired');
    }
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Proving ownership via the emailed reset token is at least as strong
        // as a correct login, so a reset must also clear any lockout —
        // otherwise a user who reset their password stays locked out for the
        // full lockout duration despite now having the correct credentials.
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.logoutAll(user.id);
    return { reset: true };
  }

  private async issueTokens(
    userId: number,
    email: string,
    role: string,
    meta: { ip?: string; userAgent?: string } = {},
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const expiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';
    const expiresAt = new Date(Date.now() + this.parseDurationMs(expiresIn));

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashRefreshToken(rawToken: string): string {
    const secret = this.config.get<string>('jwt.refreshSecret') ?? 'fallback-refresh-secret';
    return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
  }
}
