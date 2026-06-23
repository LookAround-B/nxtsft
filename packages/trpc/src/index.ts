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
import { supervisorRouter } from "./routers/supervisor.js";
import { propertyViewsRouter } from "./routers/propertyViews.js";
import { buildersRouter } from "./routers/builders.js";
import { listingsRouter } from "./routers/listings.js";
import { mediaRouter } from "./routers/media.js";
import { campaignsRouter } from "./routers/campaigns.js";
import { contactRouter } from "./routers/contact.js";

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
  supervisor: supervisorRouter,
  propertyViews: propertyViewsRouter,
  listings: listingsRouter,
  media: mediaRouter,
  campaigns: campaignsRouter,
  contact: contactRouter,
});

export type AppRouter = typeof appRouter;
