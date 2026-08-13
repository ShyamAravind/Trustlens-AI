// ── 1. Known selectors (fast path) ──────────────────────────
const KNOWN_SELECTORS = [
  '[class*="single-review-text-container"]',  // Amazon
  '[class*="review-body"]',                    // Amazon old
  '[class*="reviewText"]',                     // Amazon alternate
  '.css-g5y9jx .css-146c3p1',                 // Flipkart (2025)
  '.t-black--ltr',                             // Flipkart old
  '._6K-7Co',                                  // Flipkart alternate
  '[class*="review-description"]',             // generic
  '[class*="ReviewText"]',                     // Meesho / generic
  '[class*="review_text"]',                    // underscore variant
  '[class*="reviewContent"]',                  // generic
  '[class*="comment-body"]',                   // comment style
  '[class*="userReview"]',                     // generic
  '[class*="CustomerReview"]',                 // generic
  'p[class*="review"]',                        // paragraph reviews
];

// ── Inject badge animation styles ───────────────────────────
const trustlensStyleElement = document.createElement('style');
trustlensStyleElement.textContent = `
  @keyframes badgepulse-green {
    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px rgba(22,163,74,0.6); }
    50% { opacity: 0.5; transform: scale(0.85); box-shadow: 0 0 2px rgba(22,163,74,0.2); }
  }
  @keyframes badgepulse-yellow {
    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px rgba(217,119,6,0.6); }
    50% { opacity: 0.5; transform: scale(0.85); box-shadow: 0 0 2px rgba(217,119,6,0.2); }
  }
  @keyframes badgepulse-red {
    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px rgba(220,38,38,0.7); }
    50% { opacity: 0.4; transform: scale(0.8); box-shadow: 0 0 2px rgba(220,38,38,0.1); }
  }
  .trustlens-inline-badge:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 16px rgba(15,23,42,0.15) !important;
  }
`;
document.head.appendChild(trustlensStyleElement);

