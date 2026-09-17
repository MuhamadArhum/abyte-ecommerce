import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RoleName } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: JwtService;
  let config: ConfigService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      role: { findUnique: jest.fn() },
      refreshToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') } as unknown as JwtService;
    config = {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          bcryptSaltRounds: 4,
          'jwt.accessSecret': 'test-secret',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return values[key];
      },
    } as unknown as ConfigService;
    service = new AuthService(prisma as PrismaService, jwt, config);
  });

  describe('register', () => {
    it('rejects registration with an already-used email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'taken@example.com' });
      await expect(
        service.register({ email: 'taken@example.com', password: 'Password1', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password before storing the user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUnique.mockResolvedValue({ id: 5, name: RoleName.CUSTOMER });
      prisma.user.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 1, email: data.email, role: { name: RoleName.CUSTOMER } }),
      );

      await service.register({ email: 'new@example.com', password: 'Password1', firstName: 'A', lastName: 'B' });

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.passwordHash).not.toBe('Password1');
      expect(await bcrypt.compare('Password1', createCall.data.passwordHash)).toBe(true);
    });
  });

  describe('login', () => {
    it('rejects an unknown email without revealing whether the account exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'nope@example.com', password: 'x' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an incorrect password and increments failed attempts', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword1', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
        role: { name: RoleName.CUSTOMER },
      });

      await expect(service.login({ email: 'user@example.com', password: 'WrongPassword' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 1 }) }),
      );
    });

    it('locks the account after 5 consecutive failed attempts', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword1', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash,
        status: 'ACTIVE',
        failedLoginAttempts: 4,
        lockedUntil: null,
        role: { name: RoleName.CUSTOMER },
      });

      await expect(service.login({ email: 'user@example.com', password: 'WrongPassword' }, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedLoginAttempts: 0, lockedUntil: expect.any(Date) }),
        }),
      );
    });

    it('rejects login while the account is locked', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash: 'irrelevant',
        status: 'ACTIVE',
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 60_000),
        role: { name: RoleName.CUSTOMER },
      });

      await expect(service.login({ email: 'user@example.com', password: 'whatever' }, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('issues an access and refresh token pair on successful login', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword1', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        passwordHash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
        lockedUntil: null,
        role: { name: RoleName.CUSTOMER },
      });

      const result = await service.login({ email: 'user@example.com', password: 'CorrectPassword1' }, {});
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(typeof result.refreshToken).toBe('string');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });
});
