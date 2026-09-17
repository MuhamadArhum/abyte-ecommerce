import { BadRequestException } from '@nestjs/common';
import { CouponType } from '@prisma/client';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CouponsService.validateAndCompute', () => {
  let service: CouponsService;
  let prisma: {
    coupon: { findUnique: jest.Mock };
    couponUsage: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      coupon: { findUnique: jest.fn() },
      couponUsage: { count: jest.fn() },
    };
    service = new CouponsService(prisma as unknown as PrismaService);
  });

  const baseCoupon = {
    id: 1,
    code: 'SAVE10',
    type: CouponType.PERCENTAGE,
    value: 10,
    active: true,
    minOrderAmount: null,
    maxDiscountAmount: null,
    usageLimit: null,
    usageCount: 0,
    perCustomerLimit: null,
    startsAt: null,
    expiresAt: null,
    productIds: null,
    categoryIds: null,
  };

  it('rejects an unknown coupon code', async () => {
    prisma.coupon.findUnique.mockResolvedValue(null);
    await expect(service.validateAndCompute('BOGUS', 1, 100, [], [])).rejects.toThrow(BadRequestException);
  });

  it('rejects an inactive coupon', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, active: false });
    await expect(service.validateAndCompute('SAVE10', 1, 100, [], [])).rejects.toThrow(BadRequestException);
  });

  it('rejects when the order is below the minimum amount', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, minOrderAmount: 50 });
    await expect(service.validateAndCompute('SAVE10', 1, 20, [], [])).rejects.toThrow(BadRequestException);
  });

  it('rejects when the coupon has reached its global usage limit', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, usageLimit: 5, usageCount: 5 });
    await expect(service.validateAndCompute('SAVE10', 1, 100, [], [])).rejects.toThrow(BadRequestException);
  });

  it('rejects when the customer has exhausted their personal usage limit', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, perCustomerLimit: 1 });
    prisma.couponUsage.count.mockResolvedValue(1);
    await expect(service.validateAndCompute('SAVE10', 1, 100, [], [])).rejects.toThrow(BadRequestException);
  });

  it('computes a percentage discount capped by maxDiscountAmount', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, value: 50, maxDiscountAmount: 20 });
    const { discount } = await service.validateAndCompute('SAVE10', 1, 100, [], []);
    expect(discount).toBe(20); // 50% of 100 = 50, capped at 20
  });

  it('never discounts more than the subtotal itself', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, type: CouponType.FIXED, value: 500 });
    const { discount } = await service.validateAndCompute('SAVE10', 1, 30, [], []);
    expect(discount).toBe(30);
  });

  it('rejects a coupon restricted to products not present in the cart', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, productIds: [999] });
    await expect(service.validateAndCompute('SAVE10', 1, 100, [1, 2], [])).rejects.toThrow(BadRequestException);
  });

  it('accepts a coupon restricted to a product present in the cart', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ ...baseCoupon, productIds: [2] });
    const { discount } = await service.validateAndCompute('SAVE10', 1, 100, [1, 2], []);
    expect(discount).toBe(10);
  });
});
