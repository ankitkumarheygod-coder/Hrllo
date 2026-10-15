/* app.js: connects everything: button clicks, file upload, starting quizzes, export download. */
(function () {
  var practiceMode = false;
  var answered = false;

  function $(id) { return document.getElementById(id); }

  function refreshHome() {
    UI.setWrongCount(getWrong().length);
  }

  function startQuiz(list, practice) {
    practiceMode = practice;
    Quiz.load(list);
    UI.showError("");
    UI.showScreen("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    UI.showQuestion(Quiz.getCurrent(), Quiz.getNumber(), Quiz.getTotal(), onPick);
  }

  function onPick(choice) {
    if (answered) { return; }
    answered = true;
    var q = Quiz.getCurrent();
    var result = Quiz.checkAnswer(choice);
    UI.highlightAnswer(choice, result.correctIndex);

    if (practiceMode) {
      if (result.correct) { removeWrong(q.id); }
    } else if (!result.correct) {
      saveWrong(q);
    }
    UI.showNext(Quiz.isLast());
  }

  function handleJsonText(text) {
    var parsed = Quiz.parse(text);
    if (!parsed.ok) { UI.showError(parsed.error); return; }
    startQuiz(parsed.questions, false);
  }

  function exportWrong() {
    var list = getWrong();
    if (list.length === 0) { return; }
    var blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "wrong-questions.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // --- Events ---
  $("file-input").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () { handleJsonText(reader.result); };
    reader.onerror = function () { UI.showError("Could not read that file."); };
    reader.readAsText(file);
    e.target.value = ""; // allow re-uploading the same file
  });

  $("btn-load-text").addEventListener("click", function () {
    var text = $("json-text").value.trim();
    if (!text) { UI.showError("Paste some JSON first."); return; }
    handleJsonText(text);
  });

  $("btn-practice").addEventListener("click", function () {
    var list = getWrong();
    if (list.length) { startQuiz(list, true); }
  });

  $("btn-export").addEventListener("click", exportWrong);

  $("btn-next").addEventListener("click", function () {
    if (Quiz.next()) {
      renderQuestion();
    } else {
      UI.showResult(Quiz.getScore(), Quiz.getTotal(), practiceMode);
    }
  });

  function goHome() {
    refreshHome();
    UI.showScreen("home");
  }
  $("btn-quit").addEventListener("click", goHome);
  $("btn-home").addEventListener("click", goHome);

  // --- Start ---
  refreshHome();
  UI.showScreen("home");
})();
