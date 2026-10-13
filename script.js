// ===== Configurazione =====
// Indirizzo a cui porta il pulsante "Accedi" (sostituiscilo con quello reale)
const LOGIN_URL = "#";

// ===== Pulsante Accedi =====
const loginBtn = document.getElementById("login-btn");

loginBtn.addEventListener("click", () => {
  loginBtn.classList.add("loading");
  // Piccola pausa per mostrare lo spinner, poi reindirizza
  setTimeout(() => {
    if (LOGIN_URL && LOGIN_URL !== "#") {
      window.location.href = LOGIN_URL;
    } else {
      loginBtn.classList.remove("loading");
      alert("Imposta LOGIN_URL in script.js per collegare il pulsante.");
    }
  }, 600);
});

// ===== Titolo "bucato" =====

const card = document.querySelector(".card");
const title = card.querySelector("h1");
// Parete del taglio: striscia visibile su un solo lato interno delle lettere.
// Spessore in px: positivi = parete in basso/a destra, negativi = in alto/a sinistra.
// 0 e 0 = solo foro netto.
const CUT_EDGE_X = 0;
const CUT_EDGE_Y = 2;
const CUT_EDGE_COLOR = "rgba(255, 255, 255, 0.9)";

function updateCardMask() {
  const cardRect = card.getBoundingClientRect();
  const w = card.clientWidth;
  const h = card.clientHeight;
  if (!w || !h) return;
  // Durante l'animazione di entrata la card è leggermente scalata
  const scale = cardRect.width / card.offsetWidth;

  const range = document.createRange();
  range.selectNodeContents(title);
  const textRect = range.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();

  const style = getComputedStyle(title);
  const dpr = window.devicePixelRatio || 1;

  function newLayer() {
    const c = document.createElement("canvas");
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d");
    g.scale(dpr, dpr);
    return [c, g];
  }

  function setFont(g) {
    g.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ("letterSpacing" in g) g.letterSpacing = style.letterSpacing;
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
  }

  // Maschera: piena ovunque, con la scritta ritagliata
  const [mask, m] = newLayer();
  setFont(m);

  // Posizione della linea di base, come la calcola il browser
  const metrics = m.measureText(title.textContent);
  const ascent = metrics.fontBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent;
  const lineHeight = parseFloat(style.lineHeight) || ascent + descent;
  const x = (textRect.left - cardRect.left) / scale - card.clientLeft;
  const y = (titleRect.top - cardRect.top) / scale - card.clientTop
    + (lineHeight - (ascent + descent)) / 2 + ascent;

  m.fillStyle = "#000";
  m.fillRect(0, 0, w, h);
  m.globalCompositeOperation = "destination-out";
  m.fillText(title.textContent, x, y);

  // Parete: la forma delle lettere meno una sua copia spostata.
  // Resta solo una striscia netta su un lato interno di ogni foro.
  const [edge, e] = newLayer();
  setFont(e);
  if (CUT_EDGE_X || CUT_EDGE_Y) {
    e.fillStyle = CUT_EDGE_COLOR;
    e.fillText(title.textContent, x, y);
    e.globalCompositeOperation = "destination-out";
    e.fillText(title.textContent, x - CUT_EDGE_X, y - CUT_EDGE_Y);
  }

  card.style.setProperty("--cut-edge", `url(${edge.toDataURL()})`);
  card.style.setProperty("--card-mask", `url(${mask.toDataURL()})`);
}

// Rifà la maschera quando il font è pronto, a fine animazione e se la card cambia misura
document.fonts.ready.then(updateCardMask);
card.addEventListener("animationend", updateCardMask);
new ResizeObserver(updateCardMask).observe(card);

// ===== Sfondo: particelle collegate da linee =====
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LINK_DISTANCE = 130;
const mouse = { x: null, y: null };
let particles = [];
let width, height;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Meno particelle sugli schermi piccoli
  const count = Math.min(90, Math.floor((width * height) / 14000));
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.8 + 0.8,
  }));
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fill();
  }

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < LINK_DISTANCE) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 * (1 - dist / LINK_DISTANCE)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Linee verso il mouse
    if (mouse.x !== null) {
      const dist = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (dist < LINK_DISTANCE * 1.4) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - dist / (LINK_DISTANCE * 1.4))})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }

  if (!reduceMotion) requestAnimationFrame(draw);
}

window.addEventListener("resize", () => {
  resize();
  if (reduceMotion) draw();
});
window.addEventListener("mousemove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});
window.addEventListener("mouseout", () => {
  mouse.x = mouse.y = null;
});

resize();
draw();
