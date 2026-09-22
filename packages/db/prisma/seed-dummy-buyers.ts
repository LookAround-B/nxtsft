/**
 * One-off seed for the transparent sample-interest preview.
 *
 *   pnpm --filter @nxtsft/db exec tsx prisma/seed-dummy-buyers.ts
 *
 * Idempotent: upserts by phone, safe to re-run.
 *
 * Names are a literal copy of a subset of apps/web/src/data/dummyNames.ts's
 * NAMES_BY_STATE (not a live cross-package import — packages/db can't depend
 * on apps/web). Region-appropriate, but sample data, not evidence of actual
 * buyer activity — same disclaimer that file carries.
 */
import prisma from "../client";

const DUMMY_BUYERS: { name: string; state: string }[] = [
  { name: "Mangala Chowdary", state: "Andhra Pradesh" },
  { name: "Vijayalakshmi Mukkamala", state: "Andhra Pradesh" },
  { name: "Lokesh Chigurupati", state: "Andhra Pradesh" },
  { name: "Yogesh Yerramilli", state: "Andhra Pradesh" },
  { name: "Suresh Pothireddy", state: "Andhra Pradesh" },
  { name: "Anand Kunamneni", state: "Andhra Pradesh" },
  { name: "Rajesh Naidu", state: "Andhra Pradesh" },
  { name: "Santosh Naidu", state: "Andhra Pradesh" },
  { name: "Garima Lal", state: "Delhi" },
  { name: "Renu Pandey", state: "Delhi" },
  { name: "Pushpa Pant", state: "Delhi" },
  { name: "Vivek Bhasin", state: "Delhi" },
  { name: "Vandana Lal", state: "Delhi" },
  { name: "Rakesh Madan", state: "Delhi" },
  { name: "Avinash Kapoor", state: "Delhi" },
  { name: "Anil Vashisth", state: "Delhi" },
  { name: "Paresh Mansuri", state: "Gujarat" },
  { name: "Nayana Rathore", state: "Gujarat" },
  { name: "Dolly Salvi", state: "Gujarat" },
  { name: "Ramaben Rathore", state: "Gujarat" },
  { name: "Mitesh Soni", state: "Gujarat" },
  { name: "Bhavna Dave", state: "Gujarat" },
  { name: "Manjulaben Kazi", state: "Gujarat" },
  { name: "Hitesh Dave", state: "Gujarat" },
  { name: "Vivek Arora", state: "Haryana" },
  { name: "Sudesh Chatterjee", state: "Haryana" },
  { name: "Shalini Kataria", state: "Haryana" },
  { name: "Devender Dalal", state: "Haryana" },
  { name: "Sahil Ghosh", state: "Haryana" },
  { name: "Mohan Chatterjee", state: "Haryana" },
  { name: "Jitendra Mukherjee", state: "Haryana" },
  { name: "Dalbir Ahluwalia", state: "Haryana" },
  { name: "Sheela Dhiman", state: "Himachal Pradesh" },
  { name: "Ritu Puri", state: "Himachal Pradesh" },
  { name: "Shanti Pathak", state: "Himachal Pradesh" },
  { name: "Sachin Rajput", state: "Himachal Pradesh" },
  { name: "Mamta Chauhan", state: "Himachal Pradesh" },
  { name: "Ashok Joshi", state: "Himachal Pradesh" },
  { name: "Raj Kumari Kumar", state: "Himachal Pradesh" },
  { name: "Raj Kumari Joshi", state: "Himachal Pradesh" },
  { name: "Pushpa Beary", state: "Karnataka" },
  { name: "Vidya Upadhya", state: "Karnataka" },
  { name: "Nanditha Upadhya", state: "Karnataka" },
  { name: "Ravindra Pai", state: "Karnataka" },
  { name: "Harish Karanth", state: "Karnataka" },
  { name: "Anand Murthy", state: "Karnataka" },
  { name: "Gayatri Salian", state: "Karnataka" },
  { name: "Roopashri Colaco", state: "Karnataka" },
  { name: "Omana Devassy", state: "Kerala" },
  { name: "Muraleedharan Kaimal", state: "Kerala" },
  { name: "Jayan Joseph", state: "Kerala" },
  { name: "Sivaraman Paily", state: "Kerala" },
  { name: "Abhilash Nair", state: "Kerala" },
  { name: "Manju Pookoya", state: "Kerala" },
  { name: "Arun Panikkar", state: "Kerala" },
  { name: "Indira Nambiar", state: "Kerala" },
  { name: "Deepika Phapale", state: "Maharashtra" },
  { name: "Manorama Sawant", state: "Maharashtra" },
  { name: "Yashwant Chitale", state: "Maharashtra" },
  { name: "Vijay Phapale", state: "Maharashtra" },
  { name: "Aparna Walawalkar", state: "Maharashtra" },
  { name: "Sangeeta Mane", state: "Maharashtra" },
  { name: "Shailesh Vora", state: "Maharashtra" },
  { name: "Lata Shenoy", state: "Maharashtra" },
  { name: "Shalini Gupta", state: "Rajasthan" },
  { name: "Seema Swarnkar", state: "Rajasthan" },
  { name: "Shalini Parmar", state: "Rajasthan" },
  { name: "Dinesh Mahawar", state: "Rajasthan" },
  { name: "Anuradha Regar", state: "Rajasthan" },
  { name: "Bhavna Choudhary", state: "Rajasthan" },
  { name: "Kusum Vyas", state: "Rajasthan" },
  { name: "Monika Tiwari", state: "Rajasthan" },
  { name: "Yogambal Kaikolar", state: "Tamil Nadu" },
  { name: "Sivagami Chetty", state: "Tamil Nadu" },
  { name: "Perumal Mukkulathor", state: "Tamil Nadu" },
  { name: "Vijayalakshmi Dharmalingam", state: "Tamil Nadu" },
  { name: "Jagadeesh Paramasivam", state: "Tamil Nadu" },
  { name: "Kanchana Dharmalingam", state: "Tamil Nadu" },
  { name: "Arumugam Maravar", state: "Tamil Nadu" },
  { name: "Gowri Mukkulathor", state: "Tamil Nadu" },
  { name: "Pratap Anugothu", state: "Telangana" },
  { name: "Harish Jadhav", state: "Telangana" },
  { name: "Jyothi Mudhiraj", state: "Telangana" },
  { name: "Yadagiri Polisetti", state: "Telangana" },
  { name: "Saritha Reddy", state: "Telangana" },
  { name: "Mallaiah Mogili", state: "Telangana" },
  { name: "Madhusudan Vangala", state: "Telangana" },
  { name: "Mamta Thota", state: "Telangana" },
  { name: "Nitin Shukla", state: "Uttar Pradesh" },
  { name: "Neha Pandey", state: "Uttar Pradesh" },
  { name: "Shweta Nigam", state: "Uttar Pradesh" },
  { name: "Ruchi Gaur", state: "Uttar Pradesh" },
  { name: "Priyanka Shukla", state: "Uttar Pradesh" },
  { name: "Saurabh Rastogi", state: "Uttar Pradesh" },
  { name: "Prashant Gaur", state: "Uttar Pradesh" },
  { name: "Rajeev Mishra", state: "Uttar Pradesh" },
  { name: "Arup Ray", state: "West Bengal" },
  { name: "Tanusree Chaudhuri", state: "West Bengal" },
  { name: "Rekha Bandyopadhyaya", state: "West Bengal" },
  { name: "Pradip Chattopadhyay", state: "West Bengal" },];

// maskContact() (packages/trpc/src/sellerContactPolicy.ts) reveals the first
// two and last two digits of a 10-digit phone. A sequential pool would make
// every dummy lead render as the same "9XXXXXX0x" pattern platform-wide, an
// obvious tell next to real leads with varied prefixes — so the visible ends
// vary while the middle stays all-zero, and the full number is deliberately
// not in any range allocated to a real subscriber.
function fakePhone(i: number): string {
  const first = 6 + (i % 4); // 6-9, as real Indian mobiles start
  const second = (i * 7) % 10;
  const last = String((i * 37) % 100).padStart(2, "0");
  return `${first}${second}000000${last}`; // 1 + 1 + 6 zeros + 2 = 10 digits
}

async function main() {
  for (const [i, b] of DUMMY_BUYERS.entries()) {
    const phone = fakePhone(i);
    await prisma.dummyBuyer.upsert({
      where: { phone },
      create: {
        name: b.name,
        phone,
        email: `${b.name.toLowerCase().replace(/\s+/g, ".")}@gmail.com`,
        state: b.state,
      },
      update: {},
    });
  }
  console.log(`Seeded ${DUMMY_BUYERS.length} dummy buyers.`);
}

main().finally(() => prisma.$disconnect());
