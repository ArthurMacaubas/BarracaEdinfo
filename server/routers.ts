import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { confirmPixPayment, createOrder, createOrUpdateProduct, deleteSponsor, getConfiguredSirenDuration, getOperationalSnapshot, listAvailableProducts, listOrderHistory, listPendingPixPayments, MAX_SIREN_DURATION_MS, PAYMENT_METHODS, recordEvent, reorderSponsors, resetSalesGoalCycle, saveSetting, saveSponsor, saveUnitGoal, setUnitGoalConcurrency, setUnitGoalStatus } from "./operations";

export const appRouter = router({
  system: systemRouter,
  operations: router({
    snapshot: publicProcedure.query(() => getOperationalSnapshot()),
    products: publicProcedure.query(() => listAvailableProducts()),
    createOrder: publicProcedure.input(z.object({ requestKey: z.string().min(8).max(100), paymentMethod: z.enum(PAYMENT_METHODS), note: z.string().max(500).optional(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1) })).mutation(({ input }) => createOrder(input)),
    pendingPixPayments: publicProcedure.query(() => listPendingPixPayments()),
    orderHistory: publicProcedure.query(() => listOrderHistory()),
    confirmPixPayment: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(({ input }) => confirmPixPayment(input.orderId)),
    saveProduct: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), description: z.string().max(500).optional(), category: z.string().min(1).max(60), price: z.number().min(0).max(9999), available: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional() })).mutation(({ input }) => createOrUpdateProduct(input)),
    saveSetting: publicProcedure.input(z.object({ key: z.string().min(1).max(80), value: z.string().max(3_000) })).mutation(({ input }) => saveSetting(input.key, input.value)),
    resetSalesGoalCycle: publicProcedure.mutation(() => resetSalesGoalCycle()),
    saveUnitGoal: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), targetUnits: z.number().int().min(1).max(100_000), message: z.string().min(1).max(500), priority: z.number().int().min(0).max(999), productIds: z.array(z.number().int().positive()).min(1).max(100) })).mutation(({ input }) => saveUnitGoal(input)),
    setUnitGoalStatus: publicProcedure.input(z.object({ goalId: z.number().int().positive(), status: z.enum(["QUEUED", "PAUSED"]) })).mutation(({ input }) => setUnitGoalStatus(input.goalId, input.status)),
    setUnitGoalConcurrency: publicProcedure.input(z.object({ value: z.number().int().min(1).max(10) })).mutation(({ input }) => setUnitGoalConcurrency(input.value)),
    saveSponsor: publicProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(120), imageUrl: z.string().max(2_000).optional(), imageData: z.string().max(3_600_000).optional(), backgroundColor: z.string().regex(/^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/).optional(), enabled: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional() })).mutation(({ input }) => saveSponsor(input)),
    reorderSponsors: publicProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(300) })).mutation(({ input }) => reorderSponsors(input.ids)),
    deleteSponsor: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteSponsor(input.id)),
  }),
  connectivity: router({
    status: publicProcedure.query(async () => { const database = Boolean(await getDb()); return { database: database ? "ONLINE" : "OFFLINE", hardware: hardwareController.getSnapshot(), serverTime: new Date() }; }),
    connectHardware: publicProcedure.mutation(async () => { await hardwareController.connect(); return hardwareController.getSnapshot(); }),
    disconnectHardware: publicProcedure.mutation(async () => { await hardwareController.disconnect(); return hardwareController.getSnapshot(); }),
    testHardware: publicProcedure.mutation(async () => { const durationMs = await getConfiguredSirenDuration(); const accepted = hardwareController.triggerAlert(`manual-test-${Date.now()}`, durationMs); await recordEvent("HARDWARE_TEST_REQUESTED", "HARDWARE", undefined, { durationMs, ...accepted }); return { accepted, snapshot: hardwareController.getSnapshot() }; }),
    setLedRelay: publicProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ input }) => { const accepted = input.enabled ? hardwareController.turnLedOn(`manual-led-on-${Date.now()}`) : hardwareController.turnLedOff(`manual-led-off-${Date.now()}`); await recordEvent("LED_RELAY_REQUESTED", "HARDWARE", undefined, { enabled: input.enabled, ...accepted }); return { accepted, snapshot: hardwareController.getSnapshot() }; }),
    setSirenRelay: publicProcedure.input(z.object({ enabled: z.boolean(), durationMs: z.number().int().min(300).max(MAX_SIREN_DURATION_MS).optional() })).mutation(async ({ input }) => { const durationMs = input.durationMs ?? await getConfiguredSirenDuration(); const accepted = input.enabled ? hardwareController.turnSirenOn(`manual-siren-on-${Date.now()}`, durationMs) : hardwareController.turnSirenOff(`manual-siren-off-${Date.now()}`); await recordEvent("SIREN_RELAY_REQUESTED", "HARDWARE", undefined, { enabled: input.enabled, durationMs, ...accepted }); return { accepted, snapshot: hardwareController.getSnapshot() }; }),
  }),
});

export type AppRouter = typeof appRouter;
