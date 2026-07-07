// Static copy for the pricing page. Deliberately price-free: all plan names,
// prices, credits and validity render from the DB (prisma.plan via
// subscriptions.plans) so Plans Manager changes can never drift from this copy.

export const PRICING_TABS = ["Property Seller", "Property Buyer"] as const;

export type ChooserVariant = "owner-rent" | "owner-sell" | "seeker";

export const CHOOSER_FLOWS: Record<
  ChooserVariant,
  {
    steps: { q: string; options: { label: string; sub?: string; value: string }[] }[];
    recommend: (answers: string[]) => { planId: string; name: string; why: string };
  }
> = {
  "owner-rent": {
    steps: [
      {
        q: "How many rental properties do you want to list?",
        options: [
          { label: "Just 1", sub: "Single landlord", value: "1" },
          { label: "2 – 3", sub: "Small portfolio", value: "2-3" },
          { label: "4 or more", sub: "Agent / large owner", value: "4+" },
        ],
      },
      {
        q: "How quickly do you need a tenant?",
        options: [
          { label: "Within a week", sub: "Urgent", value: "urgent" },
          { label: "Within a month", sub: "Normal pace", value: "normal" },
          { label: "No rush", sub: "Flexible", value: "flexible" },
        ],
      },
      {
        q: "How much help do you want from NxtSft.com?",
        options: [
          { label: "Just give me leads", sub: "I'll handle everything", value: "self" },
          { label: "Help with lead routing", sub: "Auto-alerts and filtering", value: "assisted" },
          { label: "Fully managed", sub: "Ads + support + routing", value: "full" },
        ],
      },
    ],
    // planId must match a real Plan.id (type "owner-rent") in the DB.
    recommend: ([props, speed, help]) => {
      if (props === "4+" || help === "full")
        return {
          planId: "owner-rent-elite",
          name: "Elite",
          why: "Our top rental tier — maximum listings and leads, top placement, a dedicated manager and marketing support. Ideal for agents managing multiple properties.",
        };
      if (props === "2-3" || help === "assisted")
        return {
          planId: "owner-rent-standard",
          name: "Standard",
          why: "Multiple listings with a featured badge and stronger lead flow — perfect for small portfolios.",
        };
      if (speed === "urgent")
        return {
          planId: "owner-rent-pro",
          name: "Pro",
          why: "Priority placement, generous lead limits and a dedicated manager — maximum visibility when you need a tenant fast.",
        };
      return {
        planId: "owner-rent-basic",
        name: "Basic",
        why: "A single listing with steady lead flow — the right fit for most individual landlords.",
      };
    },
  },
  "owner-sell": {
    steps: [
      {
        q: "How many properties are you listing for sale?",
        options: [
          { label: "1 property", sub: "Homeowner", value: "1" },
          { label: "2 – 3", sub: "Independent agent", value: "2-3" },
          { label: "7 or more", sub: "Builder / developer", value: "7+" },
        ],
      },
      {
        q: "What kind of marketing support do you need?",
        options: [
          { label: "Basic listing", sub: "Just be listed", value: "basic" },
          { label: "Boosted visibility", sub: "Ads + top placement", value: "boosted" },
          { label: "Full digital marketing", sub: "Managed ad campaigns", value: "full" },
        ],
      },
      {
        q: "Do you need a CRM or lead routing system?",
        options: [
          { label: "No, I manage manually", value: "no" },
          { label: "Yes, integrated CRM", value: "yes" },
        ],
      },
    ],
    // planId must match a real Plan.id (type "owner-sell") in the DB.
    recommend: ([props, mkt, crm]) => {
      if (crm === "yes" || props === "7+")
        return {
          planId: "owner-sell-elite",
          name: "Elite",
          why: "Our top selling tier — maximum listings and leads, top placement, a dedicated manager and full marketing support. Built for serious developers.",
        };
      if (mkt === "full")
        return {
          planId: "owner-sell-pro",
          name: "Pro",
          why: "Priority placement, generous lead limits and a dedicated manager — for premium agencies.",
        };
      if (props === "2-3" || mkt === "boosted")
        return {
          planId: "owner-sell-standard",
          name: "Standard",
          why: "Multiple listings with a featured badge and stronger lead flow — the sweet spot for agents.",
        };
      return {
        planId: "owner-sell-basic",
        name: "Basic",
        why: "A single property listing with steady buyer lead flow — the right start for a direct homeowner.",
      };
    },
  },
  seeker: {
    steps: [
      {
        q: "How many properties do you want to enquire about?",
        options: [
          { label: "1 – 2", sub: "Very targeted", value: "1-2" },
          { label: "3 – 6", sub: "Short search", value: "3-6" },
          { label: "7 – 12", sub: "Active search", value: "7-12" },
          { label: "12+", sub: "Extensive search", value: "12+" },
        ],
      },
      {
        q: "Would you like priority support & site-visit scheduling help?",
        options: [
          { label: "Yes please", sub: "Priority support, visit scheduling", value: "yes" },
          { label: "No, I'll self-serve", sub: "I just need contacts", value: "no" },
        ],
      },
      {
        q: "When do you need to move in?",
        options: [
          { label: "ASAP", sub: "Within 2 weeks", value: "asap" },
          { label: "Within a month", sub: "Normal timeline", value: "month" },
          { label: "Just exploring", sub: "No rush", value: "explore" },
        ],
      },
    ],
    // planId must match a real seeker Plan.id ("seeker-instant" / "seeker-basic" /
    // "seeker-premium" when DB-seeded, or the bare "instant" / "basic" / "premium"
    // fallback names) — pricing/page.tsx's scrollToPlan() matches either form.
    recommend: ([count, support, when]) => {
      if (support === "yes" || count === "12+" || count === "7-12")
        return {
          planId: "premium",
          name: "Premium",
          why: "Our largest credit bundle with priority support — best for an active, multi-property search.",
        };
      if (count === "1-2" && when === "explore")
        return {
          planId: "instant",
          name: "Instant",
          why: "A single owner contact — perfect for testing one lead with zero commitment.",
        };
      return {
        planId: "basic",
        name: "Basic",
        why: "Our most popular credit bundle — the right fit for a focused, short search.",
      };
    },
  },
};

