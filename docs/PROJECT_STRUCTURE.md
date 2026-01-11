# Project Structure

## Core Application Files (Root)

- `server.js` - Express server and API endpoints
- `calculation-engine.js` - Standalone calculation logic (primary calculation engine)
- `valuation-algorithms.js` - Valuation algorithms (legacy, for comparison)
- `formula-engine.js` - Formula execution engine
- `mach33lib.js` - Financial Greeks calculation library
- `package.json` - Node.js dependencies
- `README.md` - Quick start guide (all other docs in `docs/` directory)

## Directories

### `js/`
- `app.js` - Frontend application logic

### `css/`
- `main.css` - Main stylesheet

### `public/`
- `index.html` - Main HTML file
- `js/` - Frontend JavaScript files
- `css/` - Frontend CSS files
- `33fg_logo.png` - Logo

### `data/`
- `earth-bandwidth-tam.json` - TAM lookup table data

### `scripts/`
- Active utility scripts (see `scripts/README.md`)
- `tests/` - Parameter test scripts

### `services/`
- `factor-models.js` - Factor risk models

### `db/models/`
- Database models (Mongoose schemas)

### `api/routes/`
- API route handlers

### `docs/`
- **All documentation** (37 files)
- `TOOL_DESCRIPTION.md` - Complete tool documentation
- `PROJECT_STRUCTURE.md` - This file
- Planning, analysis, and implementation documents

### `archive/`
- Archived files (analysis outputs, deprecated scripts, old data)
- See `archive/README.md` for details

## Key Data Files

- `excel_parsed_detailed.json` - Parsed Excel spreadsheet data (used by code)
- `model_structure.json` - Model structure metadata (used by code)
- `SpaceX Valuation Model (ARK x Mach33) (2).xlsx` - Original Excel spreadsheet

## Documentation

All documentation is in the `docs/` directory:
- `README.md` - Documentation directory guide
- `TOOL_DESCRIPTION.md` - Complete tool documentation
- `PROJECT_STRUCTURE.md` - This file
- `EXCEL_INPUTS_COMPLETE_ANALYSIS.md` - Excel inputs analysis
- Plus 33 additional planning, analysis, and implementation documents

The root `README.md` contains a quick start guide.
