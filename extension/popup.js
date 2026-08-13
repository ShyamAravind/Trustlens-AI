function renderUI(counts, total) {
  const trustScore = Math.round((counts.real / total) * 100);

  let verdict, verdictColor, verdictIcon;
  if (trustScore >= 70) {
    verdict = 'This product has mostly genuine reviews. Generally safe to trust.';
    verdictColor = '#00ff88'; verdictIcon = '✓';
  } else if (trustScore >= 45) {
    verdict = 'Mixed signals detected. Read reviews carefully before buying.';
    verdictColor = '#ffd700'; verdictIcon = '⚠';
  } else {
    verdict = 'High fake review activity detected. Be cautious with this product.';
    verdictColor = '#ff4444'; verdictIcon = '✕';
  }

  const main = document.getElementById('main');
  main.innerHTML = `
    <div class="dashboard">
      <p class="summary-text">AI analyzed <strong style="color:#f3f4f6">${total}</strong> review${total !== 1 ? 's' : ''} on this page</p>

      <div class="chart-wrapper">
        <div class="chart-glow"></div>
        <canvas id="pie" width="130" height="130"></canvas>
        <div class="chart-center">
          <div class="chart-total" id="trust-number">0%</div>
          <div class="chart-label">TRUST</div>
        </div>
      </div>

      <div class="verdict-box" style="border-left:3px solid ${verdictColor};border:1px solid ${verdictColor}33;">
        <span class="verdict-icon" style="color:${verdictColor};">${verdictIcon}</span>
        <span class="verdict-text">${verdict}</span>
      </div>

      <div class="stats-row">
        <div class="stat-card green" id="btn-real">
          <div class="stat-number green" id="count-real">0</div>
          <div class="stat-label">Real</div>
        </div>
        <div class="stat-card yellow" id="btn-suspicious">
          <div class="stat-number yellow" id="count-suspicious">0</div>
          <div class="stat-label">Suspect</div>
        </div>
        <div class="stat-card red" id="btn-fake">
          <div class="stat-number red" id="count-fake">0</div>
          <div class="stat-label">Fake</div>
        </div>
      </div>

      <button class="reset-btn" id="btn-reset">↺ Show All Reviews</button>
    </div>
  `;

  drawPie(counts, total);

  // ── Counting animation ───────────────────────────────────
  function animateCount(elementId, target, suffix = '') {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 1000;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.round(current) + suffix;
    }, duration / steps);
  }

  animateCount('trust-number', trustScore, '%');
  animateCount('count-real', counts.real);
  animateCount('count-suspicious', counts.suspicious);
  animateCount('count-fake', counts.fake);

  document.getElementById('btn-real').onclick       = () => sendFilter('real');
  document.getElementById('btn-suspicious').onclick = () => sendFilter('suspicious');
  document.getElementById('btn-fake').onclick       = () => sendFilter('fake');
  document.getElementById('btn-reset').onclick      = () => sendFilter('all');
}

function drawPie(counts, total) {
  const canvas = document.getElementById('pie');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (total === 0) return;

  const slices = [
    { value: counts.real,       color: '#22c55e', category: 'real' },
    { value: counts.suspicious, color: '#f97316', category: 'suspicious' },
    { value: counts.fake,       color: '#ef4444', category: 'fake' },
  ].filter(s => s.value > 0);

  const cx = 65, cy = 65, r = 57;
  let startAngle = -Math.PI / 2;

  slices.forEach(slice => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = slice.color;
    ctx.fill();
    ctx.strokeStyle = '#030712';
    ctx.lineWidth = 3;
    ctx.stroke();
    slice.startAngle = startAngle;
    slice.endAngle   = startAngle + sliceAngle;
    startAngle += sliceAngle;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
  ctx.fillStyle = '#030712';
  ctx.fill();

  // Click handler
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < 36 || dist > r) return;
    let angle = Math.atan2(y, x);
    if (angle < -Math.PI / 2) angle += 2 * Math.PI;
    slices.forEach(slice => {
      if (angle >= slice.startAngle && angle < slice.endAngle) {
        sendFilter(slice.category);
      }
    });
  };
}

function sendFilter(category) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'FILTER', category });
  });
}

function loadResults(retries = 14) {
  chrome.storage.local.get(['trustlensCounts', 'trustlensTotal'], (result) => {
    const total  = result.trustlensTotal || 0;
    const counts = result.trustlensCounts || { real: 0, suspicious: 0, fake: 0 };

    if (total === 0) {
      if (retries > 0) {
        setTimeout(() => loadResults(retries - 1), 500);
      } else {
        document.getElementById('main').innerHTML =
          '<div class="scanning"><div style="color:#475569;font-size:12px;">No reviews found on this page.</div></div>';
      }
      return;
    }

    renderUI(counts, total);
  });
}

loadResults();