export const seekerFaqs: string[][] = [
  [
    "What is the difference between the buyer plans?",
    "Instant gives you a single owner contact — ideal for testing one specific property. Basic is our most popular bundle for a focused, short search. Premium gives the largest credit bundle for an active search across many properties. The exact price, number of credits, and validity of each plan are shown on the plan cards above — they are always up to date.",
  ],
  [
    "Which plan should I choose?",
    'Use the "Help me choose" tool above — answer 3 questions and we\'ll match you to the right plan. As a rule of thumb: if you have 1–2 specific properties in mind, go Instant. For a focused search across a neighbourhood, Basic. If you are actively searching across many properties and want priority support, Premium.',
  ],
  [
    "How quickly can I access contacts after purchasing a plan?",
    "Immediately. Credits are added to your wallet the moment your payment clears (usually within seconds). You can then unlock any property contact in one tap from the listing page.",
  ],
  [
    "What if a contact is unreachable or the property is already taken?",
    'Open your Unlocks tab in the User Portal and tap "Raise Dispute" on that unlock within 24 hours of the issue. Our team verifies the claim — if valid, the credit is restored to your wallet the same day. If you paid via a plan rather than wallet, a credit is returned rather than a cash refund.',
  ],
  [
    "Why was my unlock rejected or showing an error?",
    "This can happen if: (1) the listing was unpublished by the owner between your payment and the unlock attempt, (2) your session expired — try refreshing and unlocking again, or (3) there was a payment gateway error. In all cases, contact care@nxtsft.com and we will resolve it within 4 hours.",
  ],
  [
    "Do unused credits expire?",
    "Yes — credits are valid only within the plan's validity window, which is shown on each plan card. Unused credits are not carried forward or refunded after expiry. Plan accordingly: if you're exploring casually, buy a small plan; if you're actively searching, pick a larger bundle with longer validity.",
  ],
  [
    "Can I unlock the same property twice?",
    "No. Once a contact is unlocked it stays visible in your Unlocks tab permanently — you will never be charged again for the same property. Only one credit is deducted per property, ever.",
  ],
  [
    "Can I top-up or upgrade mid-search?",
    "Yes. You can purchase another plan at any time. New credits are added to your existing wallet balance on top of whatever you already hold.",
  ],
  [
    "Is there a monthly subscription?",
    "No. All buyer plans are one-time payments. There are no auto-renewals, no hidden recurring charges. Buy credits only when you need to search.",
  ],
  [
    "Is my payment secure?",
    "Yes. All transactions are processed by PCI-DSS compliant payment gateways. NxtSft.com never stores your card, UPI, or banking credentials. Payments are encrypted end-to-end.",
  ],
];

