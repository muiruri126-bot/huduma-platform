# Huduma Platform

A multi-category service marketplace connecting service seekers with providers across Kenya and East Africa.

## Overview

Huduma Platform enables users to find and hire trusted service providers across 19+ categories including house help, plumbing, electrical work, tutoring, catering, and more. The platform features OTP-based phone authentication, real-time messaging, listing management, and a review system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | Flutter (Dart) — cross-platform (Android, iOS, Web) |
| **Backend API** | NestJS (TypeScript) with Prisma ORM |
| **Database** | PostgreSQL (Neon — cloud-hosted) |
| **Cache** | Redis (Upstash — cloud-hosted) |
| **Auth** | JWT + OTP via SMS (Africa's Talking) |
| **Real-time** | WebSocket (Socket.IO via NestJS Gateway) |

## Project Structure

```
Business/
├── platform/              # NestJS backend API
│   ├── prisma/            # Database schema & migrations
│   └── src/               # API source code
│       ├── auth/          # OTP + JWT authentication
│       ├── listings/      # Service listings CRUD
│       ├── applications/  # Job applications
│       ├── chat/          # Real-time messaging
│       ├── reviews/       # Rating & review system
│       ├── profiles/      # User profiles
│       ├── categories/    # Service categories
│       ├── notifications/ # Push notifications
│       ├── verification/  # ID verification
│       ├── upload/        # File uploads
│       └── admin/         # Admin panel API
├── platform_mobile/       # Flutter mobile app
│   └── lib/
│       ├── features/      # Feature modules (auth, home, listings, etc.)
│       ├── core/          # DI, networking, interceptors
│       ├── config/        # Theme, routes, constants
│       └── shared/        # Models, shared widgets
└── PLATFORM_ARCHITECTURE.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Flutter SDK 3.x
- PostgreSQL database (or Neon account)
- Redis instance (or Upstash account)

### Backend Setup

```bash
cd platform
npm install
cp .env.example .env    # Configure your environment variables
npx prisma generate
npx prisma migrate deploy
npx prisma db seed      # Seeds 19 service categories
npm run start:dev
```

The API starts at `http://localhost:3000/api/v1`.

### Mobile App Setup

```bash
cd platform_mobile
flutter pub get
flutter run -d chrome   # Web
flutter run              # Android/iOS
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | Token expiry (e.g., `7d`) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry (e.g., `30d`) |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `OTP_LENGTH` | OTP digit count (default: 6) |
| `OTP_EXPIRY_SECONDS` | OTP validity period |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | Africa's Talking username |
| `AT_SENDER_ID` | SMS sender ID |

## API Endpoints

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | OTP send/verify, token refresh |
| Users | `/api/v1/users` | User management |
| Profiles | `/api/v1/profiles` | Profile CRUD |
| Categories | `/api/v1/categories` | Service categories |
| Listings | `/api/v1/listings` | Create/search/manage listings |
| Applications | `/api/v1/applications` | Apply to listings |
| Reviews | `/api/v1/reviews` | Rating & reviews |
| Chat | `/api/v1/chat` | Conversations & messages |
| Notifications | `/api/v1/notifications` | User notifications |
| Upload | `/api/v1/upload` | File uploads |
| Verification | `/api/v1/verification` | ID verification |
| Admin | `/api/v1/admin` | Admin operations |

## Service Categories

House Help, Babysitter/Nanny, Cleaning, Electrician, Plumber, Carpenter, Painter, Mason, Gardener/Landscaper, Mechanic, Tutor, Catering/Chef, Laundry, Security Guard, Driver, Mover, Tailor/Seamstress, Beautician/Barber, General Handyman.

## Deployment

The backend is configured for Railway deployment. See `platform/Procfile` and `platform/railway.json`.

## License

MIT
