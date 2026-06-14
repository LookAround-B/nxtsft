import { router } from "./server.js";
import { authRouter } from "./routers/auth.js";
import { propertiesRouter } from "./routers/properties.js";
import { leadsRouter } from "./routers/leads.js";
import { usersRouter } from "./routers/users.js";
import { subscriptionsRouter } from "./routers/subscriptions.js";
import { adminRouter } from "./routers/admin.js";
import { ticketsRouter } from "./routers/tickets.js";
import { notificationsRouter } from "./routers/notifications.js";
import { siteVisitsRouter } from "./routers/siteVisits.js";
import { searchAlertsRouter } from "./routers/searchAlerts.js";
import { reviewsRouter } from "./routers/reviews.js";
import { superAdminRouter } from "./routers/superAdmin.js";
import { propertyViewsRouter } from "./routers/propertyViews.js";
import { buildersRouter } from "./routers/builders.js";

export const appRouter = router({
  auth: authRouter,
  properties: propertiesRouter,
  builders: buildersRouter,
  leads: leadsRouter,
  users: usersRouter,
  subscriptions: subscriptionsRouter,
  admin: adminRouter,
  tickets: ticketsRouter,
  notifications: notificationsRouter,
  siteVisits: siteVisitsRouter,
  searchAlerts: searchAlertsRouter,
  reviews: reviewsRouter,
  superAdmin: superAdminRouter,
  propertyViews: propertyViewsRouter,
});

export type AppRouter = typeof appRouter;
