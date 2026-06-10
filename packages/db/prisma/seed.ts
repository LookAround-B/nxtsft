import bcrypt from "bcryptjs";
import prisma from "../client.js";

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

  // ── Resolve user ids for relations ─────────────────────────────────────────
  const allUsers = await prisma.user.findMany();
  const uid = (email: string) => {
    const u = allUsers.find((x) => x.email === email);
    if (!u) throw new Error(`Seed: user ${email} not found`);
    return u.id;
  };
  const rohan = uid("rohan@example.com");
  const ananya = uid("ananya@example.com");
  const priya = uid("priya@nxtsft.com");
  const support = uid("support@nxtsft.com");

  const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

  // ── Properties (idempotent: upsert by slug) ────────────────────────────────
  const propertySeed = [
    {
      slug: "skyline-3bhk-bandra-west-mumbai", title: "Skyline 3 BHK with Sea View, Bandra West",
      type: "Apartment", purpose: "Sale", price: 65000000, area: 1850, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "West", possession: "Ready to Move", builder: "Lodha Group",
      rera: "P51800000001", featured: true, ownerId: rohan, views: 412, matchScore: 94,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Mumbai", state: "Maharashtra", locality: "Bandra West",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Power Backup"],
    },
    {
      slug: "green-acres-villa-whitefield-bengaluru", title: "Green Acres 4 BHK Villa, Whitefield",
      type: "Villa", purpose: "Sale", price: 42000000, area: 3200, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Unfurnished", facing: "North-East", possession: "Ready to Move", builder: "Prestige Group",
      rera: "PRM/KA/RERA/1251/446/PR/000002", featured: true, ownerId: ananya, views: 287, matchScore: 88,
      image: IMG("photo-1564013799919-ab600027ffc6"), city: "Bengaluru", state: "Karnataka", locality: "Whitefield",
      amenities: ["Landscaped Garden", "Covered Parking", "24/7 Security", "Children's Play Area", "Solar Panels"],
    },
    {
      slug: "urban-nest-2bhk-koregaon-park-pune", title: "Urban Nest 2 BHK, Koregaon Park",
      type: "Apartment", purpose: "Rent", price: 55000, area: 1100, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Kolte Patil",
      rera: "P52100000003", featured: true, ownerId: rohan, views: 198, matchScore: 91,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Pune", state: "Maharashtra", locality: "Koregaon Park",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "Visitor Parking"],
    },
    {
      slug: "lakeview-studio-hitech-city-hyderabad", title: "Lakeview Studio, HITEC City",
      type: "Studio", purpose: "Rent", price: 28000, area: 520, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "South", possession: "Ready to Move", builder: "My Home Group",
      rera: "P02400000004", featured: false, ownerId: ananya, views: 143, matchScore: 79,
      image: IMG("photo-1522708323590-d24dbb6b0267"), city: "Hyderabad", state: "Telangana", locality: "HITEC City",
      amenities: ["Power Backup", "24/7 Security", "Elevator / Lift", "CCTV Surveillance"],
    },
    {
      slug: "corporate-suite-office-cyber-city-gurgaon", title: "Grade-A Office Suite, Cyber City",
      type: "Office", purpose: "Rent", price: 185000, area: 2400, bhk: null, bedrooms: 0, bathrooms: 2, parking: 4,
      furnishing: "Furnished", facing: "North", possession: "Ready to Move", builder: "DLF",
      rera: "GGM/345/77/2020/0005", featured: true, ownerId: priya, views: 321, matchScore: 85,
      image: IMG("photo-1497366216548-37526070297c"), city: "Gurgaon", state: "Haryana", locality: "DLF Cyber City",
      amenities: ["Power Backup", "24/7 Security", "Covered Parking", "Elevator / Lift", "CCTV Surveillance"],
    },
    {
      slug: "heritage-bungalow-alkapuri-vadodara", title: "Heritage 5 BHK Bungalow, Alkapuri",
      type: "Bungalow", purpose: "Sale", price: 38000000, area: 4500, bhk: "5 BHK", bedrooms: 5, bathrooms: 5, parking: 3,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Independent",
      rera: "PR/GJ/VADODARA/0006", featured: false, ownerId: priya, views: 156, matchScore: 82,
      image: IMG("photo-1605276374104-dee2a0ed3cd6"), city: "Ahmedabad", state: "Gujarat", locality: "Alkapuri",
      amenities: ["Landscaped Garden", "Covered Parking", "Power Backup", "Smart Home"],
    },
    {
      slug: "riverside-plot-omr-chennai", title: "DTCP-Approved Residential Plot, OMR",
      type: "Plot", purpose: "Sale", price: 9500000, area: 2400, bhk: null, bedrooms: 0, bathrooms: 0, parking: 0,
      furnishing: "Unfurnished", facing: "South-East", possession: "Ready to Move", builder: "Independent",
      rera: "TN/29/Building/0007", featured: false, ownerId: priya, views: 98, matchScore: 74,
      image: IMG("photo-1500382017468-9049fed747ef"), city: "Chennai", state: "Tamil Nadu", locality: "OMR",
      amenities: ["24/7 Security", "Jogging Track"],
    },
    {
      slug: "comfort-pg-koramangala-bengaluru", title: "Comfort Co-living PG, Koramangala",
      type: "PG", purpose: "Rent", price: 18000, area: 220, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 0,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Stanza Living",
      rera: "PRM/KA/RERA/1251/446/PR/000008", featured: false, ownerId: ananya, views: 211, matchScore: 77,
      image: IMG("photo-1555854877-bab0e564b8d5"), city: "Bengaluru", state: "Karnataka", locality: "Koramangala",
      amenities: ["Power Backup", "24/7 Security", "Community Hall", "CCTV Surveillance"],
    },
    {
      slug: "metro-heights-2bhk-noida-sector-62", title: "Metro Heights 2 BHK, Sector 62",
      type: "Apartment", purpose: "Sale", price: 8800000, area: 1150, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Unfurnished", facing: "North", possession: "Under Construction", builder: "Supertech",
      rera: "UPRERAPRJ000009", featured: false, ownerId: rohan, views: 134, matchScore: 80,
      image: IMG("photo-1494526585095-c41746248156"), city: "Noida", state: "Uttar Pradesh", locality: "Sector 62",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Children's Play Area"],
    },
    {
      slug: "palm-grove-3bhk-gachibowli-hyderabad", title: "Palm Grove 3 BHK, Gachibowli",
      type: "Apartment", purpose: "Sale", price: 14500000, area: 1650, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Aparna Constructions",
      rera: "P02400000010", featured: false, ownerId: ananya, views: 176, matchScore: 86,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Hyderabad", state: "Telangana", locality: "Gachibowli",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "Clubhouse", "24/7 Security", "Landscaped Garden"],
    },
  ];

  const propIdBySlug: Record<string, string> = {};
  for (const p of propertySeed) {
    const { city, state, locality, image, ...rest } = p;
    const prop = await prisma.property.upsert({
      where: { slug: p.slug },
      update: {
        ...rest, price: BigInt(p.price), pricePerSqft: Math.round(p.price / p.area),
        images: [image], status: "Active",
      },
      create: {
        ...rest, price: BigInt(p.price), pricePerSqft: Math.round(p.price / p.area),
        images: [image], status: "Active",
        location: { create: { city, state, locality, latitude: 0, longitude: 0 } },
      },
    });
    propIdBySlug[p.slug] = prop.id;
  }
  console.log(`✓ Seeded ${propertySeed.length} properties`);

  // ── Leads (idempotent: explicit ids; assigned to sales rep Priya) ───────────
  const leadSeed = [
    { id: "seed-lead-01", slug: "skyline-3bhk-bandra-west-mumbai", name: "Vikram Desai", phone: "9820011001", city: "Mumbai", interest: "3 BHK Apartment", source: "Portal", status: "Hot", value: 65000000, buyer: rohan },
    { id: "seed-lead-02", slug: "green-acres-villa-whitefield-bengaluru", name: "Sneha Reddy", phone: "9845022002", city: "Bengaluru", interest: "4 BHK Villa", source: "WhatsApp", status: "Warm", value: 42000000, buyer: ananya },
    { id: "seed-lead-03", slug: "urban-nest-2bhk-koregaon-park-pune", name: "Arjun Mehta", phone: "9011033003", city: "Pune", interest: "2 BHK Rental", source: "Referral", status: "Hot", value: 660000, buyer: rohan },
    { id: "seed-lead-04", slug: "corporate-suite-office-cyber-city-gurgaon", name: "Priyanka Joshi", phone: "9711044004", city: "Gurgaon", interest: "Office space", source: "Direct", status: "New", value: 2220000, buyer: ananya },
    { id: "seed-lead-05", slug: "metro-heights-2bhk-noida-sector-62", name: "Rohit Khanna", phone: "9911055005", city: "Noida", interest: "2 BHK Apartment", source: "Portal", status: "Cold", value: 8800000, buyer: rohan },
    { id: "seed-lead-06", slug: "palm-grove-3bhk-gachibowli-hyderabad", name: "Meghana Rao", phone: "9849066006", city: "Hyderabad", interest: "3 BHK Apartment", source: "WhatsApp", status: "Warm", value: 14500000, buyer: ananya },
    { id: "seed-lead-07", slug: "lakeview-studio-hitech-city-hyderabad", name: "Karthik Nair", phone: "9000077007", city: "Hyderabad", interest: "Studio rental", source: "Portal", status: "New", value: 336000, buyer: rohan },
    { id: "seed-lead-08", slug: "heritage-bungalow-alkapuri-vadodara", name: "Deepika Shah", phone: "9925088008", city: "Ahmedabad", interest: "5 BHK Bungalow", source: "Referral", status: "Hot", value: 38000000, buyer: ananya },
  ];
  for (const l of leadSeed) {
    const { slug, buyer, ...rest } = l;
    const data = { ...rest, propertyId: propIdBySlug[slug], userId: buyer, assignedToId: priya };
    await prisma.lead.upsert({ where: { id: l.id }, update: data, create: data });
  }
  console.log(`✓ Seeded ${leadSeed.length} leads`);

  // ── Support tickets (idempotent: explicit ids) ──────────────────────────────
  const ticketSeed = [
    { id: "seed-tkt-01", userId: rohan, subject: "Owner contact number is incorrect", description: "The phone number I unlocked for the Bandra listing doesn't connect.", category: "property", priority: "high", status: "open", assignedTo: support },
    { id: "seed-tkt-02", userId: ananya, subject: "Refund for unused credits not processed", description: "I cancelled my Basic plan but the refund of ₹299 hasn't arrived in 6 days.", category: "payment", priority: "urgent", status: "open", assignedTo: support },
    { id: "seed-tkt-03", userId: rohan, subject: "Property already sold but still listed", description: "The Whitefield villa shows as available but the owner says it's sold.", category: "property", priority: "medium", status: "in_progress", assignedTo: support },
    { id: "seed-tkt-04", userId: ananya, subject: "Cannot log in on mobile app", description: "Login keeps failing with a network error on Android.", category: "technical", priority: "low", status: "resolved", assignedTo: support },
    { id: "seed-tkt-05", userId: rohan, subject: "Agent was unresponsive", description: "Assigned agent hasn't replied to my site-visit request for 3 days.", category: "agent", priority: "high", status: "open", assignedTo: null as string | null },
  ];
  for (const t of ticketSeed) {
    const data = { ...t, resolvedAt: t.status === "resolved" ? new Date() : null };
    await prisma.ticket.upsert({ where: { id: t.id }, update: data, create: data });
  }
  console.log(`✓ Seeded ${ticketSeed.length} support tickets`);

  // ── Site visits + favorites for the demo buyer (Rohan) ──────────────────────
  const visitSeed = [
    { id: "seed-visit-01", slug: "skyline-3bhk-bandra-west-mumbai", status: "Scheduled", inDays: 3 },
    { id: "seed-visit-02", slug: "urban-nest-2bhk-koregaon-park-pune", status: "Completed", inDays: -5 },
  ];
  for (const v of visitSeed) {
    const data = {
      userId: rohan, propertyId: propIdBySlug[v.slug], salesRepId: priya,
      status: v.status, scheduledAt: new Date(Date.now() + v.inDays * 86_400_000),
    };
    await prisma.siteVisit.upsert({ where: { id: v.id }, update: data, create: { id: v.id, ...data } });
  }
  await prisma.user.update({
    where: { id: rohan },
    data: { favorites: { connect: [
      { id: propIdBySlug["green-acres-villa-whitefield-bengaluru"] },
      { id: propIdBySlug["palm-grove-3bhk-gachibowli-hyderabad"] },
    ] } },
  });
  console.log(`✓ Seeded ${visitSeed.length} site visits + favorites for demo buyer`);

  console.log(`\nDemo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
