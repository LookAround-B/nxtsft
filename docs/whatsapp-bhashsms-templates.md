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

> ⚠️ **Sender ID (common "approved but not delivering" cause):** BhashSMS sends
> Authentication (OTP) and Utility templates from *different* sender IDs. OTP uses
> `BHASHSMS_SENDER` (`BhashSoftwareLab`); every Utility template (all rows below
> except `signup_otp`) uses **`BHASHSMS_SENDER_UTILITY`**, which defaults to
> `BUZWAP` (BhashSMS's WhatsApp sender). If an approved Utility template still
> doesn't arrive, confirm your utility sender with BhashSMS and set
> `BHASHSMS_SENDER_UTILITY` in Vercel — this does **not** affect OTP.

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
| `BHASHSMS_TEMPLATE_PAYMENT_REMINDER` | `payment_reminder` | Utility | `{{1}}` customer name, `{{2}}` plan, `{{3}}` amount (₹), `{{4}}` payment link | rep hits "Send reminder" → customer |
| `BHASHSMS_TEMPLATE_LISTING_EXPIRING` | `listing_expiring` | Utility | `{{1}}` seller name, `{{2}}` property title, `{{3}}` days left | validity sweep, 3 days out → seller |
| `BHASHSMS_TEMPLATE_LISTING_EXPIRED` | `listing_expired` | Utility | `{{1}}` seller name, `{{2}}` property title | validity sweep, on expiry → seller |
| `BHASHSMS_TEMPLATE_ADMIN_NEW_USER` | `admin_new_user` | Utility | `{{1}}` name, `{{2}}` phone, `{{3}}` city, `{{4}}` role | any new signup → **business owner** (see `ADMIN_ALERT_WHATSAPP` below) |

### Suggested body wording (match the variable order above)
- **seller_welcome** — `Hi {{1}}, your NxtSft.com account is approved. You can now log in and list your property.` (kept promo-free so it stays **Utility** — a promotional tail risks a Marketing reclassification)
- **new_lead_alert** — `New enquiry on NxtSft.com! {{1}} ({{2}}) is interested in your listing "{{3}}". Respond fast to close the deal.`
- **enquiry_ack** — `Hi {{1}}, we've received your enquiry for "{{2}}" on NxtSft.com. Our team will connect you with the owner shortly.`
- **contact_unlocked** — `You unlocked the owner contact for "{{1}}" on NxtSft.com. Owner: {{2}}, {{3}}. Call now to schedule a visit!`
- **visit_confirmed** — `Hi {{1}}, your site visit for "{{2}}" is confirmed for {{3}}. See you there! — NxtSft.com`
- **listing_live** — `Hi {{1}}, your listing "{{2}}" is now LIVE on NxtSft.com and visible to buyers. 🎉`
- **payment_receipt** — `Payment received! {{1}} — {{2}} credits added to your NxtSft.com wallet. Amount: ₹{{3}}. Thank you!`
- **payment_reminder** — `Hi {{1}}, your NxtSft.com listing ({{2}}, {{3}}) is waiting on payment. Complete it here: {{4}}`
- **listing_expiring** — `Hi {{1}}, your NxtSft.com listing "{{2}}" expires in {{3}} day(s). Renew to keep receiving enquiries.`
- **listing_expired** — `Hi {{1}}, your NxtSft.com listing "{{2}}" has expired and is no longer visible to buyers. Renew any time to go live again.`
- **admin_new_user** — `Hello! A new user just registered on NxtSft.com. Name: {{1}}. Mobile: {{2}}. City: {{3}}. They signed up as a {{4}}. Review this registration in your admin dashboard.`
  > Meta rejects a short body with 4 variables ("Parameters words ratio exceeds
  > limit", subcode 2388293) — the body must carry enough static text per
  > variable, and must not start or end with a `{{n}}`. Keep the wording at least
  > this long. Only the body text changes to satisfy this; the code still fills
  > `{{1}}`–`{{4}}` as name, phone, city, role, so no redeploy is needed.

> ⚠️ **`admin_new_user` is the one template sent to a fixed owner number, not a
> per-event customer.** It needs **both** env vars: `BHASHSMS_TEMPLATE_ADMIN_NEW_USER`
> (the approved template name) **and** `ADMIN_ALERT_WHATSAPP` (the owner's 10-digit
> WhatsApp number, no country code). If either is blank it stays a silent no-op —
> which is why the alert wasn't arriving before this was wired.

## Wired code locations
- helper: `sendTemplateIfConfigured(envKey, to, params)` in `packages/trpc/src/bhashsms.ts`
- `seller_welcome`, `listing_live` → `routers/admin.ts` (users.verify, properties.approve)
- `new_lead_alert`, `enquiry_ack`, `visit_confirmed` → `routers/leads.ts` (create, scheduleVisit)
- `contact_unlocked` → `routers/properties.ts` (unlockContact)
- `payment_receipt` → `routers/subscriptions.ts` (verifyPayment)
- `payment_reminder` → `routers/leads.ts` (sendPaymentReminder)
- `listing_expiring`, `listing_expired` → `listingExpiry.ts` (sweepListingValidity, run by `/api/cron/listing-expiry`)
- `seller_welcome` also fires for rep-created customer accounts → `customerAccount.ts`
- `admin_new_user` → `routers/auth.ts` (register, registerSeller, completePhone — both Google branches) via `notifyAdminNewUser()`; sent to the owner number in `ADMIN_ALERT_WHATSAPP` on every completed signup

## Not yet wired (need more than an event hook)
- **visit_reminder** (day-before) — needs a scheduled cron, not an event. Separate task.
- **kyc_result**, **plan_expiry** — wire on the KYC-review / expiry events when wanted.

## Marketing / engagement (planned)
`welcome_offer`, `price_drop`, `new_matches` 🎠, `recommended_homes` 🎠,
`re_engage` 🎠, `refer_earn`, `festive_offer`, `cross_sell` — need `waOptIn` +
Marketing category, sent from the **nxtsft admin campaign sender** (to be built).
Carousels (🎠) are **blocked on confirming BhashSMS carousel API support**.
