const MARKET_STORAGE_KEY = "stock_exchange_markets_v1";
const USERS_STORAGE_KEY = "stock_exchange_users_v1";
const SESSION_STORAGE_KEY = "stock_exchange_session_v1";
const THEME_STORAGE_KEY = "stock_exchange_theme_v1";

const STARTING_CASH = 100;
const ACCOUNT_BALANCE_VERSION = 3;
const MAX_POINTS = 90;
const MAX_MARKET_POINTS = 650;
const TICK_MS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CLOSED_START_MINUTES = 2 * 60;
const CLOSED_END_MINUTES = 4 * 60;
const RANGE_WINDOWS = {
  "1D": DAY_MS,
  "1W": 7 * DAY_MS,
  "1M": 30 * DAY_MS,
  "3M": 90 * DAY_MS,
  "1Y": 365 * DAY_MS,
};
const CUSTOM_MARKET_COLORS = ["#2fd179", "#6fb1ff", "#d8a948", "#9bd36a", "#ffb86b", "#b794f4", "#ff7f7f"];

const MARKET_DEFINITIONS = [
  {
    symbol: "COAL",
    name: "Coalie Industries",
    industry: "Energy and mining",
    headquarters: "Dhanbad, India",
    price: 4.26,
    open: 4.24,
    volume: 1200000,
    marketCap: 426000000,
    tickLimit: 1.15,
    color: "#2fd179",
    about:
      "Coalie Industries operates thermal coal supply, rail-linked storage yards, and industrial fuel contracts across eastern India.",
  },
  {
    symbol: "PICK",
    name: "Pickaxe Corp",
    industry: "Industrial equipment",
    headquarters: "Bengaluru, India",
    price: 1.2,
    open: 1.22,
    volume: 850000,
    marketCap: 120000000,
    tickLimit: 1.6,
    color: "#d8a948",
    about:
      "Pickaxe Corp manufactures compact excavation tools, drilling accessories, and replacement parts for small industrial contractors.",
  },
  {
    symbol: "APEX",
    name: "Apex Bank",
    industry: "Financial services",
    headquarters: "Mumbai, India",
    price: 68.4,
    open: 67.85,
    volume: 430000,
    marketCap: 6840000000,
    tickLimit: 0.8,
    color: "#6fb1ff",
    about:
      "Apex Bank provides commercial lending, treasury management, and digital account infrastructure for mid-market companies.",
  },
  {
    symbol: "NOVA",
    name: "NovaGrid Systems",
    industry: "Renewable infrastructure",
    headquarters: "Pune, India",
    price: 32.15,
    open: 31.72,
    volume: 610000,
    marketCap: 3215000000,
    tickLimit: 1.35,
    color: "#9bd36a",
    about:
      "NovaGrid Systems builds solar microgrid controllers, industrial batteries, and monitoring software for distributed power sites.",
  },
  {
    symbol: "ORBT",
    name: "Orbit Foods",
    industry: "Consumer staples",
    headquarters: "New Delhi, India",
    price: 12.5,
    open: 12.6,
    volume: 510000,
    marketCap: 1250000000,
    tickLimit: 0.95,
    color: "#ffb86b",
    about:
      "Orbit Foods sells packaged snacks, ready-to-cook staples, and cold-chain products through supermarkets and regional distributors.",
  },
  {
    symbol: "TIDE",
    name: "Tidemark Shipping",
    industry: "Logistics",
    headquarters: "Chennai, India",
    price: 21.75,
    open: 21.52,
    volume: 390000,
    marketCap: 2175000000,
    tickLimit: 1.1,
    color: "#b794f4",
    about:
      "Tidemark Shipping manages short-haul cargo vessels, port warehousing, and route optimization services for coastal freight.",
  },
];

const UPCOMING_EVENTS = [
  {
    date: "Today",
    title: "Market close",
    detail: "Closing auction and settlement snapshot at 12:00 AM IST.",
    tag: "Exchange",
  },
  {
    date: "Jul 15",
    title: "Apex Bank earnings",
    detail: "Quarterly net interest margin and lending growth update.",
    tag: "APEX",
  },
  {
    date: "Jul 18",
    title: "NovaGrid investor call",
    detail: "Management update on battery order book and grid deployments.",
    tag: "NOVA",
  },
  {
    date: "Jul 21",
    title: "Orbit Foods dividend window",
    detail: "Board record date for the proposed interim dividend.",
    tag: "ORBT",
  },
  {
    date: "Jul 24",
    title: "Greyline Mobility IPO watch",
    detail: "Expected price band and subscription schedule announcement.",
    tag: "IPO",
  },
];

const state = {
  users: {},
  user: null,
  markets: [],
  selectedSymbol: null,
  currentView: "dashboard",
  tickTimer: null,
  resizeTimer: null,
  hoverFrame: null,
  chartHover: new WeakMap(),
  tradeDrafts: {},
  chartRange: "1D",
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindElements();
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "dark");
  state.users = readJson(USERS_STORAGE_KEY, {});
  state.markets = hydrateMarkets();
  bindEvents();

  const sessionEmail = localStorage.getItem(SESSION_STORAGE_KEY);
  if (sessionEmail && state.users[sessionEmail]) {
    startSession(sessionEmail);
  } else {
    showAuth();
  }
}

function toggleTheme() {
  applyTheme(document.body.dataset.theme === "light" ? "dark" : "light", true);
}

function applyTheme(theme, shouldSave = false) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  if (els.themeToggleButton) {
    els.themeToggleButton.setAttribute("aria-pressed", String(nextTheme === "light"));
  }
  if (els.themeToggleLabel) {
    els.themeToggleLabel.textContent = nextTheme === "light" ? "Light mode" : "Dark mode";
  }
  if (shouldSave) {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    toast(`${nextTheme === "light" ? "Light" : "Dark"} mode enabled.`);
  }
  requestAnimationFrame(drawVisibleCharts);
}

function bindElements() {
  els.authScreen = document.querySelector("#authScreen");
  els.appShell = document.querySelector("#appShell");
  els.loginForm = document.querySelector("#loginForm");
  els.emailInput = document.querySelector("#emailInput");
  els.passwordInput = document.querySelector("#passwordInput");
  els.loginMessage = document.querySelector("#loginMessage");
  els.navItems = Array.from(document.querySelectorAll(".nav-item"));
  els.viewTargets = Array.from(document.querySelectorAll("[data-view-target]"));
  els.views = {
    dashboard: document.querySelector("#dashboardView"),
    markets: document.querySelector("#marketsView"),
    marketDetail: document.querySelector("#marketDetailView"),
    portfolio: document.querySelector("#portfolioView"),
    news: document.querySelector("#newsView"),
    upcoming: document.querySelector("#upcomingView"),
  };
  els.pageTitle = document.querySelector("#pageTitle");
  els.sessionLine = document.querySelector("#sessionLine");
  els.sidebarEmail = document.querySelector("#sidebarEmail");
  els.sidebarCash = document.querySelector("#sidebarCash");
  els.sidebarMarketState = document.querySelector("#sidebarMarketState");
  els.sidebarMarketTime = document.querySelector("#sidebarMarketTime");
  els.welcomeLine = document.querySelector("#welcomeLine");
  els.marketStatus = document.querySelector("#marketStatus");
  els.watchStatus = document.querySelector("#watchStatus");
  els.dashboardStocks = document.querySelector("#dashboardStocks");
  els.marketWatchList = document.querySelector("#marketWatchList");
  els.dashboardHoldings = document.querySelector("#dashboardHoldings");
  els.dashboardTotalValue = document.querySelector("#dashboardTotalValue");
  els.dashboardReturn = document.querySelector("#dashboardReturn");
  els.dashboardCashLine = document.querySelector("#dashboardCashLine");
  els.wealthChart = document.querySelector("#wealthChart");
  els.marketsGrid = document.querySelector("#marketsGrid");
  els.marketCreateForm = document.querySelector("#marketCreateForm");
  els.marketSymbolInput = document.querySelector("#marketSymbolInput");
  els.marketNameInput = document.querySelector("#marketNameInput");
  els.marketIndustryInput = document.querySelector("#marketIndustryInput");
  els.marketHqInput = document.querySelector("#marketHqInput");
  els.marketPriceInput = document.querySelector("#marketPriceInput");
  els.marketTickLimitInput = document.querySelector("#marketTickLimitInput");
  els.marketAboutInput = document.querySelector("#marketAboutInput");
  els.marketCreateMessage = document.querySelector("#marketCreateMessage");
  els.marketBackButton = document.querySelector("#marketBackButton");
  els.marketDetailContent = document.querySelector("#marketDetailContent");
  els.portfolioSubtext = document.querySelector("#portfolioSubtext");
  els.portfolioTotalValue = document.querySelector("#portfolioTotalValue");
  els.portfolioTotalChange = document.querySelector("#portfolioTotalChange");
  els.portfolioCash = document.querySelector("#portfolioCash");
  els.portfolioInvested = document.querySelector("#portfolioInvested");
  els.allocationBar = document.querySelector("#allocationBar");
  els.allocationLegend = document.querySelector("#allocationLegend");
  els.portfolioHoldings = document.querySelector("#portfolioHoldings");
  els.profitLossCards = document.querySelector("#profitLossCards");
  els.tradeHistory = document.querySelector("#tradeHistory");
  els.newsList = document.querySelector("#newsList");
  els.upcomingList = document.querySelector("#upcomingList");
  els.downloadReportButton = document.querySelector("#downloadReportButton");
  els.signOutButton = document.querySelector("#signOutButton");
  els.themeToggleButton = document.querySelector("#themeToggleButton");
  els.themeToggleLabel = document.querySelector("#themeToggleLabel");
  els.toast = document.querySelector("#toast");
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });
  els.viewTargets.forEach((target) => {
    target.addEventListener("click", () => showView(target.dataset.viewTarget));
  });
  els.marketSymbolInput?.addEventListener("input", () => {
    els.marketSymbolInput.value = normalizeMarketSymbol(els.marketSymbolInput.value);
  });
  els.marketCreateForm?.addEventListener("submit", handleCreateMarket);
  els.marketBackButton?.addEventListener("click", () => showView("markets"));
  els.downloadReportButton.addEventListener("click", downloadReport);
  els.signOutButton.addEventListener("click", signOut);
  els.themeToggleButton.addEventListener("click", toggleTheme);
  window.addEventListener("resize", () => {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(drawVisibleCharts, 120);
  });
}

