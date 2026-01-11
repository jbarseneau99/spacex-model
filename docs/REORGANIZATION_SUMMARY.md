# Project Reorganization Summary

**Date**: 2026-01-11

## Overview

The project directory has been reorganized to improve clarity and maintainability. All files have been preserved - nothing was deleted, only moved to an archive directory.

## New Structure

### Root Directory (Clean)
**Core Application Files:**
- `server.js` - Express server
- `calculation-engine.js` - Primary calculation engine
- `valuation-algorithms.js` - Legacy algorithms (for comparison)
- `formula-engine.js` - Formula execution
- `mach33lib.js` - Financial Greeks library
- `package.json` / `package-lock.json` - Dependencies

**Active Documentation:**
- `README.md` - Project overview
- `TOOL_DESCRIPTION.md` - Complete tool documentation
- `EXCEL_INPUTS_COMPLETE_ANALYSIS.md` - Excel inputs analysis
- `PROJECT_STRUCTURE.md` - Project structure guide
- `REORGANIZATION_SUMMARY.md` - This file

**Key Data Files:**
- `excel_parsed_detailed.json` - Parsed Excel data (used by code)
- `model_structure.json` - Model structure metadata (used by code)
- `SpaceX Valuation Model (ARK x Mach33) (2).xlsx` - Original spreadsheet

### Directories

**`js/`** - Frontend JavaScript
- `app.js` - Main application logic

**`css/`** - Stylesheets
- `main.css` - Main stylesheet

**`public/`** - Public assets
- `index.html` - Main HTML
- `js/` - Frontend JS files
- `css/` - Frontend CSS files
- `33fg_logo.png` - Logo

**`data/`** - Application data
- `earth-bandwidth-tam.json` - TAM lookup table

**`scripts/`** - Active utility scripts
- `regenerate-tam-data.js` - Regenerate TAM data
- `seed-scenarios.js` - Seed database scenarios
- `test-calculations-against-spreadsheet.js` - Validation tests
- `calibrate-to-spreadsheet.js` - Calibration tool
- `analyze-excel-inputs.js` - Input analysis
- `comprehensive-system-test.js` - System tests
- `tests/` - Parameter test scripts (organized)

**`services/`** - Service modules
- `factor-models.js` - Factor risk models

**`db/models/`** - Database models
- Mongoose schemas

**`api/routes/`** - API routes
- Route handlers

**`archive/`** - Archived files (preserved for reference)
- `analysis/` - Analysis outputs
- `documentation/` - Old documentation (25 files)
- `scripts/` - Deprecated scripts (15 files)
- `data/` - Analysis data outputs (8 files)

## What Was Moved

### To `archive/data/` (8 files)
- Analysis JSON outputs (formula categorization, business algorithms mapping, etc.)
- CSV inventory files
- Test output files

### To `archive/documentation/` (25 files)
- Planning documents (FORMULA_RECONCILIATION_PLAN.md, etc.)
- Analysis documents (FORMULA_ANALYSIS_DETAILED.md, etc.)
- Implementation guides (ALGORITHM_IMPLEMENTATION.md, etc.)
- Comparison documents (GREEKS_VS_FACTORS_COMPARISON.md, etc.)
- Test result summaries

### To `archive/scripts/` (15 files)
- One-off analysis scripts (analyze-all-formulas.js, etc.)
- Categorization scripts (categorize-by-context.js, etc.)
- Mapping scripts (map-to-business-algorithms.js, etc.)
- Extraction scripts (extract-tam-data.js, etc.)

### To `scripts/tests/` (50+ files)
- Parameter test scripts (test-*-spreadsheet.js, test-*.js)
- Organized by parameter name

## Benefits

1. **Cleaner Root Directory** - Only essential files visible
2. **Better Organization** - Related files grouped together
3. **Preserved History** - All files archived, nothing deleted
4. **Easier Navigation** - Clear structure for new developers
5. **Maintained Functionality** - All active code remains functional

## Next Steps

- Review archived files periodically
- Consider removing truly obsolete files after 6 months
- Keep `archive/` directory for reference but exclude from git (via .gitignore)

## Notes

- All archived files are preserved and can be restored if needed
- Active code paths remain unchanged
- Documentation references may need updating if they point to archived files
