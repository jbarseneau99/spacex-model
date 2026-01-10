# Context-Based Formula Categorization

**Categorizing formulas based on ACTUAL patterns and cell locations**

**Generated**: 2026-01-10T03:05:58.805Z

---

## 📊 **Categorization Results**

| Category | Count | % of "Other" | Description |
|----------|-------|---------------|-------------|
| Cell Reference | 1396 | 21.1% | Simple cell references that pass values through |
| Cross-Sheet Data Linking | 150 | 2.3% | Formulas linking data between sheets (Earth!O153, Mars!K54) |
| Cost Component Calculations | 21 | 0.3% | Formulas calculating individual cost components (O142-O143, O127-O130, O134-O137) |
| Cost Aggregation | 17 | 0.3% | SUM formulas aggregating cost components |
| Present Value Calculations | 11 | 0.2% | Formulas calculating present value of cash flows (O58, O59, O61, O62) |
| Valuation Output/Display | 9 | 0.1% | Formulas that reference or display final valuation values |
| Revenue Component Calculations | 9 | 0.1% | Formulas calculating individual revenue components (O116-O118, O95-O99, O111-O113) |
| **Still Uncategorized** | 4993 | 75.6% | Formulas that don't match known patterns |
| **TOTAL** | **6606** | **100%** | |

---

## 📋 **Detailed Categories**

### Cell Reference

**Description**: Simple cell references that pass values through

**Count**: 1396 formulas

**Example Formulas**:

1. `=Y153`
   Location: Earth!D7

2. `=B8`
   Location: Earth!C8

3. `=C8`
   Location: Earth!D8

4. `=I29`
   Location: Earth!J25

5. `=J29`
   Location: Earth!K25

6. `=K29`
   Location: Earth!L25

7. `=L29`
   Location: Earth!M25

8. `=M29`
   Location: Earth!N25

9. `=N29`
   Location: Earth!O25

10. `=O29`
   Location: Earth!P25

*... and 1386 more formulas*

---

### Cross-Sheet Data Linking

**Description**: Formulas linking data between sheets (Earth!O153, Mars!K54)

**Count**: 150 formulas

**Example Formulas**:

1. `=Mars!U54+Mars!U8-Mars!U27`
   Location: Earth!D10

2. `=Earth!O144`
   Location: Valuation Outputs!J7

3. `=-(MIN(Mars!E14,Mars!E15)*I43)`
   Location: Earth!I32

4. `=-(MIN(Mars!F14,Mars!F15)*J43)`
   Location: Earth!J32

5. `=-(MIN(Mars!G14,Mars!G15)*K43)`
   Location: Earth!K32

6. `=-(MIN(Mars!H14,Mars!H15)*L43)`
   Location: Earth!L32

7. `=-(MIN(Mars!I14,Mars!I15)*M43)`
   Location: Earth!M32

8. `=-(MIN(Mars!J14,Mars!J15)*N43)`
   Location: Earth!N32

9. `=-(MIN(Mars!K14,Mars!K15)*O43)`
   Location: Earth!O32

10. `=-(MIN(Mars!L14,Mars!L15)*P43)`
   Location: Earth!P32

*... and 140 more formulas*

---

### Cost Component Calculations

**Description**: Formulas calculating individual cost components (O142-O143, O127-O130, O134-O137)

**Count**: 21 formulas

**Example Formulas**:

1. `=O127/(1-O106)`
   Location: Earth!O107

2. `=O134/(1-O106)`
   Location: Earth!O108

3. `=O127`
   Location: Earth!P127

4. `=O128`
   Location: Earth!P128

5. `=1-O128`
   Location: Earth!O129

6. `=O127*O129`
   Location: Earth!O131

7. `=O134`
   Location: Earth!P134

8. `=1-O135`
   Location: Earth!O136

9. `=O134*O136`
   Location: Earth!O138

10. `=(O137+O164)/O66`
   Location: Earth!O139

*... and 11 more formulas*

---

### Cost Aggregation

**Description**: SUM formulas aggregating cost components

**Count**: 17 formulas

**Example Formulas**:

1. `=SUM(I142:I143)`
   Location: Earth!I144

2. `=SUM(J142:J143)`
   Location: Earth!J144

3. `=SUM(K142:K143)`
   Location: Earth!K144

4. `=SUM(L142:L143)`
   Location: Earth!L144

5. `=SUM(M142:M143)`
   Location: Earth!M144

6. `=SUM(N142:N143)`
   Location: Earth!N144

7. `=SUM(P142:P143)`
   Location: Earth!P144

8. `=SUM(Q142:Q143)`
   Location: Earth!Q144

9. `=SUM(R142:R143)`
   Location: Earth!R144

10. `=SUM(S142:S143)`
   Location: Earth!S144

*... and 7 more formulas*

---

### Present Value Calculations

**Description**: Formulas calculating present value of cash flows (O58, O59, O61, O62)

**Count**: 11 formulas

**Example Formulas**:

1. `=Earth!O59`
   Location: Valuation Outputs!B7

2. `=Earth!O62`
   Location: Valuation Outputs!C7

3. `=Earth!O58`
   Location: Valuation Outputs!D7

4. `=Earth!O61`
   Location: Valuation Outputs!E7

5. `=MAX(-O27,-(O58*$B$28))`
   Location: Earth!O28

6. `=MAX(-O35,IF($B$31>O16,-O35,-(O59*$B$28)))`
   Location: Earth!O36

7. `=SUM(O58:O59)`
   Location: Earth!O60

8. `=O61+P58`
   Location: Earth!P61

9. `=O62+P59`
   Location: Earth!P62

10. `=O159*O58`
   Location: Earth!O160

*... and 1 more formulas*

---

### Valuation Output/Display

**Description**: Formulas that reference or display final valuation values

**Count**: 9 formulas

**Example Formulas**:

1. `=O153`
   Location: Earth!B7

2. `=O153`
   Location: Earth!C7

3. `=B7*B8`
   Location: Earth!B9

4. `=C7*C8`
   Location: Earth!C9

5. `=D7*D8`
   Location: Earth!D9

6. `=Earth!O153`
   Location: Valuation Outputs!K7

7. `=O153/O119`
   Location: Earth!O154

8. `=O153-O176-O177`
   Location: Earth!O178

9. `=O153-O180`
   Location: Earth!O182

---

### Revenue Component Calculations

**Description**: Formulas calculating individual revenue components (O116-O118, O95-O99, O111-O113)

**Count**: 9 formulas

**Example Formulas**:

1. `=Earth!O116`
   Location: Valuation Outputs!F7

2. `=Earth!O117`
   Location: Valuation Outputs!G7

3. `=Earth!O118`
   Location: Valuation Outputs!H7

4. `=Earth!O119`
   Location: Valuation Outputs!I7

5. `=O119*O146`
   Location: Earth!O149

6. `=O119*O150`
   Location: Earth!O151

7. `=$B$177*O119`
   Location: Earth!O177

8. `=P279*O119`
   Location: Earth!P280

9. `=P362*O119`
   Location: Earth!P363

---