function handleLogin(event) {
  event.preventDefault();
  const email = els.emailInput.value.trim().toLowerCase();
  const password = els.passwordInput.value;
  els.loginMessage.textContent = "";

  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    els.loginMessage.textContent = "Use a valid Gmail address.";
    return;
  }

  if (password.length < 1) {
    els.loginMessage.textContent = "Enter a password.";
    return;
  }

  const existing = state.users[email];
  if (existing && existing.password !== password) {
    els.loginMessage.textContent = "Password does not match this saved account.";
    return;
  }

  if (!existing) {
    state.users[email] = createUser(email, password);
    saveUsers();
  }

  localStorage.setItem(SESSION_STORAGE_KEY, email);
  startSession(email);
}

function createUser(email, password) {
  const now = Date.now();
  return {
    email,
    password,
    accountBalanceVersion: ACCOUNT_BALANCE_VERSION,
    cash: STARTING_CASH,
    startingCash: STARTING_CASH,
    holdings: {},
    trades: [],
    realizedProfit: 0,
    portfolioHistory: Array.from({ length: 30 }, (_, index) => ({
      t: now - (29 - index) * TICK_MS,
      v: STARTING_CASH,
    })),
    createdAt: now,
  };
}

function startSession(email) {
  state.user = normalizeUser(state.users[email]);
  saveUsers();
  showApp();
  renderAll();
  startTicker();
}

function normalizeUser(user) {
  if (user.accountBalanceVersion !== ACCOUNT_BALANCE_VERSION || user.startingCash !== STARTING_CASH) {
    resetTradingAccount(user);
  }
  user.cash = numberOr(user.cash, STARTING_CASH);
  user.startingCash = numberOr(user.startingCash, STARTING_CASH);
  user.holdings = user.holdings || {};
  user.trades = Array.isArray(user.trades) ? user.trades : [];
  user.realizedProfit = numberOr(user.realizedProfit, 0);
  if (!Array.isArray(user.portfolioHistory) || user.portfolioHistory.length === 0) {
    const holdingsValue = Object.entries(user.holdings).reduce((sum, [symbol, holding]) => {
      const market = findMarket(symbol);
      return sum + (market ? market.price * holding.shares : 0);
    }, 0);
    user.portfolioHistory = [{ t: Date.now(), v: roundMoney(user.cash + holdingsValue) }];
  }
  return user;
}

function resetTradingAccount(user) {
  const now = Date.now();
  user.accountBalanceVersion = ACCOUNT_BALANCE_VERSION;
  user.cash = STARTING_CASH;
  user.startingCash = STARTING_CASH;
  user.holdings = {};
  user.trades = [];
  user.realizedProfit = 0;
  user.portfolioHistory = Array.from({ length: 30 }, (_, index) => ({
    t: now - (29 - index) * TICK_MS,
    v: STARTING_CASH,
  }));
}

function showAuth() {
  els.authScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  stopTicker();
}

function showApp() {
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
}

function signOut() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  state.user = null;
  els.loginForm.reset();
  showAuth();
}

function showView(view, symbol) {
  if (symbol) {
    state.selectedSymbol = symbol;
  }

  state.currentView = view;
  Object.entries(els.views).forEach(([name, node]) => {
    node.classList.toggle("active-view", name === view);
  });
  els.navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === view);
  });

  const titles = {
    dashboard: "Overview",
    markets: "Markets",
    marketDetail: state.selectedSymbol ? `$${state.selectedSymbol}` : "Market",
    portfolio: "Portfolio",
    news: "News",
    upcoming: "Upcoming",
  };
  els.pageTitle.textContent = titles[view] || "Overview";

  if (view === "marketDetail") {
    renderMarketDetail();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
  requestAnimationFrame(drawVisibleCharts);
}

function renderAll() {
  if (!state.user) return;
  els.sessionLine.textContent = state.user.email;
  els.sidebarEmail.textContent = state.user.email;
  els.sidebarCash.textContent = `${formatCurrency(state.user.cash)} cash`;
  const session = getMarketSessionStatus();
  els.welcomeLine.innerHTML = `Welcome back, ${escapeHtml(state.user.email)}. Market is currently <strong class="${session.isOpen ? "positive" : "negative"}">${session.label}</strong>`;
  renderStatusPills();
  renderDashboard();
  renderMarkets();
  renderPortfolio();
  renderNews();
  renderUpcoming();
  if (state.currentView === "marketDetail") {
    updateMarketDetailLive();
  }
  requestAnimationFrame(drawVisibleCharts);
}

function renderStatusPills() {
  const session = getMarketSessionStatus();
  const text = `${session.label} - ${session.detail}`;
  els.marketStatus.textContent = text;
  els.marketStatus.className = `status-pill ${session.isOpen ? "" : "closed"}`;
  els.watchStatus.textContent = session.label;
  els.watchStatus.className = `status-pill compact ${session.isOpen ? "" : "closed"}`;
  els.sidebarMarketState.textContent = session.label === "OPEN" ? "Open" : "Closed";
  els.sidebarMarketState.className = session.isOpen ? "open" : "closed";
  els.sidebarMarketTime.textContent = session.detail;
}

function renderDashboard() {
  const portfolio = calculatePortfolio();
  const change = calculatePortfolioChange();

  els.dashboardTotalValue.textContent = formatCurrency(portfolio.total);
  els.dashboardReturn.textContent = `${formatPercent(change)} (24h)`;
  els.dashboardReturn.className = `change-pill ${change > 0 ? "" : change < 0 ? "negative" : "neutral"}`;
  els.dashboardCashLine.textContent = `Present wealth in cash ${formatCurrency(state.user.cash)} - Available to trade`;

  els.dashboardStocks.innerHTML = state.markets
    .slice(0, 4)
    .map((market) => stockCardTemplate(market))
    .join("");
  els.dashboardStocks.querySelectorAll("[data-symbol]").forEach((card) => {
    card.addEventListener("click", () => openMarket(card.dataset.symbol));
  });

  els.marketWatchList.innerHTML = state.markets
    .slice(0, 5)
    .map((market) => marketWatchTemplate(market))
    .join("");
  els.marketWatchList.querySelectorAll("[data-symbol]").forEach((row) => {
    row.addEventListener("click", () => openMarket(row.dataset.symbol));
  });

  renderHoldingsCards(els.dashboardHoldings);
}

function stockCardTemplate(market) {
  const change = getMarketChange(market);
  const changeClass = change < 0 ? "negative" : "";
  return `
    <button class="stock-card" type="button" data-symbol="${market.symbol}">
      <span class="symbol-tile">$${market.symbol[0]}</span>
      <span>
        <h4>$${market.symbol}</h4>
        <span class="muted">${escapeHtml(market.name)}</span>
      </span>
      <span class="price-column">
        <strong>${formatCurrency(market.price)}</strong>
        <span class="${changeClass}">${formatPercent(change)}</span>
        <span class="tap-label">Tap to trade</span>
      </span>
    </button>
  `;
}

function marketWatchTemplate(market) {
  const change = getMarketChange(market);
  const changeClass = change < 0 ? "negative" : "";
  return `
    <button class="watch-row" type="button" data-symbol="${market.symbol}">
      <span class="symbol-tile">$${market.symbol[0]}</span>
      <span>
        <h4>$${market.symbol}</h4>
        <span class="muted">Vol ${formatCompact(market.volume)}</span>
      </span>
      <span class="price-column">
        <strong>${formatCurrency(market.price)}</strong>
        <span class="${changeClass}">${formatPercent(change)}</span>
      </span>
    </button>
  `;
}

function renderMarkets() {
  els.marketsGrid.innerHTML = state.markets.map((market) => marketCardTemplate(market)).join("");
  els.marketsGrid.querySelectorAll("[data-symbol]").forEach((card) => {
    card.addEventListener("click", () => openMarket(card.dataset.symbol));
  });
  requestAnimationFrame(drawSparklines);
}

