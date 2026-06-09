'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// NxtSft PRD Generator  –  produces nxtsft.pdf in project root
// ─────────────────────────────────────────────────────────────────────────────
const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');

const OUT = path.join(__dirname, '..', 'nxtsft.pdf');

const doc = new PDFDocument({
  size:          'A4',
  autoFirstPage: true,
  bufferPages:   true,
  margins:       { top: 65, bottom: 80, left: 60, right: 60 },
  info: {
    Title:   'NxtSft — Product Requirements Document',
    Author:  'Aashish Reddy',
    Subject: 'PRD v1.0',
    Creator: 'NxtSft',
  },
});
var stream = fs.createWriteStream(OUT);
doc.pipe(stream);

// ── Layout constants ──────────────────────────────────────────────────────────
const PW  = doc.page.width;   // 595.28 pt  (A4)
const PH  = doc.page.height;  // 841.89 pt
const ML  = 60;
const MR  = 60;
const TW  = PW - ML - MR;     // ~475 pt  (text width)
const BOT = PH - 65;          // footer guard line

const B   = 'Helvetica-Bold';
const R   = 'Helvetica';

// ── Core helpers ──────────────────────────────────────────────────────────────

function gap(n)  { doc.moveDown(n == null ? 0.5 : n); }

function rule(weight, color) {
  doc.save()
     .moveTo(ML, doc.y).lineTo(PW - MR, doc.y)
     .lineWidth(weight || 0.5)
     .strokeColor(color || '#AAAAAA')
     .stroke()
     .restore();
}

function guard(pts) {
  if (doc.y + (pts || 60) > BOT) doc.addPage();
}

// ── Typography helpers ────────────────────────────────────────────────────────

// Major section – always on a new page
function SECT(num, title) {
  doc.addPage();
  gap(0.2);
  rule(2.5, '#000000');
  gap(0.55);
  doc.font(B).fontSize(15).fillColor('#000')
     .text(num + '.   ' + title, ML, doc.y, { width: TW });
  gap(0.2);
  rule(0.8, '#000000');
  gap(0.55);
  doc.font(R).fontSize(9.5).fillColor('#000');
}

// Sub-section
function SUB(title) {
  guard(75);
  gap(0.7);
  doc.font(B).fontSize(11).fillColor('#000').text(title, ML, doc.y, { width: TW });
  gap(0.08);
  rule(0.4, '#AAAAAA');
  gap(0.35);
  doc.font(R).fontSize(9.5).fillColor('#000');
}

// Tab / feature heading (inside a subsection)
function TAB(title) {
  guard(50);
  gap(0.45);
  doc.font(B).fontSize(9.8).fillColor('#000').text(title, ML, doc.y, { width: TW });
  gap(0.12);
  doc.font(R).fontSize(9.5).fillColor('#000');
}

// Body paragraph
function P(text) {
  doc.font(R).fontSize(9.5).fillColor('#000')
     .text(text, ML, doc.y, { width: TW, lineGap: 2 });
  gap(0.18);
}

// Bullet
function BUL(text, depth) {
  depth = depth || 0;
  var x = ML + 14 + depth * 13;
  var w = TW - 14  - depth * 13;
  doc.font(R).fontSize(9.5).fillColor('#000')
     .text('•  ' + text, x, doc.y, { width: w, lineGap: 1.5 });
}

// Labeled bullet  (bold label + regular value)
function LBUL(label, text, depth) {
  depth = depth || 0;
  var x = ML + 14 + depth * 13;
  var w = TW - 14  - depth * 13;
  doc.font(B).fontSize(9.5).fillColor('#000')
     .text('•  ' + label + ': ', x, doc.y, { continued: true, width: w });
  doc.font(R).text(text, { lineGap: 1.5 });
}

// Key-value row (used in cover + data model sections)
function KV(key, val) {
  doc.font(B).fontSize(9.5).fillColor('#000')
     .text(key + ':  ', ML, doc.y, { continued: true, width: TW });
  doc.font(R).text(val, { lineGap: 2 });
  gap(0.3);
}

// Thin divider
function HR() {
  gap(0.15);
  rule(0.3, '#DDDDDD');
  gap(0.15);
}

// ─────────────────────────────────────────────────────────────────────────────
// ██  COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────

doc.y = 130;
rule(3, '#000000');
gap(1.3);

doc.font(B).fontSize(42).fillColor('#000')
   .text('NxtSft', ML, doc.y, { width: TW, align: 'center' });
gap(0.38);

doc.font(R).fontSize(16).fillColor('#000')
   .text('Product Requirements Document', ML, doc.y, { width: TW, align: 'center' });
gap(0.28);

doc.font(R).fontSize(10.5).fillColor('#333')
   .text('Real Estate Platform  —  Multi-Portal Management Suite', ML, doc.y, { width: TW, align: 'center' });
gap(2.8);

rule(1, '#000000');
gap(1.1);

// Meta block
var mx = ML + 90;
var mw = TW - 90;

function covRow(k, v) {
  doc.font(B).fontSize(9.5).fillColor('#000')
     .text(k + ':  ', mx, doc.y, { continued: true, width: mw });
  doc.font(R).text(v, { lineGap: 2 });
  gap(0.38);
}

covRow('Author',     'Aashish Reddy');
covRow('Version',    '1.0');
covRow('Date',       'June 2026');
covRow('Status',     'Draft');
covRow('Platform',   'NxtSft.com');
covRow('Technology', 'Next.js 15  ·  React 19  ·  TypeScript  ·  Tailwind CSS 4');

gap(1.8);
rule(1, '#000000');
gap(0.75);

doc.font(R).fontSize(8).fillColor('#777')
   .text('Confidential — Internal Use Only. All rights reserved.', ML, doc.y, { width: TW, align: 'center' });

// ─────────────────────────────────────────────────────────────────────────────
// ██  TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────

doc.addPage();
gap(0.2);
rule(2.5, '#000000');
gap(0.55);
doc.font(B).fontSize(15).fillColor('#000').text('Table of Contents', ML, doc.y, { width: TW });
gap(0.2);
rule(0.8, '#000000');
gap(0.65);

