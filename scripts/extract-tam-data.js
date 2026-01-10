/**
 * Extract Earth Bandwidth TAM data from Excel file
 * Creates a JSON file with the TAM lookup table (columns A and B, rows 8-1012)
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, '../SpaceX Valuation Model (ARK x Mach33) (2).xlsx');
const outputPath = path.join(__dirname, '../data/earth-bandwidth-tam.json');

try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(excelPath);
    
    const sheetName = 'Earth Bandwidth TAM';
    if (!workbook.Sheets[sheetName]) {
        throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Extract columns A and B, rows 8-1012
    const tamData = [];
    
    for (let row = 8; row <= 1012; row++) {
        const cellA = worksheet[`A${row}`];
        const cellB = worksheet[`B${row}`];
        
        if (cellA && cellB) {
            const key = cellA.v; // Column A: lookup key (penetration/bandwidth value)
            const value = cellB.v; // Column B: TAM multiplier
            
            if (key !== null && key !== undefined && value !== null && value !== undefined) {
                tamData.push({
                    key: typeof key === 'number' ? key : parseFloat(key),
                    value: typeof value === 'number' ? value : parseFloat(value)
                });
            }
        }
    }
    
    // Ensure data is sorted by key (ascending) for binary search
    tamData.sort((a, b) => a.key - b.key);
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save to JSON
    const output = {
        metadata: {
            source: 'Earth Bandwidth TAM',
            rows: tamData.length,
            range: 'A8:B1012',
            description: 'Total Addressable Market lookup table for bandwidth pricing',
            extracted: new Date().toISOString()
        },
        data: tamData
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`✓ Extracted ${tamData.length} rows from TAM table`);
    console.log(`✓ Key range: ${tamData[0].key} to ${tamData[tamData.length - 1].key}`);
    console.log(`✓ Value range: ${Math.min(...tamData.map(d => d.value))} to ${Math.max(...tamData.map(d => d.value))}`);
    console.log(`✓ Saved to: ${outputPath}`);
    
} catch (error) {
    console.error('Error extracting TAM data:', error);
    process.exit(1);
}

