# ARCA SOAP API

Backend service for SOAP integration with ARCA systems.

## � Features

- Express.js with TypeScript
- SOAP API integration
- Database connectivity with ODBC
- Development environment with hot reload
- Colored console output
- Environment configuration

## � Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Database with ODBC driver

## �️ Installation

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

## �‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## � Project Structure

```
src/
├── index.ts                 # Application entry point
├── server.ts               # Express server configuration
├── router.ts               # API routes
├── backend-resources/
│   └── models/
│       ├── Database.ts     # Database model
│       └── Response.ts     # Response model
├── middleware/             # Express middleware
└── modules/
    └── database/
        └── db-init.ts      # Database initialization
```

## � Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run clean` - Clean build directory

## � Environment Variables

Create a `.env` file in the root directory with:

```env
NODE_ENV=development
PORT=3000
DB_CONNECTION_STRING=your_database_connection_string
```

## � Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## � License

This project is licensed under the ISC License.
