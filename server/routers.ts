import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  sync: router({
    uploadWorkDays: protectedProcedure
      .input(
        z.object({
          workDays: z.array(
            z.object({
              date: z.string(),
              dayType: z.enum([
                "workday",
                "weekend",
                "holiday",
                "vacation",
                "shortened_workday",
              ]),
              totalWorkedMs: z.number(),
              totalBreakMs: z.number(),
              totalTemporaryExitMs: z.number(),
              eventsJson: z.string(),
              version: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const results = [];
        for (const workDay of input.workDays) {
          const id = await db.upsertWorkDay({
            userId: ctx.user.id,
            ...workDay,
          });
          results.push(id);
        }

        // Log sync event
        await db.logSyncEvent({
          userId: ctx.user.id,
          action: "upload",
          status: "success",
        });

        return { success: true, count: results.length };
      }),

    downloadWorkDays: protectedProcedure
      .input(
        z.object({
          since: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const since = input.since ? new Date(input.since) : new Date(0);
        const workDays = await db.getUnsyncedWorkDays(ctx.user.id, since);

        return {
          workDays: workDays.map((day) => ({
            id: day.id,
            date: day.date,
            dayType: day.dayType,
            totalWorkedMs: day.totalWorkedMs,
            totalBreakMs: day.totalBreakMs,
            totalTemporaryExitMs: day.totalTemporaryExitMs,
            eventsJson: day.eventsJson,
            version: day.version,
            syncedAt: day.syncedAt,
            updatedAt: day.updatedAt,
          })),
        };
      }),

    getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
      const lastSyncTime = await db.getLastSyncTime(ctx.user.id);
      const syncHistory = await db.getUserSyncHistory(ctx.user.id, 10);

      return {
        lastSyncTime,
        syncHistory: syncHistory.map((log) => ({
          id: log.id,
          action: log.action,
          status: log.status,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
        })),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
