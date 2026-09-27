import { NAMES_BY_STATE, type DummyName } from "./dummyNames";

// NxtSft's Virtual Property Consultant desk — 10 named consultants per state.
// These are the NAMES our virtual consultant team answers under, not
// independent agents: cards show no ratings, reviews, RERA badges or deal
// counts, and every "Request a callback" becomes a real lead (unassigned, for a
// supervisor/admin to hand out). Facts on the card come from the business:
// languages English + Hindi, callbacks the same day.
export const CONSULTANT_LANGUAGES = ["English", "Hindi"];
export const CONSULTANT_RESPONSE = "Calls back the same day";
export const CONSULTANT_PROPERTY_TYPES = ["Apartments", "Villas", "Plots", "Commercial"];
export const CONSULTANTS_PER_STATE = 10;

/** Major cities each state desk covers (shown as "Covers" chips). */
export const STATE_COVERAGE: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Durg"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman", "Diu"],
  Delhi: ["New Delhi", "South Delhi", "North Delhi", "Delhi NCR"],
  Goa: ["Panaji", "Madgaon", "Vasco da Gama", "Mapuca"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Haryana: ["Gurgaon", "Faridabad", "Panipat", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamsala", "Solan", "Mandi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi"],
  Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Manipur: ["Imphal", "Thoubal"],
  Meghalaya: ["Shillong", "Tura"],
  Mizoram: ["Aizawl", "Lunglei"],
  Nagaland: ["Kohima", "Dimapur"],
  Odisha: ["Bhubaneshwar", "Cuttack", "Puri", "Raurkela"],
  Puducherry: ["Puducherry", "Karaikal"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Mohali"],
  Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota"],
  Sikkim: ["Gangtok", "Namchi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  Telangana: ["Hyderabad", "Warangal", "Karimnagar", "Khammam"],
  Tripura: ["Agartala", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi"],
  Uttarakhand: ["Dehradun", "Haridwar", "Rishikesh", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur"],
};

// Region-appropriate names for states without a list in dummyNames.ts.
const f = (n: string): DummyName => ({ n, g: "f" });
const m = (n: string): DummyName => ({ n, g: "m" });
const EXTRA_NAMES: Record<string, DummyName[]> = {
  "Andaman and Nicobar Islands": [m("Arun Das"), f("Priya Mondal"), m("Suresh Nair"), f("Lakshmi Rao"), m("Ravi Biswas"), f("Anita Kujur"), m("Manoj Pillai"), f("Deepa Saha"), m("Sanjay Tirkey"), f("Kavita Roy")],
  "Arunachal Pradesh": [m("Tage Tatung"), f("Yami Nabam"), m("Tabom Riba"), f("Ngurang Yangfo"), m("Kento Jini"), f("Yapi Taba"), m("Doni Tali"), f("Mepung Pertin"), m("Nabam Tuki"), f("Oyin Moyong")],
  Assam: [m("Pranjal Bora"), f("Rupjyoti Gogoi"), m("Bhaskar Kalita"), f("Nandita Baruah"), m("Dipankar Saikia"), f("Mousumi Deka"), m("Hemanta Das"), f("Pallavi Hazarika"), m("Jitu Phukan"), f("Anjali Talukdar")],
  Bihar: [m("Rakesh Kumar Singh"), f("Pooja Kumari"), m("Amit Jha"), f("Nisha Mishra"), m("Vikash Yadav"), f("Shweta Sinha"), m("Rajiv Ranjan"), f("Priyanka Pandey"), m("Santosh Choudhary"), f("Kiran Thakur")],
  Chandigarh: [m("Harpreet Singh"), f("Simran Kaur"), m("Rohit Sharma"), f("Neha Bansal"), m("Gurdeep Sandhu"), f("Ritika Malhotra"), m("Aman Chopra"), f("Jasleen Gill"), m("Kunal Verma"), f("Pooja Mehta")],
  Chhattisgarh: [m("Ravi Sahu"), f("Sunita Verma"), m("Deepak Chandrakar"), f("Rekha Patel"), m("Ajay Sinha"), f("Kavita Tiwari"), m("Manish Agrawal"), f("Anjali Dewangan"), m("Rahul Yadav"), f("Priya Sharma")],
  "Dadra and Nagar Haveli and Daman and Diu": [m("Jignesh Patel"), f("Hetal Tandel"), m("Bhavesh Solanki"), f("Kinjal Desai"), m("Nilesh Halpati"), f("Dimple Rathod"), m("Mehul Varli"), f("Priti Patel"), m("Kalpesh Mistry"), f("Nisha Bhandari")],
  Goa: [m("Anthony Fernandes"), f("Maria D'Souza"), m("Prashant Naik"), f("Sneha Kamat"), m("Rohan Gaonkar"), f("Clara Pereira"), m("Vishal Shetye"), f("Priya Sawant"), m("Joseph Rodrigues"), f("Anjali Borkar")],
  "Jammu and Kashmir": [m("Imran Bhat"), f("Shabnam Dar"), m("Rajesh Raina"), f("Nazia Mir"), m("Faisal Wani"), f("Pooja Koul"), m("Vikram Singh Jamwal"), f("Rukhsana Shah"), m("Aamir Lone"), f("Sonia Gupta")],
  Jharkhand: [m("Ravi Munda"), f("Sunita Oraon"), m("Amit Mahato"), f("Pooja Kumari"), m("Deepak Soren"), f("Anita Tirkey"), m("Rajesh Prasad"), f("Kavita Hansda"), m("Sanjay Mahto"), f("Priya Singh")],
  Ladakh: [m("Tsering Dorjay"), f("Dolma Angmo"), m("Stanzin Namgyal"), f("Padma Lhamo"), m("Rigzin Tundup"), f("Tsewang Yangchen"), m("Jigmet Wangchuk"), f("Skarma Chondol"), m("Sonam Phuntsog"), f("Deachen Dolkar")],
  Lakshadweep: [m("Abdul Rahman"), f("Fathima Beevi"), m("Muhammed Koya"), f("Ayisha Bi"), m("Hamza Koya"), f("Rasiya Beegum"), m("Ismail Kutty"), f("Safiya Bi"), m("Kasim Koya"), f("Nafeesa Bi")],
  "Madhya Pradesh": [m("Rahul Chouhan"), f("Pooja Tiwari"), m("Sandeep Jain"), f("Neha Dubey"), m("Anil Rathore"), f("Kavita Patidar"), m("Manoj Yadav"), f("Shweta Agrawal"), m("Vivek Mishra"), f("Priya Sen")],
  Manipur: [m("Thoiba Singh"), f("Bembem Devi"), m("Ibomcha Meitei"), f("Sanatombi Chanu"), m("Rajkumar Somorjit"), f("Memcha Devi"), m("Tomba Singh"), f("Premila Chanu"), m("Boby Khuman"), f("Lanthoi Devi")],
  Meghalaya: [m("Banshan Syiem"), f("Iarisa Lyngdoh"), m("Donbok Kharkongor"), f("Wanda Marak"), m("Ricky Sangma"), f("Daphi Nongrum"), m("Kyrshan Warjri"), f("Merilin Dkhar"), m("Pynshai Rymbai"), f("Ibajanai Nongbri")],
  Mizoram: [m("Lalthanzuala Ralte"), f("Lalrinpuii Sailo"), m("Zothansanga Hmar"), f("Vanlalhriati Khiangte"), m("Lalremsiama Chhangte"), f("Malsawmi Pachuau"), m("Rohmingthanga Colney"), f("Lalhmangaihi Hnamte"), m("Vanlalruata Tochhawng"), f("Zonunpuii Renthlei")],
  Nagaland: [m("Neiphiu Rio"), f("Akala Ao"), m("Temjen Imchen"), f("Vikono Sema"), m("Imkong Jamir"), f("Sentila Longkumer"), m("Kevi Angami"), f("Toshila Lotha"), m("Hekani Yim"), f("Achila Chang")],
  Odisha: [m("Subhasis Mohanty"), f("Sasmita Das"), m("Prasanta Nayak"), f("Lipika Panda"), m("Debasish Sahoo"), f("Sunita Mishra"), m("Rajesh Patnaik"), f("Mamata Behera"), m("Bibhuti Swain"), f("Priyanka Rout")],
  Puducherry: [m("Arumugam Pillai"), f("Lakshmi Murugan"), m("Rajasekar Pakirisamy"), f("Anitha Selvam"), m("Vijay Kumar"), f("Priya Natarajan"), m("Senthil Raj"), f("Kavitha Balan"), m("Karthik Subramanian"), f("Deepa Raman")],
  Punjab: [m("Gurpreet Singh Dhillon"), f("Manpreet Kaur"), m("Harjinder Sandhu"), f("Rupinder Grewal"), m("Jaspal Singh Brar"), f("Navneet Kaur Sidhu"), m("Amandeep Gill"), f("Kulwinder Bajwa"), m("Sukhwinder Randhawa"), f("Harleen Chahal")],
  Sikkim: [m("Karma Bhutia"), f("Pema Lepcha"), m("Tashi Namgyal"), f("Sangay Doma"), m("Bishal Rai"), f("Anita Gurung"), m("Nima Sherpa"), f("Sabina Pradhan"), m("Ugen Tamang"), f("Diki Chettri")],
  Tripura: [m("Biplab Debbarma"), f("Moumita Saha"), m("Sudip Roy"), f("Rinku Das"), m("Tapas Chakraborty"), f("Sujata Reang"), m("Pradip Bhowmik"), f("Mitali Datta"), m("Ratan Jamatia"), f("Papiya Nath")],
  Uttarakhand: [m("Rakesh Negi"), f("Sunita Rawat"), m("Deepak Bisht"), f("Pooja Joshi"), m("Mahendra Rana"), f("Kavita Bhandari"), m("Harish Pant"), f("Neha Chauhan"), m("Vinod Dhyani"), f("Anjali Semwal")],
};

export type VirtualConsultant = {
  id: string; // stable: "<state-slug>-<n>"
  name: string;
  initials: string;
  state: string;
  cities: string[];
};

// Small deterministic shuffle so each state's picks are stable across renders
// and deploys (no reshuffling names between visits).
function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** 10 consultants for a state — gender-balanced, stable, region-appropriate. */
export function consultantsForState(state: string): VirtualConsultant[] {
  const pool = NAMES_BY_STATE[state] ?? EXTRA_NAMES[state] ?? [];
  const rnd = seeded(state);
  const shuffled = [...pool].sort((a, b) => (a.n < b.n ? -1 : 1)).map((x) => ({ x, k: rnd() })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const women = shuffled.filter((p) => p.g === "f");
  const men = shuffled.filter((p) => p.g === "m");
  const picked: DummyName[] = [];
  for (let i = 0; picked.length < CONSULTANTS_PER_STATE && (i < women.length || i < men.length); i++) {
    if (women[i]) picked.push(women[i]!);
    if (men[i] && picked.length < CONSULTANTS_PER_STATE) picked.push(men[i]!);
  }
  const cities = STATE_COVERAGE[state] ?? [];
  return picked.map((p, i) => ({
    id: `${slug(state)}-${i + 1}`,
    name: p.n,
    initials: p.n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    state,
    cities,
  }));
}

export const CONSULTANT_STATES = Object.keys(STATE_COVERAGE);
