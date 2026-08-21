(() => {
  'use strict';

  /* =========================================================
     MOCK DATA CONFIG
     Change UPDATE_INTERVAL_MS to control how often prices/
     portfolio values refresh. Change BASE_PRICES to reset
     starting points.
  ========================================================= */
  const CONFIG = {
    UPDATE_INTERVAL_MS: 3000,     // how often mock prices tick
    VOLATILITY: 0.006,            // max % move per tick
    PORTFOLIO_BASE: 24180.00,     // hero portfolio starting value
  };

  const ASSETS = {
    BTC: { price: 96420.18 },
    ETH: { price: 3412.55 },
    SOL: { price: 214.72 },
    XRP: { price: 2.41 },
    ADA: { price: 0.82 },
    DOGE: { price: 0.31 },
  };

  const fmtUSD = (n, decimals = 2) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  const randomWalk = (price, volatility) => {
    const change = (Math.random() * 2 - 1) * volatility;
    return Math.max(price * (1 + change), 0.0001);
  };

  /* ===================== TICKER ===================== */
  function buildTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const render = () => {
      const parts = Object.entries(ASSETS).map(([sym, data]) => {
        const dir = Math.random() > 0.45 ? 'up' : 'down';
        const pct = (Math.random() * 3.2).toFixed(2);
        const arrow = dir === 'up' ? '▲' : '▼';
        return `<span>${sym} <span class="mono">${fmtUSD(data.price, data.price < 10 ? 4 : 2)}</span> <span class="${dir}">${arrow} ${pct}%</span></span>`;
      });
      // duplicate the list so the scroll loop feels continuous
      track.innerHTML = parts.join('') + parts.join('');
    };

    render();
    setInterval(render, CONFIG.UPDATE_INTERVAL_MS);
  }

  /* ================ HERO LIVE PANEL ================ */
  function updateHeroPanel() {
    let portfolioValue = CONFIG.PORTFOLIO_BASE;
    const startValue = CONFIG.PORTFOLIO_BASE;

    const valueEl = document.getElementById('heroPortfolioValue');
    const deltaEl = document.getElementById('heroPortfolioDelta');
    const rowBTC = document.getElementById('rowBTC');
    const rowETH = document.getElementById('rowETH');
    const rowSOL = document.getElementById('rowSOL');
    const spark = document.getElementById('heroSpark');
    const polyline = spark ? spark.querySelector('polyline') : null;

    const points = [60, 55, 58, 42, 45, 30, 34, 20, 24, 10, 14];

    const tick = () => {
      // walk asset prices
      ASSETS.BTC.price = randomWalk(ASSETS.BTC.price, CONFIG.VOLATILITY);
      ASSETS.ETH.price = randomWalk(ASSETS.ETH.price, CONFIG.VOLATILITY);
      ASSETS.SOL.price = randomWalk(ASSETS.SOL.price, CONFIG.VOLATILITY);

      // walk portfolio value gently upward on average
      portfolioValue = randomWalk(portfolioValue, CONFIG.VOLATILITY * 0.6);

      if (valueEl) valueEl.textContent = fmtUSD(portfolioValue);
      if (rowBTC) rowBTC.textContent = fmtUSD(ASSETS.BTC.price);
      if (rowETH) rowETH.textContent = fmtUSD(ASSETS.ETH.price);
      if (rowSOL) rowSOL.textContent = fmtUSD(ASSETS.SOL.price);

      const pctChange = ((portfolioValue - startValue) / startValue) * 100;
      if (deltaEl) {
        const up = pctChange >= 0;
        deltaEl.textContent = `${up ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(2)}% this month`;
        deltaEl.style.color = up ? 'var(--gain)' : 'var(--loss)';
      }

      // shift spark line
      points.shift();
      const last = points[points.length - 1];
      const next = Math.min(Math.max(last + (Math.random() * 16 - 8), 4), 74);
      points.push(next);
      if (polyline) {
        const step = 300 / (points.length - 1);
        const coords = points.map((y, i) => `${(i * step).toFixed(1)},${y.toFixed(1)}`).join(' ');
        polyline.setAttribute('points', coords);
        polyline.setAttribute('stroke', pctChange >= 0 ? 'var(--brass-soft)' : 'var(--loss)');
      }
    };

    tick();
    setInterval(tick, CONFIG.UPDATE_INTERVAL_MS);
  }

  /* ================ ANIMATED COUNTERS ================ */
  function animateCounters() {
    const els = document.querySelectorAll('[data-count]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        const target = parseFloat(el.getAttribute('data-count'));
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1400;
        const start = performance.now();

        const frame = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = Math.floor(target * eased);
          el.textContent = prefix + value.toLocaleString('en-US') + suffix;
          if (progress < 1) requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.4 });

    els.forEach((el) => observer.observe(el));
  }

  /* ===================== CALCULATOR ===================== */
  function initCalculator() {
    const amountSlider = document.getElementById('calcAmount');
    const amountDisplay = document.getElementById('calcAmountDisplay');
    const planButtons = document.querySelectorAll('.calc-plan-btn');
    const termEl = document.getElementById('calcTerm');
    const apyEl = document.getElementById('calcApy');
    const payoutEl = document.getElementById('calcPayout');

    if (!amountSlider) return;

    let apy = parseFloat(document.querySelector('.calc-plan-btn.active').dataset.apy);
    let termDays = parseInt(document.querySelector('.calc-plan-btn.active').dataset.term, 10);

    const recalc = () => {
      const amount = parseFloat(amountSlider.value);
      amountDisplay.textContent = fmtUSD(amount, 0);
      termEl.textContent = `${termDays} days`;
      apyEl.textContent = `${apy}%`;

      const dailyRate = apy / 100 / 365;
      const payout = amount * Math.pow(1 + dailyRate, termDays);
      payoutEl.textContent = fmtUSD(payout);
    };

    amountSlider.addEventListener('input', recalc);

    planButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        planButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        apy = parseFloat(btn.dataset.apy);
        termDays = parseInt(btn.dataset.term, 10);
        recalc();
      });
    });

    // also wire plan card CTAs to preselect a plan and scroll to calculator
    document.querySelectorAll('.plan-cta').forEach((cta, i) => {
      cta.addEventListener('click', () => {
        planButtons[i].click();
        document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
      });
    });

    recalc();
  }

  /* ===================== NAV MOBILE ===================== */
  function initNav() {
    const burger = document.getElementById('navBurger');
    const mobile = document.getElementById('navMobile');
    if (!burger || !mobile) return;

    burger.addEventListener('click', () => {
      mobile.classList.toggle('open');
    });

    mobile.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => mobile.classList.remove('open'))
    );
  }

  /* ===================== MODAL / AUTH ===================== */
  function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('modalForm');
    const nameField = document.getElementById('modalNameField');
    const nameInput = document.getElementById('fieldName');
    const emailInput = document.getElementById('fieldEmail');
    const passwordInput = document.getElementById('fieldPassword');
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('modalSubmit');
    const switchBtn = document.getElementById('modalSwitch');
    const switchText = document.getElementById('modalSwitchText');
    const openers = ['loginBtn', 'signupBtn', 'signupBtnMobile', 'heroSignup', 'ctaSignup'];

    if (!overlay || !form || !window.MVAuth) return;

    let mode = 'signup'; // or 'login'

    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.classList.toggle('show', !!msg);
    };

    const setMode = (newMode) => {
      mode = newMode;
      showError('');
      if (mode === 'login') {
        title.textContent = 'Log in to MyVanguard';
        nameField.classList.add('hidden');
        nameInput.required = false;
        submitBtn.textContent = 'Log in';
        switchText.textContent = "Don't have an account?";
        switchBtn.textContent = 'Sign up';
      } else {
        title.textContent = 'Create your account';
        nameField.classList.remove('hidden');
        nameInput.required = true;
        submitBtn.textContent = 'Create account';
        switchText.textContent = 'Already have an account?';
        switchBtn.textContent = 'Log in';
      }
    };

    const open = (isLogin) => {
      form.reset();
      setMode(isLogin ? 'login' : 'signup');
      overlay.classList.add('open');
      setTimeout(() => emailInput.focus(), 150);
    };
    const close = () => overlay.classList.remove('open');

    const isReturning = !!window.MVAuth.getSession();

    openers.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isReturning) {
        el.textContent = id === 'loginBtn' ? 'Dashboard' : 'Go to dashboard';
        el.addEventListener('click', () => { window.location.href = 'dashboard.html'; });
      } else {
        el.addEventListener('click', () => open(id === 'loginBtn'));
      }
    });

    if (switchBtn) switchBtn.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      submitBtn.disabled = true;
      submitBtn.textContent = mode === 'login' ? 'Logging in…' : 'Creating account…';

      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
      };

      const result = mode === 'login'
        ? await window.MVAuth.loginUser(payload)
        : await window.MVAuth.registerUser(payload);

      if (result.ok) {
        window.location.href = 'dashboard.html';
      } else {
        showError(result.error);
        submitBtn.disabled = false;
        submitBtn.textContent = mode === 'login' ? 'Log in' : 'Create account';
      }
    });
  }

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', () => {
    buildTicker();
    updateHeroPanel();
    animateCounters();
    initCalculator();
    initNav();
    initModal();
  });
})();
