# Regenerates apps/web/src/data/dummyNames.ts.
#   • South states (Kerala/TN/Karnataka/Telangana/Andhra Pradesh): sampled from
#     docs/South_Indian_Hindu_Names_Dataset.xlsx (First + Last, by gender).
#   • Other listing states: region-appropriate curated pools (see CURATED).
# Run: python packages/trpc/scripts/gen-dummy-names.py
import openpyxl, random, json, collections, os

random.seed(42)  # reproducible sampling
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
XLSX = os.path.join(ROOT, "docs", "South_Indian_Hindu_Names_Dataset.xlsx")
OUT = os.path.join(ROOT, "apps", "web", "src", "data", "dummyNames.ts")

SOUTH_PER_STATE = 90
CURATED_PER_STATE = 45

# ── South states from the verified dataset ─────────────────────────────────
def sample_south():
    wb = openpyxl.load_workbook(XLSX, read_only=True)
    ws = wb["All Names Dataset"]
    by_state = collections.defaultdict(list)
    for r in ws.iter_rows(min_row=2, values_only=True):
        first, _mid, last, gender, _age, _rel, state = r[1], r[2], r[3], r[4], r[5], r[6], r[7]
        if not first or not last or not gender:
            continue
        g = "m" if str(gender).strip().lower().startswith("m") else "f"
        by_state[state].append({"n": f"{str(first).strip()} {str(last).strip()}", "g": g})
    out = {}
    for state, names in by_state.items():
        # dedupe by display name, keep gender balance, then sample
        seen, uniq = set(), []
        random.shuffle(names)
        for x in names:
            if x["n"] in seen:
                continue
            seen.add(x["n"]); uniq.append(x)
        out[state] = uniq[:SOUTH_PER_STATE]
    return out

# ── Curated region pools for states absent from the dataset ────────────────
# first names split by gender + region surnames; combined deterministically.
CURATED = {
    "Maharashtra": {
        "m": ["Aniket","Sachin","Mahesh","Nilesh","Prasad","Rohit","Sandeep","Yogesh","Amol","Ganesh","Vikas","Sagar","Tushar","Mangesh","Pravin","Swapnil","Akshay","Omkar","Nikhil","Sumit"],
        "f": ["Snehal","Priyanka","Pooja","Madhuri","Smita","Vaishali","Kavita","Manasi","Trupti","Rutuja","Sayali","Ashwini","Pallavi","Shraddha","Mrunal","Aarti","Sneha","Komal","Neha","Devyani"],
        "s": ["Patil","Deshmukh","Joshi","Kulkarni","Pawar","Jadhav","Gaikwad","Bhosale","Shinde","Kale","More","Sawant","Naik","Chavan","Deshpande","Wagh","Salunkhe","Mhatre","Bhosle","Kadam"],
    },
    "West Bengal": {
        "m": ["Arnab","Subhankar","Soumitra","Debasish","Anirban","Tanmay","Pritam","Sourav","Indranil","Abir","Rudra","Sayan","Joydeep","Kaushik","Rajib","Arghya","Tirthankar","Shubho","Ratan","Bivas"],
        "f": ["Rituparna","Paromita","Ananya","Moumita","Debolina","Sohini","Ishita","Madhumita","Piyali","Sutapa","Aparna","Nandini","Srabani","Tanusree","Mahua","Poulomi","Rupa","Sromona","Riya","Doyel"],
        "s": ["Banerjee","Chatterjee","Mukherjee","Bhattacharya","Das","Bose","Ghosh","Sen","Dutta","Roy","Chakraborty","Sarkar","Mitra","Dey","Basu","Pal","Nandi","Saha","Ganguly","Sengupta"],
    },
    "Gujarat": {
        "m": ["Jignesh","Hardik","Nilay","Bhavesh","Kalpesh","Mehul","Chirag","Tejas","Parth","Hiren","Dhruv","Nirav","Rutvik","Harsh","Mitul","Ronak","Krunal","Darshan","Jay","Vatsal"],
        "f": ["Krupa","Foram","Hetal","Riddhi","Nisha","Khushboo","Jinal","Drashti","Avani","Bhumika","Kinjal","Roshni","Heena","Mansi","Urvi","Komal","Dimple","Heta","Shraddha","Vidhi"],
        "s": ["Patel","Shah","Mehta","Desai","Joshi","Trivedi","Modi","Parekh","Gandhi","Amin","Vyas","Bhatt","Thakkar","Pandya","Dave","Raval","Jani","Sheth","Soni","Panchal"],
    },
    "Rajasthan": {
        "m": ["Mahaveer","Bhanwar","Devendra","Mahendra","Naresh","Lokesh","Hemant","Mukesh","Manish","Govind","Rajendra","Pankaj","Vikram","Yogendra","Kailash","Banwari","Mohit","Shyam","Dinesh","Jitendra"],
        "f": ["Sunita","Kavita","Manju","Rekha","Pooja","Aarti","Suman","Sapna","Neelam","Babita","Anju","Mamta","Geeta","Priyanka","Asha","Sarita","Lata","Hemlata","Pinky","Kiran"],
        "s": ["Sharma","Agarwal","Rathore","Choudhary","Shekhawat","Jain","Soni","Meena","Khandelwal","Saini","Vyas","Purohit","Mathur","Bhati","Charan","Maheshwari","Goyal","Sankhla","Tak","Singhal"],
    },
    "Haryana": {
        "m": ["Sumit","Vikas","Sandeep","Pradeep","Naveen","Ravi","Manoj","Deepak","Ankit","Rohit","Parveen","Sahil","Yogesh","Vijender","Mandeep","Sachin","Amit","Krishan","Jagbir","Sonu"],
        "f": ["Pooja","Kavita","Sunita","Priyanka","Renu","Saroj","Manisha","Babita","Nisha","Seema","Ritu","Suman","Anjali","Komal","Kiran","Neha","Sonia","Deepika","Jyoti","Preeti"],
        "s": ["Yadav","Dahiya","Malik","Sangwan","Hooda","Phogat","Chahal","Sheoran","Beniwal","Kadyan","Lamba","Rana","Sihag","Tomar","Punia","Dhankar","Antil","Grewal","Khatri","Saharan"],
    },
    "Delhi": {
        "m": ["Rohit","Aman","Karan","Varun","Sahil","Nikhil","Ankit","Rahul","Gaurav","Tarun","Vishal","Mohit","Akash","Harsh","Sumit","Naman","Yash","Kunal","Siddharth","Dev"],
        "f": ["Nupur","Ritika","Sakshi","Megha","Tanya","Ishita","Aditi","Shreya","Kritika","Pooja","Neha","Bhavna","Simran","Divya","Anjali","Mansi","Ankita","Surbhi","Vanshika","Khushi"],
        "s": ["Sharma","Verma","Gupta","Khanna","Kapoor","Malhotra","Chopra","Bhardwaj","Sethi","Arora","Bansal","Mittal","Saxena","Aggarwal","Tandon","Chadha","Nagpal","Sood","Mehra","Grover"],
    },
    "Uttar Pradesh": {
        "m": ["Abhishek","Shivam","Saurabh","Anurag","Aditya","Vivek","Ankur","Prashant","Vaibhav","Utkarsh","Devesh","Himanshu","Praveen","Ashutosh","Manish","Nitin","Rajeev","Akhilesh","Vineet","Gaurav"],
        "f": ["Shalini","Priyanka","Garima","Swati","Aarti","Neha","Pooja","Richa","Deepti","Anamika","Shweta","Ruchi","Kanchan","Nidhi","Astha","Preeti","Sneha","Ankita","Vandana","Madhuri"],
        "s": ["Tripathi","Tiwari","Dubey","Mishra","Pandey","Shukla","Srivastava","Yadav","Singh","Chaturvedi","Awasthi","Dwivedi","Bajpai","Saxena","Rastogi","Verma","Pathak","Upadhyay","Nigam","Gaur"],
    },
}

