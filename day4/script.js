const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

function updateCounts() {
    const text = noteText.value;
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    charCount.textContent = `${characters} / 200 characters`;
    wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

    charCount.classList.remove("warning", "over");

    if (characters > 200) {
        charCount.classList.add("over");
    } else if (characters > 180) {
        charCount.classList.add("warning");
    }
}

function clearNote() {
    noteText.value = "";
    localStorage.removeItem("draft");
    updateCounts();
}

noteText.addEventListener("input", () => {
    updateCounts();
    localStorage.setItem("draft", noteText.value);
});

noteText.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        clearNote();
    }
});

clearBtn.addEventListener("click", clearNote);

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const isDark = document.body.classList.contains("dark");
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
    localStorage.setItem("theme", isDark ? "dark" : "light");
});
const savedDraft = localStorage.getItem("draft");
if (savedDraft) {
    noteText.value = savedDraft;
}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
}

updateCounts();