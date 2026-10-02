let notes = [
    { id: 1, text: "Buy milk and bread", category: "personal" },
    { id: 2, text: "Finish the Day 3 assignment", category: "study" },
    { id: 3, text: "Email the project report to Grace", category: "work" },
    { id: 4, text: "Revise JavaScript arrays", category: "study" },
    { id: 5, text: "Call mum", category: "personal" },
];


// 1. Search notes
function searchNotes(word) {
    return notes.filter(note =>
        note.text.toLowerCase().includes(word.toLowerCase())
    );
}


function longestNote() {
    if (notes.length === 0) {
        return null;
    }

    return notes.reduce((longest, note) =>
        note.text.length > longest.text.length ? note : longest
    );
}

function countByCategory() {
    let counts = {
        personal: 0,
        work: 0,
        study: 0
    };

    notes.forEach(note => {
        counts[note.category]++;
    });

    return counts;
}


// 4. Get summary
function getSummary() {
    let counts = countByCategory();
    let word = notes.length === 1 ? "note" : "notes";

    return `${notes.length} ${word}: ${counts.personal} personal, ${counts.work} work, ${counts.study} study.`;
}

function isDuplicate(text) {
    let cleanText = text.trim().toLowerCase();

    return notes.some(note =>
        note.text.trim().toLowerCase() === cleanText
    );
}

function addNote(text, category) {
    let categories = ["personal", "work", "study"];
    let cleanText = text.trim();

    if (cleanText.length < 1 || cleanText.length > 200) {
        console.log("Invalid length");
        return false;
    }

    if (isDuplicate(cleanText)) {
        console.log("Duplicate note");
        return false;
    }

    if (!categories.includes(category)) {
        console.log("Invalid category");
        return false;
    }

    notes.push({
        id: notes.length + 1,
        text: cleanText,
        category: category
    });

    console.log("Note added");
    return true;
}

// TESTS

console.log(searchNotes("javascript"));

console.log(searchNotes("pizza"));

console.log(longestNote());

let oldNotes = notes;
notes = [];
console.log(longestNote());

notes = oldNotes;

console.log(countByCategory());

notes = [];
console.log(countByCategory());
notes = oldNotes;

console.log(getSummary());

let oneNote = notes;
notes = [
    { id: 1, text: "Test note", category: "personal" }
];
console.log(getSummary());
notes = oneNote;


console.log(isDuplicate("Buy milk and bread"));

console.log(isDuplicate("  BUY MILK AND BREAD  "));

console.log(isDuplicate("Go to the gym"));

console.log(addNote("Complete JavaScript practice", "study"));

console.log(addNote("Buy milk and bread", "personal"));

console.log(addNote("Go shopping", "shopping"));


console.log(addNote("", "personal"));
