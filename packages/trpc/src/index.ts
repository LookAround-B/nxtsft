import { router } from "./server";
import { authRouter } from "./routers/auth";
import { propertiesRouter } from "./routers/properties";
import { leadsRouter } from "./routers/leads";
import { usersRouter } from "./routers/users";
import { subscriptionsRouter } from "./routers/subscriptions";
import { adminRouter } from "./routers/admin";
import { ticketsRouter } from "./routers/tickets";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = router({
  auth: authRouter,
  properties: propertiesRouter,
  leads: leadsRouter,
  users: usersRouter,
  subscriptions: subscriptionsRouter,
  admin: adminRouter,
  tickets: ticketsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
