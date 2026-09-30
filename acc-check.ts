import { analyze } from "@/lib/checks";
import { DOCUMENTS } from "@/data/documents";
import { SEED_CLAIMS } from "@/data/claims";
import { REFERENCE } from "@/data/reference";
import { PEOPLE } from "@/data/people";

const a = analyze({ docs: DOCUMENTS, claims: SEED_CLAIMS, reference: REFERENCE, people: PEOPLE });
console.log("flagged order:", a.flagged.map(d => `${d.id}:${a.statusByDoc[d.id]}:${a.priorityByDoc[d.id]}`).join(" "));
console.log("green:", a.trusted.map(d => d.id).join(","));
console.log("D2 issues:", a.issuesByDoc.D2.map(i=>i.kind), "who:", a.whoToAskByDoc.D2.person.name);
console.log("D4 issues:", a.issuesByDoc.D4.map(i=>i.kind));
console.log("D5:", a.issuesByDoc.D5.map(i=>i.reason), "who:", a.whoToAskByDoc.D5.person.name);
console.log("D7:", a.issuesByDoc.D7.map(i=>i.reason));
const ref2 = REFERENCE.map(r => r.topic_param==="indexation.rate" ? {...r, value:"2.2%"} : r);
const b = analyze({ docs: DOCUMENTS, claims: SEED_CLAIMS, reference: ref2, people: PEOPLE });
console.log("after legal watch D1:", b.statusByDoc.D1, "mismatch docs:", DOCUMENTS.filter(d=>b.issuesByDoc[d.id].some(i=>i.kind==="reference_mismatch"&&i.reason.includes("2.2%"))).map(d=>d.id));
