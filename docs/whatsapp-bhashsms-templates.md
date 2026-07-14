# WhatsApp Templates — BhashSMS (current provider)

> Supersedes the Meta Cloud API plan in `whatsapp-templates.md`. We send via
> **BhashSMS** (`packages/trpc/src/bhashsms.ts`), not the Meta Cloud API.

Every send is **best-effort** (never blocks the app) and **env-gated**: it stays
a silent no-op until the matching `BHASHSMS_TEMPLATE_*` env var is set in Vercel
to the **approved** template name. So code is wired now and each message goes
live only once its template is approved and its env var is set.

## How to take a template live
1. Create it in the BhashSMS panel with the **exact placeholder order** below,
   category **Utility** (OTP = Authentication), and get it approved.
2. In Vercel set the env var to the approved name
   (e.g. `BHASHSMS_TEMPLATE_NEW_LEAD_ALERT=new_lead_alert`).
3. Redeploy → that message now fires on its event.

> ⚠️ Variable **count + order must match** the table or the send fails.
> Recipients must give their **WhatsApp number** (delivery is on WhatsApp).

## Transactional templates (wired, auto-fire)

| Env var | Suggested name | Category | Variables (in order) | Fires when → who |
|---|---|---|---|---|
| `BHASHSMS_TEMPLATE_SIGNUP_OTP` | `signup_otp` | Authentication | `{{1}}` OTP | login/signup → user **(LIVE)** |
| `BHASHSMS_TEMPLATE_SELLER_WELCOME` | `seller_welcome` | Utility | `{{1}}` name | seller/agent approved → them |
| `BHASHSMS_TEMPLATE_NEW_LEAD_ALERT` | `new_lead_alert` | Utility | `{{1}}` buyer name, `{{2}}` buyer phone, `{{3}}` property title | buyer enquires → property owner |
| `BHASHSMS_TEMPLATE_ENQUIRY_ACK` | `enquiry_ack` | Utility | `{{1}}` buyer name, `{{2}}` property title | buyer enquires → buyer |
| `BHASHSMS_TEMPLATE_CONTACT_UNLOCKED` | `contact_unlocked` | Utility | `{{1}}` property title, `{{2}}` owner name, `{{3}}` owner phone | buyer spends a credit → buyer |
| `BHASHSMS_TEMPLATE_VISIT_CONFIRMED` | `visit_confirmed` | Utility | `{{1}}` visitor name, `{{2}}` property title, `{{3}}` date & time | site visit scheduled → visitor |
| `BHASHSMS_TEMPLATE_LISTING_LIVE` | `listing_live` | Utility | `{{1}}` seller name, `{{2}}` property title | listing approved → seller |
| `BHASHSMS_TEMPLATE_PAYMENT_RECEIPT` | `payment_receipt` | Utility | `{{1}}` plan name, `{{2}}` credits, `{{3}}` amount (₹) | credits payment success → buyer |

### Suggested body wording (match the variable order above)
- **seller_welcome** — `Hi {{1}}, welcome to NxtSft.com! Your account is approved — you can now log in and list your property. Zero commission, RERA-verified buyers.`
- **new_lead_alert** — `New enquiry on NxtSft.com! {{1}} ({{2}}) is interested in your listing "{{3}}". Respond fast to close the deal.`
- **enquiry_ack** — `Hi {{1}}, we've received your enquiry for "{{2}}" on NxtSft.com. Our team will connect you with the owner shortly.`
- **contact_unlocked** — `You unlocked the owner contact for "{{1}}" on NxtSft.com. Owner: {{2}}, {{3}}. Call now to schedule a visit!`
- **visit_confirmed** — `Hi {{1}}, your site visit for "{{2}}" is confirmed for {{3}}. See you there! — NxtSft.com`
- **listing_live** — `Hi {{1}}, your listing "{{2}}" is now LIVE on NxtSft.com and visible to buyers. 🎉`
- **payment_receipt** — `Payment received! {{1}} — {{2}} credits added to your NxtSft.com wallet. Amount: ₹{{3}}. Thank you!`

## Wired code locations
- helper: `sendTemplateIfConfigured(envKey, to, params)` in `packages/trpc/src/bhashsms.ts`
- `seller_welcome`, `listing_live` → `routers/admin.ts` (users.verify, properties.approve)
- `new_lead_alert`, `enquiry_ack`, `visit_confirmed` → `routers/leads.ts` (create, scheduleVisit)
- `contact_unlocked` → `routers/properties.ts` (unlockContact)
- `payment_receipt` → `routers/subscriptions.ts` (verifyPayment)

## Not yet wired (need more than an event hook)
- **visit_reminder** (day-before) — needs a scheduled cron, not an event. Separate task.
- **kyc_result**, **plan_expiry** — wire on the KYC-review / expiry events when wanted.

## Marketing / engagement (planned)
`welcome_offer`, `price_drop`, `new_matches` 🎠, `recommended_homes` 🎠,
`re_engage` 🎠, `refer_earn`, `festive_offer`, `cross_sell` — need `waOptIn` +
Marketing category, sent from the **nxtsft admin campaign sender** (to be built).
Carousels (🎠) are **blocked on confirming BhashSMS carousel API support**.
