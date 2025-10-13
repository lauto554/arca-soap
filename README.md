# ARCA SOAP API

Backend service for SOAP integration with ARCA systems.

## íº€ Features

- Express.js with TypeScript
- SOAP API integration
- Database connectivity with ODBC
- Development environment with hot reload
- Colored console output
- Environment configuration

## í³‹ Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Database with ODBC driver

## í» ï¸ Installation

1. Clone the repository:
```bash
git clone https://github.com/lauto554/arca-soap.git
cd arca-soap
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`

## í¿ƒâ€â™‚ï¸ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## í³ Project Structure

```
src/
â”œâ”€â”€ index.ts                 # Application entry point
â”œâ”€â”€ server.ts               # Express server configuration
â”œâ”€â”€ router.ts               # API routes
â”œâ”€â”€ backend-resources/
â”‚   â””â”€â”€ models/
â”‚       â”œâ”€â”€ Database.ts     # Database model
â”‚       â””â”€â”€ Response.ts     # Response model
â”œâ”€â”€ middleware/             # Express middleware
â””â”€â”€ modules/
    â””â”€â”€ database/
        â””â”€â”€ db-init.ts      # Database initialization
```

## í´§ Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory

## í¼ Environment Variables

Create a `.env` file in the root directory with:

```env
NODE_ENV=development
PORT=3000
DB_CONNECTION_STRING=your_database_connection_string
```

## í´ Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## í³ License

This project is licensed under the ISC License.
