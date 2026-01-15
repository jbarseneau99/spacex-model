# Project Rules

## Critical Rules

### 1. NEVER Read from Excel Spreadsheet for Runtime Data

**CRITICAL RULE**: The application MUST NEVER read from the Excel spreadsheet (`excel_parsed_detailed.json`) for runtime calculations or data display.

**Purpose of Spreadsheet**:
- The Excel spreadsheet is ONLY used as a **test reference point**
- Used to verify calculations match expected outputs
- Used for calibration and testing
- Used for documentation and understanding formulas

**What This Means**:
- ✅ All valuations MUST come from model calculations (`/api/calculate`)
- ✅ All data MUST come from user inputs and calculation engine
- ✅ Spreadsheet is reference only - never source of truth for runtime
- ❌ NEVER use `getSpreadsheetCellValue()` for runtime data
- ❌ NEVER read C10, D10, E10 or any cells for display
- ❌ NEVER use spreadsheet values in production code

**Exception**: 
- Spreadsheet reading functions may exist for testing/calibration scripts only
- These should be clearly marked as test-only utilities

**Enforcement**:
- All runtime calculations use `CalculationEngine` class
- All data comes from MongoDB models or user inputs
- Frontend displays only calculated/model data

---

## Other Rules

### Database Rules
- All database relations need to use database ID Object ID -- no matching strings!!!

### UI/UX Rules
- All UI changes must work in BOTH free mode (floating windows) and fixed mode (GoldenLayout)
- Every popup or modal that uses AI should have a settings icon in the header
- Any time AI or internet is called, the mach33 AI progress modal should be shown
- Only use Lucide icons or custom ones the developer provides

### Testing Rules
- When adding new functionality or fixing errors, make sure everything is tested
- Use the fix-test-assess cycle until change is working properly
- Ask user to confirm it is working

### Scripts
- When building a temporary script, place it in ./scripts





























