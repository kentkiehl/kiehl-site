/* Shared header/footer, header scroll state, mobile nav, active link, scroll reveals, analytics beacon. */
(function () {
  const C = window.SITE_CONFIG || {};
  const header = `<header class="site-header solid"><div class="wrap">
    <a class="brand" href="./"><span class="brand-mark" aria-hidden="true"><img src="assets/logo-mark.png" alt="" width="26" height="26"></span><span><b>Kiehl</b> Lab</span></a>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span></button>
    <nav class="nav" id="nav" aria-label="Main">
      <a href="research.html">Research</a>
      <a href="treatment.html">Treatment</a>
      <a href="publications.html">Publications</a>
      <a href="book.html">Books</a>
      <a href="media.html">Media &amp; talks</a>
      <a href="news.html">News</a>
      <a href="people.html">People</a>
      <div class="menu"><a href="about-kent.html" class="menu-btn" aria-haspopup="true" aria-expanded="false">About ▾</a>
        <div class="menu-list"><a href="about-kent.html">Kent Kiehl, PI: biography &amp; CV</a><a href="resources.html">Resources &amp; scales</a><a href="network.html">Collaborator network</a><a href="bibliometrics.html">Bibliometrics</a><a href="about.html">About this site</a></div></div>
      <a href="contact.html">Contact &amp; join</a>
    </nav></div></header>`;
  const footer = `<footer class="site-footer"><div class="wrap">
    <div><strong>Kiehl Laboratory</strong>Principal investigator: Kent A. Kiehl, PhD, Executive Science Officer and Director of Mobile Imaging at the nonprofit Mind Research Network and Professor of Psychology, Neurosciences and Law at the University of New Mexico. We study psychopathy and related conditions with brain imaging, and what neuroscience means for the legal system. <span id="foot-updated"></span></div>
    <div><strong>Lab</strong><ul><li><a href="research.html">Research</a></li><li><a href="treatment.html">Treatment trials</a></li><li><a href="publications.html">Publications</a></li><li><a href="book.html">Books</a></li><li><a href="media.html">Media &amp; talks</a></li><li><a href="news.html">News</a></li><li><a href="people.html">People</a></li><li><a href="contact.html">Contact</a></li><li><a href="feed.xml">RSS: new papers</a></li></ul></div>
    <div><strong>Elsewhere</strong><ul><li><a href="https://www.mrn.org/" target="_blank" rel="noopener">Mind Research Network</a></li><li><a href="https://psych.unm.edu/" target="_blank" rel="noopener">UNM Psychology</a></li><li><a href="https://pubmed.ncbi.nlm.nih.gov/?term=Kiehl+KA%5BAuthor%5D&sort=date" target="_blank" rel="noopener">PubMed</a></li><li><a href="http://www.psychopathwhisperer.com/" target="_blank" rel="noopener">psychopathwhisperer.com</a></li><li><a href="donate.html">Support the research</a></li><li><a href="about.html">About this site</a></li></ul></div>
    <div class="credit-row"><span class="credit">Kiehl Laboratory · Mind Research Network · University of New Mexico · Albuquerque, NM · Site design after <a href="https://torwager.github.io/canlab/" target="_blank" rel="noopener">Tor Wager's CANlab site</a></span></div>
  </div></footer>`;
  const h = document.getElementById("site-header"); if (h) h.outerHTML = header;
  const f = document.getElementById("site-footer"); if (f) f.outerHTML = footer;

  const hdr = document.querySelector(".site-header");
  const onScroll = () => hdr && hdr.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  if (window.CL) CL.updateListBadge();
  // "My list" lives in the footer: mirror the star count there
  const here = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".nav a").forEach(a => { if (a.getAttribute("href") === here) a.classList.add("active"); });
  if (here.startsWith("paper")) document.querySelectorAll('.nav a[href="publications.html"]').forEach(a => a.classList.add("active"));

  const toggle = document.querySelector(".nav-toggle"), nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => { const open = nav.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(open)); });
    nav.addEventListener("click", e => { if (e.target.tagName === "A" && !e.target.classList.contains("menu-btn")) nav.classList.remove("open"); });
  }
  document.querySelectorAll(".menu-btn").forEach(b => b.addEventListener("click", e => { const m = b.parentElement; if (!m.classList.contains("open") && window.matchMedia("(hover: none)").matches) { e.preventDefault(); m.classList.add("open"); b.setAttribute("aria-expanded", "true"); } }));

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rvs = document.querySelectorAll(".rv");
  if (reduce || !("IntersectionObserver" in window)) { rvs.forEach(el => el.classList.add("in")); }
  else { const io = new IntersectionObserver(entries => { entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }); }, { threshold: 0.12 }); rvs.forEach(el => io.observe(el)); }

  // Cookie-free analytics (Cloudflare Web Analytics) once a token is configured
  if (C.cfAnalyticsToken) { const s = document.createElement("script"); s.defer = true; s.src = "https://static.cloudflareinsights.com/beacon.min.js"; s.setAttribute("data-cf-beacon", JSON.stringify({ token: C.cfAnalyticsToken })); document.head.appendChild(s); }
})();