// ── 2. Find reviews section container ───────────────────────
function findReviewSection() {
  const reviewSectionSelectors = [
    '[id*="review"]', '[id*="Review"]',
    '[id*="rating"]', '[id*="Rating"]',
    '[id*="feedback"]', '[id*="Feedback"]',
    '[class*="review-section"]',
    '[class*="reviews-container"]',
    '[class*="ratings-reviews"]',
    '[class*="customer-reviews"]',
    '[class*="user-reviews"]',
    '[data-section*="review"]',
  ];
  for (const selector of reviewSectionSelectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// ── 3. Heuristic — only inside reviews section ───────────────
function findReviewsHeuristically() {
  const candidates = [];
  const reviewSection = findReviewSection();
  const searchRoot = reviewSection || document.body;

  searchRoot.querySelectorAll('p, div').forEach(el => {
    if (el.dataset.trustlens) return;

    const text = el.innerText?.trim() || '';
    if (text.length < 50 || text.length > 1500) return;

    // Skip non-review text
    if (text.startsWith('Review for:')) return;
    if (text.startsWith('Helpful for')) return;
    if (text.startsWith('Verified Purchase')) return;
    if (text.startsWith('Hang on')) return;
    if (/^\d+(\.\d+)?$/.test(text)) return;
    if (text.split(' ').length < 8) return;

    // No block children
    const hasBlockChildren = [...el.children].some(child =>
      ['P','DIV','SECTION','ARTICLE','UL','OL'].includes(child.tagName)
    );
    if (hasBlockChildren) return;

    // Lower sibling requirement if we found a review section
    const minSiblings = reviewSection ? 2 : 4;
    const parentEl = el.parentElement;
    if (!parentEl) return;
    const siblings = [...parentEl.children].filter(c =>
      c.tagName === el.tagName && !c.dataset.trustlens
    );
    if (siblings.length < minSiblings) return;

    candidates.push(el);
  });

  return candidates;
}

// ── 4. Store results ─────────────────────────────────────────
window.trustlensResults = [];
const trustlensCounts = { real: 0, suspicious: 0, fake: 0 };

// ── 5. Score helpers ─────────────────────────────────────────
function getRealScore(fake_prob) {
  return Math.round(100 - fake_prob);
}

function getCategory(realScore) {
  if (realScore >= 60) return 'real';
  if (realScore >= 35) return 'suspicious';
  return 'fake';
}

function getBadgeLabel(realScore) {
  if (realScore >= 60) return 'Likely Real';
  if (realScore >= 35) return 'Suspicious';
  return 'Likely Fake';
}

// ── 6. Create badge ──────────────────────────────────────────
function createBadge(realScore) {
  const badge = document.createElement('div');
  badge.className = 'trustlens-inline-badge';
  const label = getBadgeLabel(realScore);

  let primaryColor, textColor, bg, pulseAnim, borderSide;

  if (realScore >= 60) {
    primaryColor = '#16803d';
    textColor    = '#14532d';
    bg           = 'linear-gradient(135deg, #e6f4ea 0%, #ceead6 100%)';
    borderSide   = '#16a34a';
    pulseAnim    = 'badgepulse-green';
  } else if (realScore >= 35) {
    primaryColor = '#b45309';
    textColor    = '#78350f';
    bg           = 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)';
    borderSide   = '#d97706';
    pulseAnim    = 'badgepulse-yellow';
  } else {
    primaryColor = '#b91c1c';
    textColor    = '#7f1d1d';
    bg           = 'linear-gradient(135deg, #fde8e8 0%, #fca5a5 100%)';
    borderSide   = '#dc2626';
    pulseAnim    = 'badgepulse-red';
  }

  badge.setAttribute('style', `
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 6px 0;
    padding: 6px 14px 6px 10px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background: ${bg};
    border: 1px solid #cbd5e1;
    border-left: 5px solid ${borderSide};
    box-shadow: 0 2px 5px rgba(15,23,42,0.08);
    color: #0f172a;
    transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
    user-select: none;
    width: fit-content;
  `);

  badge.innerHTML = `
    <span style="
      width:8px; height:8px;
      border-radius:50%;
      background:${borderSide};
      flex-shrink:0;
      animation:${pulseAnim} 2s cubic-bezier(0.4,0,0.6,1) infinite;
    "></span>
    <span style="color:#475569;font-weight:800;font-size:10px;letter-spacing:0.08em;">TRUSTLENS</span>
    <span style="color:rgba(15,23,42,0.2);font-size:11px;font-weight:400;">|</span>
    <span style="color:${textColor};font-weight:700;font-size:12px;">${label}</span>
    <span style="margin-left:2px;color:${primaryColor};font-weight:800;font-size:13px;">${realScore}%</span>
  `;

  return badge;
}

// ── 7. Analyze review ────────────────────────────────────────
async function analyzeReview(element) {
  if (element.dataset.trustlens) return;
  element.dataset.trustlens = 'true';

  const reviewText = element.innerText.trim();
  if (!reviewText || reviewText.length < 30) return;

  if (reviewText.startsWith('Review for:')) return;
  if (reviewText.startsWith('Helpful for')) return;
  if (reviewText.startsWith('Verified Purchase')) return;
  if (reviewText.startsWith('Hang on')) return;

  try {
    const response = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review: reviewText })
    });

    const data      = await response.json();
    const realScore = getRealScore(data.fake_probability);
    const category  = getCategory(realScore);

    window.trustlensResults.push({ realScore, category, element });
    trustlensCounts[category]++;

    chrome.storage.local.set({
      trustlensCounts: { ...trustlensCounts },
      trustlensTotal: window.trustlensResults.length
    });

    element.dataset.trustlensCategory = category;
    const badge = createBadge(realScore);
    badge.addEventListener('click', () => filterByCategory(category));
    element.parentElement.insertBefore(badge, element);

  } catch (err) {
    console.log('TrustLens: API not reachable', err);
  }
}

// ── 8. Filter reviews ────────────────────────────────────────
function filterByCategory(category) {
  document.querySelectorAll('[data-trustlens-category]').forEach(el => {
    el.style.opacity = '0.25';
    el.style.outline = '';
  });
  document.querySelectorAll(`[data-trustlens-category="${category}"]`).forEach(el => {
    el.style.opacity = '1';
    el.style.outline = '2px solid #22c55e';
    el.style.borderRadius = '4px';
  });
  const first = document.querySelector(`[data-trustlens-category="${category}"]`);
  if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetFilter() {
  document.querySelectorAll('[data-trustlens-category]').forEach(el => {
    el.style.opacity = '1';
    el.style.outline = '';
  });
}

// ── 9. Listen from popup ─────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILTER') {
    if (message.category === 'all') resetFilter();
    else filterByCategory(message.category);
    sendResponse({ ok: true });
  }
  return false;
});

// ── 10. Scan page ────────────────────────────────────────────
function scanPage() {
  KNOWN_SELECTORS.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => analyzeReview(el));
  });
  findReviewsHeuristically().forEach(el => analyzeReview(el));
}

// ── 11. Only run on product pages ────────────────────────────
function isProductPage() {
  const url = window.location.href;
  if (url.includes('amazon') && url.includes('/dp/')) return true;
  if (url.includes('flipkart') && url.includes('/p/')) return true;
  if (url.includes('meesho') && url.includes('/p/')) return true;
  if (findReviewSection()) return true;
  return false;
}

if (isProductPage()) {
  scanPage();
  const observer = new MutationObserver(() => scanPage());
  observer.observe(document.body, { childList: true, subtree: true });
}