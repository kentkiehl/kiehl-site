/* Hero graphic: the lab's mobile MRI drives around a map of the United States.
   The truck follows the cursor (or tours on its own when left alone). When it reaches a city, a few
   mid-sagittal brain "scans" pop out in bubbles and the scan counter goes up. An illustration, not a record
   of where data were collected. A killer whale surfaces in the Pacific: drive the truck out to her and a card with
   an auditory brainstem response (ABR) trace opens, then the visitor is taken to the killer whale research page. Colour rule shared with the CANlab design: grey at rest, amber when active. */
(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const wrap = canvas.parentElement, ctx = canvas.getContext("2d");
  wrap.style.aspectRatio = "1.56 / 1"; wrap.style.maxWidth = "680px";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Outline of the contiguous United States (lon, lat), clockwise from the north-west corner. Hand-simplified.
  const US = [[-124.7,48.4],[-123.2,49],[-95.2,49],[-94.6,48.7],[-92.9,48.6],[-89.6,48],[-92.1,46.75],[-90.5,46.6],[-88.5,47.4],[-87.4,46.5],[-84.8,46.5],[-84.7,45.9],[-86.5,45.8],[-87.6,45.1],[-87.9,43],[-87.6,41.7],[-86.8,41.8],[-86.3,43],[-86.4,44.7],[-85,45.7],[-83.4,45],[-83.9,43.7],[-82.6,43.9],[-82.4,43],[-83.1,42.2],[-83.4,41.7],[-81.7,41.5],[-80.1,42.2],[-78.9,42.9],[-79,43.3],[-76.8,43.3],[-76.3,44.2],[-75,45],[-71.5,45],[-70.4,46.2],[-69.2,47.45],[-68.2,47.35],[-67.8,45.7],[-67,44.8],[-68.9,44.3],[-70.2,43.6],[-70.7,42.7],[-70,42],[-70,41.7],[-71.4,41.5],[-71.9,41.3],[-72,41.05],[-73.9,40.6],[-74,39.7],[-74.9,38.95],[-75.1,38.4],[-75.9,37.1],[-76.3,36.9],[-75.5,35.25],[-76.7,34.7],[-77.9,33.9],[-79.2,33.2],[-80.9,32],[-81.4,30.7],[-81.3,29.9],[-80.5,28.4],[-80,26.8],[-80.2,25.3],[-81.1,25.1],[-81.8,26.1],[-82.8,27.8],[-82.7,29],[-83.7,30],[-84.9,29.7],[-86.5,30.4],[-88,30.3],[-89.2,30.2],[-89.2,29],[-90.6,29.1],[-91.8,29.5],[-93.8,29.7],[-94.8,29.3],[-96.4,28.4],[-97.3,27.3],[-97.2,25.95],[-99.1,26.4],[-99.5,27.5],[-100.7,29.1],[-101.4,29.8],[-102.4,29.8],[-103.2,29],[-104.5,29.7],[-106.5,31.75],[-108.2,31.75],[-108.2,31.33],[-111.07,31.33],[-114.8,32.5],[-117.1,32.53],[-118.4,33.8],[-120.5,34.45],[-121.9,36.6],[-122.5,37.8],[-123.7,38.9],[-124.4,40.4],[-124.2,41.9],[-124.5,42.8],[-124.1,44.7],[-123.9,46.2],[-124.6,47.9]];
  const CITIES = [["Albuquerque",-106.65,35.08,1],["Seattle",-122.33,47.61],["San Francisco",-122.42,37.77],["Los Angeles",-118.24,34.05],["Denver",-104.99,39.74],["Dallas",-96.8,32.78],["Houston",-95.37,29.76],["Minneapolis",-93.27,44.98],["Madison",-89.4,43.07],["Chicago",-87.63,41.88],["Atlanta",-84.39,33.75],["Miami",-80.19,25.76],["Washington",-77.04,38.91],["New York",-74.01,40.71],["Boston",-71.06,42.36],["Hartford",-72.68,41.76]];

  // Albers equal-area conic projection (standard parallels 29.5 and 45.5, centred on 96W 37.5N)
  const rad = d => d * Math.PI / 180, p1 = rad(29.5), p2 = rad(45.5), n = (Math.sin(p1) + Math.sin(p2)) / 2;
  const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1), rho0 = Math.sqrt(C - 2 * n * Math.sin(rad(37.5))) / n;
  function albers(lon, lat) { const th = n * rad(lon + 96), rho = Math.sqrt(C - 2 * n * Math.sin(rad(lat))) / n; return [rho * Math.sin(th), -(rho0 - rho * Math.cos(th))]; }
  const raw = US.map(p => albers(p[0], p[1]));
  const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);

  let W = 0, H = 0, dpr = 1, k = 1, ox = 0, oy = 0, outline = [], cities = [], dots = [], path = null;
  const truck = { x: 0, y: 0, vx: 0, vy: 0, dir: 1, bob: 0 };
  const orca = { x: 0, y: 0, t: 0, near: false, splash: 0, was: 0 }, ORCA_URL = "cetacean.html"; let going = false;
  let mouse = null, lastMove = 0, tour = 0, bubbles = [], trail = [], scans = 0, running = false, last = performance.now();
  const P = (lon, lat) => { const a = albers(lon, lat); return [ox + (a[0] - x0) * k, oy + (a[1] - y0) * k]; };

  function build() {
    const r = wrap.getBoundingClientRect();
    W = Math.max(240, r.width); H = Math.max(150, r.height); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 14, padL = Math.max(30, W * 0.085); k = Math.min((W - pad - padL) / (x1 - x0), (H - 2 * pad - 14) / (y1 - y0));   // padL leaves room for the Pacific
    ox = padL + (W - pad - padL - (x1 - x0) * k) / 2; oy = (H - 14 - (y1 - y0) * k) / 2;
    outline = US.map(p => P(p[0], p[1]));
    path = new Path2D(); outline.forEach((p, i) => i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])); path.closePath();
    cities = CITIES.map(c => { const q = P(c[1], c[2]); return { name: c[0], x: q[0], y: q[1], home: !!c[3], a: 0, cool: 0 }; });
    dots = []; const step = W < 420 ? 11 : 13;
    for (let y = step / 2; y < H; y += step) for (let x = (Math.round(y / step) % 2) * step / 2; x < W; x += step) if (ctx.isPointInPath(path, x * dpr, y * dpr)) dots.push([x, y]);
    const home = cities[0]; truck.x = home.x; truck.y = home.y;
    const oq = P(-123.6, 33.4); orca.x = Math.max(26, oq[0] - W * 0.04); orca.y = oq[1];
  }

  // The killer whale in the Pacific. j = 0 resting at the surface .. 1 top of a small jump.
  function drawOrca(t) {
    const s = Math.max(0.8, Math.min(1.25, W / 500)), cyc = orca.near ? 1.3 : 4.6, u = (t % cyc) / cyc, win = orca.near ? 0.75 : 0.26;
    const j = reduce ? 0.35 : (u < win ? Math.sin(Math.PI * u / win) : 0), bob = reduce ? 0 : Math.sin(t * 2.2) * 1.2;
    if (orca.was > 0.25 && j <= 0.25) orca.splash = 1; orca.was = j;
    const x = orca.x, y = orca.y;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = "rgba(111,143,176,.55)"; ctx.lineWidth = 1.1; ctx.lineCap = "round";                          // open water
    [[-30, 13, 12], [14, 16, 10], [-12, 22, 14], [-40, -6, 8], [26, 2, 9]].forEach((w, i) => { const dx = Math.sin(t * 1.3 + i) * 2; ctx.beginPath(); ctx.moveTo(w[0] + dx, w[1]); ctx.quadraticCurveTo(w[0] + dx + w[2] / 2, w[1] - 3, w[0] + dx + w[2], w[1]); ctx.stroke(); });
    ctx.save(); ctx.beginPath(); ctx.rect(-60, -80, 120, 83); ctx.clip();                                           // only what is above the water line shows
    ctx.translate(-2, 9 + bob - j * 17); ctx.rotate(-1.0 + j * 0.3);
    ctx.fillStyle = "#12161d"; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-15, -23); ctx.quadraticCurveTo(-12, -24, -2, -8.5); ctx.closePath(); ctx.fill();   // dorsal fin
    ctx.beginPath(); ctx.ellipse(0, 0, 27, 9.5, 0, 0, 6.283); ctx.fill();                                           // body
    ctx.beginPath(); ctx.ellipse(7, 10, 7, 3.2, 0.9, 0, 6.283); ctx.fill();                                         // flipper
    ctx.fillStyle = "#f4f4f1"; ctx.beginPath(); ctx.moveTo(26, 2); ctx.quadraticCurveTo(14, 10.5, -10, 8.6); ctx.quadraticCurveTo(6, 4, 26, 2); ctx.fill();          // chin and belly
    ctx.beginPath(); ctx.ellipse(15, -3.2, 4.4, 1.9, -0.15, 0, 6.283); ctx.fill();                                  // eye patch
    ctx.fillStyle = "rgba(200,205,212,.75)"; ctx.beginPath(); ctx.ellipse(-12, -6.2, 5, 1.6, 0.2, 0, 6.283); ctx.fill();  // saddle
    ctx.restore();
    ctx.strokeStyle = "rgba(111,143,176,.9)"; ctx.lineWidth = 1.3;                                                  // rings where she breaks the surface
    ctx.beginPath(); ctx.ellipse(-1, 4, 15 + j * 3, 3.4, 0, 0, 6.283); ctx.stroke();
    if (orca.splash > 0) { const e = 1 - orca.splash; ctx.globalAlpha = orca.splash; ctx.beginPath(); ctx.ellipse(-1, 4, 16 + e * 18, 3.6 + e * 3, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(111,143,176,.9)"; for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.42; ctx.beginPath(); ctx.arc(Math.cos(a) * (10 + e * 16), 2 + Math.sin(a) * (6 + e * 18) + e * e * 14, 1.3, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1; }
    ctx.restore();
    if (W >= 360) { ctx.fillStyle = "rgba(63,99,144,.9)"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `italic ${W < 420 ? 8.5 : 10}px Inter, system-ui, sans-serif`; ctx.fillText("Pacific Ocean", Math.max(36, x), y + 36 * s); }
  }
  // Card that opens when the truck reaches the whale: an illustrative ABR trace and a short countdown to the page.
  const abr = ms => [[2.6, .22], [3.2, -.2], [3.9, .5], [4.5, -.32], [5.3, .95], [6.1, -1], [7.1, .28], [8, -.12]].reduce((v, g) => v + g[1] * Math.exp(-((ms - g[0]) ** 2) / 0.09), 0) + Math.sin(ms * 9) * 0.03;
  function drawCard(t) {
    const a = Math.min(1, orca.t / 0.25), cw = Math.min(190, W * 0.46), ch = cw * 0.56, cx = Math.min(W - cw - 6, Math.max(6, orca.x + 14)), cy = Math.max(6, orca.y - ch - 34);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy + (1 - a) * 10);
    ctx.fillStyle = "#0b0d11"; ctx.strokeStyle = "rgba(233,185,73,.95)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f4f4f1"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = `600 ${cw < 150 ? 8.5 : 10.5}px Inter, system-ui, sans-serif`; ctx.fillText("Killer whale brainstem response", 9, 8);
    const gx = 9, gw = cw - 18, gy = ch * 0.56, gh = ch * 0.24;
    ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
    const shown = reduce ? 1 : Math.min(1, orca.t / 1.1); ctx.strokeStyle = "#e9b949"; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.beginPath();
    for (let i = 0; i <= 120 * shown; i++) { const ms = i / 12, px = gx + gw * i / 120, py = gy - abr(ms) * gh; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    ctx.fillStyle = "rgba(244,244,241,.7)"; ctx.font = `${cw < 150 ? 7.5 : 9}px Inter, system-ui, sans-serif`; ctx.textBaseline = "bottom";
    ctx.fillText(going || orca.t > 1.2 ? "Opening killer whale research…" : "10 ms · about 1 µV · Yaka, 1999", 9, ch - 9);
    ctx.fillStyle = "rgba(233,185,73,.95)"; ctx.fillRect(0, ch - 3, cw * Math.min(1, orca.t / 2.2), 3);
    ctx.restore();
  }
  function goOrca() { if (going) return; going = true; location.href = ORCA_URL; }

  // One mid-sagittal slice, drawn once on an offscreen canvas and reused in every bubble
  const slice = document.createElement("canvas"); slice.width = slice.height = 96;
  (function () {
    const c = slice.getContext("2d"), g = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
    c.fillStyle = "#0b0d11"; c.beginPath(); c.arc(48, 48, 48, 0, 6.283); c.fill();
    c.strokeStyle = g(205); c.lineWidth = 3.2; c.beginPath(); c.ellipse(47, 43, 36, 31, -0.08, 0, 6.283); c.stroke();           // scalp and skull
    c.fillStyle = g(205); c.beginPath(); c.moveTo(16, 58); c.quadraticCurveTo(6, 64, 13, 70); c.lineTo(22, 70); c.closePath(); c.fill(); // nose
    c.fillStyle = g(60); c.beginPath(); c.ellipse(47, 43, 32, 27, -0.08, 0, 6.283); c.fill();                                    // CSF
    c.fillStyle = g(150); c.beginPath(); c.ellipse(46, 39, 30, 22, -0.1, 0, 6.283); c.fill();                                   // cerebrum
    c.strokeStyle = g(95); c.lineWidth = 1.3;                                                                                    // sulci
    for (let i = 0; i < 9; i++) { const a = Math.PI + 0.25 + i * 0.33; c.beginPath(); c.moveTo(46 + Math.cos(a) * 29, 39 + Math.sin(a) * 21); c.lineTo(46 + Math.cos(a) * 21, 39 + Math.sin(a) * 14); c.stroke(); }
    c.strokeStyle = g(235); c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.ellipse(45, 43, 15, 8, -0.1, Math.PI * 0.97, Math.PI * 2.08); c.stroke(); // corpus callosum
    c.fillStyle = g(40); c.beginPath(); c.ellipse(45, 45, 9, 3.2, -0.1, 0, 6.283); c.fill();                                     // ventricle
    c.fillStyle = g(175); c.beginPath(); c.ellipse(47, 50, 6, 4.5, 0, 0, 6.283); c.fill();                                       // thalamus
    c.strokeStyle = g(185); c.lineWidth = 7; c.beginPath(); c.moveTo(50, 54); c.quadraticCurveTo(54, 66, 53, 82); c.stroke();    // brainstem
    c.fillStyle = g(165); c.beginPath(); c.ellipse(66, 60, 10, 7.5, 0.5, 0, 6.283); c.fill();                                    // cerebellum
    c.strokeStyle = g(105); c.lineWidth = 1; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(58, 60 + i * 2.6); c.lineTo(75, 61 + i * 2.6); c.stroke(); }
    c.globalCompositeOperation = "destination-in"; c.beginPath(); c.arc(48, 48, 47, 0, 6.283); c.fill();
  })();

  function arrive(c) {
    c.a = 1; c.cool = 3.2; const nB = 3 + Math.floor(Math.random() * 3); scans += nB;
    for (let i = 0; i < nB; i++) { const a = -Math.PI / 2 + (i - (nB - 1) / 2) * 0.5 + (Math.random() - 0.5) * 0.3, sp = 34 + Math.random() * 26;
      bubbles.push({ x: c.x, y: c.y - 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (W < 420 ? 10 : 13) + Math.random() * 6, t: -i * 0.09, life: 2.6 + Math.random() * 0.8, ph: Math.random() * 6.28 }); }
  }

  // The Mind Research Network mobile imaging semi: white trailer with a red dashed stripe, white conventional tractor with a sleeper
  function drawTruck(x, y, dir, t) {
    const s = Math.max(0.62, Math.min(1, W / 620)), ink = "#1a2332";
    ctx.save(); ctx.translate(x, y + Math.sin(t * 16) * (Math.hypot(truck.vx, truck.vy) > 8 ? 0.5 : 0)); ctx.scale(dir * s, s);
    ctx.fillStyle = "rgba(26,35,50,.18)"; ctx.beginPath(); ctx.ellipse(-2, 10.5, 40, 3.6, 0, 0, 6.283); ctx.fill();          // shadow
    ctx.lineWidth = 1.1; ctx.strokeStyle = ink; ctx.lineJoin = "round";
    ctx.fillStyle = "#2a313c"; ctx.fillRect(4, 3.5, 31, 2.4); ctx.fillRect(-8, 4, 11, 3.2); ctx.fillRect(-1, 4, 1.4, 5.5);    // tractor frame, belly box, landing gear
    ctx.fillStyle = "#fdfdfb"; ctx.beginPath(); ctx.roundRect(-41, -14, 49, 18, 1.2); ctx.fill(); ctx.stroke();               // trailer
    ctx.strokeStyle = "#c62f3a"; ctx.lineWidth = 1; ctx.setLineDash([2.2, 1.4]); ctx.beginPath(); ctx.moveTo(-40, 1.2); ctx.lineTo(7, 1.2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(26,35,50,.45)"; ctx.lineWidth = 0.7; ctx.strokeRect(-12, -10, 8, 13.4); ctx.fillStyle = ink; ctx.fillRect(-2.6, -9, 1.8, 3);   // side door and window
    ctx.save(); ctx.scale(dir, 1); ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillStyle = "#23408e"; ctx.font = "700 5.4px Inter, system-ui, sans-serif"; ctx.fillText("MIND", -28 * dir, -7.6);
    ctx.fillStyle = "rgba(26,35,50,.6)"; ctx.fillRect(-28 * dir - 8, -4.2, 16, 0.8); ctx.fillStyle = "#1a9aa0"; ctx.fillRect(3 * dir - 3, -4.4, 6, 1.1); ctx.restore();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.1;
    ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.rect(8, -10, 3.2, 8.5); ctx.fill(); ctx.stroke();                            // air-conditioning unit on the trailer nose
    ctx.fillStyle = "#fdfdfb"; ctx.beginPath(); ctx.roundRect(13.5, -11.5, 8, 15, [2, 1, 0, 0]); ctx.fill(); ctx.stroke();       // sleeper
    ctx.beginPath(); ctx.moveTo(21.5, -9.5); ctx.lineTo(26, -9.5); ctx.lineTo(28.2, -3.4); ctx.lineTo(35.5, -2.2); ctx.quadraticCurveTo(37.6, -1.6, 37.6, 1); ctx.lineTo(37.6, 3.5); ctx.lineTo(21.5, 3.5); ctx.closePath(); ctx.fill(); ctx.stroke(); // cab and long hood
    ctx.fillStyle = "#9fb4c8"; ctx.beginPath(); ctx.moveTo(22.6, -8.2); ctx.lineTo(25.3, -8.2); ctx.lineTo(27, -3.6); ctx.lineTo(22.6, -3.6); ctx.closePath(); ctx.fill();  // window
    ctx.fillStyle = "#8b929c"; ctx.fillRect(12.3, -13.5, 1.1, 14); ctx.fillRect(36.6, 2.6, 1.8, 1.6);                           // exhaust stack, bumper
    const wheel = (wx, r) => { ctx.fillStyle = "#14181f"; ctx.beginPath(); ctx.arc(wx, 7.2, r, 0, 6.283); ctx.fill(); ctx.fillStyle = "#c9ced6"; ctx.beginPath(); ctx.arc(wx, 7.2, r * 0.38, 0, 6.283); ctx.fill(); };
    [-35, -28.2, 8.5, 15.3, 31.5].forEach(wx => wheel(wx, 3.2));
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
    // where is the truck heading? the cursor, or the next city on its own tour
    let tx, ty;
    if (mouse && now - lastMove < 6000) { tx = mouse.x; ty = mouse.y; }
    else { const c = cities[tour % cities.length]; tx = c.x; ty = c.y; if (Math.hypot(tx - truck.x, ty - truck.y) < 6) tour = (tour + 1 + Math.floor(Math.random() * 4)) % cities.length; }
    const dx = tx - truck.x, dy = ty - truck.y, d = Math.hypot(dx, dy), max = Math.max(90, W * 0.3);
    const want = Math.min(max, d * 3.2), ax = d > 0.5 ? dx / d * want : 0, ay = d > 0.5 ? dy / d * want : 0;
    truck.vx += (ax - truck.vx) * Math.min(1, dt * 5); truck.vy += (ay - truck.vy) * Math.min(1, dt * 5);
    truck.x += truck.vx * dt; truck.y += truck.vy * dt;
    if (Math.abs(truck.vx) > 6) truck.dir = truck.vx > 0 ? 1 : -1;
    const speed = Math.hypot(truck.vx, truck.vy);
    if (speed > 12 && (!trail.length || Math.hypot(trail[trail.length - 1].x - truck.x, trail[trail.length - 1].y - truck.y) > 7)) trail.push({ x: truck.x, y: truck.y + 9, a: 1 });
    trail.forEach(p => p.a -= dt * 0.45); trail = trail.filter(p => p.a > 0);
    for (const c of cities) { c.a = Math.max(0, c.a - dt * 0.5); c.cool = Math.max(0, c.cool - dt); if (!c.cool && Math.hypot(c.x - truck.x, c.y - truck.y) < 15) arrive(c); }

    const dOrca = Math.hypot(orca.x - truck.x, orca.y - truck.y), driving = mouse && now - lastMove < 6000;
    orca.near = !reduce && driving && dOrca < 34; orca.splash = Math.max(0, orca.splash - dt * 1.6);
    orca.t = orca.near || going ? orca.t + dt : Math.max(0, orca.t - dt * 2.5);
    if (orca.t >= 2.2) goOrca();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(128,135,147,.34)"; for (const p of dots) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.25, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = "rgba(100,107,117,.75)"; ctx.lineWidth = 1.4; ctx.lineJoin = "round"; ctx.stroke(path);
    for (const p of trail) { ctx.fillStyle = `rgba(163,35,47,${0.5 * p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, 6.283); ctx.fill(); }
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = `${W < 420 ? 8.5 : 10.5}px Inter, system-ui, sans-serif`;
    for (const c of cities) {
      if (c.a > 0) { ctx.strokeStyle = `rgba(233,185,73,${c.a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, 5 + (1 - c.a) * 22, 0, 6.283); ctx.stroke(); }
      ctx.fillStyle = c.a > 0.05 ? `rgb(${233 - 19 * c.a | 0},${185 - 73 * c.a | 0},${73 - 41 * c.a | 0})` : (c.home ? "#a3232f" : "rgb(110,117,128)");
      ctx.beginPath(); ctx.arc(c.x, c.y, c.home ? 4.4 : 3.2, 0, 6.283); ctx.fill();
      ctx.strokeStyle = "rgba(250,248,244,.9)"; ctx.lineWidth = 1; ctx.stroke();
      if (W >= 360 || c.home) { ctx.fillStyle = c.home ? "#a3232f" : "rgba(100,107,117,.95)"; const right = c.x > W - 70; ctx.textAlign = right ? "right" : "left"; ctx.fillText(c.name, c.x + (right ? -7 : 7), c.y - (c.home ? 9 : 0)); }
    }
    drawOrca(t);
    drawTruck(truck.x, truck.y, truck.dir, t);
    bubbles = bubbles.filter(b => b.t < b.life);
    for (const b of bubbles) {
      b.t += dt; if (b.t < 0) continue;
      b.vx *= 1 - dt * 1.4; b.vy = b.vy * (1 - dt * 1.4) - dt * 9; b.x += (b.vx + Math.sin(t * 2 + b.ph) * 6) * dt; b.y += b.vy * dt;
      const u = b.t / b.life, pop = Math.min(1, b.t / 0.22), r = b.r * (pop < 1 ? 0.3 + 0.7 * (1 - (1 - pop) ** 3) * 1.08 : 1), al = u > 0.72 ? Math.max(0, 1 - (u - 0.72) / 0.28) : 1;
      ctx.globalAlpha = al; ctx.drawImage(slice, b.x - r, b.y - r, r * 2, r * 2);
      ctx.strokeStyle = "rgba(233,185,73,.95)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(b.x, b.y, r + 1, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.ellipse(b.x - r * 0.42, b.y - r * 0.5, r * 0.2, r * 0.1, -0.7, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (orca.t > 0) drawCard(t);
    ctx.fillStyle = "rgba(100,107,117,.95)"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.font = "500 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(`scans collected: ${String(scans).padStart(4, "0")}`, 10, H - 6);
    if (running) requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }

  build();
  if (reduce) { cities.slice(1, 4).forEach(arrive); bubbles.forEach((b, i) => { b.t = 0.5; b.x += b.vx * 0.7; b.y += b.vy * 0.7; b.vx = b.vy = 0; }); scans = 0; last = performance.now(); frame(last); }
  else if ("IntersectionObserver" in window) new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop())).observe(canvas);
  else start();
  const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const overOrca = m => Math.hypot(m.x - orca.x, m.y - orca.y) < 30;
  canvas.addEventListener("pointermove", e => { mouse = pos(e); lastMove = performance.now(); canvas.style.cursor = overOrca(mouse) ? "pointer" : ""; });
  canvas.addEventListener("click", e => { if (e.pointerType !== "touch" && overOrca(pos(e))) goOrca(); });   // a mouse click on the whale goes straight there; touch drives the truck over first
  window.addEventListener("pageshow", () => { going = false; orca.t = 0; mouse = null; lastMove = 0; if (cities.length) { truck.x = cities[0].x; truck.y = cities[0].y; truck.vx = truck.vy = 0; } if (!reduce && !document.hidden) start(); });
  canvas.addEventListener("pointerdown", e => { mouse = pos(e); lastMove = performance.now(); });
  canvas.addEventListener("pointerleave", () => { lastMove = performance.now() - 4500; });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { const s = scans; build(); scans = s; if (reduce) frame(performance.now()); }, 150); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
})();
