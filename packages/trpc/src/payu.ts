import { createHash } from "node:crypto";

export const PAYU_BASE_URL =
  process.env.PAYU_BASE_URL ?? "https://test.payu.in/_payment";

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
  const key = process.env.PAYU_MERCHANT_KEY!;
  const salt = process.env.PAYU_MERCHANT_SALT!;
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
  const key = process.env.PAYU_MERCHANT_KEY!;
  const salt = process.env.PAYU_MERCHANT_SALT!;
  const { txnid, amount, productinfo, firstname, email } = fields;
  const udf1 = fields.udf1 ?? "";
  const udf2 = fields.udf2 ?? "";
  const udf3 = fields.udf3 ?? "";
  const udf4 = fields.udf4 ?? "";
  const udf5 = fields.udf5 ?? "";
  // PayU reverse hash: salt|status|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const str = `${salt}|${status}|${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const expected = createHash("sha512").update(str).digest("hex");
  return expected === receivedHash;
}
