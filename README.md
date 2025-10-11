# FinSight 💡
*Personal Finance + Investing Assistant*

A full-stack PERN application that centralizes your finances — tracking **stocks** (from Robinhood CSVs), **crypto** (from Coinbase API), computing **salary and taxes**, running **budget simulations**, and providing an **AI-powered insight chatbot** with educational investment ideas.

![License](https://img.shields.io/badge/license-UNLICENSED-red)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-5.3.2-blue)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** & **Docker Compose**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd FinSight
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the database**
   ```bash
   npm run db:up
   ```

5. **Run database migrations & seeds**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Database**: localhost:5432

---

## 📁 Project Structure

```
FinSight/
├── apps/
│   ├── web/                 # React frontend (Vite + TypeScript)
│   ├── server/              # Express API server
│   └── jobs/                # Background jobs (price sync, etc.)
├── packages/
│   ├── tax-engine/          # Tax calculation logic
│   └── advisor/             # AI advisor & scoring
├── infra/
│   └── docker/              # Docker configurations
├── package.json             # Root workspace configuration
└── README.md
```

---

## 🛠 Development

### Available Scripts

```bash
# Development
npm run dev                  # Start both frontend & backend
npm run server:dev          # Start backend only
npm run web:dev             # Start frontend only
npm run jobs                # Start background jobs

# Database
npm run db:up               # Start PostgreSQL container
npm run db:down             # Stop database
npm run db:migrate          # Run migrations
npm run db:seed             # Seed demo data
npm run db:reset            # Reset database completely

# Building & Testing
npm run build              # Build all apps
npm run test               # Run all tests
npm run lint               # Lint all code
npm run type-check         # TypeScript type checking
npm run clean              # Clean all build artifacts
```

### Database Management

The project uses **Knex.js** for database migrations and **PostgreSQL** as the primary database.

**Migration commands:**
```bash
# Create new migration
cd apps/server
npx knex migrate:make migration_name --knexfile src/config/knexfile.ts

# Run migrations
npm run db:migrate

# Rollback last migration
npm run migrate:rollback --workspace=apps/server
```

### Working with the API

The backend API is organized into these main routes:

- `GET /health` - Health check
- `POST /api/auth/login` - User authentication
- `GET /api/portfolio/summary` - Portfolio overview
- `POST /api/robinhood/upload` - CSV upload
- `POST /api/coinbase/sync` - Sync Coinbase data
- `POST /api/salary/calc` - Tax calculations
- `POST /api/budget/scenario` - Budget simulations
- `POST /api/advisor` - AI insights

---

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure these variables:

### Core Configuration
```bash
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DB_URL=postgres://postgres:postgres@localhost:5432/finsight
```

### Security
```bash
SESSION_SECRET=your-super-secret-session-key
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
```

### External APIs
```bash
COINGECKO_BASE=https://api.coingecko.com/api/v3
ALPHAVANTAGE_KEY=your-alpha-vantage-api-key
OPENAI_KEY=your-openai-api-key
```

---

## 🏗 Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Backend**: Express, TypeScript, Knex.js, PostgreSQL
- **Authentication**: Express Sessions with PostgreSQL store
- **Styling**: TailwindCSS with dark theme
- **Icons**: Heroicons
- **Charts**: Recharts
- **API Integrations**: Coinbase, CoinGecko, Alpha Vantage, OpenAI

### Data Flow
```
Coinbase API → positions → live prices → portfolio valuation
Robinhood CSV → parser → positions/transactions → P&L calculations  
Salary input → tax-engine → detailed paystub breakdown
Budget scenarios → allocation analysis → savings insights
AI Advisor → OpenAI GPT-5 → educational investment recommendations
```

---

## 💾 Database Schema

### Core Tables
- **users** - User accounts and authentication
- **external_accounts** - Connected brokerages (Robinhood, Coinbase)
- **positions** - Current holdings across all accounts
- **transactions** - Trade history and transaction records
- **prices** - Market data cache for stocks and crypto

### Finance Tables
- **salary_profiles** - Tax year salary and deduction settings
- **budget_categories** - Spending categories (housing, food, etc.)
- **budget_allocations** - Budget scenarios and allocations
- **factor_scores** - Investment analysis metrics (value, growth, etc.)

---

## 🎯 Features

### ✅ Portfolio Tracker
- Import Robinhood positions via CSV upload
- Connect Coinbase via read-only API
- Real-time price updates from CoinGecko & Alpha Vantage
- Asset allocation visualization and P&L tracking

### ✅ Salary & Tax Calculator  
- Federal, state, and FICA tax calculations
- Support for 401k, HSA, FSA contributions
- Multiple pay frequency options (weekly, biweekly, etc.)
- Interactive "what-if" scenarios

### ✅ Budget Simulator
- Category-based budgeting with visual allocations
- Scenario comparison (location changes, salary adjustments)
- Savings rate calculation and runway analysis
- Integration with salary calculations

### ✅ AI Investment Advisor
- Educational investment insights and recommendations
- ETF/stock analysis based on risk tolerance and goals
- Pros/cons analysis with "what could go wrong" scenarios
- Guardrails to prevent single-ticker recommendations

---

## 🔒 Security

### Data Protection
- All API credentials encrypted using `tweetnacl`
- Session-based authentication with PostgreSQL store
- Input validation using Zod schemas
- Rate limiting and CORS protection

### Privacy
- **Personal use only** - no third-party user accounts
- Encrypted storage of sensitive financial data
- Local development environment by default
- No data sharing or external analytics

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific app tests
npm run test --workspace=apps/server
npm run test --workspace=apps/web

# Run tests in watch mode
npm run test:watch --workspace=apps/server
```

---

## 📋 Development Roadmap

### Phase 1: MVP (Current)
- [x] Project setup and architecture
- [x] Database schema and migrations  
- [x] Basic authentication and routing
- [ ] Robinhood CSV import functionality
- [ ] Coinbase API integration
- [ ] Tax calculation engine
- [ ] Budget simulation features

### Phase 2: Core Features
- [ ] Real-time price updates
- [ ] Portfolio analytics and charts
- [ ] Advanced tax scenarios
- [ ] AI advisor integration
- [ ] Mobile-responsive design

### Phase 3: Enhancements
- [ ] Export capabilities (PDF/CSV)
- [ ] DCA simulation tools
- [ ] Multi-currency support
- [ ] Performance benchmarking

---

## 🚨 Known Issues & Limitations

- **Personal use only** - not designed for multi-user scenarios
- **US tax focus** - currently supports US federal and select states
- **Manual Robinhood sync** - requires CSV download and upload
- **Rate limits** - external APIs have usage restrictions
- **Demo mode** - some features use mock data during development

---

## 📚 API Documentation

### Authentication Endpoints
```typescript
POST /api/auth/login
POST /api/auth/logout  
GET /api/auth/me
```

### Portfolio Endpoints
```typescript
GET /api/portfolio/summary      // Portfolio overview
GET /api/portfolio/positions    // All positions
POST /api/robinhood/upload      // CSV import
POST /api/coinbase/sync         // Sync balances
```

### Finance Endpoints
```typescript
POST /api/salary/calc           // Tax calculation
POST /api/budget/scenario       // Budget analysis
POST /api/advisor               // AI insights
```

---

## 🤝 Contributing

This is a personal project, but contributions and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚖️ Legal & Disclaimer

> **⚠️ Important**: FinSight is for **educational purposes only**.  
> This application does **not** provide financial advice.  
> All investment decisions are your responsibility.  
> Past performance does not guarantee future results.

---

## 📧 Support

For questions or issues:
1. Check the existing issues in the repository
2. Create a new issue with detailed information
3. Include relevant logs and environment details

---

## 🏷 License

This project is licensed as **UNLICENSED** - for personal use only.

---

**Built with ❤️ for personal finance enthusiasts**

*Happy investing! 📈*