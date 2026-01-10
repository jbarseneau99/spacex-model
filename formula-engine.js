/**
 * Excel Formula Execution Engine
 * 
 * This module provides functionality to parse and execute Excel formulas
 * from the SpaceX Valuation Model spreadsheet.
 */

const formulajs = require('formulajs');

class FormulaEngine {
  constructor(excelData) {
    this.excelData = excelData;
    this.cache = new Map();
    this.dependencyGraph = new Map();
    this.executionOrder = [];
  }

  /**
   * Get cell value from spreadsheet
   */
  getCellValue(sheetName, cellRef) {
    const cacheKey = `${sheetName}!${cellRef}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    if (!this.excelData || !this.excelData[sheetName] || !this.excelData[sheetName].cells) {
      return null;
    }

    const cell = this.excelData[sheetName].cells[cellRef];
    if (!cell) {
      return null;
    }

    // If cell has a value, return it
    if (typeof cell === 'object' && 'value' in cell) {
      const value = cell.value;
      this.cache.set(cacheKey, value);
      return value;
    }

    // If cell has a formula, execute it
    if (typeof cell === 'object' && cell.formula) {
      const value = this.executeFormula(sheetName, cellRef, cell.formula);
      this.cache.set(cacheKey, value);
      return value;
    }

    return null;
  }

  /**
   * Parse cell reference (e.g., "A1", "$A$1", "A$1", "$A1")
   */
  parseCellReference(ref) {
    const match = ref.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!match) return null;
    
    const [, colAbs, col, rowAbs, row] = match;
    return {
      col: col,
      row: parseInt(row),
      colAbsolute: colAbs === '$',
      rowAbsolute: rowAbs === '$'
    };
  }

  /**
   * Resolve cell reference to value
   */
  resolveCellReference(sheetName, cellRef, currentSheet, currentRow, currentCol) {
    // Handle cross-sheet references (e.g., "Earth!A1")
    if (cellRef.includes('!')) {
      const [refSheet, refCell] = cellRef.split('!');
      return this.getCellValue(refSheet, refCell);
    }

    // Handle absolute/relative references
    const parsed = this.parseCellReference(cellRef);
    if (!parsed) {
      return null;
    }

    // For now, use direct reference (can be enhanced for relative references)
    return this.getCellValue(sheetName, cellRef);
  }

  /**
   * Parse range reference (e.g., "A1:A10")
   */
  parseRange(range) {
    const [start, end] = range.split(':');
    const startRef = this.parseCellReference(start);
    const endRef = this.parseCellReference(end);
    
    if (!startRef || !endRef) {
      return null;
    }

    // Get all cells in range
    const cells = [];
    const startCol = this.columnToNumber(startRef.col);
    const endCol = this.columnToNumber(endRef.col);
    
    for (let row = startRef.row; row <= endRef.row; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const colLetter = this.numberToColumn(col);
        cells.push(`${colLetter}${row}`);
      }
    }
    
    return cells;
  }

  /**
   * Convert column letter to number (A=1, B=2, ..., Z=26, AA=27, etc.)
   */
  columnToNumber(col) {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
  }

  /**
   * Convert number to column letter
   */
  numberToColumn(num) {
    let col = '';
    while (num > 0) {
      num--;
      col = String.fromCharCode(65 + (num % 26)) + col;
      num = Math.floor(num / 26);
    }
    return col;
  }

  /**
   * Execute Excel formula
   */
  executeFormula(sheetName, cellRef, formula) {
    try {
      // Remove leading =
      if (formula.startsWith('=')) {
        formula = formula.substring(1);
      }

      // Handle simple cell references
      if (/^[A-Z]+\$?\d+$/.test(formula)) {
        return this.resolveCellReference(sheetName, formula, sheetName, null, null);
      }

      // Handle cross-sheet references
      if (formula.includes('!') && /^[A-Z]+\$?\d+$/.test(formula.split('!')[1])) {
        return this.resolveCellReference(sheetName, formula, sheetName, null, null);
      }

      // Handle simple arithmetic (A1+B1, A1*B1, etc.)
      const arithmeticMatch = formula.match(/^([A-Z]+\$?\d+)\s*([+\-*/])\s*([A-Z]+\$?\d+)$/);
      if (arithmeticMatch) {
        const [, left, op, right] = arithmeticMatch;
        const leftVal = this.resolveCellReference(sheetName, left, sheetName, null, null) || 0;
        const rightVal = this.resolveCellReference(sheetName, right, sheetName, null, null) || 0;
        
        switch (op) {
          case '+': return leftVal + rightVal;
          case '-': return leftVal - rightVal;
          case '*': return leftVal * rightVal;
          case '/': return rightVal !== 0 ? leftVal / rightVal : 0;
          default: return null;
        }
      }

      // Handle SUM function
      const sumMatch = formula.match(/^SUM\((.+)\)$/i);
      if (sumMatch) {
        const range = sumMatch[1];
        if (range.includes(':')) {
          // Range: SUM(A1:A10)
          const cells = this.parseRange(range);
          if (cells) {
            return cells.reduce((sum, cell) => {
              const val = this.getCellValue(sheetName, cell) || 0;
              return sum + val;
            }, 0);
          }
        } else {
          // List: SUM(A1,A2,A3)
          const cells = range.split(',').map(c => c.trim());
          return cells.reduce((sum, cell) => {
            const val = this.resolveCellReference(sheetName, cell, sheetName, null, null) || 0;
            return sum + val;
          }, 0);
        }
      }

      // Use formulajs for complex functions
      // Convert Excel formula to JavaScript expression
      const jsExpression = this.convertToJSExpression(formula, sheetName);
      
      if (jsExpression) {
        // Create context with formulajs functions
        const context = {
          ...formulajs,
          // Add custom functions
          getCell: (ref) => this.resolveCellReference(sheetName, ref, sheetName, null, null)
        };
        
        // Evaluate expression (simplified - would need proper parser)
        try {
          // For now, return null and let formulajs handle it
          // This is a placeholder - full implementation would parse the formula properly
          return null;
        } catch (error) {
          console.warn(`Formula execution error for ${sheetName}!${cellRef}: ${formula}`, error);
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error executing formula ${sheetName}!${cellRef}: ${formula}`, error);
      return null;
    }
  }

  /**
   * Convert Excel formula to JavaScript expression (placeholder)
   * Full implementation would use a proper parser
   */
  convertToJSExpression(formula, sheetName) {
    // This is a placeholder - would need full parser implementation
    return null;
  }

  /**
   * Build dependency graph for a sheet
   */
  buildDependencyGraph(sheetName) {
    if (!this.excelData || !this.excelData[sheetName] || !this.excelData[sheetName].cells) {
      return;
    }

    const cells = this.excelData[sheetName].cells;
    const graph = new Map();

    for (const [cellRef, cellData] of Object.entries(cells)) {
      if (typeof cellData === 'object' && cellData.formula) {
        const formula = cellData.formula;
        const dependencies = this.extractDependencies(formula);
        graph.set(cellRef, dependencies);
      }
    }

    this.dependencyGraph.set(sheetName, graph);
    return graph;
  }

  /**
   * Extract cell references from formula
   */
  extractDependencies(formula) {
    const dependencies = [];
    
    // Extract cell references (A1, $A$1, etc.)
    const cellRefs = formula.match(/([A-Z]+\$?\d+)/g);
    if (cellRefs) {
      dependencies.push(...cellRefs);
    }

    // Extract cross-sheet references (Earth!A1)
    const crossSheetRefs = formula.match(/([A-Z]+)![A-Z]+\$?\d+/g);
    if (crossSheetRefs) {
      dependencies.push(...crossSheetRefs);
    }

    return dependencies;
  }

  /**
   * Get key output values
   */
  getKeyOutputs() {
    return {
      earth: {
        o153: this.getCellValue('Earth', 'O153'),
        o119: this.getCellValue('Earth', 'O119'),
        o144: this.getCellValue('Earth', 'O144'),
        o152: this.getCellValue('Earth', 'O152')
      },
      mars: {
        k54: this.getCellValue('Mars', 'K54'),
        k8: this.getCellValue('Mars', 'K8'),
        k27: this.getCellValue('Mars', 'K27'),
        u54: this.getCellValue('Mars', 'U54'),
        u8: this.getCellValue('Mars', 'U8'),
        u27: this.getCellValue('Mars', 'U27')
      }
    };
  }
}

module.exports = FormulaEngine;




