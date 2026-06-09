import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ── Plans ────────────────────────────────────────────────────────────────
  const seekerPlans = [
    {
      id: "seeker-instant",
      name: "Instant",
      price: 99,
      priceLabel: "₹99",
      credits: 1,
      validity: 30,
      tagline: "Unlock a single contact",
      features: ["1 owner contact", "Valid 30 days", "Instant activation"],
      popular: false,
      type: "seeker",
    },
    {
      id: "seeker-basic",
      name: "Basic",
      price: 299,
      priceLabel: "₹299",
      credits: 5,
      validity: 60,
      tagline: "Most popular for serious buyers",
      features: ["5 owner contacts", "Valid 60 days", "Email support"],
      popular: true,
      type: "seeker",
    },
    {
      id: "seeker-premium",
      name: "Premium",
      price: 699,
      priceLabel: "₹699",
      credits: 15,
      validity: 90,
      tagline: "Best value — shortlist confidently",
      features: ["15 owner contacts", "Valid 90 days", "Priority support", "Free site visit scheduling"],
      popular: false,
      type: "seeker",
    },
  ];

  const ownerRentPlans = [
    {
      id: "owner-rent-basic",
      name: "Basic",
      price: 499,
      priceLabel: "₹499",
      credits: 0,
      validity: 30,
      tagline: "List one rental property",
      features: ["1 listing", "10 leads/month", "30-day validity"],
      popular: false,
      type: "owner-rent",
    },
    {
      id: "owner-rent-standard",
      name: "Standard",
      price: 999,
      priceLabel: "₹999",
      credits: 0,
      validity: 60,
      tagline: "Get noticed faster",
      features: ["3 listings", "30 leads/month", "60-day validity", "Featured badge"],
      popular: true,
      type: "owner-rent",
    },
    {
      id: "owner-rent-pro",
      name: "Pro",
      price: 2499,
      priceLabel: "₹2,499",
      credits: 0,
      validity: 90,
      tagline: "For professional landlords",
      features: ["10 listings", "Unlimited leads", "90-day validity", "Priority placement", "Dedicated manager"],
      popular: false,
      type: "owner-rent",
    },
    {
      id: "owner-rent-elite",
      name: "Elite",
      price: 4999,
      priceLabel: "₹4,999",
      credits: 0,
      validity: 180,
      tagline: "Maximum visibility",
      features: ["Unlimited listings", "Unlimited leads", "180-day validity", "Top placement", "Dedicated manager", "Marketing support"],
      popular: false,
      type: "owner-rent",
    },
  ];

  const ownerSellPlans = ownerRentPlans.map((p) => ({
    ...p,
    id: p.id.replace("owner-rent", "owner-sell"),
    type: "owner-sell",
  }));

  const allPlans = [...seekerPlans, ...ownerRentPlans, ...ownerSellPlans];
  for (const plan of allPlans) {
    await prisma.plan.upsert({ where: { id: plan.id }, update: plan, create: plan });
  }
  console.log(`✓ Seeded ${allPlans.length} plans`);

  // ── Staff users ──────────────────────────────────────────────────────────
  const staffUsers = [
    {
      email: "sa@nxtsft.com",
      phone: "9000000001",
      name: "Aarav Kapoor",
      role: "super-admin",
      city: "Mumbai",
      verified: true,
    },
    {
      email: "admin@nxtsft.com",
      phone: "9000000002",
      name: "Meera Iyer",
      role: "admin",
      city: "Bengaluru",
      verified: true,
    },
    {
      email: "supervisor@nxtsft.com",
      phone: "9000000003",
      name: "Rahul Verma",
      role: "supervisor",
      city: "Delhi",
      verified: true,
    },
    {
      email: "priya@nxtsft.com",
      phone: "9000000004",
      name: "Priya Sharma",
      role: "sales",
      city: "Pune",
      verified: true,
    },
    {
      email: "support@nxtsft.com",
      phone: "9000000005",
      name: "Kiran Nair",
      role: "support-admin",
      city: "Chennai",
      verified: true,
    },
  ];

  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, verified: true },
      create: { ...u, passwordHash: hash, credits: 0 },
    });
  }
  console.log(`✓ Seeded ${staffUsers.length} staff users`);

  // ── Consumer users ───────────────────────────────────────────────────────
  const consumerUsers = [
    {
      email: "rohan@example.com",
      phone: "9100000001",
      name: "Rohan Mehta",
      role: "user",
      city: "Mumbai",
      verified: true,
      credits: 3,
    },
    {
      email: "ananya@example.com",
      phone: "9100000002",
      name: "Ananya Gupta",
      role: "customer",
      city: "Delhi",
      verified: true,
      credits: 3,
    },
  ];

  for (const u of consumerUsers) {
    const { credits, ...data } = u;
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, credits },
      create: { ...data, passwordHash: hash, credits },
    });
  }
  console.log(`✓ Seeded ${consumerUsers.length} consumer users`);
  console.log(`\nDemo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
