import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryTransactionType } from '@prisma/client';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(() => {
    const tx = {
      inventory: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      inventoryTransaction: { create: jest.fn() },
    };
    prisma = {
      inventory: { findUnique: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(tx)),
      _tx: tx,
    };
    service = new InventoryService(prisma as PrismaService);
  });

  it('throws if the product has no inventory record', async () => {
    prisma._tx.inventory.findUnique.mockResolvedValue(null);
    await expect(service.adjustStock(1, 10, InventoryTransactionType.RESTOCK, undefined, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an adjustment that would push stock negative', async () => {
    prisma._tx.inventory.findUnique.mockResolvedValue({ productId: 1, quantity: 5 });
    await expect(service.adjustStock(1, -10, InventoryTransactionType.ADJUSTMENT, undefined, 1)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('allows an adjustment that keeps stock at or above zero and logs a transaction', async () => {
    prisma._tx.inventory.findUnique.mockResolvedValue({ productId: 1, quantity: 5 });
    prisma._tx.inventory.update.mockResolvedValue({ productId: 1, quantity: 15 });

    const result = await service.adjustStock(1, 10, InventoryTransactionType.RESTOCK, 'restock', 1);

    expect(result.quantity).toBe(15);
    expect(prisma._tx.inventoryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 1, quantity: 10 }) }),
    );
  });

  describe('reserveStockTx', () => {
    it('throws when the conditional decrement affects zero rows (insufficient stock)', async () => {
      const tx = {
        inventory: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
        inventoryTransaction: { create: jest.fn() },
      };
      await expect(service.reserveStockTx(tx as any, [{ productId: 1, quantity: 5 }])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('decrements stock and logs a SALE transaction for each item on success', async () => {
      const tx = {
        inventory: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        inventoryTransaction: { create: jest.fn() },
      };
      await service.reserveStockTx(tx as any, [{ productId: 1, quantity: 2 }]);
      expect(tx.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ productId: 1, quantity: -2, type: InventoryTransactionType.SALE }),
        }),
      );
    });
  });
});
