/* quiz.js: quiz logic only (parse/validate questions, track index, check answers). No DOM, no storage. */
var Quiz = (function () {
  var questions = [];
  var index = 0;
  var score = 0; // in memory only, for the result screen

  // Returns { ok: true, questions } or { ok: false, error }
  function parse(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: "Invalid JSON: " + e.message };
    }
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, error: "JSON must be a non-empty array of questions." };
    }
    for (var i = 0; i < data.length; i++) {
      var q = data[i], n = "Question " + (i + 1) + ": ";
      if (!q || typeof q.question !== "string" || !q.question.trim()) {
        return { ok: false, error: n + "missing \"question\" text." };
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        return { ok: false, error: n + "\"options\" must be an array of at least 2 items." };
      }
      if (typeof q.answer !== "number" || q.answer % 1 !== 0 || q.answer < 0 || q.answer >= q.options.length) {
        return { ok: false, error: n + "\"answer\" must be a valid option index starting from 0." };
      }
      if (q.id === undefined || q.id === null) { q.id = i + 1; }
    }
    return { ok: true, questions: data };
  }

  function load(list) { questions = list.slice(); index = 0; score = 0; }
  function getCurrent() { return questions[index]; }
  function getNumber() { return index + 1; }
  function getTotal() { return questions.length; }
  function getScore() { return score; }
  function isLast() { return index >= questions.length - 1; }

  function checkAnswer(choice) {
    var q = questions[index];
    var correct = choice === q.answer;
    if (correct) { score++; }
    return { correct: correct, correctIndex: q.answer };
  }

  // Moves to next question; returns false if there is none.
  function next() {
    if (isLast()) { return false; }
    index++;
    return true;
  }

  return {
    parse: parse, load: load, getCurrent: getCurrent, getNumber: getNumber,
    getTotal: getTotal, getScore: getScore, isLast: isLast,
    checkAnswer: checkAnswer, next: next
  };
})();