function handleCreateMarket(event) {
  event.preventDefault();
  if (!state.user) return;

  const symbol = normalizeMarketSymbol(els.marketSymbolInput.value);
  const name = els.marketNameInput.value.trim();
  const industry = els.marketIndustryInput.value.trim();
  const headquarters = els.marketHqInput.value.trim();
  const price = roundMoney(Number(els.marketPriceInput.value));
  const tickLimit = Math.min(5, Math.max(0.1, Number(els.marketTickLimitInput.value) || 1));
  const about = els.marketAboutInput.value.trim();

  els.marketCreateMessage.textContent = "";

  if (symbol.length < 2) {
    els.marketCreateMessage.textContent = "Use a 2-5 character symbol.";
    return;
  }
  if (findMarket(symbol)) {
    els.marketCreateMessage.textContent = `$${symbol} already exists.`;
    return;
  }
  if (!name || !industry || !headquarters) {
    els.marketCreateMessage.textContent = "Fill in the company details.";
    return;
  }
  if (!Number.isFinite(price) || price < 0.25) {
    els.marketCreateMessage.textContent = "Start price must be at least $0.25.";
    return;
  }

  const market = createCustomMarket({
    symbol,
    name,
    industry,
    headquarters,
    price,
    tickLimit,
    about,
  });

  state.markets.push(market);
  saveMarkets();
  els.marketCreateForm.reset();
  els.marketTickLimitInput.value = "1.00";
  renderAll();
  openMarket(symbol);
  toast(`Started $${symbol} market.`);
}

function createCustomMarket({ symbol, name, industry, headquarters, price, tickLimit, about }) {
  const volume = Math.round(75000 + Math.random() * 250000);
  return {
    symbol,
    name,
    industry,
    headquarters,
    price,
    open: price,
    volume,
    marketCap: roundMoney(price * 1000000),
    tickLimit,
    color: getCustomMarketColor(symbol),
    about: about || `${name} is a custom local market created for paper-trading simulation.`,
    custom: true,
    ownerEmail: state.user.email,
    isPaused: false,
    history: seedHistory(price, tickLimit),
  };
}

