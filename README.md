# SpaceX Valuation Model Platform

A web-based platform for analyzing and visualizing SpaceX valuation models, built with Node.js and Express.

## Features

- Interactive valuation model visualization
- Excel data parsing and analysis
- RESTful API for model data access
- Modern web interface

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "SpaceX Model"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the server:
```bash
npm start
```

The application will be available at `http://localhost:2999`

## Project Structure

```
SpaceX Model/
├── api/              # API routes
├── css/              # Stylesheets
├── db/               # Database models
├── js/               # Frontend JavaScript
├── public/           # Static assets
├── scripts/          # Utility scripts
├── services/         # Business logic services
├── server.js         # Express server entry point
└── package.json      # Dependencies and scripts
```

## Development

Run the development server:
```bash
npm run dev
```

## API Endpoints

- `GET /api/sheets` - Get all model sheets
- Additional endpoints documented in the API routes

## License

MIT