var tocItems = [
  [false, '1.  Executive Summary'],
  [false, '2.  Platform Overview & Architecture'],
  [false, '3.  User Roles & Permission Hierarchy'],
  [false, '4.  Public Website & Landing Pages'],
  [true,  '4.1  Home Page'],
  [true,  '4.2  User Authentication (Login / Register)'],
  [true,  '4.3  Properties Listing & Property Detail'],
  [true,  '4.4  Agents Directory'],
  [true,  '4.5  List a Property'],
  [true,  '4.6  Pricing Plans'],
  [true,  '4.7  User Profile Page'],
  [true,  '4.8  Legal & Policy Pages'],
  [false, '5.  User Portal  —  Home Buyer / Property Seeker'],
  [true,  '5.1  Overview Dashboard'],
  [true,  '5.2  Saved Properties'],
  [true,  '5.3  Recently Viewed'],
  [true,  '5.4  My Credits & Token System'],
  [true,  '5.5  Search Alerts'],
  [true,  '5.6  My Listings'],
  [true,  '5.7  Site Visits'],
  [true,  '5.8  EMI Calculator'],
  [true,  '5.9  Documents & KYC'],
  [true,  '5.10  Profile & Preferences'],
  [false, '6.  Admin Portal  —  Operations Management'],
  [true,  '6.1  Operations Dashboard'],
  [true,  '6.2  Team Management'],
  [true,  '6.3  Listings Management'],
  [true,  '6.4  Lead Management'],
  [true,  '6.5  CRM Pipeline'],
  [true,  '6.6  Subscriptions'],
  [true,  '6.7  Property Views Analytics'],
  [true,  '6.8  Click Alerts'],
  [true,  '6.9  Marketing Tools'],
  [true,  '6.10  Developer / Builder Management'],
  [true,  '6.11  Reports'],
  [true,  '6.12  Plans Manager'],
  [true,  '6.13  Commissions'],
  [false, '7.  Sales Portal  —  Field Sales Representative'],
  [true,  '7.1  My Leads'],
  [true,  '7.2  Lead Details'],
  [true,  '7.3  Activity Log'],
  [true,  '7.4  Click-to-Call'],
  [true,  '7.5  Site Visits'],
  [true,  '7.6  My Commission'],
  [true,  '7.7  Listings'],
  [true,  '7.8  Reports'],
  [false, '8.  Supervisor Portal  —  Team Desk'],
  [true,  '8.1  Team Dashboard'],
  [true,  '8.2  Team Leads'],
  [true,  '8.3  Lead Reassignment'],
  [true,  '8.4  Activity Monitor'],
  [true,  '8.5  Performance Analytics'],
  [true,  '8.6  Visit Calendar'],
  [true,  '8.7  Escalations'],
  [true,  '8.8  Reports'],
  [false, '9.  Support Portal  —  Support Administration'],
  [true,  '9.1  Dashboard'],
  [true,  '9.2  Ticket Queue'],
  [true,  '9.3  Escalations'],
  [true,  '9.4  My Assignments'],
  [true,  '9.5  TAT Report'],
  [true,  '9.6  Knowledge Base'],
  [false, '10.  Super Admin Portal  —  Command Centre'],
  [true,  '10.1  Command Dashboard'],
  [true,  '10.2  User Management'],
  [true,  '10.3  All Teams'],
  [true,  '10.4  Platform Configuration'],
  [true,  '10.5  Global Analytics'],
  [true,  '10.6  Audit Trail'],
  [true,  '10.7  AI Model Control'],
  [true,  '10.8  Notifications Centre'],
  [true,  '10.9  Content CMS'],
  [true,  '10.10  Security Console'],
  [true,  '10.11  Billing & Revenue'],
  [true,  '10.12  Role & Permission Management'],
  [true,  '10.13  Plans Manager'],
  [true,  '10.14  Support Tickets'],
  [true,  '10.15  Reports'],
  [false, '11.  Data Models & Field Specifications'],
  [false, '12.  Subscription & Pricing Plans'],
  [false, '13.  Authentication, Session & Security'],
];

