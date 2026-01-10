/**
 * Valuation Algorithms Module
 * 
 * Reverse-engineered from spreadsheet formulas to ensure we capture all logical steps.
 * These are JavaScript implementations of the unique formula patterns found in the Excel model.
 * 
 * Key Patterns Identified:
 * - Earth: 7,705 formulas → 100 unique templates
 * - Mars: 1,038 formulas → 37 unique templates
 */

class ValuationAlgorithms {
  constructor(excelData) {
    this.excelData = excelData;
    this.cache = new Map();
  }

  /**
   * Get cell value from Excel data
   */
  getCellValue(sheetName, cellRef) {
    const cacheKey = `${sheetName}!${cellRef}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const sheet = this.excelData[sheetName];
      if (!sheet || !sheet.cells) return null;

      const cell = sheet.cells[cellRef];
      if (!cell) return null;

      const value = typeof cell === 'object' && 'value' in cell ? cell.value : cell;
      this.cache.set(cacheKey, value);
      return value;
    } catch (error) {
      console.warn(`Error getting cell ${sheetName}!${cellRef}:`, error);
      return null;
    }
  }

  /**
   * Set cell value (for calculated results)
   */
  setCellValue(sheetName, cellRef, value) {
    const cacheKey = `${sheetName}!${cellRef}`;
    this.cache.set(cacheKey, value);
  }

  /**
   * PATTERN 1: Direct Reference
   * Formula: =O153
   * Usage: 2,124 times in Earth sheet
   */
  directReference(sourceCell) {
    return this.getCellValue('Earth', sourceCell);
  }

  /**
   * PATTERN 2: Simple Arithmetic
   * Formula: =B7*B8, =A1+B1, =A1-B1, =A1/B1
   * Usage: 697 times (multiplication), 296 times (addition)
   */
  multiply(a, b) {
    return (a || 0) * (b || 0);
  }

  add(a, b) {
    return (a || 0) + (b || 0);
  }

  subtract(a, b) {
    return (a || 0) - (b || 0);
  }

  divide(a, b) {
    if (!b || b === 0) return 0;
    return (a || 0) / b;
  }

  /**
   * PATTERN 3: SUM Range
   * Formula: =SUM(O116:O118), =SUM(I20:I21)
   * Usage: 375 times in Earth, 130 times in Mars
   */
  sumRange(sheetName, startCell, endCell) {
    const [startCol, startRow] = this.parseCellRef(startCell);
    const [endCol, endRow] = this.parseCellRef(endCell);
    
    let sum = 0;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellRef = this.cellRefFromColRow(col, row);
        const value = this.getCellValue(sheetName, cellRef);
        if (typeof value === 'number') {
          sum += value;
        }
      }
    }
    return sum;
  }

  /**
   * PATTERN 4: IF Statement
   * Formula: =IF(J245="Starlink Constellation Complete",J267,J398)
   * Usage: 1,692 times in Earth, 130 times in Mars
   */
  ifStatement(condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
  }

  /**
   * PATTERN 5: Cross-Sheet Reference
   * Formula: =Mars!K54, =Earth!O153
   * Usage: Common pattern for linking sheets
   */
  crossSheetReference(sheetName, cellRef) {
    return this.getCellValue(sheetName, cellRef);
  }

  /**
   * CORE ALGORITHM: Calculate Earth Valuation (O153)
   * 
   * Formula breakdown:
   * O153 = O119 - O144 - O152
   *   O119 = SUM(O116:O118)  [Total Revenue Components]
   *   O144 = SUM(O142:O143)  [Total Cost Components]
   *   O152 = (O146 + O150) * O119  [Tax/Expense Rate × Revenue]
   */
  calculateEarthValuation(scenario = 'base') {
    const col = scenario === 'optimistic' ? 'Y' : 'O';
    
    // O119 = SUM(O116:O118) - Total Revenue
    const o116 = this.getCellValue('Earth', `${col}116`);
    const o117 = this.getCellValue('Earth', `${col}117`);
    const o118 = this.getCellValue('Earth', `${col}118`);
    const o119 = this.add(this.add(o116 || 0, o117 || 0), o118 || 0);
    
    // O144 = SUM(O142:O143) - Total Costs
    const o142 = this.getCellValue('Earth', `${col}142`);
    const o143 = this.getCellValue('Earth', `${col}143`);
    const o144 = this.add(o142 || 0, o143 || 0);
    
    // O152 = (O146 + O150) * O119 - Tax/Expense Rate × Revenue
    const o146 = this.getCellValue('Earth', `${col}146`);
    const o150 = this.getCellValue('Earth', `${col}150`);
    const o152 = this.multiply(this.add(o146 || 0, o150 || 0), o119);
    
    // O153 = O119 - O144 - O152 - Final Valuation
    const o153 = this.subtract(this.subtract(o119, o144), o152);
    
    // Convert to billions
    return o153 / 1e9;
  }

  /**
   * CORE ALGORITHM: Calculate Mars Valuation (K54)
   * 
   * Formula breakdown:
   * K54 = K53 + J54 * (1 - 1/$B54)
   *   K53 = K44 * K52
   *     K44 = $F44 * (1 + $B52)^(LOG(COLUMN()-COLUMN($F44)+1, 2))
   *     K52 = SUM($F47:K47) - OFFSET(...)
   */
  calculateMarsValuation(scenario = 'base') {
    const col = scenario === 'optimistic' ? 'U' : 'K';
    
    // Try to get K54 directly first (most reliable)
    const k54 = this.getCellValue('Mars', `${col}54`);
    if (k54 !== null && typeof k54 === 'number') {
      return k54 / 1e9; // Convert to billions
    }
    
    // If not available, calculate from components
    // K53 = K44 * K52
    const k44 = this.getCellValue('Mars', `${col}44`);
    const k52 = this.getCellValue('Mars', `${col}52`);
    const k53 = this.multiply(k44 || 0, k52 || 0);
    
    // J54 component
    const j54 = this.getCellValue('Mars', `J54`);
    
    // B54 (discount factor)
    const b54 = this.getCellValue('Mars', 'B54');
    const discountFactor = b54 ? (1 - 1 / b54) : 0;
    
    // K54 = K53 + J54 * (1 - 1/$B54)
    const k54Calculated = this.add(k53, this.multiply(j54 || 0, discountFactor));
    
    return k54Calculated / 1e9; // Convert to billions
  }

  /**
   * CORE ALGORITHM: Calculate Mars Option Value
   * 
   * Formula: K54 + K8 - K27 (base case) or U54 + U8 - U27 (optimistic)
   * This represents: Cumulative Value + Revenue - Costs
   */
  calculateMarsOptionValue(scenario = 'base') {
    const col = scenario === 'optimistic' ? 'U' : 'K';
    
    const k54 = this.getCellValue('Mars', `${col}54`);
    const k8 = this.getCellValue('Mars', `${col}8`);
    const k27 = this.getCellValue('Mars', `${col}27`);
    
    if (k54 !== null && k8 !== null && k27 !== null) {
      const optionValue = this.add(this.subtract(k54, k27), k8);
      return optionValue / 1e9; // Convert to billions
    }
    
    return null;
  }

  /**
   * Helper: Parse cell reference (e.g., "O153" → [14, 153])
   */
  parseCellRef(cellRef) {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/);
    if (!match) return [0, 0];
    
    const colStr = match[1];
    const row = parseInt(match[2], 10);
    
    // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, etc.)
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    
    return [col, row];
  }

  /**
   * Helper: Convert column number and row to cell reference
   */
  cellRefFromColRow(col, row) {
    let colStr = '';
    let num = col;
    while (num > 0) {
      const remainder = (num - 1) % 26;
      colStr = String.fromCharCode(65 + remainder) + colStr;
      num = Math.floor((num - 1) / 26);
    }
    return `${colStr}${row}`;
  }

  /**
   * PATTERN 6: INDEX/MATCH Lookup
   * Formula: =INDEX(range, MATCH(value, lookup_range, 0))
   * Usage: 631 times in Earth
   */
  indexMatch(lookupValue, lookupRange, returnRange, exactMatch = true) {
    // Simplified implementation - would need full range parsing
    // For now, return null and handle in specific contexts
    return null;
  }

  /**
   * PATTERN 7: MAX/MIN
   * Formula: =MAX(A1:A10), =MIN(A1:A10)
   * Usage: 419 times (MAX), 287 times (MIN) in Earth
   */
  maxRange(sheetName, startCell, endCell) {
    const [startCol, startRow] = this.parseCellRef(startCell);
    const [endCol, endRow] = this.parseCellRef(endCell);
    
    let max = -Infinity;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellRef = this.cellRefFromColRow(col, row);
        const value = this.getCellValue(sheetName, cellRef);
        if (typeof value === 'number' && value > max) {
          max = value;
        }
      }
    }
    return max === -Infinity ? 0 : max;
  }

  minRange(sheetName, startCell, endCell) {
    const [startCol, startRow] = this.parseCellRef(startCell);
    const [endCol, endRow] = this.parseCellRef(endCell);
    
    let min = Infinity;
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cellRef = this.cellRefFromColRow(col, row);
        const value = this.getCellValue(sheetName, cellRef);
        if (typeof value === 'number' && value < min) {
          min = value;
        }
      }
    }
    return min === Infinity ? 0 : min;
  }

  /**
   * PATTERN 8: IFERROR
   * Formula: =IFERROR(value, default)
   * Usage: 207 times in Earth, 26 times in Mars
   */
  ifError(value, defaultValue) {
    try {
      if (value === null || value === undefined || isNaN(value)) {
        return defaultValue;
      }
      return value;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * PATTERN 9: LOG/EXP (for Mars growth calculations)
   * Formula: =LOG(value, base), =EXP(value)
   * Usage: 156 times (LN) in Earth, 51 times (LOG) in Mars, 26 times (EXP) in Mars
   */
  log(value, base = Math.E) {
    if (!value || value <= 0) return 0;
    return Math.log(value) / Math.log(base);
  }

  exp(value) {
    return Math.exp(value);
  }

  /**
   * PATTERN 10: RRI (Rate of Return)
   * Formula: =RRI(nper, pv, fv)
   * Usage: 4 times in Valuation Inputs & Logic
   */
  rri(nper, pv, fv) {
    if (!nper || nper === 0 || !pv || pv === 0) return 0;
    return Math.pow(fv / pv, 1 / nper) - 1;
  }

  /**
   * Clear cache (useful when inputs change)
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = ValuationAlgorithms;




