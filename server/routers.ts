import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { confirmPixPayment, createOrder, createOrUpdateProduct, getOperationalSnapshot, listAvailableProducts, listPendingPixPayments, PAYMENT_METHODS, recordEvent, reorderSponsors, resetSalesGoalCycle, saveSetting, saveSponsor, saveUnitGoal, setUnitGoalConcurrency, setUnitGoalStatus } from "./operations";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  operations: router({
    snapshot: publicProcedure.query(() => getOperationalSnapshot()),
    products: publicProcedure.query(() => listAvailableProducts()),
    createOrder: publicProcedure.input(z.object({ requestKey: z.string().min(8).max(100), paymentMethod: z.enum(PAYMENT_METHODS), note: z.string().max(500).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1) })).mutation(({ input }) => createOrder(input)),
    pendingPixPayments: publicProcedure.query(() => listPendingPixPayments()),
    confirmPixPayment: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(({ input }) => confirmPixPayment(input.orderId)),
    saveProduct: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), description: z.string().max(500).optional(), category: z.string().min(1).max(60), price: z.number().min(0).max(9999), available: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional() })).mutation(({ input }) => createOrUpdateProduct(input)),
    saveSetting: publicProcedure.input(z.object({ key: z.string().min(1).max(80), value: z.string().max(3_000) })).mutation(({ input }) => saveSetting(input.key, input.value)),
    resetSalesGoalCycle: publicProcedure.mutation(() => resetSalesGoalCycle()),
    saveUnitGoal: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), targetUnits: z.number().int().min(1).max(100_000), message: z.string().min(1).max(500), priority: z.number().int().min(0).max(999), productIds: z.array(z.number().int().positive()).min(1).max(100) })).mutation(({ input }) => saveUnitGoal(input)),
    setUnitGoalStatus: publicProcedure.input(z.object({ goalId: z.number().int().positive(), status: z.enum(["QUEUED", "PAUSED"]) })).mutation(({ input }) => setUnitGoalStatus(input.goalId, input.status)),
    setUnitGoalConcurrency: publicProcedure.input(z.object({ value: z.number().int().min(1).max(10) })).mutation(({ input }) => setUnitGoalConcurrency(input.value)),
    saveSponsor: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), imageUrl: z.string().max(2_000).optional(), imageData: z.string().max(3_600_000).optional(), backgroundColor: z.string().regex(/^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/).optional(), enabled: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional() })).mutation(({ input }) => saveSponsor(input)),
    reorderSponsors: publicProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(300) })).mutation(({ input }) => reorderSponsors(input.ids)),
  }),
  connectivity: router({
    status: publicProcedure.query(async () => { const database = Boolean(await getDb()); return { database: database ? "ONLINE" : "OFFLINE", hardware: hardwareController.getSnapshot(), serverTime: new Date() }; }),
    connectHardware: publicProcedure.mutation(async () => { await hardwareController.connect(); return hardwareController.getSnapshot(); }),
    disconnectHardware: publicProcedure.mutation(async () => { await hardwareController.disconnect(); return hardwareController.getSnapshot(); }),
    testHardware: publicProcedure.mutation(async () => { const accepted = hardwareController.triggerAlert(`manual-test-${Date.now()}`, 700); await recordEvent("HARDWARE_TEST_REQUESTED", "HARDWARE", undefined, accepted); return { accepted, snapshot: hardwareController.getSnapshot() }; }),
  }),
});

export type AppRouter = typeof appRouter;
