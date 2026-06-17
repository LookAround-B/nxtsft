import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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

    // ── Apartments ───────────────────────────────────────────────────────────
    {
      slug: "lakeside-2bhk-powai-mumbai", title: "Lakeside 2 BHK, Powai",
      type: "Apartment", purpose: "Sale", price: 21000000, area: 1240, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Semi-Furnished", facing: "North-East", possession: "Ready to Move", builder: "Hiranandani",
      rera: "P51800000011", featured: true, ownerId: rohan, views: 256, matchScore: 89,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Mumbai", state: "Maharashtra", locality: "Powai",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Power Backup"],
    },
    {
      slug: "sunrise-1bhk-wakad-pune", title: "Sunrise 1 BHK, Wakad",
      type: "Apartment", purpose: "Rent", price: 22000, area: 680, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Kolte Patil",
      rera: "P52100000012", featured: false, ownerId: ananya, views: 112, matchScore: 75,
      image: IMG("photo-1494526585095-c41746248156"), city: "Pune", state: "Maharashtra", locality: "Wakad",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "Visitor Parking"],
    },
    {
      slug: "orchid-3bhk-indiranagar-bengaluru", title: "Orchid 3 BHK, Indiranagar",
      type: "Apartment", purpose: "Sale", price: 18500000, area: 1580, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "West", possession: "Ready to Move", builder: "Brigade Group",
      rera: "PRM/KA/RERA/1251/446/PR/000013", featured: true, ownerId: priya, views: 298, matchScore: 90,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Bengaluru", state: "Karnataka", locality: "Indiranagar",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "Clubhouse", "24/7 Security", "Landscaped Garden"],
    },
    {
      slug: "crystal-2bhk-kondapur-hyderabad", title: "Crystal 2 BHK, Kondapur",
      type: "Apartment", purpose: "Rent", price: 32000, area: 1080, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Furnished", facing: "North", possession: "Ready to Move", builder: "My Home Group",
      rera: "P02400000014", featured: false, ownerId: ananya, views: 134, matchScore: 81,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Hyderabad", state: "Telangana", locality: "Kondapur",
      amenities: ["Gym / Fitness Centre", "Power Backup", "24/7 Security", "Children's Play Area"],
    },

    // ── Villas ───────────────────────────────────────────────────────────────
    {
      slug: "emerald-villa-ecr-chennai", title: "Emerald 4 BHK Villa, ECR",
      type: "Villa", purpose: "Sale", price: 36000000, area: 3000, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Unfurnished", facing: "East", possession: "Ready to Move", builder: "Casagrand",
      rera: "TN/29/Building/0015", featured: true, ownerId: rohan, views: 187, matchScore: 86,
      image: IMG("photo-1564013799919-ab600027ffc6"), city: "Chennai", state: "Tamil Nadu", locality: "ECR",
      amenities: ["Swimming Pool", "Landscaped Garden", "Covered Parking", "24/7 Security", "Children's Play Area"],
    },
    {
      slug: "serene-villa-new-town-kolkata", title: "Serene 4 BHK Villa, New Town",
      type: "Villa", purpose: "Sale", price: 28000000, area: 2800, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Semi-Furnished", facing: "South", possession: "Ready to Move", builder: "PS Group",
      rera: "WB/RERA/0016", featured: false, ownerId: ananya, views: 121, matchScore: 80,
      image: IMG("photo-1564013799919-ab600027ffc6"), city: "Kolkata", state: "West Bengal", locality: "New Town",
      amenities: ["Landscaped Garden", "Covered Parking", "24/7 Security", "Clubhouse"],
    },

    // ── Studios ──────────────────────────────────────────────────────────────
    {
      slug: "cozy-studio-andheri-east-mumbai", title: "Cozy Studio, Andheri East",
      type: "Studio", purpose: "Rent", price: 26000, area: 450, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 0,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Independent",
      rera: "P51800000017", featured: false, ownerId: priya, views: 98, matchScore: 72,
      image: IMG("photo-1522708323590-d24dbb6b0267"), city: "Mumbai", state: "Maharashtra", locality: "Andheri East",
      amenities: ["Power Backup", "24/7 Security", "Elevator / Lift", "CCTV Surveillance"],
    },
    {
      slug: "smart-studio-electronic-city-bengaluru", title: "Smart Studio, Electronic City",
      type: "Studio", purpose: "Rent", price: 19000, area: 480, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Salarpuria Sattva",
      rera: "PRM/KA/RERA/1251/446/PR/000018", featured: false, ownerId: rohan, views: 156, matchScore: 76,
      image: IMG("photo-1522708323590-d24dbb6b0267"), city: "Bengaluru", state: "Karnataka", locality: "Electronic City",
      amenities: ["Power Backup", "24/7 Security", "Gym / Fitness Centre", "CCTV Surveillance"],
    },

    // ── Offices ──────────────────────────────────────────────────────────────
    {
      slug: "premium-office-bkc-mumbai", title: "Premium Office Floor, BKC",
      type: "Office", purpose: "Rent", price: 450000, area: 5200, bhk: null, bedrooms: 0, bathrooms: 3, parking: 8,
      furnishing: "Furnished", facing: "North", possession: "Ready to Move", builder: "K Raheja Corp",
      rera: "P51800000019", featured: true, ownerId: priya, views: 276, matchScore: 84,
      image: IMG("photo-1497366216548-37526070297c"), city: "Mumbai", state: "Maharashtra", locality: "Bandra Kurla Complex",
      amenities: ["Power Backup", "24/7 Security", "Covered Parking", "Elevator / Lift", "CCTV Surveillance"],
    },
    {
      slug: "tech-office-hinjewadi-pune", title: "Tech Park Office, Hinjewadi",
      type: "Office", purpose: "Sale", price: 32000000, area: 3800, bhk: null, bedrooms: 0, bathrooms: 2, parking: 6,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Panchshil",
      rera: "P52100000020", featured: false, ownerId: ananya, views: 143, matchScore: 79,
      image: IMG("photo-1497366216548-37526070297c"), city: "Pune", state: "Maharashtra", locality: "Hinjewadi",
      amenities: ["Power Backup", "24/7 Security", "Covered Parking", "Elevator / Lift"],
    },

    // ── Bungalows ──────────────────────────────────────────────────────────────
    {
      slug: "royal-bungalow-jubilee-hills-hyderabad", title: "Royal 5 BHK Bungalow, Jubilee Hills",
      type: "Bungalow", purpose: "Sale", price: 95000000, area: 6000, bhk: "5 BHK", bedrooms: 5, bathrooms: 6, parking: 4,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Independent",
      rera: "P02400000021", featured: true, ownerId: rohan, views: 312, matchScore: 92,
      image: IMG("photo-1605276374104-dee2a0ed3cd6"), city: "Hyderabad", state: "Telangana", locality: "Jubilee Hills",
      amenities: ["Swimming Pool", "Landscaped Garden", "Covered Parking", "24/7 Security", "Smart Home"],
    },
    {
      slug: "garden-bungalow-koregaon-park-pune", title: "Garden 4 BHK Bungalow, Koregaon Park",
      type: "Bungalow", purpose: "Sale", price: 52000000, area: 4200, bhk: "4 BHK", bedrooms: 4, bathrooms: 5, parking: 3,
      furnishing: "Unfurnished", facing: "North", possession: "Ready to Move", builder: "Independent",
      rera: "P52100000022", featured: false, ownerId: ananya, views: 167, matchScore: 85,
      image: IMG("photo-1605276374104-dee2a0ed3cd6"), city: "Pune", state: "Maharashtra", locality: "Koregaon Park",
      amenities: ["Landscaped Garden", "Covered Parking", "24/7 Security", "Power Backup"],
    },

    // ── Plots ──────────────────────────────────────────────────────────────────
    {
      slug: "premium-plot-sarjapur-bengaluru", title: "DTCP-Approved Plot, Sarjapur Road",
      type: "Plot", purpose: "Sale", price: 12000000, area: 2000, bhk: null, bedrooms: 0, bathrooms: 0, parking: 0,
      furnishing: "Unfurnished", facing: "East", possession: "Ready to Move", builder: "Independent",
      rera: "PRM/KA/RERA/1251/446/PR/000023", featured: false, ownerId: priya, views: 87, matchScore: 73,
      image: IMG("photo-1500382017468-9049fed747ef"), city: "Bengaluru", state: "Karnataka", locality: "Sarjapur Road",
      amenities: ["24/7 Security", "Jogging Track"],
    },
    {
      slug: "corner-plot-kompally-hyderabad", title: "Corner Residential Plot, Kompally",
      type: "Plot", purpose: "Sale", price: 6800000, area: 1800, bhk: null, bedrooms: 0, bathrooms: 0, parking: 0,
      furnishing: "Unfurnished", facing: "North-East", possession: "Ready to Move", builder: "Independent",
      rera: "P02400000024", featured: false, ownerId: ananya, views: 76, matchScore: 70,
      image: IMG("photo-1500382017468-9049fed747ef"), city: "Hyderabad", state: "Telangana", locality: "Kompally",
      amenities: ["24/7 Security", "Gated Community"],
    },

    // ── PGs ────────────────────────────────────────────────────────────────────
    {
      slug: "elite-pg-hsr-layout-bengaluru", title: "Elite Co-living PG, HSR Layout",
      type: "PG", purpose: "Rent", price: 16000, area: 200, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 0,
      furnishing: "Furnished", facing: "South", possession: "Ready to Move", builder: "Zolo",
      rera: "PRM/KA/RERA/1251/446/PR/000025", featured: false, ownerId: rohan, views: 189, matchScore: 75,
      image: IMG("photo-1555854877-bab0e564b8d5"), city: "Bengaluru", state: "Karnataka", locality: "HSR Layout",
      amenities: ["Power Backup", "24/7 Security", "Community Hall", "CCTV Surveillance"],
    },
    {
      slug: "urban-pg-viman-nagar-pune", title: "Urban PG, Viman Nagar",
      type: "PG", purpose: "Rent", price: 14000, area: 180, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 0,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Stanza Living",
      rera: "P52100000026", featured: false, ownerId: ananya, views: 145, matchScore: 73,
      image: IMG("photo-1555854877-bab0e564b8d5"), city: "Pune", state: "Maharashtra", locality: "Viman Nagar",
      amenities: ["Power Backup", "24/7 Security", "Community Hall", "CCTV Surveillance"],
    },

    // ── Delhi NCR ──────────────────────────────────────────────────────────────
    {
      slug: "saket-2bhk-delhi", title: "Garden Estate 2 BHK, Saket",
      type: "Apartment", purpose: "Sale", price: 16500000, area: 1150, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "DLF",
      rera: "DLRERA2024P0027", featured: false, ownerId: rohan, views: 221, matchScore: 87,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Delhi NCR", state: "Delhi", locality: "Saket",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "dwarka-3bhk-delhi", title: "Sky Court 3 BHK, Dwarka",
      type: "Apartment", purpose: "Sale", price: 19500000, area: 1620, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "North", possession: "Ready to Move", builder: "Godrej Properties",
      rera: "DLRERA2024P0028", featured: true, ownerId: ananya, views: 305, matchScore: 90,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Delhi NCR", state: "Delhi", locality: "Dwarka",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Power Backup"],
    },
    {
      slug: "vasant-kunj-bungalow-delhi", title: "Vasant 5 BHK Bungalow, Vasant Kunj",
      type: "Bungalow", purpose: "Sale", price: 120000000, area: 6500, bhk: "5 BHK", bedrooms: 5, bathrooms: 6, parking: 4,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Independent",
      rera: "DLRERA2024P0029", featured: false, ownerId: priya, views: 198, matchScore: 91,
      image: IMG("photo-1605276374104-dee2a0ed3cd6"), city: "Delhi NCR", state: "Delhi", locality: "Vasant Kunj",
      amenities: ["Swimming Pool", "Landscaped Garden", "Covered Parking", "24/7 Security", "Smart Home"],
    },
    {
      slug: "rohini-1bhk-delhi", title: "Compact 1 BHK, Rohini",
      type: "Apartment", purpose: "Rent", price: 24000, area: 620, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Ansal API",
      rera: "DLRERA2024P0030", featured: false, ownerId: rohan, views: 109, matchScore: 74,
      image: IMG("photo-1494526585095-c41746248156"), city: "Delhi NCR", state: "Delhi", locality: "Rohini",
      amenities: ["Power Backup", "Elevator / Lift", "Visitor Parking", "24/7 Security"],
    },

    // ── Jaipur ───────────────────────────────────────────────────────────────
    {
      slug: "malviya-nagar-2bhk-jaipur", title: "Pink City 2 BHK, Malviya Nagar",
      type: "Apartment", purpose: "Sale", price: 7200000, area: 1080, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Mahima Group",
      rera: "RAJ/P/2024/0031", featured: false, ownerId: ananya, views: 132, matchScore: 79,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Jaipur", state: "Rajasthan", locality: "Malviya Nagar",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "vaishali-3bhk-jaipur", title: "Royal Residency 3 BHK, Vaishali Nagar",
      type: "Apartment", purpose: "Sale", price: 11000000, area: 1550, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "North-East", possession: "Ready to Move", builder: "Okay Plus",
      rera: "RAJ/P/2024/0032", featured: true, ownerId: rohan, views: 247, matchScore: 88,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Jaipur", state: "Rajasthan", locality: "Vaishali Nagar",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "Clubhouse", "24/7 Security", "Landscaped Garden"],
    },
    {
      slug: "mansarovar-villa-jaipur", title: "Heritage 4 BHK Villa, Mansarovar",
      type: "Villa", purpose: "Sale", price: 24000000, area: 2700, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Unfurnished", facing: "South", possession: "Ready to Move", builder: "Independent",
      rera: "RAJ/P/2024/0033", featured: false, ownerId: priya, views: 118, matchScore: 83,
      image: IMG("photo-1564013799919-ab600027ffc6"), city: "Jaipur", state: "Rajasthan", locality: "Mansarovar",
      amenities: ["Landscaped Garden", "Covered Parking", "24/7 Security", "Clubhouse"],
    },
    {
      slug: "c-scheme-studio-jaipur", title: "City Studio, C-Scheme",
      type: "Studio", purpose: "Rent", price: 17000, area: 480, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Independent",
      rera: "RAJ/P/2024/0034", featured: false, ownerId: ananya, views: 94, matchScore: 71,
      image: IMG("photo-1522708323590-d24dbb6b0267"), city: "Jaipur", state: "Rajasthan", locality: "C-Scheme",
      amenities: ["Power Backup", "24/7 Security", "Elevator / Lift", "CCTV Surveillance"],
    },

    // ── Kochi ──────────────────────────────────────────────────────────────────
    {
      slug: "marine-drive-3bhk-kochi", title: "Backwater 3 BHK, Marine Drive",
      type: "Apartment", purpose: "Sale", price: 13500000, area: 1600, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "West", possession: "Ready to Move", builder: "Sobha Ltd",
      rera: "K-RERA/P/2024/0035", featured: true, ownerId: rohan, views: 268, matchScore: 89,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Kochi", state: "Kerala", locality: "Marine Drive",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Power Backup"],
    },
    {
      slug: "kakkanad-2bhk-kochi", title: "InfoPark 2 BHK, Kakkanad",
      type: "Apartment", purpose: "Rent", price: 28000, area: 1120, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Skyline Builders",
      rera: "K-RERA/P/2024/0036", featured: false, ownerId: ananya, views: 141, matchScore: 80,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Kochi", state: "Kerala", locality: "Kakkanad",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "panampilly-villa-kochi", title: "Lagoon 4 BHK Villa, Panampilly Nagar",
      type: "Villa", purpose: "Sale", price: 30000000, area: 2900, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Unfurnished", facing: "North-East", possession: "Ready to Move", builder: "Asset Homes",
      rera: "K-RERA/P/2024/0037", featured: false, ownerId: priya, views: 126, matchScore: 84,
      image: IMG("photo-1564013799919-ab600027ffc6"), city: "Kochi", state: "Kerala", locality: "Panampilly Nagar",
      amenities: ["Landscaped Garden", "Covered Parking", "24/7 Security", "Clubhouse"],
    },
    {
      slug: "edappally-pg-kochi", title: "Riverside Co-living PG, Edappally",
      type: "PG", purpose: "Rent", price: 13000, area: 190, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 0,
      furnishing: "Furnished", facing: "South", possession: "Ready to Move", builder: "Independent",
      rera: "K-RERA/P/2024/0038", featured: false, ownerId: rohan, views: 152, matchScore: 72,
      image: IMG("photo-1555854877-bab0e564b8d5"), city: "Kochi", state: "Kerala", locality: "Edappally",
      amenities: ["Power Backup", "24/7 Security", "Community Hall", "CCTV Surveillance"],
    },

    // ── Gurgaon ──────────────────────────────────────────────────────────────
    {
      slug: "golf-course-4bhk-gurgaon", title: "Aralias 4 BHK, Golf Course Road",
      type: "Apartment", purpose: "Sale", price: 38000000, area: 2600, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "DLF",
      rera: "GGM/456/188/2024/0039", featured: true, ownerId: ananya, views: 334, matchScore: 92,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Gurgaon", state: "Haryana", locality: "Golf Course Road",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Landscaped Garden"],
    },
    {
      slug: "sohna-2bhk-gurgaon", title: "Sohna Heights 2 BHK, Sohna Road",
      type: "Apartment", purpose: "Sale", price: 9500000, area: 1180, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Unfurnished", facing: "North", possession: "Under Construction", builder: "M3M",
      rera: "GGM/457/189/2024/0040", featured: false, ownerId: rohan, views: 145, matchScore: 78,
      image: IMG("photo-1494526585095-c41746248156"), city: "Gurgaon", state: "Haryana", locality: "Sohna Road",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "sector56-studio-gurgaon", title: "Urban Studio, Sector 56",
      type: "Studio", purpose: "Rent", price: 21000, area: 500, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Independent",
      rera: "GGM/458/190/2024/0041", featured: false, ownerId: priya, views: 103, matchScore: 73,
      image: IMG("photo-1522708323590-d24dbb6b0267"), city: "Gurgaon", state: "Haryana", locality: "Sector 56",
      amenities: ["Power Backup", "24/7 Security", "Elevator / Lift", "CCTV Surveillance"],
    },

    // ── Ahmedabad ──────────────────────────────────────────────────────────────
    {
      slug: "satellite-3bhk-ahmedabad", title: "Satellite Square 3 BHK, Satellite",
      type: "Apartment", purpose: "Sale", price: 12000000, area: 1700, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Adani Realty",
      rera: "PR/GJ/AHMEDABAD/0042", featured: false, ownerId: ananya, views: 188, matchScore: 85,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Ahmedabad", state: "Gujarat", locality: "Satellite",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse"],
    },
    {
      slug: "bodakdev-bungalow-ahmedabad", title: "Grand 6 BHK Bungalow, Bodakdev",
      type: "Bungalow", purpose: "Sale", price: 65000000, area: 5500, bhk: "6 BHK", bedrooms: 6, bathrooms: 6, parking: 4,
      furnishing: "Semi-Furnished", facing: "North", possession: "Ready to Move", builder: "Independent",
      rera: "PR/GJ/AHMEDABAD/0043", featured: false, ownerId: priya, views: 174, matchScore: 88,
      image: IMG("photo-1605276374104-dee2a0ed3cd6"), city: "Ahmedabad", state: "Gujarat", locality: "Bodakdev",
      amenities: ["Swimming Pool", "Landscaped Garden", "Covered Parking", "24/7 Security", "Smart Home"],
    },
    {
      slug: "sg-highway-office-ahmedabad", title: "Corporate Office, SG Highway",
      type: "Office", purpose: "Rent", price: 220000, area: 3000, bhk: null, bedrooms: 0, bathrooms: 2, parking: 5,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Safal Group",
      rera: "PR/GJ/AHMEDABAD/0044", featured: false, ownerId: rohan, views: 137, matchScore: 79,
      image: IMG("photo-1497366216548-37526070297c"), city: "Ahmedabad", state: "Gujarat", locality: "SG Highway",
      amenities: ["Power Backup", "24/7 Security", "Covered Parking", "Elevator / Lift", "CCTV Surveillance"],
    },

    // ── Noida ──────────────────────────────────────────────────────────────────
    {
      slug: "sector150-3bhk-noida", title: "Sports City 3 BHK, Sector 150",
      type: "Apartment", purpose: "Sale", price: 14000000, area: 1750, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "North-East", possession: "Ready to Move", builder: "ATS Group",
      rera: "UPRERAPRJ0045", featured: true, ownerId: ananya, views: 256, matchScore: 87,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Noida", state: "Uttar Pradesh", locality: "Sector 150",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Landscaped Garden"],
    },
    {
      slug: "sector137-2bhk-noida", title: "Express Park 2 BHK, Sector 137",
      type: "Apartment", purpose: "Rent", price: 26000, area: 1050, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Furnished", facing: "East", possession: "Ready to Move", builder: "Paras Buildtech",
      rera: "UPRERAPRJ0046", featured: false, ownerId: rohan, views: 128, matchScore: 77,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Noida", state: "Uttar Pradesh", locality: "Sector 137",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "sector78-plot-noida", title: "Residential Plot, Sector 78",
      type: "Plot", purpose: "Sale", price: 8500000, area: 1600, bhk: null, bedrooms: 0, bathrooms: 0, parking: 0,
      furnishing: "Unfurnished", facing: "South-East", possession: "Ready to Move", builder: "Independent",
      rera: "UPRERAPRJ0047", featured: false, ownerId: priya, views: 91, matchScore: 72,
      image: IMG("photo-1500382017468-9049fed747ef"), city: "Noida", state: "Uttar Pradesh", locality: "Sector 78",
      amenities: ["24/7 Security", "Gated Community"],
    },

    // ── Kolkata ──────────────────────────────────────────────────────────────
    {
      slug: "salt-lake-2bhk-kolkata", title: "Salt Lake 2 BHK, Sector V",
      type: "Apartment", purpose: "Sale", price: 8500000, area: 1150, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Merlin Group",
      rera: "WBRERA/P/0048", featured: false, ownerId: ananya, views: 163, matchScore: 81,
      image: IMG("photo-1494526585095-c41746248156"), city: "Kolkata", state: "West Bengal", locality: "Salt Lake",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },
    {
      slug: "ballygunge-4bhk-kolkata", title: "Heritage 4 BHK, Ballygunge",
      type: "Apartment", purpose: "Sale", price: 26000000, area: 2300, bhk: "4 BHK", bedrooms: 4, bathrooms: 4, parking: 2,
      furnishing: "Furnished", facing: "South", possession: "Ready to Move", builder: "PS Group",
      rera: "WBRERA/P/0049", featured: false, ownerId: rohan, views: 201, matchScore: 86,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Kolkata", state: "West Bengal", locality: "Ballygunge",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Power Backup"],
    },
    {
      slug: "rajarhat-1bhk-kolkata", title: "New Town 1 BHK, Rajarhat",
      type: "Apartment", purpose: "Rent", price: 18000, area: 650, bhk: "1 BHK", bedrooms: 1, bathrooms: 1, parking: 1,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Bengal Peerless",
      rera: "WBRERA/P/0050", featured: false, ownerId: priya, views: 117, matchScore: 75,
      image: IMG("photo-1494526585095-c41746248156"), city: "Kolkata", state: "West Bengal", locality: "Rajarhat",
      amenities: ["Power Backup", "Elevator / Lift", "Visitor Parking", "24/7 Security"],
    },

    // ── Chennai (top-up) ───────────────────────────────────────────────────────
    {
      slug: "adyar-3bhk-chennai", title: "Marina 3 BHK, Adyar",
      type: "Apartment", purpose: "Sale", price: 16000000, area: 1600, bhk: "3 BHK", bedrooms: 3, bathrooms: 3, parking: 2,
      furnishing: "Semi-Furnished", facing: "East", possession: "Ready to Move", builder: "Casagrand",
      rera: "TN/29/Building/0051", featured: false, ownerId: ananya, views: 192, matchScore: 85,
      image: IMG("photo-1567496898669-ee935f5f647a"), city: "Chennai", state: "Tamil Nadu", locality: "Adyar",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse"],
    },
    {
      slug: "anna-nagar-2bhk-chennai", title: "Tower Park 2 BHK, Anna Nagar",
      type: "Apartment", purpose: "Rent", price: 30000, area: 1100, bhk: "2 BHK", bedrooms: 2, bathrooms: 2, parking: 1,
      furnishing: "Furnished", facing: "North", possession: "Ready to Move", builder: "Akshaya",
      rera: "TN/29/Building/0052", featured: false, ownerId: rohan, views: 138, matchScore: 78,
      image: IMG("photo-1502672260266-1c1ef2d93688"), city: "Chennai", state: "Tamil Nadu", locality: "Anna Nagar",
      amenities: ["Gym / Fitness Centre", "Power Backup", "Elevator / Lift", "24/7 Security"],
    },

    // ── Mumbai (5+ BHK penthouse for BHK variety) ────────────────────────────────
    {
      slug: "worli-penthouse-mumbai", title: "Sea-Facing 5 BHK Penthouse, Worli",
      type: "Apartment", purpose: "Sale", price: 180000000, area: 4200, bhk: "5 BHK", bedrooms: 5, bathrooms: 5, parking: 3,
      furnishing: "Furnished", facing: "West", possession: "Ready to Move", builder: "Lodha Group",
      rera: "P51800000053", featured: true, ownerId: priya, views: 421, matchScore: 95,
      image: IMG("photo-1512917774080-9991f1c4c750"), city: "Mumbai", state: "Maharashtra", locality: "Worli",
      amenities: ["Swimming Pool", "Gym / Fitness Centre", "24/7 Security", "Clubhouse", "Smart Home", "Power Backup"],
    },
  ];

  // Image pools for varied galleries — verified Unsplash property photos.
  const INTERIORS = [
    "photo-1567496898669-ee935f5f647a", "photo-1560448204-e02f11c3d0e2", "photo-1545324418-cc1a3fa10c00",
    "photo-1560185007-cde436f6a4d0", "photo-1576941089067-2de3c901e126", "photo-1600585154340-be6161a56a0c",
    "photo-1600607687939-ce8a6c25118c", "photo-1600566753086-00f18fb6b3ea", "photo-1600210492486-724fe5c67fb0",
    "photo-1600047509807-ba8f99d2cdde", "photo-1502005229762-cf1b2da7c5d6", "photo-1484154218962-a197022b5858",
    "photo-1556909114-f6e7ad7d3136", "photo-1505691938895-1758d7feb511", "photo-1522444195799-478538b28823",
  ];
  const EXTERIORS = [
    "photo-1570129477492-45c003edd2be", "photo-1583608205776-bfd35f0d9f83", "photo-1512453979798-5ea266f8880c",
    "photo-1493809842364-78817add7ffb", "photo-1568605114967-8130f3a36994", "photo-1580587771525-78b9dba3b914",
    "photo-1600596542815-ffad4c1539a9", "photo-1486304873000-235643847519", "photo-1600573472550-8090b5e0745e",
    "photo-1600121848594-d8644e57abab", "photo-1598928506311-c55ded91a20c", "photo-1599809275671-b5942cabc7a2",
    "photo-1613977257363-707ba9348227", "photo-1502005097973-6a7082348e28",
  ];
  const pick = (pool: string[], start: number, n: number) =>
    Array.from({ length: n }, (_, k) => IMG(pool[(start + k) % pool.length]!));

  // Each property gets the type-appropriate hero + rotating extras, offset by
  // index so neighbouring listings never share the same gallery.
  function buildGallery(hero: string, type: string, idx: number): string[] {
    if (type === "Plot") return [hero, ...pick(EXTERIORS, idx, 3)];
    if (type === "Office") return [hero, ...pick(INTERIORS, idx * 2, 2), ...pick(EXTERIORS, idx, 1)];
    return [hero, ...pick(EXTERIORS, idx, 1), ...pick(INTERIORS, idx * 3, 3)];
  }

  const propIdBySlug: Record<string, string> = {};
  let propIdx = 0;
  for (const p of propertySeed) {
    const { city, state, locality, image, ...rest } = p;
    const images = buildGallery(image, p.type, propIdx++);
    const prop = await prisma.property.upsert({
      where: { slug: p.slug },
      update: {
        ...rest, price: BigInt(p.price), pricePerSqft: Math.round(p.price / p.area),
        images, status: "Active",
      },
      create: {
        ...rest, price: BigInt(p.price), pricePerSqft: Math.round(p.price / p.area),
        images, status: "Active",
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
  console.log(`✓ Seeded ${visitSeed.length} site visits for demo buyer`);

  // ── Engagement: wishlists ("liked") + contact requests (for the activity feeds) ──
  const favoriteSeed: Array<[string, string]> = [
    [rohan, "green-acres-villa-whitefield-bengaluru"],
    [rohan, "palm-grove-3bhk-gachibowli-hyderabad"],
    [rohan, "skyline-3bhk-bandra-west-mumbai"],
    [rohan, "worli-penthouse-mumbai"],
    [ananya, "skyline-3bhk-bandra-west-mumbai"],
    [ananya, "worli-penthouse-mumbai"],
    [ananya, "orchid-3bhk-indiranagar-bengaluru"],
  ];
  for (const [favUserId, slug] of favoriteSeed) {
    const pid = propIdBySlug[slug];
    if (!pid) continue;
    await prisma.favorite.upsert({
      where: { userId_propertyId: { userId: favUserId, propertyId: pid } },
      create: { userId: favUserId, propertyId: pid },
      update: {},
    });
  }

  const unlockSeed = [
    { id: "seed-unlock-01", userId: rohan, slug: "skyline-3bhk-bandra-west-mumbai" },
    { id: "seed-unlock-02", userId: ananya, slug: "green-acres-villa-whitefield-bengaluru" },
    { id: "seed-unlock-03", userId: rohan, slug: "worli-penthouse-mumbai" },
    { id: "seed-unlock-04", userId: ananya, slug: "orchid-3bhk-indiranagar-bengaluru" },
  ];
  for (const u of unlockSeed) {
    const pid = propIdBySlug[u.slug];
    if (!pid) continue;
    await prisma.creditTransaction.upsert({
      where: { id: u.id },
      create: { id: u.id, userId: u.userId, type: "debit", amount: 1, reason: "contact_unlock", propertyId: pid },
      update: { propertyId: pid },
    });
  }
  console.log(`✓ Seeded ${favoriteSeed.length} wishlists + ${unlockSeed.length} contact requests`);

  // ── Audit log (idempotent: explicit ids) ────────────────────────────────────
  const auditSeed = [
    { id: "seed-audit-01", userId: uid("sa@nxtsft.com"), action: "user.role_changed", entity: "User", entityId: priya, ipAddress: "203.0.113.10", hoursAgo: 1 },
    { id: "seed-audit-02", userId: uid("admin@nxtsft.com"), action: "property.approved", entity: "Property", entityId: propIdBySlug["skyline-3bhk-bandra-west-mumbai"], ipAddress: "203.0.113.22", hoursAgo: 3 },
    { id: "seed-audit-03", userId: uid("admin@nxtsft.com"), action: "plan.updated", entity: "Plan", entityId: "seeker-basic", ipAddress: "203.0.113.22", hoursAgo: 6 },
    { id: "seed-audit-04", userId: uid("supervisor@nxtsft.com"), action: "lead.reassigned", entity: "Lead", entityId: "seed-lead-03", ipAddress: "203.0.113.31", hoursAgo: 9 },
    { id: "seed-audit-05", userId: uid("sa@nxtsft.com"), action: "config.updated", entity: "PlatformConfig", entityId: "gst_rate", ipAddress: "203.0.113.10", hoursAgo: 20 },
    { id: "seed-audit-06", userId: uid("support@nxtsft.com"), action: "ticket.resolved", entity: "Ticket", entityId: "seed-tkt-04", ipAddress: "203.0.113.44", hoursAgo: 26 },
  ];
  for (const a of auditSeed) {
    const { hoursAgo, ...rest } = a;
    const data = { ...rest, createdAt: new Date(Date.now() - hoursAgo * 3_600_000) };
    await prisma.auditLog.upsert({ where: { id: a.id }, update: data, create: data });
  }
  console.log(`✓ Seeded ${auditSeed.length} audit-log entries`);

  // ── Subscriptions (idempotent: explicit ids) ────────────────────────────────
  const DAY = 86_400_000;
  const subSeed = [
    { id: "seed-sub-01", userId: rohan, planId: "seeker-premium", planName: "Premium", amount: 69900, status: "Active", startAgo: 12, endIn: 78 },
    { id: "seed-sub-02", userId: ananya, planId: "seeker-basic", planName: "Basic", amount: 29900, status: "Active", startAgo: 5, endIn: 55 },
    { id: "seed-sub-03", userId: rohan, planId: "seeker-instant", planName: "Instant", amount: 9900, status: "Expired", startAgo: 60, endIn: -30 },
  ];
  for (const s of subSeed) {
    const { startAgo, endIn, ...rest } = s;
    const start = new Date(Date.now() - startAgo * DAY);
    const end = new Date(Date.now() + endIn * DAY);
    const data = {
      ...rest,
      amount: BigInt(s.amount),
      cycle: "one-time",
      startDate: start,
      endDate: end,
      renewalDate: s.status === "Active" ? end : null,
    };
    await prisma.subscription.upsert({ where: { id: s.id }, update: data, create: { id: s.id, ...data } });
  }
  console.log(`✓ Seeded ${subSeed.length} subscriptions`);

  // ── Builders directory (bulk-imported from the Andhra Pradesh list) ──────────
  const buildersPath = join(dirname(fileURLToPath(import.meta.url)), "ap-builders.json");
  const buildersData = JSON.parse(readFileSync(buildersPath, "utf8")) as Array<{
    companyName: string; ownerName: string; mobile: string;
    projectType: string; state: string; district: string; city: string;
  }>;
  const CHUNK = 1000;
  let builderTotal = 0;
  for (let i = 0; i < buildersData.length; i += CHUNK) {
    const res = await prisma.builder.createMany({ data: buildersData.slice(i, i + CHUNK), skipDuplicates: true });
    builderTotal += res.count;
  }
  console.log(`✓ Seeded ${builderTotal} builders (of ${buildersData.length} in file)`);

  // ── Team Members (Sales Reps) ────────────────────────────────────────────
  const teamMembers = [
    { email: "priya.sharma@nxtsft.com", name: "Priya Sharma", city: "Mumbai" },
    { email: "karan.joshi@nxtsft.com", name: "Karan Joshi", city: "Bengaluru" },
    { email: "anita.rao@nxtsft.com", name: "Anita Rao", city: "Hyderabad" },
    { email: "devansh.patel@nxtsft.com", name: "Devansh Patel", city: "Pune" },
  ];

  for (const member of teamMembers) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {},
      create: {
        email: member.email,
        name: member.name,
        city: member.city,
        role: "sales",
        verified: true,
        passwordHash: hash,
      },
    });
  }
  console.log(`✓ Seeded ${teamMembers.length} team members (Sales Reps)`);

  // ── Agents ──────────────────────────────────────────────────────────────
  const agents = [
    { email: "priya.sharma.agent@nxtsft.com", name: "Priya Sharma", initials: "PS", rating: 4.9, reviews: 87, deals: 142, since: 2018 },
    { email: "karan.joshi.agent@nxtsft.com", name: "Karan Joshi", initials: "KJ", rating: 4.8, reviews: 63, deals: 98, since: 2019 },
    { email: "devansh.patel.agent@nxtsft.com", name: "Devansh Patel", initials: "DP", rating: 4.6, reviews: 41, deals: 67, since: 2017 },
    { email: "meera.krishnan@nxtsft.com", name: "Meera Krishnan", initials: "MK", rating: 4.9, reviews: 96, deals: 161, since: 2015 },
    { email: "anita.rao.agent@nxtsft.com", name: "Anita Rao", initials: "AR", rating: 4.7, reviews: 34, deals: 54, since: 2020 },
    { email: "rohit.mehra@nxtsft.com", name: "Rohit Mehra", initials: "RM", rating: 4.8, reviews: 72, deals: 119, since: 2016 },
    { email: "lakshmi.nair@nxtsft.com", name: "Lakshmi Nair", initials: "LN", rating: 4.7, reviews: 58, deals: 83, since: 2019 },
    { email: "arjun.kapoor@nxtsft.com", name: "Arjun Kapoor", initials: "AK", rating: 4.5, reviews: 45, deals: 76, since: 2018 },
    { email: "vijay.deshmukh@nxtsft.com", name: "Vijay Deshmukh", initials: "VD", rating: 4.6, reviews: 52, deals: 94, since: 2017 },
    { email: "fatima.sheikh@nxtsft.com", name: "Fatima Sheikh", initials: "FS", rating: 4.8, reviews: 67, deals: 108, since: 2018 },
    { email: "gaurav.singh@nxtsft.com", name: "Gaurav Singh", initials: "GS", rating: 4.5, reviews: 38, deals: 52, since: 2020 },
    { email: "divya.menon@nxtsft.com", name: "Divya Menon", initials: "DM", rating: 4.7, reviews: 43, deals: 71, since: 2019 },
    { email: "pooja.agarwal@nxtsft.com", name: "Pooja Agarwal", initials: "PA", rating: 4.6, reviews: 55, deals: 88, since: 2018 },
    { email: "amit.bhatt@nxtsft.com", name: "Amit Bhatt", initials: "AB", rating: 4.4, reviews: 29, deals: 45, since: 2021 },
    { email: "suresh.iyer@nxtsft.com", name: "Suresh Iyer", initials: "SI", rating: 5.0, reviews: 4, deals: 1, since: 2024 },
  ];

  for (const agent of agents) {
    await prisma.user.upsert({
      where: { email: agent.email },
      update: {},
      create: {
        email: agent.email,
        name: agent.name,
        city: "Mumbai",
        role: "agent",
        verified: true,
        passwordHash: hash,
        metadata: {
          initials: agent.initials,
          rating: agent.rating,
          reviews: agent.reviews,
          deals: agent.deals,
          since: agent.since,
        },
      },
    });
  }
  console.log(`✓ Seeded ${agents.length} agents`);

  // ── Reviews for Properties ──────────────────────────────────────────────
  const allProperties = await prisma.property.findMany({ take: 20 });
  const sampleReviewTitles = [
    "Excellent property, highly recommended",
    "Great location and amenities",
    "Well-maintained and professional",
    "Amazing experience, will buy again",
    "Perfect for my family",
    "Outstanding service from the agent",
    "Smooth transaction, very happy",
    "Beautiful property, worth the price",
    "Professional team, highly satisfied",
    "Exceeded expectations",
  ];

  const buyersForReviews = await prisma.user.findMany({ where: { role: "user" }, take: 10 });
  let reviewCount = 0;

  for (const property of allProperties) {
    for (let i = 0; i < 3; i++) {
      const user = buyersForReviews[i % buyersForReviews.length];
      const title = sampleReviewTitles[i % sampleReviewTitles.length];
      await prisma.review.upsert({
        where: { id: `${property.id}-review-${i}` },
        update: {},
        create: {
          id: `${property.id}-review-${i}`,
          propertyId: property.id,
          authorId: user.id,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          title,
          content: `This property exceeded my expectations. ${title}. Highly recommended!`,
        },
      });
      reviewCount++;
    }
  }
  console.log(`✓ Seeded ${reviewCount} reviews for properties`);

  // ── Property Views ──────────────────────────────────────────────────────
  const propertiesToView = await prisma.property.findMany({ take: 30 });
  const usersForViews = await prisma.user.findMany({ where: { role: "user" }, take: 15 });
  let viewCount = 0;

  for (const property of propertiesToView) {
    for (let i = 0; i < 3; i++) {
      const user = usersForViews[i % usersForViews.length];
      await prisma.propertyView.upsert({
        where: { id: `${property.id}-view-${i}` },
        update: {},
        create: {
          id: `${property.id}-view-${i}`,
          propertyId: property.id,
          userId: user.id,
          durationSec: Math.floor(Math.random() * 300) + 30,
          contactUnlocked: Math.random() > 0.6,
        },
      });
      viewCount++;
    }
  }
  console.log(`✓ Seeded ${viewCount} property views`);

  // ── Listings ────────────────────────────────────────────────────────────
  const propertiesForListings = await prisma.property.findMany({ take: 25 });
  const salesReps = await prisma.user.findMany({ where: { role: "sales" } });
  let listingCount = 0;

  for (const property of propertiesForListings) {
    const rep = salesReps[listingCount % salesReps.length];
    await prisma.listing.upsert({
      where: { id: `listing-${property.id}` },
      update: {},
      create: {
        id: `listing-${property.id}`,
        propertyId: property.id,
        createdBy: rep.id,
        description: `${property.bhk} in ${property.title}. ${property.amenities?.slice(0, 3).join(", ")}`,
        highlights: property.amenities?.slice(0, 5) || [],
        active: true,
        promoted: Math.random() > 0.7,
      },
    });
    listingCount++;
  }
  console.log(`✓ Seeded ${listingCount} listings`);

  console.log(`\nDemo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
