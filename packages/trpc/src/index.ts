import { router } from "./server";
import { authRouter } from "./routers/auth";
import { propertiesRouter } from "./routers/properties";
import { leadsRouter } from "./routers/leads";
import { usersRouter } from "./routers/users";
import { subscriptionsRouter } from "./routers/subscriptions";
import { adminRouter } from "./routers/admin";
import { ticketsRouter } from "./routers/tickets";
import { notificationsRouter } from "./routers/notifications";
import { siteVisitsRouter } from "./routers/siteVisits";
import { searchAlertsRouter } from "./routers/searchAlerts";
import { reviewsRouter } from "./routers/reviews";
import { superAdminRouter } from "./routers/superAdmin";
import { supervisorRouter } from "./routers/supervisor";
import { propertyViewsRouter } from "./routers/propertyViews";
import { buildersRouter } from "./routers/builders";
import { listingsRouter } from "./routers/listings";
import { mediaRouter } from "./routers/media";
import { campaignsRouter } from "./routers/campaigns";
import { contactRouter } from "./routers/contact";
import { siteContentRouter } from "./routers/siteContent";
import { reportsRouter } from "./routers/reports";
import { projectsRouter } from "./routers/projects";
import { interiorDesignersRouter } from "./routers/interiorDesigners";
import { decorStoresRouter } from "./routers/decorStores";
import { referralsRouter } from "./routers/referrals";
import { socialRouter } from "./routers/social";
import { pushRouter } from "./routers/push";

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
  siteContent: siteContentRouter,
  reports: reportsRouter,
  projects: projectsRouter,
  interiorDesigners: interiorDesignersRouter,
  decorStores: decorStoresRouter,
  referrals: referralsRouter,
  social: socialRouter,
  push: pushRouter,
});

export type AppRouter = typeof appRouter;