function normalizeMarketSymbol(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

function getCustomMarketColor(symbol) {
  const score = String(symbol)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return CUSTOM_MARKET_COLORS[score % CUSTOM_MARKET_COLORS.length];
}

function marketCardTemplate(market) {
  const change = getMarketChange(market);
  const changeClass = change < 0 ? "negative" : "";
  return `
    <button class="market-card" type="button" data-symbol="${market.symbol}">
      <span class="market-card-top">
        <span class="symbol-tile">$${market.symbol[0]}</span>
        <span>
          <h3>$${market.symbol}</h3>
          <span class="muted">${escapeHtml(market.name)}</span>
        </span>
      </span>
      <span class="market-meta">
        <span>${escapeHtml(market.industry)}</span>
        <span>${escapeHtml(market.headquarters)}</span>
        ${market.custom ? `<span>Custom</span>` : ""}
        ${market.isPaused ? `<span class="paused-meta">Paused</span>` : ""}
      </span>
      <span class="sparkline">
        <canvas data-sparkline="${market.symbol}" width="360" height="90"></canvas>
      </span>
      <span class="market-price-row">
        <strong>${formatCurrency(market.price)}</strong>
        <span class="${changeClass}">${formatPercent(change)}</span>
      </span>
    </button>
  `;
}

function openMarket(symbol) {
  state.selectedSymbol = symbol;
  showView("marketDetail");
}

function parseTradeQuantity(input) {
  return Math.max(0, Math.floor(Number(input?.value) || 0));
}

function getTradeDraft(symbol) {
  if (!state.tradeDrafts[symbol]) {
    state.tradeDrafts[symbol] = { quantity: "" };
  }
  return state.tradeDrafts[symbol];
}

function renderMarketDetail() {
  const market = getSelectedMarket();
  if (!market) {
    els.marketDetailContent.innerHTML = `<div class="empty-state">Select a market to view details.</div>`;
    return;
  }

  const change = getMarketChange(market);
  const changeClass = change < 0 ? "negative" : "positive";
  const holding = state.user.holdings[market.symbol];
  const owned = holding ? holding.shares : 0;
  const draft = getTradeDraft(market.symbol);
  const focusedTradeInput = document.activeElement?.id;
  const session = getMarketSessionStatus();
  const detailStatus = getMarketDetailStatus(market, session);
  const band = getFluctuationBand(market);

  els.marketDetailContent.innerHTML = `
    <section class="market-summary-panel">
      <div>
        <div class="market-title-row">
          <h2>$${market.symbol}</h2>
          <span id="detailMarketStatus" class="status-pill compact ${detailStatus.className}">${detailStatus.label} - ${detailStatus.detail}</span>
        </div>
        <p class="muted">${escapeHtml(market.industry)} - ${escapeHtml(market.headquarters)}</p>
        <div class="market-company-lines">
          <strong>${escapeHtml(market.name)}</strong>
          <span>HQ: ${escapeHtml(market.headquarters)}</span>
          <span>Fluctuation (permanent): ${formatCurrency(band.low)} - ${formatCurrency(band.high)}</span>
        </div>
      </div>
      <div class="detail-price">
        <strong id="detailMarketPrice">${formatCurrency(market.price)}</strong>
        <span id="detailMarketChange" class="${changeClass}">${formatPercent(change)}</span>
      </div>
    </section>

    <div class="market-detail-hero">
      <article class="detail-chart-card">
        <div class="timeframe-tabs" aria-label="Chart range">
          ${rangeButtonTemplate()}
        </div>
        <div class="chart-wrap">
          <canvas id="marketChart" width="900" height="330" aria-label="${market.symbol} price chart"></canvas>
        </div>
      </article>

      <aside class="trade-panel">
        <div class="panel-title-row">
          <h3>Quick Trade</h3>
        </div>
        <div class="trade-form">
          <div id="tradeSessionBanner" class="session-banner ${isMarketTradable(market) ? "" : "closed"}">${getTradeSessionText(market, session)}</div>
          <label>
            Shares
            <input id="tradeQuantity" type="number" min="1" step="1" placeholder="0" inputmode="numeric" value="${escapeHtml(draft.quantity)}" />
          </label>
          <label>
            Tick fluctuation limit (%)
            <input id="tickLimitInput" type="number" min="0.1" max="5" step="0.05" value="${market.tickLimit.toFixed(2)}" />
          </label>
          <div class="trade-value-box">
            <div class="trade-line"><span>Current wealth</span><strong id="tradeCurrentWealth">${formatCurrency(calculatePortfolio().total)}</strong></div>
            <div class="trade-line"><span>Buying power</span><strong id="tradeBuyingCapacity">${formatCurrency(state.user.cash)}</strong></div>
            <div class="trade-line"><span>Max buy</span><strong id="tradeMaxBuyShares">${formatShares(Math.floor(state.user.cash / market.price))}</strong></div>
            <div class="trade-line"><span>Market price</span><strong id="tradeMarketPrice">${formatCurrency(market.price)}</strong></div>
            <div class="trade-line"><span>Estimated value</span><strong id="tradeTotalValue">$0.00</strong></div>
            <div class="trade-line"><span>Owned shares</span><strong id="ownedSharesLine">${formatShares(owned)}</strong></div>
          </div>
          <div class="trade-actions">
            <button id="buyButton" class="primary-button" type="button" disabled>Buy</button>
            <button id="sellButton" class="primary-button sell-button" type="button" disabled>Sell</button>
          </div>
          <p id="tradeMessage" class="form-message"></p>
        </div>
        ${ownerMarketControlsTemplate(market)}
      </aside>
    </div>

    <section class="company-section">
      <article class="panel">
        <div class="panel-title-row">
          <h3>About ${escapeHtml(market.name)}</h3>
        </div>
        <p class="muted">${escapeHtml(market.about)}</p>
      </article>
      <article class="panel">
        <div class="panel-title-row">
          <h3>Company Info</h3>
        </div>
        <div class="info-list">
          <div class="info-item"><span>Industry</span><strong>${escapeHtml(market.industry)}</strong></div>
          <div class="info-item"><span>Headquarters</span><strong>${escapeHtml(market.headquarters)}</strong></div>
          <div class="info-item"><span>Volume</span><strong>${formatCompact(market.volume)}</strong></div>
          <div class="info-item"><span>Market cap</span><strong>${formatCurrency(market.marketCap)}</strong></div>
        </div>
      </article>
    </section>
  `;

  bindRangeButtons();
  bindTradePanel(market);
  bindOwnerMarketControls(market);
  if (focusedTradeInput === "tradeQuantity" || focusedTradeInput === "tickLimitInput") {
    const input = document.querySelector(`#${focusedTradeInput}`);
    input?.focus({ preventScroll: true });
  }
  requestAnimationFrame(drawVisibleCharts);
}

function updateMarketDetailLive() {
  const market = getSelectedMarket();
  const quantityInput = document.querySelector("#tradeQuantity");
  if (!market || !quantityInput) {
    renderMarketDetail();
    return;
  }

  const session = getMarketSessionStatus();
  const detailStatus = getMarketDetailStatus(market, session);
  const change = getMarketChange(market);
  const priceNode = document.querySelector("#detailMarketPrice");
  const changeNode = document.querySelector("#detailMarketChange");
  const statusNode = document.querySelector("#detailMarketStatus");

  if (priceNode) priceNode.textContent = formatCurrency(market.price);
  if (changeNode) {
    changeNode.textContent = formatPercent(change);
    changeNode.className = change < 0 ? "negative" : "positive";
  }
  if (statusNode) {
    statusNode.textContent = `${detailStatus.label} - ${detailStatus.detail}`;
    statusNode.className = `status-pill compact ${detailStatus.className}`;
  }

  updateTradeControls(market);
}

function bindTradePanel(market) {
  const draft = getTradeDraft(market.symbol);
  const quantityInput = document.querySelector("#tradeQuantity");
  const tickLimitInput = document.querySelector("#tickLimitInput");
  const buyButton = document.querySelector("#buyButton");
  const sellButton = document.querySelector("#sellButton");
  const tradeMessage = document.querySelector("#tradeMessage");

  function updateTradeState() {
    updateTradeControls(market, { clearMessage: true });
  }

  function getTradeQuantity() {
    return parseTradeQuantity(quantityInput);
  }

  quantityInput.addEventListener("input", () => {
    draft.quantity = quantityInput.value;
    updateTradeState();
  });
  tickLimitInput.addEventListener("change", () => {
    const value = Math.min(5, Math.max(0.1, Number(tickLimitInput.value) || market.tickLimit));
    market.tickLimit = value;
    tickLimitInput.value = value.toFixed(2);
    saveMarkets();
    toast(`Tick limit for $${market.symbol} set to ${value.toFixed(2)}%.`);
  });

  buyButton.addEventListener("click", () => {
    if (!isMarketTradable(market)) {
      tradeMessage.textContent = market.isPaused
        ? "Market is paused by the owner."
        : "Market is closed. Trading opens at 4:00 AM IST.";
      updateTradeState();
      return;
    }
    const qty = getTradeQuantity();
    const ok = buyShares(market.symbol, qty);
    if (!ok) {
      tradeMessage.textContent = "Not enough cash for this buy order.";
      updateTradeState();
      return;
    }
    draft.quantity = "";
    renderAll();
    showView("marketDetail");
    toast(`Bought ${qty} shares of $${market.symbol}.`);
  });

  sellButton.addEventListener("click", () => {
    if (!isMarketTradable(market)) {
      tradeMessage.textContent = market.isPaused
        ? "Market is paused by the owner."
        : "Market is closed. Trading opens at 4:00 AM IST.";
      updateTradeState();
      return;
    }
    const qty = getTradeQuantity();
    const ok = sellShares(market.symbol, qty);
    if (!ok) {
      tradeMessage.textContent = "Not enough shares for this sell order.";
      updateTradeState();
      return;
    }
    draft.quantity = "";
    renderAll();
    showView("marketDetail");
    toast(`Sold ${qty} shares of $${market.symbol}.`);
  });

  updateTradeState();
}

function updateTradeControls(market, options = {}) {
  const quantityInput = document.querySelector("#tradeQuantity");
  const buyButton = document.querySelector("#buyButton");
  const sellButton = document.querySelector("#sellButton");
  const totalValue = document.querySelector("#tradeTotalValue");
  const marketPrice = document.querySelector("#tradeMarketPrice");
  const ownedSharesLine = document.querySelector("#ownedSharesLine");
  const currentWealth = document.querySelector("#tradeCurrentWealth");
  const buyingCapacity = document.querySelector("#tradeBuyingCapacity");
  const maxBuySharesLine = document.querySelector("#tradeMaxBuyShares");
  const sessionBanner = document.querySelector("#tradeSessionBanner");
  const tradeMessage = document.querySelector("#tradeMessage");

  if (!quantityInput || !buyButton || !sellButton || !totalValue) return;

  const qty = parseTradeQuantity(quantityInput);
  const value = qty * market.price;
  const holding = state.user.holdings[market.symbol];
  const owned = holding ? holding.shares : 0;
  const session = getMarketSessionStatus();
  const tradable = isMarketTradable(market);
  const portfolio = calculatePortfolio();
  const maxBuyShares = Math.floor(state.user.cash / market.price);

  totalValue.textContent = formatCurrency(value);
  if (marketPrice) marketPrice.textContent = formatCurrency(market.price);
  if (ownedSharesLine) ownedSharesLine.textContent = formatShares(owned);
  if (currentWealth) currentWealth.textContent = formatCurrency(portfolio.total);
  if (buyingCapacity) buyingCapacity.textContent = formatCurrency(state.user.cash);
  if (maxBuySharesLine) maxBuySharesLine.textContent = `${formatShares(maxBuyShares)} shares`;
  if (sessionBanner) {
    sessionBanner.textContent = getTradeSessionText(market, session);
    sessionBanner.className = `session-banner ${tradable ? "" : "closed"}`;
  }
  if (options.clearMessage && tradeMessage) tradeMessage.textContent = "";

  buyButton.disabled = !tradable || qty <= 0 || value > state.user.cash;
  sellButton.disabled = !tradable || qty <= 0 || qty > owned;
}

function ownerMarketControlsTemplate(market) {
  if (!market.custom) return "";

  if (!isMarketOwner(market)) {
    return `
      <div class="owner-controls">
        <div class="panel-title-row compact-row">
          <h3>Market Controls</h3>
          <span class="status-pill compact">Custom</span>
        </div>
        <p class="muted">This custom market can only be controlled from the account that created it.</p>
      </div>
    `;
  }

  return `
    <div class="owner-controls">
      <div class="panel-title-row compact-row">
        <h3>Market Controls</h3>
        <span class="status-pill compact ${market.isPaused ? "closed" : ""}">${market.isPaused ? "Paused" : "Running"}</span>
      </div>
      <div class="control-grid">
        <label>
          Set price
          <input id="ownerPriceInput" type="number" min="0.25" step="0.01" value="${market.price.toFixed(2)}" />
        </label>
        <label>
          Tick limit (%)
          <input id="ownerTickLimitControl" type="number" min="0.1" max="5" step="0.05" value="${market.tickLimit.toFixed(2)}" />
        </label>
      </div>
      <div class="control-actions">
        <button id="ownerApplyButton" class="secondary-button" type="button">Apply</button>
        <button id="ownerPauseButton" class="ghost-button" type="button">${market.isPaused ? "Resume" : "Pause"}</button>
        <button id="ownerRemoveButton" class="ghost-button danger-button" type="button">Remove</button>
      </div>
      <p id="ownerControlMessage" class="form-message"></p>
    </div>
  `;
}

function bindOwnerMarketControls(market) {
  if (!isMarketOwner(market)) return;

  const priceInput = document.querySelector("#ownerPriceInput");
  const tickLimitInput = document.querySelector("#ownerTickLimitControl");
  const applyButton = document.querySelector("#ownerApplyButton");
  const pauseButton = document.querySelector("#ownerPauseButton");
  const removeButton = document.querySelector("#ownerRemoveButton");
  const message = document.querySelector("#ownerControlMessage");

  applyButton?.addEventListener("click", () => {
    const price = roundMoney(Number(priceInput.value));
    const tickLimit = Math.min(5, Math.max(0.1, Number(tickLimitInput.value) || market.tickLimit));

    if (!Number.isFinite(price) || price < 0.25) {
      message.textContent = "Price must be at least $0.25.";
      return;
    }

    market.price = price;
    market.tickLimit = tickLimit;
    market.marketCap = roundMoney(price * 1000000);
    market.history.push({ t: Date.now(), v: price });
    market.history = market.history.slice(-MAX_MARKET_POINTS);
    saveMarkets();
    renderAll();
    showView("marketDetail");
    toast(`Updated $${market.symbol} controls.`);
  });

  pauseButton?.addEventListener("click", () => {
    market.isPaused = !market.isPaused;
    saveMarkets();
    renderAll();
    showView("marketDetail");
    toast(`${market.isPaused ? "Paused" : "Resumed"} $${market.symbol}.`);
  });

  removeButton?.addEventListener("click", () => {
    if (hasAnyHoldingsForSymbol(market.symbol)) {
      message.textContent = "Sell all shares before removing this market.";
      return;
    }
    if (!window.confirm(`Remove $${market.symbol} from this exchange?`)) return;

    state.markets = state.markets.filter((item) => item.symbol !== market.symbol);
    state.selectedSymbol = null;
    saveMarkets();
    renderAll();
    showView("markets");
    toast(`Removed $${market.symbol}.`);
  });
}

function isMarketOwner(market) {
  return Boolean(market.custom && state.user && market.ownerEmail === state.user.email);
}

function hasAnyHoldingsForSymbol(symbol) {
  return Object.values(state.users).some((user) => numberOr(user?.holdings?.[symbol]?.shares, 0) > 0);
}

function isMarketTradable(market) {
  return getMarketSessionStatus().isOpen && !market.isPaused;
}

function getMarketDetailStatus(market, session = getMarketSessionStatus()) {
  if (market.isPaused) {
    return {
      label: "PAUSED",
      detail: "owner controls stopped ticks",
      className: "closed",
    };
  }
  return {
    label: session.label,
    detail: session.detail,
    className: session.isOpen ? "" : "closed",
  };
}

function getTradeSessionText(market, session = getMarketSessionStatus()) {
  if (market.isPaused) {
    return "Market paused by owner. Ticks and trading are stopped.";
  }
  return session.isOpen ? `Market open. ${session.detail}.` : `Market closed. ${session.detail}.`;
}

function rangeButtonTemplate() {
  return ["1D", "1W", "1M", "3M", "YTD", "1Y"]
    .map((range) => `<button class="range-button ${state.chartRange === range ? "active" : ""}" type="button" data-range="${range}">${range}</button>`)
    .join("");
}

function bindRangeButtons() {
  document.querySelectorAll("[data-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartRange = button.dataset.range;
      document.querySelectorAll("[data-range]").forEach((item) => item.classList.toggle("active", item === button));
      drawVisibleCharts();
    });
  });
}