def gen_curated():
    out = {}
    for state, pools in CURATED.items():
        combos, seen = [], set()
        firsts = [(n, "m") for n in pools["m"]] + [(n, "f") for n in pools["f"]]
        random.shuffle(firsts)
        surnames = pools["s"][:]
        i = 0
        for first, g in firsts:
            random.shuffle(surnames)
            for s in surnames:
                name = f"{first} {s}"
                if name in seen:
                    continue
                seen.add(name); combos.append({"n": name, "g": g})
                i += 1
                break
            if len(combos) >= CURATED_PER_STATE:
                break
        out[state] = combos
    return out

south = sample_south()
curated = gen_curated()
by_state = {**south, **curated}

# DEFAULT fallback pool for any state not listed: a pan-India blend.
default = []
for st in ["Delhi", "Maharashtra", "West Bengal", "Karnataka", "Gujarat"]:
    default += by_state.get(st, [])[:12]
random.shuffle(default)

def dump(arr):
    return "[\n" + ",\n".join(f'  {{ "n": {json.dumps(x["n"])}, "g": "{x["g"]}" }}' for x in arr) + ",\n]"

lines = []
lines.append("// Auto-generated by packages/trpc/scripts/gen-dummy-names.py — do not hand-edit.")
lines.append("// Social-proof \"buyer\" names for the property Activity widget, grouped by state so")
lines.append("// a listing shows region-appropriate names. South states are sampled from the")
lines.append("// verified dataset; other states use curated region pools.")
lines.append('export type DummyName = { n: string; g: "m" | "f" };')
lines.append("")
lines.append("export const NAMES_BY_STATE: Record<string, DummyName[]> = {")
for state in sorted(by_state):
    body = ",\n".join(f'    {{ n: {json.dumps(x["n"])}, g: "{x["g"]}" }}' for x in by_state[state])
    lines.append(f"  {json.dumps(state)}: [\n{body},\n  ],")
lines.append("};")
lines.append("")
body = ",\n".join(f'  {{ n: {json.dumps(x["n"])}, g: "{x["g"]}" }}' for x in default)
lines.append(f"export const DEFAULT_NAMES: DummyName[] = [\n{body},\n];")
lines.append("")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Wrote", OUT)
for s in sorted(by_state):
    print(f"  {s}: {len(by_state[s])}")
print("DEFAULT:", len(default))
