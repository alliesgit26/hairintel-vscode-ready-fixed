(function () {
  function cleanBadTextNodes() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (node.nodeValue && node.nodeValue.trim() === "\\n \\n \\n") {
        node.nodeValue = "";
      }
      if (node.nodeValue && node.nodeValue.trim() === "\\n\\n\\n") {
        node.nodeValue = "";
      }
    });
  }

  function addLuxuryShell() {
    if (document.querySelector(".hi-luxe-sidebar")) return;

    document.body.classList.add("hi-luxe-active");

    var sidebar = document.createElement("aside");
    sidebar.className = "hi-luxe-sidebar";
    sidebar.innerHTML = `
      <div class="hi-luxe-brand">HairIntel <span>AI</span></div>
      <div class="hi-luxe-sub">Intelligent Hair Consultation</div>

      <div class="hi-luxe-nav">
        <button class="active" type="button">Dashboard</button>
        <button type="button">Consultations</button>
        <button type="button">Clients</button>
        <button type="button">Templates</button>
        <button type="button">Education</button>
        <button type="button">Support</button>
      </div>

      <div class="hi-luxe-pro">
        <strong>Unlock Pro Tools</strong>
        <p>Advanced mapping, load modeling, saved reports, and client-ready exports.</p>
        <button type="button">Upgrade Now</button>
      </div>
    `;

    var topbar = document.createElement("nav");
    topbar.className = "hi-luxe-topbar";
    topbar.innerHTML = `
      <button class="active" type="button">Overview</button>
      <button type="button">Analysis</button>
      <button type="button">Recommendations</button>
      <button type="button">History</button>
    `;

    document.body.prepend(topbar);
    document.body.prepend(sidebar);
  }

  function patchPlacementHead() {
    var pageText = document.body.innerText || "";
    if (!/Placement Map|Extension Placement Map|Placement Map Preview/i.test(pageText)) return;

    if (document.querySelector(".hi-placement-head-card")) return;

    var target = null;

    var svgs = Array.from(document.querySelectorAll("svg"));
    target = svgs.find(function (svg) {
      var box = svg.getBoundingClientRect();
      return box.width > 160 && box.height > 160;
    });

    if (!target) {
      var canvases = Array.from(document.querySelectorAll("canvas"));
      target = canvases.find(function (canvas) {
        var box = canvas.getBoundingClientRect();
        return box.width > 160 && box.height > 160;
      });
    }

    if (!target) {
      var cards = Array.from(document.querySelectorAll("section, .card, .panel, .hi-card, div"));
      target = cards.find(function (el) {
        var box = el.getBoundingClientRect();
        return box.width > 300 && box.height > 250 && /placement|map|zone/i.test(el.className || "");
      });
    }

    if (!target) return;

    var wrap = target.closest("section, .card, .panel, .hi-card, div") || target.parentElement;
    if (!wrap) return;

    target.style.display = "none";

    var card = document.createElement("div");
    card.className = "hi-placement-head-card";
    card.innerHTML = `
      <img src="/placement-head.png" alt="Placement map preview">
      <div class="hi-placement-caption">Placement Map Preview</div>
    `;

    wrap.prepend(card);
  }

  function runLuxePatch() {
    cleanBadTextNodes();
    addLuxuryShell();
    patchPlacementHead();
  }

  document.addEventListener("DOMContentLoaded", runLuxePatch);
  window.addEventListener("load", runLuxePatch);
  document.addEventListener("click", function () {
    setTimeout(runLuxePatch, 80);
    setTimeout(runLuxePatch, 350);
  });

  var observer = new MutationObserver(function () {
    runLuxePatch();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
