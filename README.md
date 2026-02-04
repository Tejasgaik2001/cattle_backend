# MyCowFarm API

A comprehensive dairy farm management RESTful API built with NestJS, TypeORM, and PostgreSQL.

## Features

- **Authentication**: JWT-based authentication with access/refresh tokens
- **Multi-tenant Farm Management**: Users can own or work on multiple farms
- **Herd Management**: Complete cow lifecycle tracking
- **Event Logging**: Health, vaccination, breeding, and general notes
- **Milk Production Tracking**: Daily AM/PM milk records with analytics
- **Financial Management**: Income/expense tracking with reporting
- **Dashboard & Alerts**: Real-time farm overview and smart notifications

## Tech Stack

- **Framework**: NestJS v11
- **Database**: PostgreSQL with TypeORM
- **Authentication**: Passport.js with JWT
- **Validation**: class-validator & class-transformer
- **API Documentation**: Swagger (OpenAPI)
- **Language**: TypeScript

## 📖 API Documentation (Swagger)

Once the server is running, you can access the interactive API documentation at:

**http://localhost:3000/api/docs**

The Swagger UI provides:
- Interactive API testing
- Request/response examples  
- Authentication support (add your JWT token)
- All endpoints organized by tags

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=postgres
   DB_DATABASE=mycowfarm

   # JWT
   JWT_SECRET=your-secret-key-change-in-production

   # App
   PORT=3000
   NODE_ENV=development
   ```

4. Start PostgreSQL and create the database:
   ```sql
   CREATE DATABASE mycowfarm;
   ```

5. Run the application:
   ```bash
   # Development
   npm run start:dev

   # Production
   npm run build
   npm run start:prod
   ```

6. (Optional) Seed sample data:
   ```bash
   npm run seed
   ```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get current user |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get profile |
| PATCH | `/api/v1/users/me` | Update profile |

### Farms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/farms` | Create farm |
| GET | `/api/v1/farms` | List user's farms |
| GET | `/api/v1/farms/:farmId` | Get farm details |
| PATCH | `/api/v1/farms/:farmId` | Update farm (owner only) |
| DELETE | `/api/v1/farms/:farmId` | Delete farm (owner only) |
| GET | `/api/v1/farms/:farmId/members` | List farm members |
| POST | `/api/v1/farms/:farmId/invitations` | Invite member (owner only) |
| DELETE | `/api/v1/farms/:farmId/members/:memberId` | Remove member (owner only) |

### Invitations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/invitations/:token` | Get invitation details |
| POST | `/api/v1/invitations/:token/accept` | Accept invitation |

### Cows (Herd Management)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/farms/:farmId/cows` | Add cow |
| GET | `/api/v1/farms/:farmId/cows` | List cows (with filters) |
| GET | `/api/v1/farms/:farmId/cows/stats` | Get herd statistics |
| GET | `/api/v1/farms/:farmId/cows/active-females` | Get active female cows |
| GET | `/api/v1/farms/:farmId/cows/:cowId` | Get cow details |
| PATCH | `/api/v1/farms/:farmId/cows/:cowId` | Update cow |
| PATCH | `/api/v1/farms/:farmId/cows/:cowId/lifecycle` | Update lifecycle status |
| DELETE | `/api/v1/farms/:farmId/cows/:cowId` | Delete cow (owner only) |

### Cow Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/farms/:farmId/cows/:cowId/events` | Add event |
| GET | `/api/v1/farms/:farmId/cows/:cowId/events` | List events |
| GET | `/api/v1/farms/:farmId/cows/:cowId/events/recent` | Get timeline |
| GET | `/api/v1/farms/:farmId/cows/:cowId/events/counts` | Event counts by type |
| GET | `/api/v1/farms/:farmId/cows/:cowId/events/:eventId` | Get event |
| PATCH | `/api/v1/farms/:farmId/cows/:cowId/events/:eventId` | Update event |
| DELETE | `/api/v1/farms/:farmId/cows/:cowId/events/:eventId` | Delete event |

### Milk Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/farms/:farmId/milk-records` | Add record |
| POST | `/api/v1/farms/:farmId/milk-records/bulk` | Bulk add records |
| GET | `/api/v1/farms/:farmId/milk-records` | List records |
| GET | `/api/v1/farms/:farmId/milk-records/today` | Today's stats |
| GET | `/api/v1/farms/:farmId/milk-records/:recordId` | Get record |
| PATCH | `/api/v1/farms/:farmId/milk-records/:recordId` | Update record |
| DELETE | `/api/v1/farms/:farmId/milk-records/:recordId` | Delete record |

### Financial (Owner Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/farms/:farmId/financial/transactions` | Add transaction |
| GET | `/api/v1/farms/:farmId/financial/transactions` | List transactions |
| GET | `/api/v1/farms/:farmId/financial/overview` | Financial overview |
| GET | `/api/v1/farms/:farmId/financial/expense-breakdown` | Expense by category |
| GET | `/api/v1/farms/:farmId/financial/transactions/:id` | Get transaction |
| PATCH | `/api/v1/farms/:farmId/financial/transactions/:id` | Update transaction |
| DELETE | `/api/v1/farms/:farmId/financial/transactions/:id` | Delete transaction |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/farms/:farmId/dashboard/summary` | Farm summary |
| GET | `/api/v1/farms/:farmId/dashboard/alerts` | Active alerts |

## Data Models

### User
- Email, password (hashed), name, phone, photo, language preference

### Farm
- Name, location, description
- Members with roles (owner/worker)

### Cow
- Tag ID (unique per farm), name, gender, breed
- Birth date, acquisition date/source
- Lifecycle status (active/sold/deceased)
- Mother reference for lineage

### Cow Events
- Types: HEALTH, VACCINATION, BREEDING, NOTE, FINANCIAL
- Structured metadata (JSONB) for type-specific data

### Milk Records
- Per cow, per date, per milking time (AM/PM)
- Amount in liters

### Financial Transactions
- Types: expense, income
- Categories: Feed, Veterinary, Breeding/AI, Labor, Utilities, Milk Sales, etc.

## Role-Based Access

| Feature | Owner | Worker |
|---------|-------|--------|
| View farm data | ✅ | ✅ |
| Add/edit cows | ✅ | ✅ |
| Add events | ✅ | ✅ |
| Add milk records | ✅ | ✅ |
| View financials | ✅ | ❌ |
| Manage financials | ✅ | ❌ |
| Invite members | ✅ | ❌ |
| Delete farm | ✅ | ❌ |

## Test Accounts (after seeding)

- **Owner**: owner@example.com / password123
- **Worker**: worker@example.com / password123

## Development

```bash
# Run in development mode with hot reload
npm run start:dev

# Run tests
npm run test

# Run linting
npm run lint

# Build for production
npm run build
```

## Project Structure

```
src/
├── common/           # Shared utilities, decorators, guards, filters
├── config/           # Configuration modules
├── database/         # Migrations and seeds
├── dto/              # Data Transfer Objects
├── entities/         # TypeORM entities
├── modules/          # Feature modules
│   ├── auth/         # Authentication
│   ├── users/        # User management
│   ├── farms/        # Farm & invitation management
│   ├── cows/         # Herd management
│   ├── cow-events/   # Event logging
│   ├── milk-records/ # Milk production tracking
│   ├── financial/    # Financial management
│   └── dashboard/    # Dashboard & alerts
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

## License

UNLICENSED - Private project
