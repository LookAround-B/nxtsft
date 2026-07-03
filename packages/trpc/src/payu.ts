import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of two hex-encoded digests. */
function hexEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// In production the gateway URL must be set explicitly — never silently fall
// back to the PayU test endpoint (payments there would never actually settle).
// An empty string surfaces as an obvious failure at the point of use instead.
export const PAYU_BASE_URL =
  process.env.PAYU_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "" : "https://test.payu.in/_payment");

// Resolve the merchant credentials, throwing if either is absent. Prevents a
// hash from ever being computed with a literal "undefined" salt/key (which
// would be forgeable by anyone who knows the algorithm).
function payuSecrets(): { key: string; salt: string } {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  if (!key || !salt) {
    throw new Error(
      "PayU is not configured: PAYU_MERCHANT_KEY and PAYU_MERCHANT_SALT are required.",
    );
  }
  return { key, salt };
}

interface HashFields {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}

export function generatePayUHash(fields: HashFields): string {
  const { key, salt } = payuSecrets();
  const { txnid, amount, productinfo, firstname, email } = fields;
  const udf1 = fields.udf1 ?? "";
  const udf2 = fields.udf2 ?? "";
  const udf3 = fields.udf3 ?? "";
  const udf4 = fields.udf4 ?? "";
  const udf5 = fields.udf5 ?? "";
  const str = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return createHash("sha512").update(str).digest("hex");
}

export function verifyPayUHash(
  fields: HashFields,
  status: string,
  receivedHash: string,
): boolean {
  const { key, salt } = payuSecrets();
  const { txnid, amount, productinfo, firstname, email } = fields;
  const udf1 = fields.udf1 ?? "";
  const udf2 = fields.udf2 ?? "";
  const udf3 = fields.udf3 ?? "";
  const udf4 = fields.udf4 ?? "";
  const udf5 = fields.udf5 ?? "";
  // PayU reverse hash: salt|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const str = `${salt}|${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const expected = createHash("sha512").update(str).digest("hex");
  return hexEqual(expected, receivedHash);
}
