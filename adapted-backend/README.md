# AdaptED Backend API

A Node.js backend API with Express and PostgreSQL for the AdaptED learning platform, featuring a comprehensive 6-step onboarding process.

For a file-by-file explanation of the original backend and the current updates, see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).

## Features

- **6-Step Onboarding Process**: Complete user onboarding with personalized learning preferences
- **PostgreSQL Database**: Migrated from MongoDB to PostgreSQL with Sequelize ORM
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive validation using express-validator
- **Security**: Helmet for security headers, CORS configuration
- **Logging**: Morgan for HTTP request logging

## Onboarding Steps

1. **Step 1**: Username selection
2. **Step 2**: Learning goals selection (multiple choice)
3. **Step 3**: Email, password, and confirm password
4. **Step 4**: Interests selection (multiple choice)
5. **Step 5**: Experience level selection
6. **Step 6**: Theme preference and onboarding completion

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adapted-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update the database credentials and JWT secret
   ```bash
   cp .env.example .env
   ```

4. **Database Setup**
   - Ensure PostgreSQL is running.
   - Run `npm run db:migrate` to create or update the schema.
   - Keep `DB_SYNC=false`; model synchronization is an explicit local-only escape hatch.
   - Keep `DB_SYNC_ALTER=false` unless a deliberate local-only schema alteration is required.

5. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)

### Onboarding
- `POST /api/onboarding/complete` - Complete entire onboarding flow in single request
- `GET /api/onboarding/` - Get onboarding data (if authenticated) or available options

### Health Check
- `GET /api/health` - Server health check

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `adapted.quantana.top` |
| `DB_NAME` | Database name | `adapted` |
| `DB_USER` | Database username | `adaptedadmin` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_PORT` | Database port | `5432` |
| `JWT_SECRET` | JWT signing secret | `your_secret_key` |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | CORS origin | `http://localhost:3000` |
| `DB_SYNC` | Enable model synchronization for local development | `true` |
| `DB_SYNC_ALTER` | Allow Sequelize to alter existing tables | `false` |

Multiple CORS origins can be supplied as a comma-separated list. The health endpoint returns
HTTP `503` when PostgreSQL is unavailable. Catalog scraping requires an authenticated `admin`
or `moderator` account.

Coursera scraping uses Puppeteer and configurable retry/timeouts through
`SCRAPER_NAVIGATION_TIMEOUT_MS`, `SCRAPER_RESULTS_TIMEOUT_MS`, and `SCRAPER_MAX_RETRIES`.
Set `PUPPETEER_EXECUTABLE_PATH` when the deployment provides its own Chrome executable.

## User Roles

- **admin**: Full access to all endpoints
- **moderator**: Limited administrative access
- **user**: Basic user access

## Response Format

All API responses follow this format:

```json
{
  "status": "success|error",
  "message": "Response message",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "data": {} // Optional data object
}
```

## Error Handling

The application includes comprehensive error handling:

- Input validation errors
- Authentication/authorization errors
- Database errors
- Custom application errors

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS configuration
- Security headers with Helmet
- Input validation and sanitization
- Rate limiting ready (can be added)

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run db:migrate` - Apply pending database migrations
- `npm test` - Run tests

### Adding New Routes

1. Create a new controller in `controllers/`
2. Create a new route file in `routes/`
3. Add the route to `server.js`
4. Add any necessary middleware
5. Update this README

## Testing

Run tests with:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License
