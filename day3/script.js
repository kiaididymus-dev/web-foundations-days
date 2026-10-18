// ---------- Starting data ----------
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// ---------- Helpers ----------
function normalize(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

// ---------- Functions ----------

// Returns notes whose text contains the word (case-insensitive)
function searchNotes(word) {
  const target = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(target));
}

// Returns the note with the most characters, or null if there are none
function longestNote() {
  if (notes.length === 0) return null;
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) longest = note;
  }
  return longest;
}

// Returns an object counting notes per category
function countByCategory() {
  const counts = { personal: 0, work: 0, study: 0 };
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// Returns a sentence such as "5 notes: 2 personal, 1 work, 2 study."
function getSummary() {
  const total = notes.length;
  const counts = countByCategory();
  const label = total === 1 ? "note" : "notes";
  if (total === 0) return `0 ${label}.`;
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${count} ${category}`);
  return `${total} ${label}: ${parts.join(", ")}.`;
}

// True if a note with the same text exists (ignoring case and extra spaces)
function isDuplicate(text) {
  const target = normalize(text);
  return notes.some((note) => normalize(note.text) === target);
}

// Adds a note if valid. Returns true when added, false otherwise.
function addNote(text, category) {
  if (typeof text !== "string" || text.trim().length < 1 || text.trim().length > 200) {
    console.log("addNote failed: text must be 1–200 characters.");
    return false;
  }
  if (isDuplicate(text)) {
    console.log("addNote failed: duplicate note.");
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log("addNote failed: category must be personal, work or study.");
    return false;
  }
  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: text.trim(), category });
  return true;
}

// ---------- Tests ----------

// searchNotes
console.log("searchNotes('milk'):", searchNotes("milk"));
// [ { id: 1, text: "Buy milk and bread", category: "personal" } ]
console.log("searchNotes('THE'):", searchNotes("THE"));
// [ id 2 "Finish the Day 3 assignment", id 3 "Email the project report to Grace" ]
console.log("searchNotes('zebra'):", searchNotes("zebra"));
// [] (edge case: no results)

// longestNote
console.log("longestNote():", longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }
const savedNotes = notes;
notes = [];
console.log("longestNote() on empty array:", longestNote());
// null (edge case: no notes)
notes = savedNotes;

// countByCategory
console.log("countByCategory():", countByCategory());
// { personal: 2, work: 1, study: 2 }
notes = [];
console.log("countByCategory() on empty array:", countByCategory());
// { personal: 0, work: 0, study: 0 } (edge case)
notes = savedNotes;

// getSummary
console.log("getSummary():", getSummary());
// "5 notes: 2 personal, 1 work, 2 study."
notes = [savedNotes[0]];
console.log("getSummary() with one note:", getSummary());
// "1 note: 1 personal." (edge case: singular)
notes = [];
console.log("getSummary() with no notes:", getSummary());
// "0 notes." (edge case)
notes = savedNotes;

// isDuplicate
console.log("isDuplicate('buy milk and bread'):", isDuplicate("buy milk and bread"));
// true
console.log("isDuplicate('  BUY   milk  and bread  '):", isDuplicate("  BUY   milk  and bread  "));
// true (edge case: case and extra spaces)
console.log("isDuplicate('Walk the dog'):", isDuplicate("Walk the dog"));
// false

// addNote
console.log("addNote('Walk the dog', 'personal'):", addNote("Walk the dog", "personal"));
// true
console.log("addNote('walk  the dog', 'personal'):", addNote("walk  the dog", "personal"));
// false, logs "addNote failed: duplicate note."
console.log("addNote('', 'work'):", addNote("", "work"));
// false, logs "addNote failed: text must be 1–200 characters."
console.log("addNote('a'.repeat(201), 'work'):", addNote("a".repeat(201), "work"));
// false, logs "addNote failed: text must be 1–200 characters."
console.log("addNote('Go to the gym', 'fitness'):", addNote("Go to the gym", "fitness"));
// false, logs "addNote failed: category must be personal, work or study."
console.log("getSummary() after adding:", getSummary());
// "6 notes: 3 personal, 1 work, 2 study."