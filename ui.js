/* ui.js: functions that update the screen only. Renders text, `inline code` and ``` code blocks ```. No logic, no storage. */
var UI = (function () {
  var LANGS = ["js", "javascript", "ts", "python", "py", "java", "c", "cpp", "cs", "html", "css", "json", "sql", "bash", "sh", "php", "go", "rust", "ruby", "kotlin", "swift"];

  function $(id) { return document.getElementById(id); }

  // Adds text to el, turning `inline code` into <code> elements (safe: uses textContent only).
  function addInline(el, text) {
    text.split("`").forEach(function (part, i) {
      if (part === "") { return; }
      if (i % 2 === 1) {
        var c = document.createElement("code");
        c.className = "inline-code";
        c.textContent = part;
        el.appendChild(c);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  // Fills el with text, turning ``` blocks into code boxes and `x` into inline code.
  function renderRich(el, text) {
    el.textContent = "";
    String(text).split("```").forEach(function (part, i) {
      if (i % 2 === 1) {
        var code = part.replace(/^\r?\n/, "");
        var m = code.match(/^([a-zA-Z+#]+)\r?\n/);
        if (m && LANGS.indexOf(m[1].toLowerCase()) !== -1) { code = code.slice(m[0].length); }
        code = code.replace(/\s+$/, "");
        var block = document.createElement("span");
        block.className = "code-block";
        block.textContent = code;
        el.appendChild(block);
      } else {
        addInline(el, part);
      }
    });
  }

  function showScreen(name) {
    ["home", "quiz", "result"].forEach(function (s) {
      $("screen-" + s).classList.toggle("hidden", s !== name);
    });
  }

  function showError(msg) {
    var el = $("error-msg");
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  }

  // Shows/hides the practice and export buttons based on how many wrong questions exist.
  function setWrongCount(n) {
    var p = $("btn-practice");
    p.textContent = "Practice wrong questions (" + n + ")";
    p.classList.toggle("hidden", n === 0);
    $("btn-export").classList.toggle("hidden", n === 0);
  }

  // onPick(index) is called when an option is tapped.
  function showQuestion(q, number, total, onPick) {
    $("quiz-progress").textContent = "Question " + number + " of " + total;
    renderRich($("quiz-question"), q.question);
    $("quiz-feedback").textContent = "";
    $("quiz-feedback").className = "feedback";
    $("btn-next").classList.add("hidden");

    var box = $("quiz-options");
    box.innerHTML = "";
    q.options.forEach(function (text, i) {
      var b = document.createElement("button");
      b.className = "option";
      renderRich(b, text);
      b.addEventListener("click", function () { onPick(i); });
      box.appendChild(b);
    });
  }

  function highlightAnswer(chosen, correctIndex) {
    var buttons = $("quiz-options").children;
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (i === correctIndex) { buttons[i].classList.add("correct"); }
      else if (i === chosen) { buttons[i].classList.add("wrong"); }
    }
    var fb = $("quiz-feedback");
    var ok = chosen === correctIndex;
    fb.textContent = ok ? "Correct!" : "Wrong";
    fb.className = "feedback " + (ok ? "ok" : "bad");
  }

  function showNext(isLast) {
    var b = $("btn-next");
    b.textContent = isLast ? "Finish" : "Next";
    b.classList.remove("hidden");
  }

  function showResult(score, total, practice) {
    $("result-score").textContent = score + " / " + total;
    $("result-note").textContent = practice
      ? "Correct answers were removed from your wrong list."
      : "Wrong answers were saved for practice.";
    showScreen("result");
  }

  return {
    showScreen: showScreen, showError: showError, setWrongCount: setWrongCount,
    showQuestion: showQuestion, highlightAnswer: highlightAnswer,
    showNext: showNext, showResult: showResult
  };
})();