function getFluctuationBand(market) {
  const width = Math.max(0.1, market.open * 0.1);
  return {
    low: Math.max(0.25, roundMoney(market.open - width)),
    high: roundMoney(market.open + width),
  };
}

function getMarketSessionStatus(date = new Date()) {
  const minutes = getIstMinutes(date);
  const isClosed = minutes >= CLOSED_START_MINUTES && minutes < CLOSED_END_MINUTES;
  const minutesUntilOpen = CLOSED_END_MINUTES - minutes;
  const minutesUntilClose = minutes < CLOSED_START_MINUTES
    ? CLOSED_START_MINUTES - minutes
    : 1440 - minutes + CLOSED_START_MINUTES;

  return {
    isOpen: !isClosed,
    label: isClosed ? "CLOSED" : "OPEN",
    detail: isClosed ? `opens in ${formatDuration(minutesUntilOpen)}` : `closes in ${formatDuration(minutesUntilClose)}`,
  };
}

function getIstMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(0, Math.ceil(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

function renderPortfolio() {
  const portfolio = calculatePortfolio();
  const invested = calculateInvested();
  const totalReturn = portfolio.total - state.user.startingCash;
  const totalReturnPct = state.user.startingCash ? (totalReturn / state.user.startingCash) * 100 : 0;

  els.portfolioSubtext.textContent = `${formatShares(totalShares())} shares held - Cash ${formatCurrency(state.user.cash)}`;
  els.portfolioTotalValue.textContent = formatCurrency(portfolio.total);
  els.portfolioCash.textContent = formatCurrency(state.user.cash);
  els.portfolioInvested.textContent = formatCurrency(invested);
  els.portfolioTotalChange.textContent = `${formatCurrency(totalReturn)} - ${formatPercent(totalReturnPct)}`;
  els.portfolioTotalChange.className = `metric-note ${totalReturn > 0 ? "positive" : totalReturn < 0 ? "negative" : "neutral"}`;

  renderAllocation(portfolio.holdingsValue);
  renderPortfolioHoldings();
  renderProfitLoss();
  renderTrades();
}

function renderAllocation(holdingsValue) {
  const entries = Object.entries(state.user.holdings)
    .map(([symbol, holding]) => {
      const market = findMarket(symbol);
      return {
        symbol,
        value: market ? market.price * holding.shares : 0,
        color: market ? market.color : "#747b85",
      };
    })
    .filter((entry) => entry.value > 0);

  if (!entries.length || holdingsValue <= 0) {
    els.allocationBar.innerHTML = `<div class="allocation-segment" style="width:100%; background:#252a31"></div>`;
    els.allocationLegend.innerHTML = `<span class="legend-item">No active holdings</span>`;
    return;
  }

  els.allocationBar.innerHTML = entries
    .map((entry) => {
      const pct = (entry.value / holdingsValue) * 100;
      return `<div class="allocation-segment" title="$${entry.symbol} ${pct.toFixed(1)}%" style="width:${pct}%; background:${entry.color}"></div>`;
    })
    .join("");

  els.allocationLegend.innerHTML = entries
    .map((entry) => {
      const pct = (entry.value / holdingsValue) * 100;
      return `<span class="legend-item"><span class="legend-swatch" style="background:${entry.color}"></span>$${entry.symbol} ${pct.toFixed(1)}%</span>`;
    })
    .join("");
}

function renderPortfolioHoldings() {
  const rows = holdingRows();
  if (!rows.length) {
    els.portfolioHoldings.innerHTML = `<div class="empty-state">No holdings yet. Open a market and place a buy order.</div>`;
    return;
  }

  els.portfolioHoldings.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Shares</th>
          <th>Avg cost</th>
          <th>Market price</th>
          <th>Value</th>
          <th>P/L</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
          <tr>
            <td>$${row.symbol}</td>
            <td>${formatShares(row.shares)}</td>
            <td>${formatCurrency(row.avgCost)}</td>
            <td>${formatCurrency(row.price)}</td>
            <td>${formatCurrency(row.value)}</td>
            <td class="${row.pl >= 0 ? "positive" : "negative"}">${formatCurrency(row.pl)} (${formatPercent(row.plPct)})</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderHoldingsCards(container) {
  const rows = holdingRows();
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state">No current stocks. Use Markets to buy your first position.</div>`;
    return;
  }

  container.innerHTML = rows
    .map(
      (row) => `
      <article class="holding-card">
        <h4>$${row.symbol}</h4>
        <p class="muted">${escapeHtml(row.name)}</p>
        <dl>
          <div><dt>Shares</dt><dd>${formatShares(row.shares)}</dd></div>
          <div><dt>Value</dt><dd>${formatCurrency(row.value)}</dd></div>
          <div><dt>Avg cost</dt><dd>${formatCurrency(row.avgCost)}</dd></div>
          <div><dt>P/L</dt><dd class="${row.pl >= 0 ? "positive" : "negative"}">${formatCurrency(row.pl)}</dd></div>
        </dl>
      </article>
    `,
    )
    .join("");
}

function renderProfitLoss() {
  const rows = holdingRows();
  const unrealized = rows.reduce((sum, row) => sum + row.pl, 0);
  const best = rows.slice().sort((a, b) => b.plPct - a.plPct)[0];
  const worst = rows.slice().sort((a, b) => a.plPct - b.plPct)[0];
  const total = calculatePortfolio().total;
  const cashRatio = total ? (state.user.cash / total) * 100 : 0;

  els.profitLossCards.innerHTML = [
    {
      label: "Unrealized P/L",
      value: formatCurrency(unrealized),
      className: unrealized >= 0 ? "positive" : "negative",
    },
    {
      label: "Realized P/L",
      value: formatCurrency(state.user.realizedProfit),
      className: state.user.realizedProfit >= 0 ? "positive" : "negative",
    },
    {
      label: "Best holding",
      value: best ? `$${best.symbol} ${formatPercent(best.plPct)}` : "No holdings",
      className: best && best.plPct >= 0 ? "positive" : best ? "negative" : "",
    },
    {
      label: "Worst holding",
      value: worst ? `$${worst.symbol} ${formatPercent(worst.plPct)}` : "No holdings",
      className: worst && worst.plPct >= 0 ? "positive" : worst ? "negative" : "",
    },
    {
      label: "Cash allocation",
      value: `${cashRatio.toFixed(1)}%`,
      className: "",
    },
  ]
    .map(
      (item) => `
      <div class="comparison-item">
        <span>${item.label}</span>
        <strong class="${item.className}">${item.value}</strong>
      </div>
    `,
    )
    .join("");
}

function renderTrades() {
  if (!state.user.trades.length) {
    els.tradeHistory.innerHTML = `<div class="empty-state">No trades recorded yet.</div>`;
    return;
  }

  els.tradeHistory.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Side</th>
          <th>Symbol</th>
          <th>Shares</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${state.user.trades
          .slice(0, 12)
          .map(
            (trade) => `
          <tr>
            <td>${formatDateTime(trade.time)}</td>
            <td class="${trade.type === "BUY" ? "positive" : "negative"}">${trade.type}</td>
            <td>$${trade.symbol}</td>
            <td>${formatShares(trade.qty)}</td>
            <td>${formatCurrency(trade.price)}</td>
            <td>${formatCurrency(trade.total)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderNews() {
  const sorted = state.markets
    .map((market) => ({ market, change: getMarketChange(market) }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const leader = sorted[0];
  const laggard = sorted.slice().sort((a, b) => a.change - b.change)[0];
  const highestCap = state.markets.slice().sort((a, b) => b.marketCap - a.marketCap)[0];

  const news = [
    {
      tag: "Live move",
      title: `$${leader.market.symbol} leads the tape at ${formatPercent(leader.change)}`,
      detail: `${leader.market.name} is trading at ${formatCurrency(leader.market.price)} with volume near ${formatCompact(leader.market.volume)} shares.`,
      meta: `${formatCurrency(leader.market.marketCap)} market cap`,
    },
    {
      tag: "Pressure",
      title: `$${laggard.market.symbol} posts the weakest intraday move`,
      detail: `${laggard.market.name} is ${laggard.change >= 0 ? "still positive" : "lower"} on the session as buyers watch the ${escapeHtml(laggard.market.industry.toLowerCase())} group.`,
      meta: `${formatPercent(laggard.change)} today`,
    },
    {
      tag: "Market cap",
      title: `${highestCap.name} remains the largest listing`,
      detail: `$${highestCap.symbol} is valued near ${formatCurrency(highestCap.marketCap)} and continues to anchor the exchange watch list.`,
      meta: highestCap.headquarters,
    },
    {
      tag: "Portfolio",
      title: `Account value at ${formatCurrency(calculatePortfolio().total)}`,
      detail: `Available cash stands at ${formatCurrency(state.user.cash)} with ${formatShares(totalShares())} shares held across active positions.`,
      meta: `${state.user.trades.length} trades recorded`,
    },
  ];

  els.newsList.innerHTML = news
    .map(
      (item) => `
      <article class="news-card">
        <div class="news-meta">
          <strong>${item.tag}</strong>
          <span>${item.meta}</span>
        </div>
        <h3>${item.title}</h3>
        <p class="muted">${item.detail}</p>
      </article>
    `,
    )
    .join("");
}

function renderUpcoming() {
  els.upcomingList.innerHTML = UPCOMING_EVENTS.map(
    (item) => `
      <article class="timeline-item">
        <span class="timeline-date">${item.date}</span>
        <span>
          <h3>${item.title}</h3>
          <p class="muted">${item.detail}</p>
        </span>
        <span class="status-pill compact">${item.tag}</span>
      </article>
    `,
  ).join("");
}

function buyShares(symbol, qty) {
  if (qty <= 0) return false;
  const market = findMarket(symbol);
  if (!market) return false;
  const total = roundMoney(market.price * qty);
  if (total > state.user.cash) return false;

  const holding = state.user.holdings[symbol] || { shares: 0, avgCost: 0 };
  const newShares = holding.shares + qty;
  const newCost = holding.avgCost * holding.shares + total;
  holding.shares = newShares;
  holding.avgCost = newCost / newShares;
  state.user.holdings[symbol] = holding;
  state.user.cash = roundMoney(state.user.cash - total);
  recordTrade("BUY", symbol, qty, market.price, total);
  appendPortfolioPoint();
  saveUsers();
  return true;
}

function sellShares(symbol, qty) {
  if (qty <= 0) return false;
  const market = findMarket(symbol);
  const holding = state.user.holdings[symbol];
  if (!market || !holding || holding.shares < qty) return false;

  const total = roundMoney(market.price * qty);
  const realized = (market.price - holding.avgCost) * qty;
  holding.shares -= qty;
  state.user.cash = roundMoney(state.user.cash + total);
  state.user.realizedProfit = roundMoney(state.user.realizedProfit + realized);
  if (holding.shares <= 0) {
    delete state.user.holdings[symbol];
  } else {
    state.user.holdings[symbol] = holding;
  }
  recordTrade("SELL", symbol, qty, market.price, total);
  appendPortfolioPoint();
  saveUsers();
  return true;
}

function recordTrade(type, symbol, qty, price, total) {
  state.user.trades.unshift({
    type,
    symbol,
    qty,
    price,
    total,
    time: Date.now(),
  });
  state.user.trades = state.user.trades.slice(0, 80);
}

function startTicker() {
  stopTicker();
  state.tickTimer = setInterval(() => {
    advanceMarkets();
    appendPortfolioPoint();
    saveMarkets();
    saveUsers();
    renderAll();
  }, TICK_MS);
}

function stopTicker() {
  if (state.tickTimer) {
    clearInterval(state.tickTimer);
    state.tickTimer = null;
  }
}

function advanceMarkets() {
  if (!getMarketSessionStatus().isOpen) return;

  const now = Date.now();
  state.markets.forEach((market) => {
    if (market.isPaused) return;
    const pct = (Math.random() * 2 - 1) * (market.tickLimit / 100);
    const next = Math.max(0.25, market.price * (1 + pct));
    market.price = roundMoney(next);
    market.volume = Math.max(1000, Math.round(market.volume * (1 + (Math.random() * 0.02 - 0.01))));
    market.history.push({ t: now, v: market.price });
    market.history = market.history.slice(-MAX_MARKET_POINTS);
  });
}

function appendPortfolioPoint() {
  if (!state.user) return;
  const point = { t: Date.now(), v: roundMoney(calculatePortfolio().total) };
  state.user.portfolioHistory.push(point);
  state.user.portfolioHistory = state.user.portfolioHistory.slice(-MAX_POINTS);
}

function calculatePortfolio() {
  if (!state.user) {
    return { cash: 0, holdingsValue: 0, total: 0 };
  }
  const holdingsValue = Object.entries(state.user.holdings || {}).reduce((sum, [symbol, holding]) => {
    const market = findMarket(symbol);
    return sum + (market ? market.price * holding.shares : 0);
  }, 0);
  return {
    cash: state.user.cash,
    holdingsValue: roundMoney(holdingsValue),
    total: roundMoney(state.user.cash + holdingsValue),
  };
}

function calculateInvested() {
  if (!state.user) return 0;
  return roundMoney(
    Object.values(state.user.holdings).reduce((sum, holding) => sum + holding.avgCost * holding.shares, 0),
  );
}

function calculatePortfolioChange() {
  const history = state.user.portfolioHistory || [];
  if (history.length < 2) return 0;
  const latest = history[history.length - 1].v;
  const prior = history[Math.max(0, history.length - 30)].v;
  return prior ? ((latest - prior) / prior) * 100 : 0;
}

function holdingRows() {
  return Object.entries(state.user.holdings || {})
    .map(([symbol, holding]) => {
      const market = findMarket(symbol);
      if (!market) return null;
      const value = market.price * holding.shares;
      const cost = holding.avgCost * holding.shares;
      const pl = value - cost;
      const plPct = cost ? (pl / cost) * 100 : 0;
      return {
        symbol,
        name: market.name,
        shares: holding.shares,
        avgCost: holding.avgCost,
        price: market.price,
        value,
        pl,
        plPct,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
}

function totalShares() {
  return Object.values(state.user.holdings || {}).reduce((sum, holding) => sum + holding.shares, 0);
}

function hydrateMarkets() {
  const saved = readJson(MARKET_STORAGE_KEY, null);
  const savedMarkets = Array.isArray(saved) ? saved : [];
  const definitionSymbols = new Set(MARKET_DEFINITIONS.map((market) => market.symbol));
  const bySymbol = new Map(savedMarkets.map((market) => [market.symbol, market]));

  const markets = MARKET_DEFINITIONS.map((definition) => {
    return hydrateMarketRecord(definition, bySymbol.get(definition.symbol) || {});
  });

  savedMarkets
    .filter((market) => market.custom && !definitionSymbols.has(market.symbol))
    .forEach((market) => {
      const hydrated = hydrateMarketRecord(market, market);
      if (hydrated.symbol && !markets.some((item) => item.symbol === hydrated.symbol)) {
        markets.push(hydrated);
      }
    });

  localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(markets));
  return markets;
}

function hydrateMarketRecord(baseMarket, savedMarket = {}) {
  const symbol = normalizeMarketSymbol(savedMarket.symbol || baseMarket.symbol);
  const price = roundMoney(numberOr(savedMarket.price, baseMarket.price || 10));
  const tickLimit = Math.min(5, Math.max(0.1, numberOr(savedMarket.tickLimit, baseMarket.tickLimit || 1)));
  const savedHistory = normalizeMarketHistory(savedMarket.history, price);
  const custom = Boolean(savedMarket.custom || baseMarket.custom);

  return {
    ...baseMarket,
    ...savedMarket,
    symbol,
    name: String(savedMarket.name || baseMarket.name || `${symbol} Market`),
    industry: String(savedMarket.industry || baseMarket.industry || "Custom market"),
    headquarters: String(savedMarket.headquarters || baseMarket.headquarters || "Local desk"),
    price,
    open: roundMoney(numberOr(savedMarket.open, baseMarket.open || price)),
    volume: Math.max(1000, Math.round(numberOr(savedMarket.volume, baseMarket.volume || 100000))),
    marketCap: roundMoney(numberOr(savedMarket.marketCap, baseMarket.marketCap || price * 1000000)),
    tickLimit,
    color: savedMarket.color || baseMarket.color || getCustomMarketColor(symbol),
    about: String(savedMarket.about || baseMarket.about || `${symbol} is a custom local market.`),
    custom,
    ownerEmail: savedMarket.ownerEmail || baseMarket.ownerEmail || "",
    isPaused: custom ? Boolean(savedMarket.isPaused) : false,
    history: hasWideMarketHistory(savedHistory)
      ? savedHistory.slice(-MAX_MARKET_POINTS)
      : seedHistory(price, tickLimit),
  };
}

function seedHistory(targetPrice, tickLimit) {
  const now = Date.now();
  const points = [];
  let price = targetPrice * (0.82 + Math.random() * 0.18);

  for (let index = 0; index < 365; index += 1) {
    const daysAgo = 365 - index;
    const drift = 0.0004 + (Math.random() * 0.0012 - 0.0006);
    const pct = drift + (Math.random() * 2 - 1) * (tickLimit / 100) * 1.7;
    price = Math.max(0.25, price * (1 + pct));
    points.push({
      t: now - daysAgo * DAY_MS,
      v: price,
    });
  }

  const intradayPoints = 180;
  const intradaySpacing = DAY_MS / (intradayPoints - 1);
  price = points[points.length - 1].v;
  for (let index = 1; index < intradayPoints; index += 1) {
    const pct = (Math.random() * 2 - 1) * (tickLimit / 100) * 0.35;
    price = Math.max(0.25, price * (1 + pct));
    points.push({
      t: now - (intradayPoints - 1 - index) * intradaySpacing,
      v: price,
    });
  }

  points.sort((a, b) => a.t - b.t);
  const last = points[points.length - 1].v;
  const factor = targetPrice / last;
  return points
    .map((point, index) => ({
      t: point.t,
      v: roundMoney(index === points.length - 1 ? targetPrice : point.v * factor),
    }))
    .slice(-MAX_MARKET_POINTS);
}

function normalizeMarketHistory(history, fallbackPrice) {
  if (!Array.isArray(history)) return [];
  return history
    .map((point) => ({
      t: numberOr(point.t, 0),
      v: roundMoney(numberOr(point.v, fallbackPrice)),
    }))
    .filter((point) => point.t > 0 && point.v > 0)
    .sort((a, b) => a.t - b.t);
}

function hasWideMarketHistory(history) {
  if (history.length < 240) return false;
  const span = history[history.length - 1].t - history[0].t;
  return span >= 320 * DAY_MS;
}

function getMarketChartData(market) {
  const history = normalizeMarketHistory(market.history, market.price);
  if (!history.length) return [];

  const cutoff = getChartRangeCutoff(state.chartRange);
  const filtered = cutoff ? history.filter((point) => point.t >= cutoff) : history;
  const source = filtered.length >= 2 ? filtered : history;
  return downsampleChartData(source, 260);
}

function getChartRangeCutoff(range) {
  const now = Date.now();
  if (range === "YTD") {
    return new Date(new Date().getFullYear(), 0, 1).getTime();
  }
  return RANGE_WINDOWS[range] ? now - RANGE_WINDOWS[range] : now - DAY_MS;
}

function downsampleChartData(points, limit) {
  if (points.length <= limit) return points;

  const sampled = [];
  const step = (points.length - 1) / (limit - 1);
  for (let index = 0; index < limit; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }
  return sampled;
}

function drawVisibleCharts() {
  if (!state.user) return;
  if (els.wealthChart.offsetParent !== null) {
    drawLineChart(els.wealthChart, state.user.portfolioHistory, {
      color: "#6fb1ff",
      accent: "#2fd179",
      accent2: "#f0f2f4",
      prefix: "$",
      yTitle: "Portfolio value",
      xTitle: "Time",
    });
  }

  const marketCanvas = document.querySelector("#marketChart");
  if (marketCanvas) {
    const market = getSelectedMarket();
    if (market) {
      drawLineChart(marketCanvas, getMarketChartData(market), {
        color: market.color,
        accent: "#6fb1ff",
        accent2: "#2fd179",
        prefix: "$",
        range: state.chartRange,
        yTitle: "Market price",
        xTitle: "Time",
      });
    }
  }

  drawSparklines();
}

function drawSparklines() {
  document.querySelectorAll("[data-sparkline]").forEach((canvas) => {
    const market = findMarket(canvas.dataset.sparkline);
    if (market) {
      drawLineChart(canvas, market.history.slice(-120), {
        color: market.color,
        fill: "transparent",
        labels: false,
        grid: false,
        compact: true,
      });
    }
  });
}

function bindChartHover(canvas) {
  if (canvas.dataset.chartHoverBound === "true") return;
  canvas.dataset.chartHoverBound = "true";

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.chartHover.set(canvas, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    queueChartRedraw();
  });

  canvas.addEventListener("mouseleave", () => {
    state.chartHover.delete(canvas);
    queueChartRedraw();
  });
}

function queueChartRedraw() {
  if (state.hoverFrame) return;
  state.hoverFrame = requestAnimationFrame(() => {
    state.hoverFrame = null;
    drawVisibleCharts();
  });
}

function drawLineChart(canvas, data, options = {}) {
  if (options.hover !== false) {
    bindChartHover(canvas);
  }

  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const w = rect.width;
  const h = rect.height;
  context.clearRect(0, 0, w, h);

  const points = (data || []).filter((point) => Number.isFinite(point.v));
  if (!points.length) return;

  const compact = Boolean(options.compact);
  const isLight = document.body.dataset.theme === "light";
  const color = options.color || "#2fd179";
  const accent = options.accent || "#6fb1ff";
  const accent2 = options.accent2 || "#f0f2f4";
  const lineColor = isLight ? "#151515" : color;
  const gridColor = isLight ? "rgba(222, 219, 210, 0.92)" : "rgba(74, 81, 91, 0.55)";
  const axisColor = isLight ? "#dedbd2" : "#5a626d";
  const labelColor = isLight ? "#8d8b86" : "#8f98a3";
  const titleColor = isLight ? "#73706b" : "#a7b0bb";
  const tooltipBg = isLight ? "rgba(255, 255, 255, 0.96)" : "rgba(13, 15, 18, 0.94)";
  const tooltipText = isLight ? "#151515" : "#f0f2f4";
  const tooltipSubtext = isLight ? "#78756f" : "#9da4ad";
  const pointStroke = isLight ? "#ffffff" : "#0d0f12";
  const padding = compact ? { top: 10, right: 10, bottom: 10, left: 10 } : { top: 24, right: 26, bottom: 48, left: 72 };
  const values = points.map((point) => point.v);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= Math.max(1, min * 0.01);
    max += Math.max(1, max * 0.01);
  }
  const range = max - min;
  min -= range * 0.12;
  max += range * 0.12;

  const chartW = Math.max(1, w - padding.left - padding.right);
  const chartH = Math.max(1, h - padding.top - padding.bottom);
  const xFor = (index) => padding.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * chartW);
  const yFor = (value) => padding.top + (1 - (value - min) / (max - min)) * chartH;

  if (!compact) {
    const bgGradient = context.createLinearGradient(0, 0, w, h);
    if (isLight) {
      bgGradient.addColorStop(0, "#ffffff");
      bgGradient.addColorStop(1, "#fbfaf7");
    } else {
      bgGradient.addColorStop(0, "rgba(111, 177, 255, 0.08)");
      bgGradient.addColorStop(0.55, "rgba(47, 209, 121, 0.035)");
      bgGradient.addColorStop(1, "rgba(216, 169, 72, 0.055)");
    }
    context.fillStyle = bgGradient;
    context.fillRect(0, 0, w, h);
  }

  context.lineWidth = 1;
  if (options.grid !== false) {
    const yTicks = 5;
    const xTicks = Math.min(5, points.length);

    context.strokeStyle = gridColor;
    context.fillStyle = labelColor;
    context.font = "11px Inter, sans-serif";
    context.textAlign = "right";
    context.textBaseline = "middle";

    for (let i = 0; i < yTicks; i += 1) {
      const y = padding.top + (i / (yTicks - 1)) * chartH;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(w - padding.right, y);
      context.stroke();
      const value = max - (i / (yTicks - 1)) * (max - min);
      context.fillText(`${options.prefix || ""}${formatAxis(value)}`, padding.left - 10, y);
    }

    context.textAlign = "center";
    context.textBaseline = "top";
    for (let i = 0; i < xTicks; i += 1) {
      const index = xTicks === 1 ? 0 : Math.round((i / (xTicks - 1)) * (points.length - 1));
      const x = xFor(index);
      if (!isLight) {
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, h - padding.bottom);
        context.stroke();
      }
      context.fillText(formatChartTime(points[index].t, false, options.range), x, h - padding.bottom + 10);
    }

    context.strokeStyle = axisColor;
    context.beginPath();
    context.moveTo(padding.left, padding.top);
    context.lineTo(padding.left, h - padding.bottom);
    context.lineTo(w - padding.right, h - padding.bottom);
    context.stroke();

    context.fillStyle = titleColor;
    context.font = "700 11px Inter, sans-serif";
    context.fillText(options.xTitle || "Time", padding.left + chartW / 2, h - 17);
    context.save();
    context.translate(16, padding.top + chartH / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(options.yTitle || "Value", 0, 0);
    context.restore();
  }

  function traceLine() {
    points.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(point.v);
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
  }

  if (options.fill !== "transparent") {
    const areaGradient = context.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    context.beginPath();
    traceLine();
    context.lineTo(xFor(points.length - 1), h - padding.bottom);
    context.lineTo(xFor(0), h - padding.bottom);
    context.closePath();
    if (isLight) {
      areaGradient.addColorStop(0, "rgba(21, 21, 21, 0.045)");
      areaGradient.addColorStop(1, "rgba(21, 21, 21, 0)");
    } else {
      areaGradient.addColorStop(0, hexToRgba(color, 0.24));
      areaGradient.addColorStop(0.62, hexToRgba(accent, 0.09));
      areaGradient.addColorStop(1, "rgba(13, 15, 18, 0)");
    }
    context.fillStyle = areaGradient;
    context.fill();
  }

  context.beginPath();
  traceLine();
  const lineGradient = context.createLinearGradient(padding.left, 0, w - padding.right, 0);
  lineGradient.addColorStop(0, color);
  lineGradient.addColorStop(0.52, accent);
  lineGradient.addColorStop(1, accent2);
  context.strokeStyle = isLight ? lineColor : compact ? color : lineGradient;
  context.lineWidth = compact ? 2 : isLight ? 2.15 : 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();

  if (!compact && points.length && !isLight) {
    const last = points[points.length - 1];
    const x = xFor(points.length - 1);
    const y = yFor(last.v);
    context.fillStyle = color;
    context.strokeStyle = pointStroke;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.stroke();
    context.fill();
  }

  const hover = state.chartHover.get(canvas);
  if (hover && options.hover !== false) {
    const hoverX = Math.min(w - padding.right, Math.max(padding.left, hover.x));
    const ratioX = chartW ? (hoverX - padding.left) / chartW : 0;
    const index = Math.min(points.length - 1, Math.max(0, Math.round(ratioX * (points.length - 1))));
    const point = points[index];
    const x = xFor(index);
    const y = yFor(point.v);
    const valueLabel = options.prefix === "$" ? formatCurrency(point.v) : `${options.prefix || ""}${formatAxis(point.v)}`;
    const timeLabel = formatChartTime(point.t, true, options.range);

    context.save();
    context.strokeStyle = isLight ? "rgba(21, 21, 21, 0.32)" : "rgba(240, 242, 244, 0.68)";
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(x, padding.top);
    context.lineTo(x, h - padding.bottom);
    context.stroke();
    context.setLineDash([]);

    context.fillStyle = lineColor;
    context.strokeStyle = pointStroke;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, compact ? 3 : 5, 0, Math.PI * 2);
    context.stroke();
    context.fill();

    if (!compact) {
      context.font = "800 13px Inter, sans-serif";
      const valueWidth = context.measureText(valueLabel).width;
      context.font = "11px Inter, sans-serif";
      const timeWidth = context.measureText(timeLabel).width;
      const boxWidth = Math.max(132, valueWidth + 24, timeWidth + 24);
      const boxHeight = 46;
      let boxX = x + 12;
      let boxY = y - boxHeight - 12;
      if (boxX + boxWidth > w - 8) boxX = x - boxWidth - 12;
      if (boxY < 8) boxY = y + 12;
      boxY = Math.min(h - boxHeight - 8, Math.max(8, boxY));

      context.fillStyle = tooltipBg;
      context.strokeStyle = isLight ? "#dedbd2" : color;
      context.lineWidth = 1;
      context.fillRect(boxX, boxY, boxWidth, boxHeight);
      context.strokeRect(boxX, boxY, boxWidth, boxHeight);
      context.fillStyle = tooltipText;
      context.font = "800 13px Inter, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(valueLabel, boxX + 12, boxY + 8);
      context.fillStyle = tooltipSubtext;
      context.font = "11px Inter, sans-serif";
      context.fillText(timeLabel, boxX + 12, boxY + 27);
    } else {
      context.font = "800 11px Inter, sans-serif";
      const boxWidth = Math.max(58, context.measureText(valueLabel).width + 14);
      const boxHeight = 22;
      let boxX = x + 8;
      let boxY = y - boxHeight - 8;
      if (boxX + boxWidth > w - 4) boxX = x - boxWidth - 8;
      if (boxY < 4) boxY = y + 8;
      boxY = Math.min(h - boxHeight - 4, Math.max(4, boxY));

      context.fillStyle = isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(13, 15, 18, 0.92)";
      context.strokeStyle = isLight ? "#dedbd2" : color;
      context.lineWidth = 1;
      context.fillRect(boxX, boxY, boxWidth, boxHeight);
      context.strokeRect(boxX, boxY, boxWidth, boxHeight);
      context.fillStyle = tooltipText;
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText(valueLabel, boxX + 7, boxY + 5);
    }

    context.restore();
  }
}

function downloadReport() {
  const portfolio = calculatePortfolio();
  const rows = holdingRows();
  const lines = [
    "Stock Exchange Report",
    `Generated: ${new Date().toLocaleString()}`,
    `Account: ${state.user.email}`,
    "",
    `Total value: ${formatCurrency(portfolio.total)}`,
    `Cash available: ${formatCurrency(state.user.cash)}`,
    `Invested cost basis: ${formatCurrency(calculateInvested())}`,
    `Realized P/L: ${formatCurrency(state.user.realizedProfit)}`,
    "",
    "Holdings",
    rows.length ? "Symbol, Shares, Avg Cost, Market Price, Value, P/L" : "No active holdings",
    ...rows.map((row) =>
      [`$${row.symbol}`, formatShares(row.shares), formatCurrency(row.avgCost), formatCurrency(row.price), formatCurrency(row.value), formatCurrency(row.pl)].join(", "),
    ),
    "",
    "Recent Trades",
    state.user.trades.length ? "Time, Side, Symbol, Shares, Price, Total" : "No trades recorded",
    ...state.user.trades.slice(0, 20).map((trade) =>
      [
        formatDateTime(trade.time),
        trade.type,
        `$${trade.symbol}`,
        formatShares(trade.qty),
        formatCurrency(trade.price),
        formatCurrency(trade.total),
      ].join(", "),
    ),
  ];

  const blob = createPdfBlob(lines);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stock-exchange-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("PDF report downloaded.");
}

function createPdfBlob(lines) {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 54;
  const topY = 742;
  const lineHeight = 16;
  const maxLines = 42;
  const pages = paginateReportLines(lines, maxLines);
  const objects = [];

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const pageRefs = [];
  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 4 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);

    const content = buildPdfPageContent(pageLines, {
      marginX,
      topY,
      lineHeight,
      pageNumber: index + 1,
      pageCount: pages.length,
    });

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    objects[contentObjectNumber] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = pdf.length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function paginateReportLines(lines, maxLines) {
  const wrapped = lines.flatMap((line) => wrapPdfLine(line, 86));
  const pages = [];
  for (let index = 0; index < wrapped.length; index += maxLines) {
    pages.push(wrapped.slice(index, index + maxLines));
  }
  return pages.length ? pages : [["Stock Exchange Report"]];
}

function wrapPdfLine(line, maxLength) {
  const clean = sanitizePdfText(line);
  if (clean.length <= maxLength) return [clean];

  const words = clean.split(" ");
  const rows = [];
  let row = "";
  words.forEach((word) => {
    const next = row ? `${row} ${word}` : word;
    if (next.length > maxLength && row) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  });
  if (row) rows.push(row);
  return rows;
}

function buildPdfPageContent(lines, page) {
  const commands = ["BT", "/F1 18 Tf", `${page.marginX} ${page.topY + 20} Td`, "(Stock Exchange Report) Tj", "/F1 10 Tf"];
  let cursorY = page.topY;

  lines.forEach((line, index) => {
    const fontSize = index === 0 ? 12 : 10;
    commands.push(`/F1 ${fontSize} Tf`);
    commands.push(`1 0 0 1 ${page.marginX} ${cursorY} Tm`);
    commands.push(`(${escapePdfText(line)}) Tj`);
    cursorY -= page.lineHeight;
  });

  commands.push("/F1 9 Tf");
  commands.push(`1 0 0 1 ${page.marginX} 32 Tm`);
  commands.push(`(Page ${page.pageNumber} of ${page.pageCount}) Tj`);
  commands.push("ET");
  return commands.join("\n");
}

function sanitizePdfText(value) {
  return String(value).replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfText(value) {
  return sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function getSelectedMarket() {
  return findMarket(state.selectedSymbol) || state.markets[0];
}

function findMarket(symbol) {
  return state.markets.find((market) => market.symbol === symbol);
}

function getMarketChange(market) {
  return market.open ? ((market.price - market.open) / market.open) * 100 : 0;
}

function saveUsers() {
  if (state.user) {
    state.users[state.user.email] = state.user;
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users));
}

function saveMarkets() {
  localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(state.markets));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(numberOr(value, 0));
}

function formatPercent(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${numberOr(value, 0).toFixed(2)}%`;
}

function formatShares(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numberOr(value, 0));
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(numberOr(value, 0));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatChartTime(value, includeSeconds = false, range = "1D") {
  if (!value) return "";
  if (range && range !== "1D") {
    const options = range === "1Y"
      ? { month: "short", year: "2-digit" }
      : { month: "short", day: "numeric" };
    return new Intl.DateTimeFormat("en-US", options).format(new Date(value));
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
  }).format(new Date(value));
}

function formatAxis(value) {
  if (Math.abs(value) >= 1000) return formatCompact(value);
  return numberOr(value, 0).toFixed(2);
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) {
    return `rgba(47, 209, 121, ${alpha})`;
  }
  const value = Number.parseInt(clean, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function roundMoney(value) {
  return Math.round(numberOr(value, 0) * 100) / 100;
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
