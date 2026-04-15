# Digital Katha - Frontend

Angular 19 frontend for the **Kirana Credit App** (Digital Khata Book) — a digital ledger for small Indian shopkeepers to track customer credit/debit transactions.

Redesigned with the **IBM Carbon Design System** for a clean, professional enterprise UI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 19.2 (Standalone Components) |
| Language | TypeScript 5.x |
| Styling | SCSS + Carbon Design tokens |
| Font | IBM Plex Sans / IBM Plex Mono |
| HTTP | Angular HttpClient + JWT interceptor |
| Build | Angular CLI / esbuild |

---

## Prerequisites

- **Node.js 18+** (tested on v25.6.0)
- **npm 9+**
- **Backend API** running at `http://localhost:8081` (see [backend repo](https://github.com/sunkararambabu11/backenddigital-katha))

---

## Setup

### 1. Clone

```bash
git clone https://github.com/sunkararambabu11/digitalkatha-frontend.git
cd digitalkatha-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the backend

Make sure the backend API is running on port 8081 before starting the frontend. See the [backend README](https://github.com/sunkararambabu11/backenddigital-katha#readme) for setup instructions.

### 4. Run

```bash
ng serve
```

Open **http://localhost:4200**. The app auto-reloads on file changes.

---

## Features

### Core
- **User Registration & Login** — JWT-based authentication, mobile number as username
- **Customer Management** — Add, edit, delete customers with opening balance, description, mobile
- **Transaction Ledger** — Record DEBIT (customer owes you) and CREDIT (customer paid you) entries
- **Running Balance** — Auto-calculated per customer with color-coded display (red = owes, green = paid)
- **Dashboard** — Overview with total outstanding, today's activity, top debtors, recent transactions, monthly chart
- **PDF Reports** — Download all customers or filtered transaction reports as PDF

### UX Enhancements
- **Search & Sort** — Filter customers and transactions by name, type, date
- **Pagination** — All list pages paginated
- **Customer Detail Page** — Click a customer to see full ledger with balance history
- **Toast Notifications** — Success/error feedback for all actions
- **Shared Layout** — Persistent header + navigation across all pages
- **Floating AI Chat Widget** — Multi-conversation AI assistant (FAB button, mini/fullscreen modes)

### Design System
- **IBM Carbon Design** — Sharp corners, Gray 100 header, Blue 60 interactive elements, bottom-border inputs
- **IBM Plex Sans** for all UI text, **IBM Plex Mono** for numeric/metric values
- **Carbon motion tokens** — 110ms fast, 150ms moderate (no bouncy animations)
- **8px spacing grid** throughout

---

## Pages & Routes

| Route | Component | Description | Auth |
|-------|-----------|-------------|------|
| `/login` | LoginComponent | Login with mobile + password | No |
| `/signup` | SignupComponent | Register new shop account | No |
| `/dashboard` | DashboardComponent | Overview stats, charts, recent activity | Yes |
| `/customers` | CustomersComponent | Customer list with search, sort, add/edit/delete | Yes |
| `/customers/:id` | CustomerDetailComponent | Single customer ledger + transactions | Yes |
| `/transactions` | TransactionsComponent | All transactions with filters | Yes |
| `/reports` | ReportsComponent | PDF download page | Yes |

---

## Project Structure

```
src/
  styles.scss                           # Global Carbon Design tokens & styles
  app/
    app.component.ts                    # Root component
    app.config.ts                       # App configuration
    app.routes.ts                       # Route definitions
    guards/
      auth.guard.ts                     # JWT auth route guard
    models/
      user.model.ts                     # User, LoginRequest/Response, SignupRequest/Response
      customer.model.ts                 # Customer, CustomerRequest
      transaction.model.ts              # Transaction, TransactionRequest, DashboardSummary
    services/
      auth.service.ts                   # Login, signup, logout, token management
      api.service.ts                    # All API calls (customers, transactions, dashboard, PDF)
      toast.service.ts                  # Toast notification service
      ai-chat.service.ts               # AI chat with multi-conversation support
    components/
      layout/                           # Shared shell (Carbon header + subnav + profile panel)
      login/                            # Login page
      signup/                           # Registration page
      dashboard/                        # Dashboard with summary API integration
      customers/                        # Customer list (search, sort, paginate, CRUD)
      customer-detail/                  # Single customer view + transaction ledger
      transactions/                     # All transactions list with filters
      reports/                          # PDF report downloads
      toast/                            # Toast notification UI
      chat-widget/                      # Floating AI chat (FAB + mini + fullscreen)
      ai-chat/                          # Full-page AI chat view
```

---

## API Connection

The frontend connects to the backend at `http://localhost:8081/api`. This is configured in:

- `src/app/services/auth.service.ts` — `apiUrl = 'http://localhost:8081/api/auth'`
- `src/app/services/api.service.ts` — `apiUrl = 'http://localhost:8081/api'`

To change the API URL, update both files.

### API Endpoints Used

| Service Method | Endpoint | Description |
|---------------|----------|-------------|
| `auth.login()` | POST `/api/auth/login` | Login (username = mobile) |
| `auth.signup()` | POST `/api/auth/register` | Register new user |
| `api.getCustomers()` | GET `/api/customers` | List customers |
| `api.createCustomer()` | POST `/api/customers` | Create customer |
| `api.getCustomerById()` | GET `/api/customers/:id` | Get single customer |
| `api.updateCustomer()` | PUT `/api/customers/:id` | Update customer |
| `api.deleteCustomer()` | DELETE `/api/customers/:id` | Delete customer |
| `api.getTransactions()` | GET `/api/transactions/customer/:id` | Customer transactions |
| `api.createTransaction()` | POST `/api/transactions` | Create transaction |
| `api.updateTransaction()` | PUT `/api/transactions/:id` | Update transaction |
| `api.deleteTransaction()` | DELETE `/api/transactions/:id` | Delete transaction |
| `api.getDashboardSummary()` | GET `/api/dashboard/summary` | Full dashboard data |
| `api.downloadCustomersPdf()` | GET `/api/pdf/customers` | All customers PDF |
| `api.downloadTransactionsPdf()` | POST `/api/pdf/transactions` | Filtered transactions PDF |

---

## Build

```bash
ng build
```

Production output goes to `dist/`. Bundle size: ~578 kB (initial).

---

## Design Tokens Reference

### Colors (Carbon-based)
| Token | Value | Usage |
|-------|-------|-------|
| `$carbon-gray-100` | `#161616` | Header background |
| `$carbon-gray-90` | `#262626` | Header hover |
| `$carbon-gray-80` | `#393939` | Borders on dark |
| `$carbon-gray-50` | `#8d8d8d` | Secondary text |
| `$carbon-gray-30` | `#c6c6c6` | Disabled |
| `$carbon-gray-20` | `#e0e0e0` | Borders |
| `$carbon-gray-10` | `#f4f4f4` | Page background |
| `$carbon-blue-60` | `#0f62fe` | Primary interactive |
| `$carbon-blue-70` | `#0043ce` | Primary hover |
| `$carbon-red-60` | `#da1e28` | Danger/debit |
| `$carbon-green-50` | `#24a148` | Success/credit |

### Spacing (8px grid)
`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`

### Motion
- Fast: `110ms` (hover, toggle)
- Moderate: `150ms` (expand, slide)
- Easing: `cubic-bezier(0.2, 0, 0.38, 0.9)`

---

## Related

- **Backend**: [backenddigital-katha](https://github.com/sunkararambabu11/backenddigital-katha) — Spring Boot 3.4 REST API with MySQL
