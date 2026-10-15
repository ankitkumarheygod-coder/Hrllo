/* storage.js: localStorage helpers. Stores ONLY wrong questions (never score, correct answers, or uploaded JSON). */
var WRONG_KEY = "quiz_wrong_questions";

function getWrong() {
  try {
    var raw = localStorage.getItem(WRONG_KEY);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeWrong(list) {
  try {
    localStorage.setItem(WRONG_KEY, JSON.stringify(list));
  } catch (e) { /* storage full or blocked: ignore */ }
}

// Saves a wrong question (replaces any entry with the same id).
function saveWrong(question) {
  var list = getWrong().filter(function (q) { return q.id !== question.id; });
  list.push({
    id: question.id,
    question: question.question,
    options: question.options,
    answer: question.answer
  });
  writeWrong(list);
}

function removeWrong(id) {
  writeWrong(getWrong().filter(function (q) { return q.id !== id; }));
}

function clearWrong() {
  try { localStorage.removeItem(WRONG_KEY); } catch (e) {}
}
