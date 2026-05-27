import { router, publicProcedure, protectedProcedure, adminProcedure } from './trpc';
import { z } from 'zod';

export const appRouter = router({
  getMe: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
  
  // Trades
  getTrades: protectedProcedure.query(async ({ ctx }) => {
    // In a real app, we'd fetch from Firestore here
    return [];
  }),

  placeTrade: protectedProcedure
    .input(z.object({
      asset: z.string(),
      direction: z.enum(['up', 'down']),
      duration: z.number(),
      amount: z.number(),
      priceAtEntry: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const returnRates: Record<number, number> = {
        60: 0.4,
        120: 0.5,
        170: 0.7,
        300: 1.0,
      };
      
      const trade = {
        id: Math.random().toString(36).substring(7),
        userId: ctx.user.uid,
        ...input,
        returnRate: returnRates[input.duration] || 0.4,
        timestamp: new Date().toISOString(),
        endTime: new Date(Date.now() + input.duration * 1000).toISOString(),
        status: 'pending' as const,
      };
      
      // Save trade to Firestore
      return trade;
    }),

  // Admin
  getAllUsers: adminProcedure.query(async () => {
    return [];
  }),
  
  getAllPendingDeposits: adminProcedure.query(async () => {
    return [];
  }),

  reviewDeposit: adminProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['approved', 'rejected']),
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),
});

export type AppRouter = typeof appRouter;
