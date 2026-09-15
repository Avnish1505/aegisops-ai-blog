/* AegisOps AI blog enhancements. Changes presentation only, never the words. */
(function () {
  "use strict";
  var prose = document.getElementById("prose");
  if (!prose) return;

  var BASE = window.AEGIS_ILLUS_BASE || "assets/illustrations/";
  var INLINE = window.AEGIS_ILLUS_INLINE || {};

  function slug(t) {
    return t.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/^[^a-z]+/, "");
  }
  function headings(sel) { return Array.prototype.slice.call(prose.querySelectorAll(sel)); }
  function findHeading(tag, text) {
    return headings(tag).filter(function (h) { return h.textContent.trim().indexOf(text) !== -1; })[0];
  }
  function level(el) { var m = /^H([1-6])$/.exec(el.tagName); return m ? +m[1] : 9; }

  /* 1. Move the article H1 into the hero so the title is not shown twice */
  var h1 = prose.querySelector("h1");
  var heroText = document.getElementById("hero-text");
  if (h1 && heroText) {
    h1.classList.add("hero-title");
    heroText.insertBefore(h1, heroText.querySelector(".hero-meta"));
  }

  /* 2. Reading time */
  var rt = document.getElementById("read-time");
  if (rt) {
    var words = (prose.textContent || "").trim().split(/\s+/).length;
    rt.textContent = Math.max(1, Math.round(words / 230)) + " min read";
  }

  /* 3. Illustrations */
  function loadInto(fig, name, label) {
    fig.setAttribute("data-illus", name);
    if (INLINE[name]) { fig.innerHTML = INLINE[name]; return; }
    fetch(BASE + name + ".svg").then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (svg) { fig.innerHTML = svg; }).catch(function () {
      var img = new Image(); img.src = BASE + name + ".svg"; img.alt = label || ""; fig.appendChild(img);
    });
  }
  var heroArt = document.querySelector(".hero-art");
  if (heroArt) loadInto(heroArt, "hero");

  var PLACEMENTS = [
    { name: "third-path", tag: "h2", text: "Motivation", where: "end" },
    { name: "data-flow", tag: "h2", text: "Data Flow", where: "afterFirst" },
    { name: "safety-checks", tag: "h3", text: "Safety Validation", where: "end" },
    { name: "fallback", tag: "h3", text: "Fallback Logic", where: "end" },
    { name: "defense-layers", tag: "h3", text: "Prompt Injection Through Retrieval Context", where: "end" },
    { name: "roadmap", tag: "h2", text: "Future Roadmap", where: "afterFirst" }
  ];
  PLACEMENTS.forEach(function (p) {
    var h = findHeading(p.tag, p.text);
    if (!h) return;
    var fig = document.createElement("figure");
    fig.className = "illus";
    var anchor = h;
    if (p.where === "afterFirst" && h.nextElementSibling) {
      anchor = h.nextElementSibling;
    } else if (p.where === "end") {
      var n = h.nextElementSibling, lv = level(h), last = h;
      while (n && level(n) > lv) { last = n; n = n.nextElementSibling; }
      anchor = last;
    }
    anchor.insertAdjacentElement("afterend", fig);
    loadInto(fig, p.name);
  });

  /* existing architecture image gets a frame */
  prose.querySelectorAll("img").forEach(function (img) {
    if ((/architecture_diagram/.test(img.getAttribute("src") || "") || /System Architecture/.test(img.alt)) && !img.closest(".diagram")) {
      var f = document.createElement("figure");
      f.className = "diagram";
      var holder = img.parentElement.tagName === "P" && img.parentElement.children.length === 1 ? img.parentElement : img;
      holder.parentNode.insertBefore(f, holder);
      f.appendChild(img);
      if (holder !== img) holder.remove();
    }
  });

  /* 4. Engineering challenge cards: split the one paragraph into labelled rows */
  headings("h3").forEach(function (h) {
    var t = h.textContent.trim();
    if (t.indexOf("Challenge:") !== 0) return;
    var first = h.firstChild;
    if (first && first.nodeType === 3 && first.nodeValue.indexOf("Challenge:") === 0) {
      var span = document.createElement("span");
      span.className = "challenge-prefix";
      span.textContent = "Challenge:";
      first.nodeValue = first.nodeValue.replace(/^Challenge:\s*/, "");
      h.insertBefore(span, first);
      h.insertBefore(document.createTextNode(" "), first);
    }
    var card = document.createElement("section");
    card.className = "challenge";
    h.parentNode.insertBefore(card, h);
    var nodes = [h], n = h.nextElementSibling;
    while (n && !/^H[1-3]$/.test(n.tagName)) { nodes.push(n); n = n.nextElementSibling; }
    nodes.forEach(function (el) { card.appendChild(el); });

    var p = card.querySelector("p");
    if (!p) return;
    var labels = /^(Problem|Root Cause|Solution|Trade-off):$/;
    var dl = document.createElement("dl"), row = null, dd = null;
    Array.prototype.slice.call(p.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === "STRONG" && labels.test(node.textContent.trim())) {
        row = document.createElement("div");
        row.className = "row k-" + slug(node.textContent.replace(":", ""));
        var dt = document.createElement("dt");
        dt.appendChild(node);
        dd = document.createElement("dd");
        row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      } else if (dd) {
        dd.appendChild(node);
      }
    });
    if (dl.children.length) { p.replaceWith(dl); }
  });

  /* 5. Small typographic helpers */
  prose.querySelectorAll("p").forEach(function (p) {
    if (/^Not implemented yet\./.test(p.textContent.trim())) p.classList.add("status-pending");
  });
  prose.querySelectorAll("li").forEach(function (li) {
    var s = li.firstElementChild;
    if (s && s.tagName === "STRONG" && li.firstChild === s && /:$/.test(s.textContent.trim())) li.classList.add("has-label");
  });
  prose.querySelectorAll("table").forEach(function (t) {
    if (t.parentElement.classList.contains("table-wrap")) return;
    var w = document.createElement("div"); w.className = "table-wrap";
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });

  /* 6. Code blocks: wrapper and copy button */
  prose.querySelectorAll("pre").forEach(function (pre) {
    var outer = pre.closest(".highlighter-rouge") || pre;
    if (outer.parentElement.classList.contains("code-wrap")) return;
    var w = document.createElement("div"); w.className = "code-wrap";
    if (/[├└│]/.test(pre.textContent)) w.classList.add("is-tree");
    outer.parentNode.insertBefore(w, outer); w.appendChild(outer);
    var b = document.createElement("button");
    b.type = "button"; b.className = "copy-btn"; b.textContent = "Copy";
    b.addEventListener("click", function () {
      var txt = pre.textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1500);
      }).catch(function () { b.textContent = "Select and copy"; });
    });
    w.appendChild(b);
  });

  /* 7. Table of contents from H2s */
  var tocList = document.getElementById("toc-list");
  var h2s = headings("h2");
  var links = [];
  if (tocList) {
    h2s.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent);
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "#" + h.id; a.textContent = h.textContent.trim();
      li.appendChild(a); tocList.appendChild(li); links.push(a);
    });
    var toc = document.querySelector(".toc"), toggle = document.querySelector(".toc-toggle");
    if (toggle) toggle.addEventListener("click", function () {
      var open = toc.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    tocList.addEventListener("click", function (e) {
      if (e.target.tagName === "A" && toc) { toc.classList.remove("is-open"); if (toggle) toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* 8. Scroll: progress bar, active section, top bar border */
  var bar = document.querySelector(".progress span");
  var topbar = document.querySelector(".topbar");
  var ticking = false;
  function onScroll() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var y = window.scrollY || doc.scrollTop;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
    if (topbar) topbar.classList.toggle("is-scrolled", y > 8);
    var current = -1;
    for (var i = 0; i < h2s.length; i++) { if (h2s[i].getBoundingClientRect().top < 140) current = i; else break; }
    links.forEach(function (a, i) { a.classList.toggle("is-active", i === current); });
    var toggleLabel = document.querySelector(".toc-toggle span");
    if (toggleLabel) toggleLabel.textContent = current >= 0 ? h2s[current].textContent.trim() : "Contents";
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
