import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { hardwareController } from "./hardware";
import { createOrder, createOrUpdateProduct, getOperationalSnapshot, listAvailableProducts, ORDER_STATUSES, PAYMENT_METHODS, recordEvent, saveSetting, updateOrderStatus } from "./operations";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  operations: router({
    snapshot: publicProcedure.query(() => getOperationalSnapshot()),
    products: publicProcedure.query(() => listAvailableProducts()),
    createOrder: publicProcedure.input(z.object({
      requestKey: z.string().min(8).max(100),
      paymentMethod: z.enum(PAYMENT_METHODS),
      note: z.string().max(500).optional(),
      items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1),
    })).mutation(({ input }) => createOrder(input)),
    changeStatus: publicProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(ORDER_STATUSES) })).mutation(async ({ input }) => {
      const order = await updateOrderStatus(input.id, input.status);
      if (input.status === "READY") {
        hardwareController.triggerAlert(`ready-${order.id}`, 900);
        await recordEvent("HARDWARE_ALERT_QUEUED", "ORDER", order.id, { ticket: order.ticket });
      }
      return order;
    }),
    saveProduct: publicProcedure.input(z.object({
      id: z.number().int().positive().optional(), name: z.string().min(1).max(120), description: z.string().max(500).optional(), category: z.string().min(1).max(60), price: z.number().min(0).max(9999), available: z.boolean(), sortOrder: z.number().int().min(0).max(999).optional(),
    })).mutation(({ input }) => createOrUpdateProduct(input)),
    saveSetting: publicProcedure.input(z.object({ key: z.string().min(1).max(80), value: z.string().max(500) })).mutation(({ input }) => saveSetting(input.key, input.value)),
  }),
  connectivity: router({
    status: publicProcedure.query(async () => {
      const database = Boolean(await getDb());
      return { database: database ? "ONLINE" : "OFFLINE", hardware: hardwareController.getSnapshot(), serverTime: new Date() };
    }),
    connectHardware: publicProcedure.mutation(async () => { await hardwareController.connect(); return hardwareController.getSnapshot(); }),
    disconnectHardware: publicProcedure.mutation(async () => { await hardwareController.disconnect(); return hardwareController.getSnapshot(); }),
    testHardware: publicProcedure.mutation(async () => {
      const accepted = hardwareController.triggerAlert(`manual-test-${Date.now()}`, 700);
      await recordEvent("HARDWARE_TEST_REQUESTED", "HARDWARE", undefined, accepted);
      return { accepted, snapshot: hardwareController.getSnapshot() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
