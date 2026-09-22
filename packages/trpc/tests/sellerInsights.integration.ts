/** Run only against the disposable DB described in docs/seller-insights.md. */
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import prisma from "@nxtsft/db";
import { sellerInsightsRouter } from "../src/routers/sellerInsights";
import { usersRouter } from "../src/routers/users";
import { subscriptionsRouter } from "../src/routers/subscriptions";
import { POST as payuCallback } from "../../../apps/web/src/app/api/payu/callback/route";
import { maskContact } from "../src/sellerContactPolicy";

const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(url.hostname, "localhost");
assert.equal(url.port, "55439", "Tests require the disposable database on port 55439");
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.UPSTASH_REDIS_REST_TOKEN = "";
process.env.RAZORPAY_KEY_ID = "test-key";
process.env.RAZORPAY_KEY_SECRET = "test-secret";
const run = `insights-${Date.now()}`;
const createUser = (name: string, role = "user") =>
  prisma.user.create({
    data: {
      name,
      role,
      email: `${run}-${name}@example.test`,
      city: "Hyderabad",
      phone: `91${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    },
  });
const context = (user: Awaited<ReturnType<typeof createUser>>) => ({
  user,
  prisma,
  token: null,
  ip: null,
});
try {
  const [seller, other, buyer, buyer2] = await Promise.all([
    createUser("Seller", "home-seller"),
    createUser("Other", "home-seller"),
    createUser("Buyer"),
    createUser("Buyer2"),
  ]);
  // `buyer` is the two-type flow's "real lead" fixture: an active, phone-OTP
  // verified account. `buyer2` stays unverified so it can stand in for the
  // "not real" comparison later.
  await prisma.user.update({ where: { id: buyer.id }, data: { phoneVerified: true } });
  const property = await prisma.property.create({
    data: {
      ownerId: seller.id,
      title: "Test listing",
      slug: run,
      type: "Villa",
      purpose: "Sale",
      price: 8500000n,
      area: 1200,
    },
  });
  const freeProperty = await prisma.property.create({
    data: {
      ownerId: seller.id,
      title: "Free listing",
      slug: `${run}-free`,
      type: "Villa",
      purpose: "Sale",
      price: 8500000n,
      area: 1200,
      freeListing: true,
    },
  });
  const previewBuyers = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      prisma.dummyBuyer.create({
        data: {
          name: `Sample buyer ${i + 1}`,
          phone: `6${i}${run.slice(-8)}`,
          email: `sample${i + 1}@example.test`,
          state: "Telangana",
        },
      }),
    ),
  );
  const lead = await prisma.lead.create({
    data: {
      propertyId: property.id,
      userId: buyer.id,
      buyerUserId: buyer.id,
      name: buyer.name,
      phone: buyer.phone!,
      email: buyer.email,
    },
  });
  await prisma.lead.create({
    data: {
      propertyId: property.id,
      userId: seller.id,
      name: "Staff test",
      phone: "919999999998",
      source: "Dummy",
    },
  });
  const legacy = await prisma.lead.create({
    data: {
      propertyId: property.id,
      userId: other.id,
      name: "Unlinked buyer",
      phone: "919999999991",
    },
  });
  const visit = await prisma.siteVisit.create({
    data: {
      propertyId: property.id,
      userId: buyer.id,
      scheduledAt: new Date(),
      status: "Cancelled",
      notes: buyer.phone!,
    },
  });
  await prisma.creditTransaction.create({
    data: {
      propertyId: property.id,
      userId: buyer.id,
      reason: "contact_unlock",
      type: "debit",
      amount: -1,
    },
  });
  await prisma.propertyView.createMany({
    data: [{ propertyId: property.id }, { propertyId: property.id, userId: buyer.id }],
  });
  await prisma.favorite.create({ data: { propertyId: property.id, userId: buyer.id } });
  const api = sellerInsightsRouter.createCaller(context(seller));
  const stranger = sellerInsightsRouter.createCaller(context(other));
  const buyerApi = sellerInsightsRouter.createCaller(context(buyer));
  const users = usersRouter.createCaller(context(seller));
  assert.equal((await api.leads()).unlocked, false);
  const samples = await api.dummyLeads({ propertyId: freeProperty.id });
  assert.equal(samples.items.length, 5, "A free listing receives five sample-interest cards");
  assert(samples.items.every((item) => item.property.id === freeProperty.id));
  assert(samples.items.every((item) => item.name.endsWith("••••")));
  assert(samples.items.every((item) => item.phone?.includes("XXXXXX")));
  assert(samples.items.every((item) => item.email?.includes("••••@")));
  assert(samples.items.every((item) => item.budget.startsWith("₹")));
  assert(samples.items.every((item) => item.requestType.endsWith("interest")));
  assert(samples.items.every((item) => item.relativeTime.endsWith("ago")));
  // Plain JSON.stringify on purpose: this stack has no superjson transformer,
  // so anything BigInt left in the payload throws here exactly as it would in
  // the real tRPC response. Do not "fix" this with a replacer — that hides a
  // 500 (it already did once).
  assert(!JSON.stringify(samples).includes(previewBuyers[0]!.phone));
  assert(samples.items.every((item) => item.leadType === "dummy"));
  assert(samples.items.every((item) => !item.matchRequested && !item.sellerContactShared));
  assert.equal(samples.paid, false);
  await assert.rejects(stranger.dummyLeads({ propertyId: freeProperty.id }));
  // Samples are no longer limited to free listings — every Active listing the
  // seller owns gets its own set.
  const paidListingSamples = await api.dummyLeads({ propertyId: property.id });
  assert.equal(
    paidListingSamples.items.length,
    5,
    "A non-freeListing Active listing also receives sample-interest cards",
  );
  assert(paidListingSamples.items.every((item) => item.property.id === property.id));
  // Regression: "View Leads →" from My Listings deep-links by propertyId on
  // listings of any status. A listing the seller owns but that isn't live must
  // return no samples, never NOT_FOUND — that 404 broke the whole deep link.
  const inactive = await prisma.property.create({
    data: {
      ownerId: seller.id,
      title: "Inactive listing",
      slug: `${run}-inactive`,
      type: "Villa",
      purpose: "Sale",
      price: 8500000n,
      area: 1200,
      status: "Inactive",
    },
  });
  assert.equal(
    (await api.dummyLeads({ propertyId: inactive.id })).items.length,
    0,
    "An owned non-Active listing returns no samples rather than throwing",
  );
  assert.equal(
    await prisma.dummyLeadAssignment.count({ where: { propertyId: inactive.id } }),
    0,
    "No sample rows are seeded for a listing buyers cannot see",
  );
  await assert.rejects(
    api.dummyLeads({ propertyId: property.id.replace(/.$/, "z") }),
    "NOT_FOUND still fires for a listing the seller does not own",
  );

  // Two-type seller lead flow: a real (active, phone-verified, linked,
  // property-specific) enquiry is unmasked for free, with the verified
  // account phone rather than the form-entered one. Everything else on the
  // free plan — an unlinked legacy enquiry, an internal "Dummy"-source
  // record — stays masked exactly as before.
  const leadsResult = await api.leads();
  const realItem = leadsResult.items.find((item) => item.id === lead.id)!;
  assert.equal(realItem.leadType, "real");
  assert.equal(realItem.phone, buyer.phone, "real leads show the verified account phone");
  assert.equal(realItem.email, buyer.email, "real leads are unmasked, not just the phone");
  assert(!leadsResult.items.some((item) => item.name.includes("Staff test")));
  const legacyItem = leadsResult.items.find((item) => item.id === legacy.id)!;
  assert.notEqual(legacyItem.leadType, "real", "an unlinked buyer never becomes a real lead");
  assert(legacyItem.phone?.includes("XXXXXX"), "non-real leads stay masked pre-plan");
  for (const result of [
    await users.sellerLeads(),
    await users.sellerUnlocks(),
    await users.sellerVisits(),
  ]) {
    assert(
      !JSON.stringify(result).includes(buyer.phone!),
      "Alternate seller endpoint leaked phone",
    );
  }
  assert.equal((await users.sellerVisits())[0]!.notes, null);
  await assert.rejects(stranger.leads({ propertyId: property.id }));
  await assert.rejects(api.shareSellerContact({ kind: "enquiry", id: lead.id }));
  assert.equal(maskContact({ name: "Buyer", phone: "12", email: null }, false).phone, null);
  await Promise.all([
    buyerApi.setWatching({ propertyId: property.id, watching: true }),
    buyerApi.setWatching({ propertyId: property.id, watching: true }),
  ]);
  assert.deepEqual(await api.metrics({ propertyId: property.id }), {
    views: 2,
    watching: 1,
    shortlisted: 1,
    requested: 4,
  });
  assert.deepEqual(
    await api.publicMetrics({ propertyId: property.id }),
    await api.metrics({ propertyId: property.id }),
  );
  await assert.rejects(api.setWatching({ propertyId: property.id, watching: true }));
  await prisma.property.update({ where: { id: property.id }, data: { price: 8600000n } });
  assert.equal(
    await prisma.notification.count({ where: { userId: buyer.id, type: "property_alert" } }),
    1,
  );
  await prisma.property.update({ where: { id: property.id }, data: { price: 8600000n } });
  assert.equal(
    await prisma.notification.count({ where: { userId: buyer.id, type: "property_alert" } }),
    1,
  );
  await prisma.property.updateMany({ where: { id: property.id }, data: { status: "Inactive" } });
  assert.equal(
    await prisma.notification.count({ where: { userId: buyer.id, type: "property_alert" } }),
    2,
  );
  await assert.rejects(api.publicMetrics({ propertyId: property.id }));
  await buyerApi.setWatching({ propertyId: property.id, watching: false });
  assert.equal((await buyerApi.watching()).length, 0);

  // A linked-but-unverified buyer's enquiry stays "not real" (masked,
  // plan-gated) — verification, not just linkage, is what makes a lead real.
  const unverifiedBuyer = await createUser("UnverifiedBuyer");
  const unverifiedLead = await prisma.lead.create({
    data: {
      propertyId: property.id,
      userId: unverifiedBuyer.id,
      buyerUserId: unverifiedBuyer.id,
      name: unverifiedBuyer.name,
      phone: unverifiedBuyer.phone!,
      email: unverifiedBuyer.email,
    },
  });
  const unverifiedItem = (await api.leads()).items.find((item) => item.id === unverifiedLead.id)!;
  assert.notEqual(unverifiedItem.leadType, "real", "unverified-phone buyer is never a real lead");
  assert(unverifiedItem.phone?.includes("XXXXXX"));

  // Sample-card actions: "Share Intent" and "Share My Number" both trigger
  // the same idempotent sales follow-up (dedup'd per seller via repContactId
  // on any DummyLeadAssignment row, same ledger the click-threshold path
  // uses), and each records its own timestamp on its own row regardless.
  const triageRep = await createUser("TriageRep", "sales");
  process.env.DUMMY_LEAD_TRIAGE_REP_ID = triageRep.id;
  await assert.rejects(stranger.requestSampleMatch({ id: samples.items[2]!.id }));
  await assert.rejects(api.shareSampleSellerContact({ id: samples.items[1]!.id, phone: "123" }));

  await api.requestSampleMatch({ id: samples.items[0]!.id });
  assert(
    (await prisma.dummyLeadAssignment.findUnique({ where: { id: samples.items[0]!.id } }))!
      .matchRequestedAt !== null,
  );
  assert.equal(
    await prisma.repContact.count({ where: { ownerId: triageRep.id, phone: seller.phone! } }),
    1,
  );
  assert.equal(
    await prisma.notification.count({
      where: { userId: triageRep.id, type: "dummy_lead_high_engagement" },
    }),
    1,
  );

  await api.shareSampleSellerContact({ id: samples.items[1]!.id, phone: "9876543210" });
  assert(
    (await prisma.dummyLeadAssignment.findUnique({ where: { id: samples.items[1]!.id } }))!
      .sellerContactSharedAt !== null,
  );
  assert.equal(
    await prisma.repContact.count({ where: { ownerId: triageRep.id } }),
    1,
    "a second sample action for the same seller stays idempotent on the CRM side",
  );
  assert.equal(
    await prisma.notification.count({
      where: { userId: triageRep.id, type: "dummy_lead_high_engagement" },
    }),
    1,
  );

  const samplesAfterActions = await api.dummyLeads({ propertyId: freeProperty.id });
  assert.equal(
    samplesAfterActions.items.find((i) => i.id === samples.items[0]!.id)!.matchRequested,
    true,
  );
  assert.equal(
    samplesAfterActions.items.find((i) => i.id === samples.items[1]!.id)!.sellerContactShared,
    true,
  );

  const plan = await prisma.plan.create({
    data: {
      name: "Seller test",
      price: 499,
      priceLabel: "₹499",
      credits: 0,
      validity: 30,
      tagline: "Test",
      features: [],
      type: "boost",
    },
  });
  const sub = await prisma.subscription.create({
    data: {
      userId: seller.id,
      planId: plan.id,
      planName: plan.name,
      amount: 49900n,
      endDate: new Date(Date.now() + 86400000),
    },
  });
  assert.equal((await api.leads()).unlocked, false, "Boost must not unlock contacts");
  for (const type of ["owner-sell", "owner-rent"]) {
    await prisma.plan.update({ where: { id: plan.id }, data: { type } });
    assert.equal((await api.leads()).unlocked, true);
    // Paid sellers now keep their sample cards (default-on ops switch), and
    // the payload says so, so the UI can drop the upsell wording.
    const paidSamples = await api.dummyLeads({ propertyId: freeProperty.id });
    assert.equal(paidSamples.items.length, 5, "Paid sellers see samples while the switch is on");
    assert.equal(paidSamples.paid, true);
  }
  // Ops kill switch: off hides samples from paid sellers only.
  await prisma.siteSetting.upsert({
    where: { key: "leads.samples_for_paid_sellers" },
    create: { key: "leads.samples_for_paid_sellers", value: false },
    update: { value: false },
  });
  assert.equal((await api.dummyLeads({ propertyId: freeProperty.id })).items.length, 0);
  const freeSellerApi = sellerInsightsRouter.createCaller(context(other));
  const otherFree = await prisma.property.create({
    data: {
      ownerId: other.id,
      title: "Other seller listing",
      slug: `${run}-other`,
      type: "Villa",
      purpose: "Sale",
      price: 8500000n,
      area: 1200,
      freeListing: true,
    },
  });
  assert.equal(
    (await freeSellerApi.dummyLeads({ propertyId: otherFree.id })).items.length,
    5,
    "The switch never hides samples from free sellers",
  );
  await prisma.siteSetting.update({
    where: { key: "leads.samples_for_paid_sellers" },
    data: { value: true },
  });
  for (const status of ["Cancelled", "Expired", "Failed"]) {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status } });
    assert.equal((await api.leads()).unlocked, false);
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "Active", endDate: new Date(0) },
  });
  assert.equal((await api.leads()).unlocked, false);
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { endDate: new Date(Date.now() + 86400000) },
  });
  assert.equal((await api.leads()).items.find((i) => i.id === lead.id)!.phone, buyer.phone);
  assert.equal((await api.leads()).items.find((i) => i.id === visit.id)!.status, "Visit cancelled");
  await assert.rejects(api.shareSellerContact({ kind: "enquiry", id: legacy.id }));
  await Promise.all([
    api.shareSellerContact({ kind: "enquiry", id: lead.id }),
    api.shareSellerContact({ kind: "visit", id: visit.id }),
  ]);
  assert.equal(await prisma.sellerContactShare.count({ where: { sellerId: seller.id } }), 1);
  assert.equal(
    await prisma.notification.count({ where: { userId: buyer.id, type: "lead_update" } }),
    1,
  );
  const secondLead = await prisma.lead.create({
    data: {
      propertyId: property.id,
      userId: buyer2.id,
      buyerUserId: buyer2.id,
      name: buyer2.name,
      phone: buyer2.phone!,
    },
  });
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION test_reject_share() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."type" = 'lead_update' THEN RAISE EXCEPTION 'test notification failure'; END IF; RETURN NEW; END; $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER test_reject_share BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION test_reject_share()`,
  );
  await assert.rejects(api.shareSellerContact({ kind: "enquiry", id: secondLead.id }));
  assert.equal(
    await prisma.sellerContactShare.count({ where: { buyerId: buyer2.id } }),
    0,
    "Notification failure must roll back share",
  );
  await prisma.$executeRawUnsafe(`DROP TRIGGER test_reject_share ON "Notification"`);
  await prisma.$executeRawUnsafe(`DROP FUNCTION test_reject_share()`);
  await api.shareSellerContact({ kind: "enquiry", id: secondLead.id });

  // Mock only the external order request. Payment persistence and activation are real.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: `order_${run}`, amount: 49900, currency: "INR" }), {
      status: 200,
    });
  const billing = subscriptionsRouter.createCaller(context(seller));
  await assert.rejects(
    subscriptionsRouter
      .createCaller(context(other))
      .createOwnerOrder({ planId: plan.id, leadsReturn: { propertyId: property.id } }),
  );
  const order = await billing.createOwnerOrder({
    planId: plan.id,
    leadsReturn: { propertyId: property.id },
  });
  globalThis.fetch = originalFetch;
  const paymentId = `pay_${run}`;
  const verification = {
    planId: plan.id,
    razorpayOrderId: order.orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: createHmac("sha256", "test-secret")
      .update(`${order.orderId}|${paymentId}`)
      .digest("hex"),
  };
  await assert.rejects(billing.verifyOwnerPayment({ ...verification, razorpaySignature: "bad" }));
  const results = await Promise.all([
    billing.verifyOwnerPayment(verification),
    billing.verifyOwnerPayment(verification),
  ]);
  assert.equal(results[0]!.returnPath, `/user-portal?propertyId=${property.id}#leads`);
  assert.equal(await prisma.subscription.count({ where: { razorpayOrderId: order.orderId } }), 1);
  assert.equal(
    await prisma.dummyLeadAssignment.count({
      where: { propertyId: freeProperty.id, sellerId: seller.id, suppressedAt: { not: null } },
    }),
    0,
    "Payment no longer suppresses sample previews — the ops switch gates them instead",
  );
  await api.requestSampleMatch({ id: samples.items[2]!.id });
  // suppressedAt survives as a manual per-row kill switch.
  await prisma.dummyLeadAssignment.update({
    where: { id: samples.items[3]!.id },
    data: { suppressedAt: new Date() },
  });
  await assert.rejects(
    api.requestSampleMatch({ id: samples.items[3]!.id }),
    "Suppressed sample rows reject new actions",
  );
  assert.equal((await billing.verifyOwnerPayment(verification)).returnPath, results[0]!.returnPath);
  assert.equal(
    (await prisma.siteVisit.findUnique({ where: { id: visit.id } }))!.status,
    "Cancelled",
  );
  process.env.PAYU_MERCHANT_KEY = "test-payu-key";
  process.env.PAYU_MERCHANT_SALT = "test-payu-salt";
  const payuOrder = await billing.createOwnerPayUOrder({
    planId: plan.id,
    leadsReturn: { propertyId: property.id },
  });
  const callback = async (status: string, tamper = false, orderFields = payuOrder) => {
    // Independent field-array fixture from PayU's documented reverse hash sequence.
    const fields = { ...orderFields, status, mihpayid: `mih_${orderFields.txnid}` };
    const hash = createHash("sha512")
      .update(
        [
          "test-payu-salt",
          status,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          fields.udf2,
          fields.udf1,
          fields.email,
          fields.firstname,
          fields.productinfo,
          fields.amount,
          fields.txnid,
          "test-payu-key",
        ].join("|"),
      )
      .digest("hex");
    return payuCallback(
      new Request("http://localhost/api/payu/callback", {
        method: "POST",
        body: new URLSearchParams({ ...fields, hash: tamper ? "bad" : hash }),
      }) as never,
    );
  };
  assert((await callback("success", true)).headers.get("location")!.includes("tampered"));
  assert((await callback("pending")).headers.get("location")!.includes("pending=1"));
  assert.equal((await billing.ownerPaymentStatus({ txnid: payuOrder.txnid })).status, "Pending");
  const subsBefore = await prisma.subscription.count({ where: { userId: seller.id } });
  const payuResults = await Promise.all([callback("success"), callback("success")]);
  assert.equal(payuResults[0]!.status, 303);
  assert(
    payuResults[0]!.headers
      .get("location")!
      .endsWith(`/user-portal?propertyId=${property.id}#leads`),
  );
  assert.equal(await prisma.subscription.count({ where: { userId: seller.id } }), subsBefore + 1);
  assert((await callback("success")).headers.get("location")!.endsWith("#leads"));
  await assert.rejects(
    subscriptionsRouter.createCaller(context(other)).ownerPaymentStatus({ txnid: payuOrder.txnid }),
  );
  const failedOrder = await billing.createOwnerPayUOrder({ planId: plan.id });
  assert(
    (await callback("failure", false, failedOrder)).headers.get("location")!.includes("failure"),
  );
  assert.equal((await billing.ownerPaymentStatus({ txnid: failedOrder.txnid })).status, "Failed");
  assert.equal(await prisma.subscription.count({ where: { userId: seller.id } }), subsBefore + 1);
  console.log(
    "PASS: masking, ownership, entitlements, metrics, watching alerts, atomic sharing, real/dummy lead typing, sample-card actions, paid-seller sample switch, Razorpay and PayU replay/return context",
  );
} finally {
  await prisma.$disconnect();
}
