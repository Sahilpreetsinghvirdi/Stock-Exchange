# Stock Exchange

A clean, browser-based paper trading dashboard for a fictional stock exchange. The app runs as a static website and stores accounts, portfolio data, trade history, market settings, and theme preference locally in the browser.

## Features

- Gmail-style local sign-in with saved browser credentials
- Dashboard with portfolio value, cash, live market cards, market watch, and holdings
- Markets page with expandable stock detail views
- Custom local market creation with owner controls for price, tick limit, pause/resume, and removal
- Interactive stock charts with hover values and range selectors: `1D`, `1W`, `1M`, `3M`, `YTD`, `1Y`
- Live market ticks every 5 seconds while the exchange is open
- Market closed window from `2:00 AM` to `4:00 AM IST`
- Quick Trade panel with buy/sell controls, buying power, max shares, estimated value, and owned shares
- Portfolio page with total value, cash, invested value, holdings allocation, trade history, and profit/loss comparison
- News and upcoming market event sections
- Developer profile page opened from the Upcoming section, with GitHub avatar and project intro
- Dark and light mode
- PDF report download from the dashboard

## Project Files

```text
Stock Exchange/
  index.html    Main page structure
  styles.css    Full app styling and responsive layout
  app.js        Trading logic, charts, storage, and PDF report generation
  Readme.md     Project documentation
```

## How To Run

Open `index.html` in a browser.

For the smoothest local workflow in Visual Studio Code, use the Live Server extension or any simple static server, then open the local URL it provides.

## Account And Data

- New users start with `$100.00` cash.
- User data is saved in `localStorage`, so it stays available after closing the browser.
- No backend or real stock market API is used.
- Clearing the browser's site data resets accounts, holdings, trades, saved markets, and theme settings.

## Market Tick Logic

Every open-market tick appends one new price point to each stock. The app does not rewrite older chart points when a new tick happens. Each stock has a configurable fluctuation limit, which controls the maximum random percentage move up or down per tick.

## Notes

This is a paper trading simulation for demonstration and learning. It does not place real trades and should not be treated as financial advice.

---

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- Chart.js
- jsPDF
- LocalStorage API

---

## Application Workflow

1. Create an account or sign in.
2. Receive an initial virtual balance of **$100.00**.
3. Browse available stocks on the Markets page.
4. View historical price charts and company information.
5. Buy or sell shares using the Quick Trade panel.
6. Track portfolio performance in real time.
7. Review completed trades in the Portfolio page.
8. Export a PDF report of your portfolio whenever needed.

---

## Price Simulation

The stock market is entirely simulated inside the browser.

Each stock contains:

- Base price
- Current market price
- Price history
- Daily change
- Trading volume
- Maximum fluctuation percentage

During every market tick:

- A random price movement is generated.
- The movement is limited by the stock's configured volatility.
- Previous price history remains unchanged.
- A new data point is appended to the chart.
- Portfolio values update automatically.
- Profit and loss calculations refresh instantly.

---

## Local Storage

The application stores the following information locally:

- User accounts
- Login session
- Cash balance
- Portfolio holdings
- Trade history
- Watchlist
- Market configuration
- Theme preference
- Generated stock history

No information leaves the user's device.

---

## Performance

The project is designed to be lightweight and responsive.

- No backend server required
- No database required
- No external authentication
- Instant page loading
- Fast chart rendering
- Responsive layout for desktop and mobile devices

---

## Future Improvements

Planned features include:

- Real-time market APIs
- Multiple portfolios
- Cryptocurrency trading
- ETF and mutual fund support
- Advanced candlestick charts
- Technical indicators (RSI, MACD, Bollinger Bands)
- Stock search and filters
- Watchlist synchronization
- Portfolio performance analytics
- Dividend simulation
- Limit and stop-loss orders
- Market news API integration
- AI-powered trading assistant
- Leaderboards
- Portfolio sharing
- Cloud account synchronization
- Multi-language support
- Progressive Web App (PWA)
- Offline support
- Admin panel for managing listed companies

---

## Browser Compatibility

Tested on:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Brave

Latest versions are recommended for the best experience.

---

## Limitations

- This is a simulated exchange.
- Prices are generated algorithmically.
- No real financial data is used.
- Trades cannot be executed on actual stock exchanges.
- User accounts exist only in browser storage.
- Clearing browser storage permanently removes all saved data.

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.

```bash
git checkout -b feature/new-feature
```

3. Commit your changes.

```bash
git commit -m "Add new feature"
```

4. Push to GitHub.

```bash
git push origin feature/new-feature
```

5. Open a Pull Request.

---

## License

This project is licensed under the MIT License.

---

## Author

**Sahilpreet Singh**

If you found this project useful, consider giving it a ⭐ on GitHub.