for (var i = 0; i < tocItems.length; i++) {
  var isChild = tocItems[i][0];
  var label   = tocItems[i][1];
  guard(20);
  if (!isChild) {
    gap(0.2);
    doc.font(B).fontSize(9.5).fillColor('#000').text(label, ML, doc.y, { width: TW, lineGap: 1.5 });
  } else {
    doc.font(R).fontSize(9).fillColor('#000').text(label, ML + 20, doc.y, { width: TW - 20, lineGap: 1.5 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ██  1. EXECUTIVE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

SECT('1', 'Executive Summary');

P('NxtSft is an end-to-end real estate platform that connects home buyers, property owners, and sales professionals through a unified, role-based portal suite. The platform eliminates brokerage fees for buyers, provides verified property listings across 50+ Indian cities, and equips internal teams with purpose-built tools for lead management, CRM, team supervision, customer support, and platform administration.');

P('NxtSft is built on Next.js 15 with React 19 and TypeScript, delivering a fast, server-rendered, fully typed application. The portal system is structured around seven distinct user roles, each with a dedicated interface tailored to that role\'s specific workflows. All portals are accessible from a single domain and share a common design language and authentication layer.');

gap(0.3);
doc.font(B).fontSize(10).fillColor('#000').text('Key Platform Objectives', ML, doc.y, { width: TW });
gap(0.2);
BUL('Zero-brokerage property discovery for home buyers with RERA-verified listings.');
BUL('Token-based contact-unlock system to monetise buyer access to owner details.');
BUL('Full-funnel CRM for sales teams — from lead ingestion through site visit to close.');
BUL('Supervisor oversight with real-time team performance monitoring and escalation workflows.');
BUL('Centralised support ticketing with SLA enforcement and TAT reporting.');
BUL('Super Admin command centre for platform configuration, billing, AI tuning, and audit trails.');

gap(0.3);
doc.font(B).fontSize(10).fillColor('#000').text('Key Metrics (Platform Goals)', ML, doc.y, { width: TW });
gap(0.2);
BUL('10,000+ verified property listings across 12 major Indian cities.');
BUL('50+ active cities covered via listing and search.');
BUL('4.8 / 5.0 customer satisfaction rating target.');
BUL('1,00,000+ registered customers.');
BUL('100% RERA-verified listings.');
BUL('₹0 brokerage for home buyers.');

// ─────────────────────────────────────────────────────────────────────────────
// ██  2. PLATFORM OVERVIEW & ARCHITECTURE
// ─────────────────────────────────────────────────────────────────────────────

SECT('2', 'Platform Overview & Architecture');

SUB('2.1  Technical Stack');
LBUL('Framework',  'Next.js 15 with App Router (React Server Components + Client Components)');
LBUL('Language',   'TypeScript 5.8 — fully typed throughout');
LBUL('Styling',    'Tailwind CSS 4 with tw-animate-css for motion utilities');
LBUL('UI Library', 'Radix UI primitives (Dialog, Tabs, Progress, Tooltip, Separator, Slot)');
LBUL('Icons',      'Lucide React icon library');
LBUL('Toasts',     'Sonner notification library');
LBUL('Auth',       'Custom localStorage-based session system (demo); production-ready role model');
LBUL('Data',       'Static JSON fixtures (demo); pluggable to REST / Supabase in production');
LBUL('Build',      'Vercel-compatible deployment; standard npm dev / build / start scripts');

SUB('2.2  Application Structure');
BUL('src/app/          — Next.js App Router pages and layouts');
BUL('src/components/   — Shared UI components (portal shells, site header/footer, etc.)');
BUL('src/lib/          — Auth context, utilities, hooks');
BUL('src/data/         — Static data fixtures for properties, leads, teams, plans, etc.');

SUB('2.3  Portal Architecture');
P('The application uses a single shared shell component (PortalShell) that renders the sidebar navigation, top header, role badge, and brand identity. Each portal passes its navigation items and active tab state to this shell. Role-based routing ensures users are automatically redirected to the correct portal after authentication.');

BUL('PortalShell: reusable layout wrapper used by all six staff/user portals');
BUL('useActiveHash: React hook for route-hash–driven active tab management');
BUL('StatCard: shared KPI metric card with icon, value, label, and optional delta');
BUL('Section: content block wrapper with title and optional action button');
BUL('Badge: status pill supporting tones — hot, warm, cold, new, success, default');
BUL('ReportsDashboard: shared reports component with filtering and export, embedded in multiple portals');

SUB('2.4  Core Domain Concepts');
LBUL('Property',    'Real estate listing with full specs, images, RERA number, pricing, and owner contact');
LBUL('Lead',        'Prospective buyer captured through the platform, assigned to a sales rep for follow-up');
LBUL('Credit / Token', 'Platform currency used by buyers to unlock owner contact details; purchased via subscription plans');
LBUL('Site Visit',  'Scheduled property inspection by a buyer, coordinated through a sales rep');
LBUL('Subscription Plan', 'Tiered plan purchased by buyers or owners to access platform features');
LBUL('RERA',        'Real Estate Regulatory Authority registration number validating a listing or owner');
LBUL('Pipeline',    'CRM funnel stages tracking a lead from first contact through to deal closure');

// ─────────────────────────────────────────────────────────────────────────────
// ██  3. USER ROLES & PERMISSION HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

SECT('3', 'User Roles & Permission Hierarchy');

P('NxtSft defines seven distinct user roles. Each role maps to a dedicated portal URL and a specific set of capabilities. Role assignment is determined at login and cannot be changed by the user; only an admin or super admin can reassign roles.');

gap(0.3);

var roles = [
  ['1', 'super-admin', 'Super Admin',    '/sa-portal',         'Full system access. Manages platform config, all users, billing, AI models, audit logs, and role permissions. No restrictions.'],
  ['2', 'admin',       'Admin',           '/admin-portal',      'Operations manager. Manages team, listings, leads, CRM pipeline, subscriptions, plans, commissions, and marketing. Cannot access super-admin controls.'],
  ['3', 'supervisor',  'Supervisor',      '/supervisor-portal', 'Team lead. Monitors team performance, reassigns leads, reviews escalations, manages visit calendar. Cannot edit plans or billing.'],
  ['4', 'sales',       'Sales Rep',       '/sales-portal',      'Field agent. Manages own leads, logs calls and visits, tracks commission. Scoped to their own lead pool.'],
  ['5', 'support-admin','Support Admin',  '/support-portal',    'Customer support agent. Manages support ticket queue, escalations, TAT reporting, and knowledge base.'],
  ['6', 'user',        'Home Buyer',      '/user-portal',       'End consumer. Searches and saves properties, uses credits to unlock contacts, schedules site visits, manages KYC.'],
  ['7', 'customer',    'Customer',        '/user-portal',       'Premium concierge buyer. Same as Home Buyer but designated as a managed/priority customer with Concierge portal label.'],
];

for (var ri = 0; ri < roles.length; ri++) {
  var ro = roles[ri];
  guard(55);
  TAB('Role ' + ro[0] + ' — ' + ro[2] + '  (' + ro[1] + ')');
  LBUL('Portal URL',    ro[3]);
  LBUL('Access Level',  ro[4]);
  LBUL('Demo Email',    ro[1] === 'sales' ? 'priya@nxtsft.com' :
                        ro[1] === 'user'  ? 'rohan@example.com' :
                        ro[1] === 'customer' ? 'ananya@example.com' :
                        ro[1] + '@nxtsft.com');
}

gap(0.5);
P('Staff roles (super-admin, admin, supervisor, sales, support-admin) log in via /admin-login. Consumer roles (user, customer) log in via /login. Registration at /register creates a user role session and grants 1 free welcome credit.');

// ─────────────────────────────────────────────────────────────────────────────
// ██  4. PUBLIC WEBSITE & LANDING PAGES
// ─────────────────────────────────────────────────────────────────────────────

SECT('4', 'Public Website & Landing Pages');

SUB('4.1  Home Page  ( / )');
P('The public home page is the primary marketing and discovery surface for NxtSft. It is fully server-rendered for SEO and features multiple interactive sections.');

TAB('Hero Section');
BUL('Auto-rotating carousel with 5 full-width background images');
BUL('Animated headline with brand tagline');
BUL('Primary CTA buttons: "Browse Properties" and "List Your Property"');

TAB('KPI Statistics Band');
BUL('10,000+ Properties  —  50+ Cities  —  4.8★ Rating');
BUL('1,00,000+ Customers  —  ₹0 Brokerage  —  100% RERA Verified');
BUL('Numbers animate on scroll using count-up animation');

TAB('Featured Properties Carousel');
BUL('Tab filter: All / Apartments / Villas / Commercial / PG');
BUL('Property cards showing: image, title, city, BHK, price, match score, RERA badge');
BUL('Clickable — navigates to /properties/[id]');

TAB('Property Categories');
BUL('6 categories: Apartments, Villas, Plots, Commercial, PG / Co-living, New Projects');
BUL('Each category links to pre-filtered search results');

TAB('City Coverage');
BUL('12 cities: Mumbai, Bengaluru, Delhi NCR, Hyderabad, Pune, Chennai, Kolkata, Ahmedabad, Jaipur, Noida, Gurgaon, Kochi');
BUL('Clickable city cards filter the property search page');

TAB('Platform Services');
BUL('AI Property Matching, RERA Verified Listings, Zero Brokerage');
BUL('Relationship Manager, Price Analytics, Secure Transactions');

TAB('Customer Testimonials');
BUL('6 testimonial cards with buyer name, city, rating, and review text');

TAB('Press Mentions');
BUL('5 media outlet logos/names displayed as trust signals');

TAB('Portal Navigation Cards');
BUL('5 portal cards with role name, description, and accent color');
BUL('Direct links to each portal login for staff onboarding');

TAB('Footer CTA');
BUL('Sign up / Browse properties call-to-action block');

SUB('4.2  User Authentication');

TAB('Consumer Login  ( /login )');
BUL('Fields: Email address, Password');
BUL('Demo mode: role selector to pre-fill credentials for testing');
BUL('Links: Forgot password, Sign up (/register), Admin login (/admin-login)');
BUL('Left panel: trust badge, feature list, platform KPIs');

TAB('Staff Login  ( /admin-login )');
BUL('Fields: Email address, Password');
BUL('Demo role selector: Super Admin / Admin / Supervisor / Sales Rep / Support Admin');
BUL('Redirects to role-specific portal on success');

TAB('Registration  ( /register )');
BUL('Fields: Full Name, Email Address, Phone Number (+91 prefix), Password, Confirm Password');
BUL('Validation: valid email format, 10-digit Indian phone number, minimum 6-character password, passwords must match');
BUL('Terms & Conditions checkbox (required)');
BUL('Password visibility toggle (show/hide)');
BUL('On success: creates user session, grants 1 free welcome credit');
BUL('Decorative left panel listing buyer onboarding benefits');

SUB('4.3  Properties Listing  ( /properties )');
BUL('Search bar: locality, project name, or builder name');
BUL('Filter: property type (Apartment, Villa, Studio, Office, Plot, PG)');
BUL('Filter: BHK configuration, price range, city');
BUL('Sort: Match Score, Price (low–high / high–low), Newest');
BUL('Property card fields: hero image, title, city / locality, BHK, area (sqft), price, price-per-sqft, match score badge, RERA verified badge, purpose (Sale / Rent)');
BUL('Click card → /properties/[id]');

TAB('Property Detail Page  ( /properties/[id] )');
BUL('Gallery carousel: up to 6 high-resolution images with lightbox zoom');
BUL('Specs panel: BHK, Bedrooms, Bathrooms, Balconies, Parking Slots, Total Area (sqft)');
BUL('Pricing: Total Price (₹), Price per sqft (₹)');
BUL('Status labels: Furnishing (Unfurnished / Semi / Fully), Facing, Floor, Age, Possession date, RERA number');
BUL('Amenities grid: up to 12 amenities with icons (e.g., Infinity Pool, Smart Home, EV Charging, Gym)');
BUL('Nearby attractions: name + distance in km (schools, hospitals, transit, markets)');
BUL('Owner card: Name, Role (Owner/Agent/Builder), RERA verified badge, Rating, Deals closed, Member since year');
BUL('Contact unlock: uses 1 credit to reveal owner phone/WhatsApp number');
BUL('Save to favourites button (heart icon)');
BUL('Description text (expandable)');
BUL('Map view of property location');

SUB('4.4  Agents Directory  ( /agents )');
BUL('Search: agent name or locality');
BUL('Filter: city');
BUL('Agent card fields: avatar, name, city, star rating, total deals closed, active listing count, RERA verified badge');
BUL('Click → /agents/[slug] for individual profile');
BUL('Profile page: agent bio, full property listings, contact methods, stats (response time, deals, rating)');

SUB('4.5  List a Property  ( /list )');
BUL('Property type selector: Apartment, Villa, Commercial, Plot, PG');
BUL('Location: city dropdown + locality with autocomplete');
BUL('Specs: BHK (1–5+), bathrooms, area (sqft), parking slots, balconies');
BUL('Price: listing price (₹), negotiable toggle');
BUL('Furnishing: Unfurnished / Semi-Furnished / Fully Furnished');
BUL('Floor number, property age, possession status');
BUL('RERA registration number');
BUL('Amenities selector: 12+ checkbox options');
BUL('Gallery upload: multiple image files, drag-to-reorder');
BUL('Property description: free text');
BUL('Contact number for enquiries');
BUL('Submit actions: Standard listing / Get Featured (paid upgrade)');

SUB('4.6  Pricing Plans  ( /pricing )');
BUL('Seeker Plans (3 tiers): Instant (1 credit, ₹99), Basic (5 credits, ₹299), Premium (15 credits, ₹699)');
BUL('Owner Rental Plans (4 tiers): ranging ₹499 – ₹4,999 with increasing lead counts and listing visibility');
BUL('Owner Sell Plans: equivalent structure to rental plans with sell-specific features');
BUL('Feature comparison table across all plan tiers');
BUL('FAQ section addressing common plan questions');

SUB('4.7  User Profile  ( /profile )');
BUL('Identity card: user avatar (initials-based), full name, role badge, city, member since date');
BUL('Account Details: Full Name (editable), Email, Phone, City, Role label, Workspace/Portal name');
BUL('Security section: change password form, 2FA via OTP toggle, active sessions list');
BUL('Recent Activity timeline: last 5 actions with timestamps and icons');
BUL('Quick Actions sidebar: role-specific shortcuts (e.g., Browse Properties, My Listings)');
BUL('Notification preferences: Email Alerts, WhatsApp Notifications, SMS Alerts, Marketing Emails (toggle each)');
BUL('Portal switcher: navigate directly to the correct portal for the current role');

SUB('4.8  Legal & Policy Pages');
BUL('/terms         — Terms & Conditions (257 lines)');
BUL('/privacy       — Privacy Policy (306 lines)');
BUL('/cookie-policy — Cookie Policy with consent details (389 lines)');
BUL('/fraud-advisory — Fraud advisory & safe-transaction guidance (314 lines)');
BUL('/about         — Company overview page');
BUL('/contact       — Contact form + email / WhatsApp contact methods');

// ─────────────────────────────────────────────────────────────────────────────
// ██  5. USER PORTAL  —  HOME BUYER / PROPERTY SEEKER  ( /user-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('5', 'User Portal  —  Home Buyer / Property Seeker  ( /user-portal )');

P('The User Portal is the primary interface for registered home buyers and premium customers. It provides 11 navigation sections covering property discovery, credit management, visit scheduling, KYC document management, and preference settings.');

SUB('5.1  Overview Dashboard  (default tab)');
TAB('Summary KPI Cards');
BUL('Saved Properties count');
BUL('Contact Unlocks Used  /  Monthly limit (e.g., 2 / 6)');
BUL('Credits Remaining balance');
BUL('Site Visits Scheduled count');

TAB('Continue Where You Left Off');
BUL('Last 3 recently viewed properties with thumbnail, price, and BHK');

TAB('Recommended For You');
BUL('3 AI-matched properties based on user preferences and browsing history');
BUL('Match score badge (0–100%) on each card');

TAB('Upcoming Site Visits');
BUL('Next 2 scheduled visits: property name, date, assigned sales rep name');
BUL('Quick link to full Site Visits tab');

SUB('5.2  Saved Properties');
BUL('Sort options: Match Score, Price (low–high), Date Saved');
BUL('Filter: BHK configuration, City');
BUL('Property card fields: image, title, city, BHK, area, price, match score, RERA badge');
BUL('Actions: Remove from saved, View detail, Contact Owner (uses 1 credit)');

SUB('5.3  Recently Viewed');
TAB('Activity Statistics');
BUL('Total properties viewed');
BUL('Total contacts unlocked');
BUL('Average time spent per property page');
BUL('Number of cities explored');
BUL('Total session time on platform');

TAB('View History Table');
BUL('Columns: Property name, Locality / City, Date and time viewed, Duration on page, Contact unlocked (Yes / No)');
BUL('Sortable by date, duration');

SUB('5.4  My Credits & Token System');
TAB('Active Plan Display');
BUL('Current plan name and tier');
BUL('Credits used / total credits in plan (progress bar)');
BUL('Plan validity / expiry date');
BUL('Renew / Upgrade button');

TAB('Credit Top-Up Modal');
BUL('3 top-up tiers: Instant (1 credit, ₹99), Basic (5 credits, ₹299), Premium (15 credits, ₹699)');
BUL('Secure payment flow (payment integration hook)');

TAB('Credit Usage Timeline');
BUL('Last 5 credit events: Credit added, Contact unlocked, Credit refunded');
BUL('Each event: type, property name (if applicable), timestamp, credit delta');

TAB('Token Ledger');
BUL('Full transaction history: Credit, Debit, Refund types');
BUL('Columns: Date, Transaction Type, Description, Amount (±)');

TAB('Unlocked Contacts');
BUL('List of owner contacts unlocked by the user');
BUL('Fields: Owner name, phone, property, unlock date');
BUL('Dispute filing button per unlock (for fraudulent contact claims)');

SUB('5.5  Search Alerts');
BUL('Create new alert: specify Location, BHK, Budget range');
BUL('Alert card fields: alert name, criteria tags, last match count, last triggered date');
BUL('Actions per alert: Pause / Resume, Edit criteria, Delete alert');
BUL('Demo shows 3 active alerts');

SUB('5.6  My Listings');
BUL('Active listing card for properties listed by this user');
BUL('Fields: property image, title, city, status (Active / Pending / Rejected)');
BUL('View count badge');
BUL('Actions: Boost listing (paid), Edit listing details, Deactivate');

SUB('5.7  Site Visits');
BUL('Upcoming scheduled visits: property name, date, time, assigned sales rep');
BUL('Actions: Reschedule (date picker), Cancel visit');
BUL('Notes field per visit');
BUL('Past visits: property visited, date, outcome notes');

SUB('5.8  EMI Calculator');
BUL('Input: Loan Amount (₹)');
BUL('Input: Annual Interest Rate (%)');
BUL('Input: Loan Tenure (years)');
BUL('Output: Monthly EMI calculated in real time');
BUL('Output: Total Interest Payable, Total Amount Payable');

SUB('5.9  Documents & KYC');
BUL('KYC document types: Aadhaar Card, PAN Card, Income Proof');
BUL('Status per document: Verified (green), Pending (amber), Not Uploaded (grey)');
BUL('Upload button for each pending document (file picker)');
BUL('Verification status indicator per document');

SUB('5.10  Profile & Preferences');
TAB('Personal Information');
BUL('Fields: Full Name, Email Address, Phone Number, City');
BUL('Save changes button');

TAB('Property Preferences');
BUL('Budget range: minimum – maximum (₹)');
BUL('Property type preference: Apartment / Villa / Plot / PG');
BUL('Purchase timeline: Immediately / 3 months / 6 months / 1 year');

TAB('Email Preferences');
BUL('New property match alerts (toggle)');
BUL('Price drop alerts (toggle)');
BUL('Platform news and updates (toggle)');

TAB('Notification Preferences');
BUL('Site visit reminders (toggle)');
BUL('Credit balance low warning (toggle)');
BUL('Listing status updates (toggle)');

TAB('Password & Security');
BUL('Change password: Current password, New password, Confirm new password fields');

TAB('Data Export');
BUL('Download My Data button: exports user data as CSV');

// ─────────────────────────────────────────────────────────────────────────────
// ██  6. ADMIN PORTAL  —  OPERATIONS MANAGEMENT  ( /admin-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('6', 'Admin Portal  —  Operations Management  ( /admin-portal )');

P('The Admin Portal is used by regional operations managers to oversee the entire sales funnel, team activity, listing approvals, subscriptions, marketing campaigns, and revenue. It contains 13 navigation tabs.');

SUB('6.1  Operations Dashboard  (default tab)');
TAB('KPI Summary Cards (8 metrics)');
BUL('Pipeline Value (₹ Crore)');
BUL('Open Leads count');
BUL('Pending Listing Approvals');
BUL('Active Click Alerts count');
BUL('Total Live Properties');
BUL('Conversions Month-to-Date (MTD)');
BUL('Average Deal Size (₹ Lakh)');
BUL('Team Size (headcount)');

TAB('Conversion Funnel');
BUL('Stages: Total Leads → Qualified (48%) → Site Visit (44%) → Closed (26%)');
BUL('Overall platform conversion rate displayed as a headline metric');

TAB('Live Activity Stream');
BUL('Last 5 activities from across all portals, colour-coded by actor type');
BUL('Columns: Timestamp, Actor name, Action description, Outcome');

TAB('Quick Actions');
BUL('Add new team member');
BUL('Approve pending listings');
BUL('Export leads (CSV)');
BUL('Launch marketing campaign');

SUB('6.2  Team Management');
BUL('Team roster table with columns: Name, Email, Role, City, Status (Active / Inactive), Phone, Date Joined, Target Achievement (%)');
BUL('Add team member form: name, email, role, city, phone');
BUL('Edit / Deactivate existing member');
BUL('Filter by city and role');

SUB('6.3  Listings Management');
BUL('Pending listings awaiting admin approval');
BUL('Columns: Property title, Owner name, Type, City, Submitted date, Status (Pending / Approved / Rejected / In Review)');
BUL('Actions: Approve, Reject (with reason), Request more info');
BUL('Featured toggle: mark a listing as featured on home page');
BUL('Edit property details');
BUL('Delete listing');

SUB('6.4  Lead Management');
BUL('Leads table with columns: Lead name, Phone, City, Interest (property type), Status (Hot / Warm / Cold / New), Source, Assigned Rep, Deal Value (₹), Last Activity');
BUL('Filter by status, city, and assigned rep');
BUL('CRM assignment: reassign lead to a different sales rep');
BUL('Lead status transitions: update status via dropdown');
BUL('Bulk export to CSV');

SUB('6.5  CRM Pipeline');
BUL('Kanban-style board with 6 stages: New → Contacted → Qualified → Site Visit → Negotiation → Closed');
BUL('Lead cards within each stage: lead name, phone, property interest, deal value, last activity time');
BUL('Drag-and-drop between stages (stage transition)');
BUL('Lead count and total pipeline value displayed per stage column');

SUB('6.6  Subscriptions');
BUL('Active subscription table: User name, Plan name, Start date, Expiry date, Credits Used / Total, Next Payment date');
BUL('Actions: Renew subscription, Cancel subscription, Adjust credits');
BUL('Filter by plan type and expiry status');

SUB('6.7  Property Views Analytics');
BUL('Table of property view events: Property name, Viewer (user), View duration, Contact unlocked (Yes / No), Timestamp');
BUL('Filter by property and date range');
BUL('Useful for identifying high-intent buyers');

SUB('6.8  Click Alerts');
BUL('Price threshold alerts: notify when a property drops below a buyer-set price');
BUL('View count alerts: notify when a property reaches N views');
BUL('Admin can configure alert thresholds globally or per property');
BUL('Alert log: property, alert type, trigger value, triggered date');

SUB('6.9  Marketing Tools');
BUL('Email campaign builder: subject, body, target audience segment, schedule');
BUL('Social media integration panel');
BUL('SMS blast tool: message body, recipient segment, send / schedule');
BUL('Campaign performance: open rate, click rate, conversions');

SUB('6.10  Developer / Builder Management');
BUL('Builder roster table: developer name, RERA number, active projects count, commission rate (%)');
BUL('Project allocation: assign listings to a developer profile');
BUL('Commission rate configuration per developer');

SUB('6.11  Reports');
P('Shared ReportsDashboard component. Provides filtering (date range, city, rep, property type) and export (CSV). Report types visible at admin scope:');
BUL('Lead pipeline report');
BUL('Conversion funnel report');
BUL('Revenue and commissions report');
BUL('Property performance report');
BUL('Team activity and KPI report');

SUB('6.12  Plans Manager');
TAB('Seeker Plans (3 tiers)');
LBUL('Instant',  '1 credit · ₹99 · 30-day validity');
LBUL('Basic',    '5 credits · ₹299 · 60-day validity');
LBUL('Premium',  '15 credits · ₹699 · 90-day validity');
BUL('Actions: Edit plan details, Delete plan, Toggle active/inactive');

TAB('Owner Rental Plans (4 tiers)');
BUL('4 pricing tiers ranging ₹499 – ₹4,999 with escalating lead counts and listing features');
BUL('Fields: name, price, validity (days), max listings, included leads, badge label, feature list');

TAB('Owner Sell Plans');
BUL('Equivalent tiered structure to rental plans, scoped for property sale listings');

SUB('6.13  Commissions');
BUL('Commission calculation rules: percentage of deal value per role/tier');
BUL('Per-rep commission ledger: rep name, deals closed, commission earned (₹), payout status');
BUL('Commission payout history: date, rep, amount, payment method');
BUL('Override rules: admin can set custom commission rates for specific deals');

// ─────────────────────────────────────────────────────────────────────────────
// ██  7. SALES PORTAL  —  FIELD SALES REPRESENTATIVE  ( /sales-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('7', 'Sales Portal  —  Field Sales Representative  ( /sales-portal )');

P('The Sales Portal is a mobile-optimised field tool for individual sales representatives. All data is scoped to the logged-in rep\'s own lead pool and performance. It contains 8 navigation tabs.');

SUB('7.1  My Leads  (default tab)');
TAB('Performance KPI Cards (6 metrics)');
BUL('Open Leads count');
BUL('Closed MTD count');
BUL('Site Visits scheduled this week');
BUL('Commission earned MTD (₹)');
BUL('Hot Leads count');
BUL('Average Deal Size (₹ Lakh)');

TAB('Lead Filter Tabs');
BUL('All / Hot / Warm / Cold — filters lead cards below');

TAB('Lead Cards');
BUL('Lead name, phone number, city, property interest, status badge (Hot / Warm / Cold / New)');
BUL('Last activity timestamp');
BUL('Deal value (₹ Lakh)');
BUL('Quick actions: Call (click-to-call), WhatsApp, Add Note, Schedule Site Visit');

SUB('7.2  Lead Details');
BUL('Full lead profile: name, phone, city, source, status, assigned date');
BUL('Property views log: properties viewed by this lead with view durations');
BUL('Timeline: chronological history of all interactions (calls, WhatsApps, visits, notes)');
BUL('Next action: dropdown (Call / WhatsApp / Visit / Email) + date/time picker');
BUL('Contact history log: last call duration, last message timestamp');

SUB('7.3  Activity Log');
BUL('Chronological feed of all activities logged by this rep');
BUL('Entry types: Outbound call, WhatsApp message, Site visit completed, Note added, Lead status changed');
BUL('Fields per entry: timestamp, lead name, activity type, duration (for calls), outcome notes');

SUB('7.4  Click-to-Call');
BUL('Initiate outbound calls directly from the portal (VoIP integration hook)');
BUL('Dial pad or lead-list click-to-call');
BUL('Active call screen: lead name, timer');
BUL('Post-call form: outcome (Interested / Not interested / Call back / Wrong number), notes, next action');
BUL('Call log: date, lead name, duration, outcome');

SUB('7.5  Site Visits');
BUL('Scheduled visits list: lead name, property address, date, time, status (Confirmed / Pending / Completed / Cancelled)');
BUL('Actions: Reschedule, Cancel, Mark as Completed');
BUL('Notes field per visit (pre-visit briefing, post-visit feedback)');
BUL('Calendar view of upcoming visits');

SUB('7.6  My Commission');
BUL('Commission earned this month (₹) and pending (₹)');
BUL('Commission breakdown table: deal name / property, close date, deal value, commission rate (%), commission amount (₹)');
BUL('Payout history: payment date, amount, payment reference');
BUL('Total YTD commission earned');

SUB('7.7  Listings');
BUL('Properties currently assigned to this rep for active selling');
BUL('Columns: property image, title, city, price, views (last 30 days), leads generated');
BUL('Performance metrics per listing: views, enquiries, site visits scheduled');

SUB('7.8  Reports');
P('ReportsDashboard component filtered to this rep\'s data scope. Report types:');
BUL('My lead funnel report');
BUL('My activity summary (calls, visits, closures)');
BUL('My commission report');

// ─────────────────────────────────────────────────────────────────────────────
// ██  8. SUPERVISOR PORTAL  —  TEAM DESK  ( /supervisor-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('8', 'Supervisor Portal  —  Team Desk  ( /supervisor-portal )');

P('The Supervisor Portal gives team leads visibility across their assigned team\'s activity, lead pipeline, and performance metrics. It contains 8 navigation tabs.');

SUB('8.1  Team Dashboard  (default tab)');
TAB('Team KPI Cards (6 metrics)');
BUL('Team Open Leads total');
BUL('Team Closed MTD total');
BUL('Average Conversion Rate across team (%)');
BUL('Site Visits scheduled this week');
BUL('Average Lead Response Time (hours)');
BUL('Overdue Leads count (not contacted within SLA)');

TAB('Team Member Live Status');
BUL('Row per team member: name, city, leads open, closed MTD, calls today, current status (Online / Away / Offline)');
BUL('Conversion rate bar and performance score bar per rep');

TAB('Daily Targets Table');
BUL('Columns: Rep name, Calls made vs target, Visits scheduled vs target');
BUL('Colour-coded achievement indicators (green / amber / red)');

SUB('8.2  Team Leads');
BUL('Combined lead list from all team members');
BUL('Filter by rep name, lead status, city');
BUL('All lead card fields identical to Sales Portal 7.1');
BUL('Bulk assignment: select multiple leads and assign to a rep');

SUB('8.3  Lead Reassignment');
BUL('Interface to transfer individual or bulk leads between team members');
BUL('From rep selector, To rep selector, optional note');
BUL('Reassignment history log: lead name, from rep, to rep, date, reason');

SUB('8.4  Activity Monitor');
BUL('Real-time team activity feed ordered by most recent');
BUL('Activity types: Calls logged, Visits scheduled/completed, Lead status changes, Notes added');
BUL('Filter by rep and date range');

SUB('8.5  Performance Analytics');
BUL('Per-rep KPI bars: Calls vs target, Conversions vs target, Deal size trend');
BUL('Team-level conversion funnel chart');
BUL('Weekly trend chart: calls, visits, closures across the team');

SUB('8.6  Visit Calendar');
BUL('Calendar view of all site visits scheduled by the team');
BUL('Color-coded by rep');
BUL('Map view showing geographic spread of visit locations');
BUL('Click event: view lead name, property, rep, status');

SUB('8.7  Escalations');
BUL('Overdue leads list: leads exceeding response SLA threshold');
BUL('Escalation workflow: supervisor can reassign or flag leads requiring direct intervention');
BUL('Escalation notes: add comments for handover context');
BUL('SLA breach timeline per escalated lead');

SUB('8.8  Reports');
P('ReportsDashboard filtered to supervisor\'s team scope. Report types:');
BUL('Team lead pipeline report');
BUL('Team performance and KPI report');
BUL('Visit completion rate report');
BUL('Conversion and revenue attribution report');

// ─────────────────────────────────────────────────────────────────────────────
// ██  9. SUPPORT PORTAL  —  SUPPORT ADMINISTRATION  ( /support-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('9', 'Support Portal  —  Support Administration  ( /support-portal )');

P('The Support Portal is the primary tool for support agents handling customer issues, complaints, and platform queries. It contains 6 navigation tabs.');

SUB('9.1  Dashboard  (default tab)');
TAB('Summary KPI Cards (4 metrics)');
BUL('Open Tickets count');
BUL('Escalated Tickets count');
BUL('Resolved Today count');
BUL('Within-TAT Percentage (%)');

TAB('Recent Tickets Table');
BUL('Columns: Ticket ID, Subject, Raised By (user name), Status, Date Raised');
BUL('Click to open full ticket detail');

TAB('Tickets by Category');
BUL('Visual breakdown (pie/bar chart) of tickets by issue category');
BUL('Categories: Listing Dispute, Payment Issue, Account Access, Fraud Report, General Query');

SUB('9.2  Ticket Queue');
BUL('Full ticket list with multi-filter support');
BUL('Filter by Status: Open / In Progress / Resolved / Escalated');
BUL('Filter by Category: issue type dropdown');
BUL('Filter by City');
BUL('Search by subject text or user name');
BUL('Ticket card fields: ID, subject, raised by, category, status badge, date, priority');
BUL('Actions: Mark as Resolved, Escalate, Assign to agent (dropdown)');
BUL('Bulk actions: export selected as CSV');
BUL('Add internal note to ticket');

SUB('9.3  Escalations');
BUL('High-priority or SLA-breached tickets requiring urgent attention');
BUL('SLA breach warning indicator (red) with time elapsed');
BUL('Escalation notes thread');
BUL('Reassign to senior agent or manager');

SUB('9.4  My Assignments');
BUL('Tickets currently assigned to the logged-in support agent');
BUL('Columns: Ticket ID, Subject, User, Due Date, Priority, Status');
BUL('Actions: Update status, Add note, Resolve');

SUB('9.5  TAT Report  (Turnaround Time)');
BUL('Average time-to-first-response across all tickets');
BUL('Average time-to-resolution per category');
BUL('SLA compliance rate (% resolved within target TAT)');
BUL('Filterable by date range and agent');

SUB('9.6  Knowledge Base');
BUL('Searchable FAQ article library for common issues');
BUL('Articles organised by category');
BUL('Agents can reference articles while resolving tickets');
BUL('Admin can add / edit / archive articles');

// ─────────────────────────────────────────────────────────────────────────────
// ██  10. SUPER ADMIN PORTAL  —  COMMAND CENTRE  ( /sa-portal )
// ─────────────────────────────────────────────────────────────────────────────

SECT('10', 'Super Admin Portal  —  Command Centre  ( /sa-portal )');

P('The Super Admin Portal provides complete platform control with 15 navigation tabs. It is restricted to the super-admin role and encompasses all administrative functions of the platform.');

SUB('10.1  Command Dashboard  (default tab)');
TAB('KPI Cards (6 platform-wide metrics)');
BUL('Total Live Listings');
BUL('Active Leads (platform total)');
BUL('Revenue Year-to-Date (₹ Crore)');
BUL('Daily Active Users (DAU)');
BUL('Monthly Active Users (MAU)');
BUL('Overall Platform Conversion Rate (%)');

TAB('Revenue & Lead Funnel Chart');
BUL('Dual-line/bar chart over 12-week rolling window');
BUL('Series: Weekly Revenue (₹), Weekly Leads');

TAB('System Health Panel');
BUL('API Response Time p50 (ms)');
BUL('Database Replication Lag (ms)');
BUL('AI Model Drift Score');
BUL('Failed Login Attempts (last 24 hours)');

TAB('Recent Property Views Table');
BUL('Platform-wide property view events: user, property, duration, contact unlocked, timestamp');

SUB('10.2  User Management');
BUL('All-users table: Name, Email, Role, Portal, City, Status (Active / Suspended), Last Login');
BUL('Add new user: name, email, role, city, phone');
BUL('Edit user details');
BUL('Suspend / Reactivate user account');
BUL('Role assignment / change');
BUL('Filter by role, city, status');
BUL('Search by name or email');

SUB('10.3  All Teams');
BUL('Full team roster across all regions');
BUL('Team lead assignment per team');
BUL('Performance summary per team: leads, closures, conversion rate');
BUL('Add new team / reorganise team structure');

SUB('10.4  Platform Configuration');
BUL('Feature flags: enable / disable specific platform features');
BUL('Maintenance mode toggle with custom downtime message');
BUL('Platform-wide settings: default currency, GST rate, RERA compliance requirements');
BUL('Integration settings: payment gateway, SMS provider, WhatsApp API keys');

SUB('10.5  Global Analytics');
BUL('Cross-portal analytics aggregating all user and transaction data');
BUL('User cohort analysis: new vs returning, by role and region');
BUL('Full funnel analysis from registration through purchase');
BUL('Retention and churn metrics');
BUL('Revenue attribution by channel and role');

SUB('10.6  Audit Trail');
BUL('Immutable log of all system changes');
BUL('Columns: Timestamp, Actor (email + role), Action, Entity (user / property / plan), Before value, After value');
BUL('Filter by actor, action type, and date range');
BUL('Export audit log as CSV');

SUB('10.7  AI Model Control');
BUL('Property-to-buyer match algorithm version management');
BUL('Feature engineering controls: enable / disable matching signals (location weight, price weight, BHK preference weight, etc.)');
BUL('Match score calibration: adjust thresholds and confidence parameters');
BUL('AI drift monitoring: track model score distributions over time');
BUL('Rollback to previous model version');

SUB('10.8  Notifications Centre');
BUL('Broadcast notifications: compose and send push/email/SMS to all users or a segment');
BUL('Scheduled sends: set future delivery date and time');
BUL('Notification templates: pre-built templates for common events (payment reminder, listing approved, etc.)');
BUL('Template fields: title, body, CTA button, target audience segment');

SUB('10.9  Content CMS');
BUL('Home page content management: hero text, KPI numbers, category labels');
BUL('Blog / article management: title, body, author, publish date, SEO slug');
BUL('Static page editor: About, Pricing, Contact pages');
BUL('Media library: upload and manage images used across the platform');

SUB('10.10  Security Console');
BUL('Failed login tracker: user email, IP address, timestamp, attempt count');
BUL('IP whitelist: allow-list specific IPs for admin access');
BUL('IP blacklist: block abusive or suspicious IP addresses');
BUL('Session management: view and force-terminate active sessions by user');
BUL('2FA enforcement policy: mandate 2FA for specific roles');
BUL('Password policy configuration: minimum length, complexity, expiry');

SUB('10.11  Billing & Revenue');
BUL('Platform-wide revenue metrics: MRR, ARR, total subscriptions, average revenue per user');
BUL('Subscription management: view, cancel, or refund any subscription');
BUL('Payout tracking: sales rep commissions, developer commissions pending / paid');
BUL('Invoice generation: create and download invoices for corporate accounts');
BUL('Tax reports: GST-compliant revenue breakdown');

SUB('10.12  Role & Permission Management');
BUL('Define capabilities per role: which portals and tabs each role can access');
BUL('Permission matrix: visual grid of role vs feature permissions (read / write / admin / none)');
BUL('Test permissions: simulate what a specific role can see and do');
BUL('Add custom roles (future extensibility hook)');

SUB('10.13  Plans Manager');
BUL('Create, edit, and delete subscription plans across all plan types (Seeker, Owner Rental, Owner Sell)');
BUL('Plan fields: name, price (₹), validity (days), credits included, max listings, leads included, feature list, badge label, popular flag');
BUL('Publish / unpublish plans');
BUL('Plan performance: subscriber count, revenue per plan');

SUB('10.14  Support Tickets');
BUL('Super admin view of all support tickets across all agents');
BUL('Includes escalated tickets and tickets pending resolution');
BUL('Can reassign tickets, override agent decisions, mark resolved');
BUL('Platform-wide SLA performance dashboard');

SUB('10.15  Reports');
P('ReportsDashboard with global (all regions, all reps) scope. Report types available:');
BUL('Platform-wide lead and revenue report');
BUL('User acquisition and retention report');
BUL('Subscription revenue report');
BUL('Property performance report');
BUL('Team and rep performance report');
BUL('Support SLA and resolution report');
BUL('AI model performance and accuracy report');

// ─────────────────────────────────────────────────────────────────────────────
// ██  11. DATA MODELS & FIELD SPECIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

SECT('11', 'Data Models & Field Specifications');

SUB('11.1  Property Model');
LBUL('id',            'Unique identifier (e.g., p1–p6 in demo)');
LBUL('slug',          'URL-safe identifier for routing');
LBUL('city',          'City name (string)');
LBUL('locality',      'Neighbourhood / area name');
LBUL('lat / lng',     'Geographic coordinates (float)');
LBUL('price',         'Listing price (integer, ₹)');
LBUL('priceLabel',    'Formatted price string (e.g., "₹1.85 Cr")');
LBUL('pricePerSqft',  'Price per sq.ft. (integer, ₹)');
LBUL('bhk',           'BHK configuration (integer)');
LBUL('bedrooms',      'Bedroom count');
LBUL('bathrooms',     'Bathroom count');
LBUL('balconies',     'Balcony count');
LBUL('parking',       'Parking slot count');
LBUL('area',          'Total area in sq.ft. (integer)');
LBUL('type',          'Property type: Apartment / Villa / Studio / Office / Bungalow / Plot / PG');
LBUL('purpose',       'Sale or Rent');
LBUL('image',         'Hero image URL');
LBUL('gallery',       'Array of up to 6 image URLs');
LBUL('featured',      'Boolean — appears in featured carousel');
LBUL('builder',       'Builder / developer name');
LBUL('matchScore',    'AI match score 0–100 (integer)');
LBUL('furnishing',    'Unfurnished / Semi-Furnished / Fully Furnished');
LBUL('facing',        'Cardinal direction facing');
LBUL('floor',         'Floor number');
LBUL('age',           'Property age in years');
LBUL('possession',    'Possession status / date');
LBUL('rera',          'RERA registration number');
LBUL('description',   'Full property description (long text)');
LBUL('amenities',     'Array of amenity strings (up to 12+)');
LBUL('nearby',        'Array of [name, distance_km] tuples');
LBUL('owner',         'Object: { name, role, phone, initials, rating (0–5), deals (count), since (year) }');

SUB('11.2  Lead Model');
LBUL('id',            'Lead identifier');
LBUL('name',          'Lead full name');
LBUL('phone',         'Contact phone number');
LBUL('city',          'City of interest');
LBUL('interest',      'Property type / specific property interest');
LBUL('status',        'Hot / Warm / Cold / New');
LBUL('source',        'Acquisition channel (Portal / WhatsApp / Referral / Direct)');
LBUL('owner',         'Assigned sales rep name');
LBUL('value',         'Estimated deal value (₹ integer)');
LBUL('lastActivity',  'Relative time string (e.g., "2 hours ago")');

SUB('11.3  Team Member Model');
LBUL('id',          'Member identifier');
LBUL('name',        'Full name');
LBUL('role',        'Portal role (sales / supervisor)');
LBUL('city',        'Operating city');
LBUL('leadsOpen',   'Current open lead count (integer)');
LBUL('closedMTD',   'Deals closed this month (integer)');
LBUL('conversion',  'Conversion rate (%)');
LBUL('target',      'Monthly deal target (integer)');
LBUL('achieved',    'Target achievement percentage (%)');

SUB('11.4  Activity / Event Model');
LBUL('ts',      'ISO timestamp');
LBUL('user',    'Actor name');
LBUL('action',  'Action description (free text)');
LBUL('outcome', 'Result of the action');

SUB('11.5  Subscription Model');
LBUL('user',        'Subscriber name / email');
LBUL('plan',        'Plan name');
LBUL('start',       'Subscription start date');
LBUL('expiry',      'Subscription expiry date');
LBUL('creditsUsed', 'Credits consumed (integer)');
LBUL('creditsTotal','Total credits in plan (integer)');
LBUL('nextPayment', 'Next renewal date');

SUB('11.6  Session Model  (Auth)');
LBUL('role',    'User role (see Section 3)');
LBUL('name',    'Display name');
LBUL('email',   'Login email');
LBUL('initials','Two-character uppercase initials');
LBUL('city',    'User home city');
LBUL('phone',   'Contact phone number');
LBUL('joined',  'Account creation month-year string');

SUB('11.7  Plan Model  (Seeker)');
LBUL('id',         'Plan identifier');
LBUL('name',       'Plan display name');
LBUL('price',      'Price in ₹ (integer)');
LBUL('priceLabel', 'Formatted price string');
LBUL('credits',    'Contact unlock credits included (integer)');
LBUL('validity',   'Validity period in days');
LBUL('tagline',    'Short marketing description');
LBUL('features',   'Array of feature strings displayed on pricing page');
LBUL('popular',    'Boolean — renders "Most Popular" badge on pricing page');

// ─────────────────────────────────────────────────────────────────────────────
// ██  12. SUBSCRIPTION & PRICING PLANS
// ─────────────────────────────────────────────────────────────────────────────

SECT('12', 'Subscription & Pricing Plans');

P('NxtSft operates a dual-sided monetisation model: buyers purchase credit packs to unlock owner contact details; property owners purchase listing plans to gain leads and visibility.');

SUB('12.1  Seeker / Buyer Plans');

TAB('Instant Plan');
BUL('Price: ₹99');
BUL('Credits: 1 contact unlock');
BUL('Validity: 30 days');
BUL('Best for: casual browsers wanting a single contact');

TAB('Basic Plan');
BUL('Price: ₹299');
BUL('Credits: 5 contact unlocks');
BUL('Validity: 60 days');
BUL('Best for: active searchers comparing 4–5 properties');

TAB('Premium Plan  (Most Popular)');
BUL('Price: ₹699');
BUL('Credits: 15 contact unlocks');
BUL('Validity: 90 days');
BUL('Best for: serious buyers conducting a full property search');

SUB('12.2  Owner Rental Plans  (4 Tiers)');
BUL('Tier 1 — Starter: ₹499 · 1 active listing · up to 10 leads');
BUL('Tier 2 — Basic:   ₹999 · 3 active listings · up to 30 leads');
BUL('Tier 3 — Pro:     ₹2,499 · 5 active listings · up to 75 leads · featured placement');
BUL('Tier 4 — Max:     ₹4,999 · unlimited listings · unlimited leads · priority support + featured badge');
BUL('All plans include: listing dashboard, lead notifications, response analytics');

SUB('12.3  Owner Sell Plans  (4 Tiers)');
BUL('Equivalent tier structure to rental plans with sell-specific features');
BUL('Higher tiers include professional photography coupon and dedicated relationship manager');
BUL('Max tier includes promoted listings on home page and search results');

SUB('12.4  Welcome Credits');
BUL('New registrations automatically receive 1 free credit (welcome gift)');
BUL('Demo sign-in for user / customer role grants 3 free credits');
BUL('Credits persist across sessions via localStorage (demo); database-backed in production');

// ─────────────────────────────────────────────────────────────────────────────
// ██  13. AUTHENTICATION, SESSION & SECURITY
// ─────────────────────────────────────────────────────────────────────────────

SECT('13', 'Authentication, Session & Security');

SUB('13.1  Auth Architecture');
P('NxtSft uses a React Context-based auth layer (AuthProvider / useAuth hook) backed by localStorage for the demo implementation. In production this would be backed by a secure server-side session or JWT system.');

LBUL('Session storage key',  '"nxtsft.session" in localStorage');
LBUL('Credits storage key',  '"nxtsft.credits" in localStorage');
LBUL('User registry key',    '"nxtsft.users" array in localStorage (demo registration)');

SUB('13.2  Auth Functions');
LBUL('signIn(role)',             'Creates a session from ROLE_META for the given role. Grants 3 free credits to user/customer roles if balance is zero.');
LBUL('signOut()',                'Removes the session from localStorage. Credits are intentionally preserved across sign-out.');
LBUL('register(name, email, phone)', 'Creates a user-role session, persists to user registry, grants 1 welcome credit if balance is zero.');
LBUL('updateProfile(name, phone)', 'Mutates the current session name, phone, and derived initials in localStorage.');
LBUL('addCredits(n)',            'Increments the stored credit balance by n.');
LBUL('useCredit()',              'Decrements credit balance by 1; returns false if balance is zero (contact unlock gate).');

SUB('13.3  Role-Based Routing');
BUL('Staff roles (super-admin, admin, supervisor, sales, support-admin) → /admin-login');
BUL('Consumer roles (user, customer) → /login and /register');
BUL('On successful sign-in, client redirects to ROLE_META[role].portal');
BUL('Unauthenticated access to portal URLs redirects to the appropriate login page');

SUB('13.4  Security Features  (User Portal)');
BUL('Password change form: current password verification, new password, confirm password');
BUL('2FA via OTP: toggle to enable one-time password for login');
BUL('Active sessions list: view all active login sessions, option to terminate specific sessions');

SUB('13.5  Security Features  (Super Admin)');
BUL('Failed login tracking with IP address logging');
BUL('IP whitelist / blacklist management');
BUL('Force-terminate any user session globally');
BUL('2FA enforcement policy per role');
BUL('Password policy configuration: length, complexity, expiry');
BUL('Immutable audit trail of all admin actions');

SUB('13.6  RERA Compliance');
BUL('Every listed property must provide a valid RERA registration number');
BUL('Owner/agent RERA badge is displayed on property listings and agent profiles');
BUL('RERA number is displayed prominently on property detail pages');
BUL('Platform validates RERA format during listing submission');

// ─────────────────────────────────────────────────────────────────────────────
// ██  PAGE NUMBERS (injected via bufferPages)
// ─────────────────────────────────────────────────────────────────────────────

var range = doc.bufferedPageRange();
var total = range.count;

for (var pi = 0; pi < total; pi++) {
  doc.switchToPage(pi);
  // skip cover (page 0)
  if (pi === 0) continue;
  var pageNum = pi + 1;
  doc.font(R).fontSize(8).fillColor('#999')
     .text('NxtSft  —  Product Requirements Document', ML, PH - 48, { width: TW / 2, align: 'left' });
  doc.font(R).fontSize(8).fillColor('#999')
     .text('Page ' + pageNum + ' of ' + total, ML + TW / 2, PH - 48, { width: TW / 2, align: 'right' });
  doc.save()
     .moveTo(ML, PH - 58).lineTo(PW - MR, PH - 58)
     .lineWidth(0.3).strokeColor('#CCCCCC').stroke()
     .restore();
}

doc.flushPages();
doc.end();

stream.on('finish', function () {
  console.log('PDF generated: ' + OUT);
});
