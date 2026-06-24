import { readFileSync } from "node:fs";
import prisma from "../client.js";

// One-off bulk importer for the multi-state builder Excel exports.
// Reads a pre-converted JSON array (see scratchpad convert_builders.py) and
// inserts in chunks. Path passed as argv[2].
const path = process.argv[2];
if (!path) throw new Error("usage: tsx import-builders.ts <json-path>");

type Rec = {
  companyName: string;
  ownerName: string | null;
  mobile: string | null;
  projectType: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
};

const data = JSON.parse(readFileSync(path, "utf8")) as Rec[];
const CHUNK = 500;

async function main() {
  const before = await prisma.builder.count();
  let inserted = 0;
  for (let i = 0; i < data.length; i += CHUNK) {
    const res = await prisma.builder.createMany({
      data: data.slice(i, i + CHUNK),
      skipDuplicates: true,
    });
    inserted += res.count;
    process.stdout.write(`\r  ${Math.min(i + CHUNK, data.length)}/${data.length} processed, ${inserted} inserted`);
  }
  const after = await prisma.builder.count();
  console.log(`\n✓ Inserted ${inserted} of ${data.length} (skipped ${data.length - inserted} duplicates)`);
  console.log(`  Builder table: ${before} → ${after}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