export const ownerFaqs: string[][] = [
  [
    "What is the difference between the rental and selling plans?",
    "Rental plans are designed for landlords seeking tenants — priced for faster turnover. Selling plans are for homeowners, agents, and developers selling properties — they carry higher lead quotas and longer validity because the sales cycle is longer. Both come in four tiers (Basic, Standard, Pro, Elite); the exact price, validity and inclusions of each tier are shown on the plan cards above.",
  ],
  [
    "When will my listing go live after I purchase a plan?",
    "Our team verifies and publishes listings within 24 hours of submission. Higher-tier plans are prioritised. You will receive a WhatsApp confirmation with your listing URL once it's live. If your listing is not published within 24 hours, contact care@nxtsft.com immediately.",
  ],
  [
    "Why was my listing rejected?",
    "Common rejection reasons: (1) the property is already listed on NxtSft.com under another account; (2) the property has already been rented or sold; (3) the submitted documents do not match the address; (4) the listing violates our content policy (misleading photos, incorrect category). You will receive a rejection reason via WhatsApp/email and can resubmit after addressing the issue.",
  ],
  [
    "Can I list multiple properties on a single plan?",
    "Yes, if your plan allows it. Each plan card above clearly states the number of active listings permitted — higher tiers allow more listings, with the top tier supporting large portfolios.",
  ],
  [
    'What counts as a "verified lead"?',
    "A verified lead is a buyer or tenant who has used a paid credit to unlock your contact on NxtSft.com. This means they have a registered, verified account, have paid for access, and are genuinely interested — not a casual browser. You receive their name, phone number, and property interest via WhatsApp instantly when they unlock your contact.",
  ],
  [
    "Do I pay per lead, or is it a flat fee?",
    "Flat fee. You pay once for the plan. Tenants and buyers pay NxtSft.com separately to unlock your contact. There are no commission or per-lead charges — you keep every rupee from your transaction. Our revenue model does not depend on your deal closing.",
  ],
  [
    "My plan expired before I found a tenant — what now?",
    "You can renew or upgrade at any time. There is no penalty, and your original listing content is preserved — just reactivate it when you renew. If you are not finding tenants quickly, consider a longer-validity tier for more time and lead flow.",
  ],
  [
    "Can I get a refund if my property gets rented through another channel?",
    "Plans are non-refundable once activated and a listing goes live — similar to how classified ads work. If your property is rented before the plan expires, higher-tier plans let you redirect the remaining lead quota to another property you own. Contact care@nxtsft.com to reassign.",
  ],
  [
    "Can I upgrade my plan mid-listing?",
    "Yes. Upgrade at any time through your account or by contacting support. The remaining days of your current plan are credited proportionally towards the upgrade cost. You will not lose any existing leads or listing visibility during the upgrade.",
  ],
  [
    "Do I need to share property documents to list?",
    'To get the "Verified" badge, yes — you will need to share a utility bill or ownership document. Unverified listings are published but shown without the badge. We strongly recommend getting verified: verified listings receive 3× more unlocks on average than unverified ones.',
  ],
  [
    "Will NxtSft.com agents help me find tenants?",
    "On Standard and above, our team actively matches your listing to tenant searches and WhatsApp-alerts you on all new enquiries. On higher tiers, a dedicated manager and marketing support are included. If you want a fully hands-off experience, contact our team about managed letting services.",
  ],
  [
    "What if a tenant I found causes problems later?",
    "NxtSft.com facilitates the connection but is not party to the tenancy agreement. Higher-tier plans include basic tenant background screening (name, ID verification) through our portal. For higher-value properties, we recommend engaging a local lawyer for a formal rental agreement.",
  ],
];

export const ownerSellFaqs: string[][] = [
  [
    "What is the difference between the selling plans?",
    "Basic is for individual homeowners with a single property. Standard adds a featured badge and stronger lead flow — ideal for active agents with a few listings. Pro adds priority placement and a dedicated manager for independent agencies. Elite is our top tier for builders and developers, with maximum listings, top placement and full marketing support. The exact price, validity and inclusions of each tier are shown on the plan cards above.",
  ],
  [
    "When will my listing go live after I purchase?",
    "Within 24 hours of document submission on standard plans. Higher-tier listings are prioritised and typically go live faster. You receive a WhatsApp confirmation with your listing URL once published.",
  ],
  [
    "Why was my sale listing rejected?",
    "Common reasons include: property already listed under another account; missing or mismatched ownership documents; property already sold; photos that do not match the described property; or a property category mismatch. You will receive a reason via WhatsApp/email and can resubmit after correction.",
  ],
  [
    "Do I pay a commission when my property sells?",
    "No. NxtSft.com charges a flat listing fee only. There are zero commissions or success fees. Every rupee from your sale goes entirely to you.",
  ],
  [
    "Which plan is right for a builder or developer?",
    "The Elite plan — it supports the largest number of active listings, includes a dedicated manager, and comes with managed marketing campaigns. For very large projects needing a dedicated microsite or custom integrations, email partners@nxtsft.com for a tailored quote and dedicated onboarding.",
  ],
  [
    "How do the marketing campaigns work?",
    "On higher tiers, our marketing team builds targeted campaigns reaching buyers by city, budget range, and property type. Campaigns go live within 48 hours of plan activation and include weekly performance reports.",
  ],
  [
    "Can I upgrade my plan or add more listings mid-month?",
    "Yes. Upgrade at any time — unused days from your current plan are credited pro-rata. You can also top up listing slots by purchasing an add-on without changing your base plan. Contact care@nxtsft.com for add-on pricing.",
  ],
  [
    "What happens if I don't sell within the plan validity?",
    "You can renew at the same plan tier (at the current price) and your listing content is preserved — no need to resubmit documents. If a buyer made enquiries during your plan but hasn't closed, their contact details remain in your dashboard even after plan expiry.",
  ],
  [
    "Is payment secure and what are the accepted methods?",
    "All payments are processed by PCI-DSS compliant payment gateways. We accept UPI, net banking, debit/credit cards, and EMI on select plans. NxtSft.com does not store any card or banking credentials.",
  ],
];
