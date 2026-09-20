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
  const masked = JSON.stringify(await api.leads());
  assert(!(await api.leads()).items.some((item) => item.name.includes("Staff test")));
  assert(!masked.includes(buyer.phone!));
  assert(!masked.includes(buyer.email));
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
  }
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
    "PASS: masking, ownership, entitlements, metrics, watching alerts, atomic sharing, Razorpay and PayU replay/return context",
  );
} finally {
  await prisma.$disconnect();
}
