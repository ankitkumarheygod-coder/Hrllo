/* ui.js: functions that update the screen only. Renders text, `inline code`, ``` code blocks ``` and $formulas$ like $S_8$. No logic, no storage. */
var UI = (function () {
  var LANGS = ["js", "javascript", "ts", "python", "py", "java", "c", "cpp", "cs", "html", "css", "json", "sql", "bash", "sh", "php", "go", "rust", "ruby", "kotlin", "swift"];

  var SYMBOLS = {
    rightarrow: "→", to: "→", leftarrow: "←", rightleftharpoons: "⇌", times: "×", cdot: "·",
    degree: "°", circ: "°", pm: "±", neq: "≠", leq: "≤", geq: "≥", approx: "≈", infty: "∞",
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ", lambda: "λ",
    mu: "μ", pi: "π", sigma: "σ", omega: "ω", Omega: "Ω"
  };

  function $(id) { return document.getElementById(id); }

  // Turns a formula like "S_8" or "x^{2}" into text + <sub>/<sup> elements.
  function addMath(el, src) {
    var s = src.trim();
    s = s.replace(/\\(?:text|mathrm|mathbf|textbf|mathit)\s*\{([^}]*)\}/g, "$1");
    s = s.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "($1)/($2)");
    s = s.replace(/\\sqrt\s*\{([^}]*)\}/g, "√($1)");
    s = s.replace(/\\[,;: ]/g, " ");
    s = s.replace(/\\([a-zA-Z]+)/g, function (m, name) {
      return SYMBOLS.hasOwnProperty(name) ? SYMBOLS[name] : name;
    });

    var buf = "";
    function flush() {
      if (buf) { el.appendChild(document.createTextNode(buf)); buf = ""; }
    }
    var i = 0;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (ch === "_" || ch === "^") {
        var tag = ch === "_" ? "sub" : "sup";
        var val = "";
        i++;
        if (s.charAt(i) === "{") {
          var end = s.indexOf("}", i);
          if (end === -1) { end = s.length; }
          val = s.slice(i + 1, end);
          i = end + 1;
        } else {
          val = s.charAt(i);
          i++;
        }
        flush();
        var node = document.createElement(tag);
        node.textContent = val.replace(/[{}]/g, "");
        el.appendChild(node);
      } else if (ch === "{" || ch === "}") {
        i++;
      } else {
        buf += ch;
        i++;
      }
    }
    flush();
  }

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

  // Handles $formula$ parts. If the number of $ is odd (e.g. a price like "$5"), leaves the text as it is.
  function addText(el, text) {
    var parts = text.split("$");
    if (parts.length < 3 || parts.length % 2 === 0) {
      addInline(el, text);
      return;
    }
    parts.forEach(function (part, i) {
      if (part === "") { return; }
      if (i % 2 === 1) { addMath(el, part); }
      else { addInline(el, part); }
    });
  }

  // Fills el with text, turning ``` blocks into code boxes, `x` into inline code, $x$ into formulas.
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
        addText(el, part);
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
