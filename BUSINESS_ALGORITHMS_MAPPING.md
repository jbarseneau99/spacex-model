# Business Algorithm Mapping

**All 8,890 formulas mapped to BUSINESS ALGORITHMS (not Excel functions)**

**Generated**: 2026-01-10T02:50:28.201Z

---

## 🎯 **Business Algorithm Categories**

### Revenue Calculation

**Description**: How revenue is calculated from business drivers

**Formulas**: 57

**Unique Patterns**: 4

**Top Patterns**:

1. `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:CELL),INDE` (27x)
   Example: `=$B$95*(((1+$B$94)*(1+$B$96))^(Earth!I16-Earth!$I$16))*(IF((I91*(1-I92))>MAX('Ea`
   Location: Earth!I95

2. `=(IF((CELL+NUM)>MAX(SHEET!CELL:CELL),INDEX(SHEET!CELL:CELL, ` (26x)
   Example: `=(IF((J236+1)>MAX('Earth Bandwidth TAM'!$A$8:$A$1012),INDEX('Earth Bandwidth TAM`
   Location: Earth!J238

3. `=CELL` (3x)
   Example: `=O96`
   Location: Earth!O116

4. `=SUM(CELL:CELL)` (1x)
   Example: `=SUM(O116:O118)`
   Location: Earth!O119

---

### Cost Calculation

**Description**: How costs are calculated (operating costs, capital costs, etc.)

**Formulas**: 3

**Unique Patterns**: 2

**Top Patterns**:

1. `=CELL*CELL` (2x)
   Example: `=O130*O58`
   Location: Earth!O142

2. `=SUM(CELL:CELL)` (1x)
   Example: `=SUM(O142:O143)`
   Location: Earth!O144

---

### Growth Projection

**Description**: How business grows over time (penetration curves, adoption rates)

**Formulas**: 830

**Unique Patterns**: 27

**Top Patterns**:

1. `SHEET!CELL` (104x)
   Example: `=MIN(F15,F14)/(1+F37)*Earth!J66`
   Location: Mars!F16

2. `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL*(NUM+CELL),` (52x)
   Example: `=IF($B$106>=0,MIN($B$105,I106*(1+$B$106)),MAX(I106*(1+$B$106),$B$105))`
   Location: Earth!J106

3. `=CELL*(NUM+CELL)` (52x)
   Example: `=I295*(1+$B$295)`
   Location: Earth!J295

4. `=CELL+((CELL+CELL+CELL)*(NUM/CELL))` (52x)
   Example: `=J380+((J382+J226+J227)*(1/J385))`
   Location: Earth!J388

5. `=MAX(CELL:CELL)*(NUM+CELL)` (52x)
   Example: `=MAX($I$20:I20)*(1+$B$394)`
   Location: Earth!J394

6. `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:CELL),INDE` (27x)
   Example: `=$B$95*(((1+$B$94)*(1+$B$96))^(Earth!I16-Earth!$I$16))*(IF((I91*(1-I92))>MAX('Ea`
   Location: Earth!I95

7. `=(CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(NUM)))+(NUM/NUM)` (26x)
   Example: `=($B$42/365)*(I77/$B$77)^((LN(1-$B$43)/LN(2)))+(2/365)`
   Location: Earth!J42

8. `=IF(CELL>CELL,NUM,((CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(` (26x)
   Example: `=IF($B$31>J16,1,(($B$42/365)*(I80/$B$80)^((LN(1-$B$43)/LN(2))))+(1/(24*365)))`
   Location: Earth!J43

9. `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL,CELL*(NUM+C` (26x)
   Example: `=IF($B$65>=0,MIN($B$64,I66*(1+$B$65)),MAX($B$66,I66*(1+$B$65)))`
   Location: Earth!J66

10. `=CELL+((CELL*(CELL+CELL))+(CELL*(CELL+CELL)))` (26x)
   Example: `=I86+((J83*(J47+J55))+(J84*(J50+J56)))`
   Location: Earth!J86

---

### Valuation Calculation

**Description**: How final valuation is calculated (DCF, terminal value, etc.)

**Formulas**: 27

**Unique Patterns**: 5

**Top Patterns**:

1. `=SHEET!CELL` (16x)
   Example: `='Valuation Inputs & Logic'!I32`
   Location: Earth!B31

2. `=QUARTILE(SHEET!CELL:CELL,NUM)/NUM^NUM` (6x)
   Example: `=QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)/10^9`
   Location: Valuation Inputs & Logic!C10

3. `=AVERAGE(SHEET!CELL:CELL)/NUM^NUM` (3x)
   Example: `=AVERAGE('Valuation Outputs'!$M$7:$M$5006)/10^9`
   Location: Valuation Inputs & Logic!D10

4. `=CELL-CELL-CELL` (1x)
   Example: `=O119-O144-O152`
   Location: Earth!O153

5. `=CELL+CELL*(NUM-NUM/CELL)` (1x)
   Example: `=K53+J54*(1-1/$B54)`
   Location: Mars!K54

---

### Present Value / Discounting

**Description**: How future cash flows are discounted to present value

**Formulas**: 196

**Unique Patterns**: 9

**Top Patterns**:

1. `SHEET!CELL` (52x)
   Example: `=MIN(F15,F14)/(1+F37)*Earth!J66`
   Location: Mars!F16

2. `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:CELL),INDE` (27x)
   Example: `=$B$95*(((1+$B$94)*(1+$B$96))^(Earth!I16-Earth!$I$16))*(IF((I91*(1-I92))>MAX('Ea`
   Location: Earth!I95

3. `=(CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(NUM)))+(NUM/NUM)` (26x)
   Example: `=($B$42/365)*(I77/$B$77)^((LN(1-$B$43)/LN(2)))+(2/365)`
   Location: Earth!J42

4. `=IF(CELL>CELL,NUM,((CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(` (26x)
   Example: `=IF($B$31>J16,1,(($B$42/365)*(I80/$B$80)^((LN(1-$B$43)/LN(2))))+(1/(24*365)))`
   Location: Earth!J43

5. `=IFERROR(IRR(CELL:CELL),NUM)` (26x)
   Example: `=IFERROR(IRR(J237:J242),0)`
   Location: Earth!J243

6. `=(CELL)*(CELL/CELL)^((LN(NUM+CELL)/LN(NUM)))` (26x)
   Example: `=($B$423)*(I413/$B$422)^((LN(1+$B$421)/LN(2)))`
   Location: Earth!J421

7. `=RRI(((CELL-CELL)/NUM),CELL,CELL)` (5x)
   Example: `=RRI(((D$13-$B$13)/365),$B$15,D15)`
   Location: Valuation Inputs & Logic!D16

8. `=_xlfn.RRI(((CELL-CELL)/NUM),CELL,CELL)` (4x)
   Example: `=_xlfn.RRI(((C$8-$B$8)/365),$B$10,C10)`
   Location: Valuation Inputs & Logic!C11

9. `=RRI(NUM,CELL,CELL)` (4x)
   Example: `=RRI(6,I66,B66)`
   Location: Earth!B65

---

### Market Size / TAM

**Description**: How Total Addressable Market is calculated

**Formulas**: 53

**Unique Patterns**: 2

**Top Patterns**:

1. `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:CELL),INDE` (27x)
   Example: `=$B$95*(((1+$B$94)*(1+$B$96))^(Earth!I16-Earth!$I$16))*(IF((I91*(1-I92))>MAX('Ea`
   Location: Earth!I95

2. `=(IF((CELL+NUM)>MAX(SHEET!CELL:CELL),INDEX(SHEET!CELL:CELL, ` (26x)
   Example: `=(IF((J236+1)>MAX('Earth Bandwidth TAM'!$A$8:$A$1012),INDEX('Earth Bandwidth TAM`
   Location: Earth!J238

---

### Market Penetration

**Description**: How market penetration affects revenue (S-curves, adoption)

**Formulas**: 442

**Unique Patterns**: 5

**Top Patterns**:

1. `=IF(CELL=STR,CELL,CELL)` (260x)
   Example: `=IF(J245="Starlink Constellation Complete",J267,J398)`
   Location: Earth!J20

2. `=IF(AND(CELL=STR,CELL=STR),CELL+CELL,NUM)` (52x)
   Example: `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),J25+J26,0)`
   Location: Earth!J286

3. `=IF(AND(CELL=STR,CELL=STR),(CELL/CELL)-CELL,NUM)` (52x)
   Example: `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),(J286/J288)-J270,0)`
   Location: Earth!J290

4. `=IF(CELL=STR,NUM,CELL)` (52x)
   Example: `=IF(J245="Starlink Constellation Complete",0,J25)`
   Location: Earth!J325

5. `=IF(CELL=STR,STR,IF(CELL=STR,IF(CELL>CELL,STR,STR),STR))` (26x)
   Example: `=IF(I245="Starlink Constellation Complete","Starlink Constellation Complete",IF(`
   Location: Earth!J245

---

### Launch Economics

**Description**: How launch volume, cost/kg, pricing affects revenue

**Formulas**: 339

**Unique Patterns**: 47

**Top Patterns**:

1. `=IF(CELL=STR,NUM,CELL)` (54x)
   Example: `=IF(J245="Launch",0,J431)`
   Location: Earth!J249

2. `=CELL` (47x)
   Example: `=J127`
   Location: Earth!J206

3. `=IF(CELL=STR,CELL,NUM)` (30x)
   Example: `=IF(J264="No",J270,0)`
   Location: Earth!J307

4. `=IF(CELL=STR,STR,IF(CELL=STR,IF(CELL>CELL,STR,STR),STR))` (26x)
   Example: `=IF(I245="Starlink Constellation Complete","Starlink Constellation Complete",IF(`
   Location: Earth!J245

5. `=IF(CELL=STR,NUM,IF(CELL>=NUM,CELL,NUM))` (26x)
   Example: `=IF(J245="Launch",0,IF(J232>=0,J232,0))`
   Location: Earth!J247

6. `=IF(CELL=STR,IF(CELL>=NUM,CELL,NUM),NUM)` (26x)
   Example: `=IF(J245="Launch",IF(J232>=0,J232,0),0)`
   Location: Earth!J323

7. `=IF(CELL=STR,CELL*CELL,NUM)` (26x)
   Example: `=IF(J245="Launch",J344*$B$345,0)`
   Location: Earth!J345

8. `SHEET!CELL,MOD(CELL,NUM)=NUM),STR,STR)` (26x)
   Example: `=IF(AND(F6>=Earth!$B234,MOD(F6,2)=0),"Go For Launch","It Ain't Your Year")`
   Location: Mars!F9

9. `=CELL*CELL` (8x)
   Example: `=J199*$B$200`
   Location: Earth!J200

10. `=CELL/CELL` (6x)
   Example: `=J251/J255`
   Location: Earth!J258

---

### Mars Colonization Economics

**Description**: How Mars colony value is calculated (population growth, bootstrap, etc.)

**Formulas**: 1413

**Unique Patterns**: 101

**Top Patterns**:

1. `SHEET!CELL` (294x)
   Example: `=Mars!K54+Mars!K8-Mars!K27`
   Location: Earth!C10

2. `=CELL` (186x)
   Example: `=J29`
   Location: Earth!K25

3. `=CELL*CELL` (109x)
   Example: `=K107*K102`
   Location: Earth!K111

4. `=CELL+CELL` (63x)
   Example: `=K27+K28`
   Location: Earth!K29

5. `=SUM(CELL:CELL)` (40x)
   Example: `=SUM(K20:K21)`
   Location: Earth!K22

6. `=CELL/CELL` (39x)
   Example: `=K153/K119`
   Location: Earth!K154

7. `=CELL-CELL` (32x)
   Example: `=K86-K87`
   Location: Earth!K89

8. `=IF(CELL=STR,CELL,NUM)` (30x)
   Example: `=IF(K264="No",K270,0)`
   Location: Earth!K307

9. `=NUM-CELL` (28x)
   Example: `=1-K128`
   Location: Earth!K129

10. `SHEET!CELL)*CELL)` (27x)
   Example: `=-(MIN(Mars!E14,Mars!E15)*I43)`
   Location: Earth!I32

---

### Milestone-Based Calculations

**Description**: How business milestones affect calculations (e.g., "Starlink Constellation Complete")

**Formulas**: 624

**Unique Patterns**: 10

**Top Patterns**:

1. `=IF(CELL=STR,CELL,CELL)` (260x)
   Example: `=IF(J245="Starlink Constellation Complete",J267,J398)`
   Location: Earth!J20

2. `=IF(CELL=STR,NUM,CELL)` (104x)
   Example: `=IF(J245="Launch",0,J431)`
   Location: Earth!J249

3. `=IF(AND(CELL=STR,CELL=STR),CELL+CELL,NUM)` (52x)
   Example: `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),J25+J26,0)`
   Location: Earth!J286

4. `=IF(AND(CELL=STR,CELL=STR),(CELL/CELL)-CELL,NUM)` (52x)
   Example: `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),(J286/J288)-J270,0)`
   Location: Earth!J290

5. `=IF(CELL=STR,STR,IF(CELL=STR,IF(CELL>CELL,STR,STR),STR))` (26x)
   Example: `=IF(I245="Starlink Constellation Complete","Starlink Constellation Complete",IF(`
   Location: Earth!J245

6. `=IF(CELL=STR,NUM,IF(CELL>=NUM,CELL,NUM))` (26x)
   Example: `=IF(J245="Launch",0,IF(J232>=0,J232,0))`
   Location: Earth!J247

7. `=IF(CELL=STR,IF(CELL>=NUM,CELL,NUM),NUM)` (26x)
   Example: `=IF(J245="Launch",IF(J232>=0,J232,0),0)`
   Location: Earth!J323

8. `=IF(CELL=STR,CELL*CELL,NUM)` (26x)
   Example: `=IF(J245="Launch",J344*$B$345,0)`
   Location: Earth!J345

9. `SHEET!CELL,MOD(CELL,NUM)=NUM),STR,STR)` (26x)
   Example: `=IF(AND(F6>=Earth!$B234,MOD(F6,2)=0),"Go For Launch","It Ain't Your Year")`
   Location: Mars!F9

10. `=IF(CELL=STR,CELL,NUM)` (26x)
   Example: `=IF(F9="Go for Launch",F8,0)`
   Location: Mars!F10

---

### Time-Series Projections

**Description**: How values are projected year-over-year

**Formulas**: 6321

**Unique Patterns**: 76

**Top Patterns**:

1. `=CELL` (1856x)
   Example: `=I48`
   Location: Earth!I102

2. `=CELL*CELL` (827x)
   Example: `=I107*I102`
   Location: Earth!I111

3. `=CELL/CELL` (348x)
   Example: `=I153/I119`
   Location: Earth!I154

4. `=SUM(CELL:CELL)` (185x)
   Example: `=SUM(I116:I118)`
   Location: Earth!I119

5. `=CELL+CELL` (135x)
   Example: `=I111+I112`
   Location: Earth!I113

6. `=CELL-CELL` (131x)
   Example: `=I153-I180`
   Location: Earth!I182

7. `=IF(CELL=STR,NUM,CELL)` (104x)
   Example: `=IF(J245="Launch",0,J431)`
   Location: Earth!J249

8. `=IF(CELL=STR,CELL-CELL,NUM)` (104x)
   Example: `=IF(J275="No",J273-J247,0)`
   Location: Earth!J276

9. `=IFERROR(CELL*(CELL/CELL),NUM)` (104x)
   Example: `=IFERROR(J298*(J290/J292),0)`
   Location: Earth!J299

10. `=IF(CELL=STR,CELL,NUM)` (104x)
   Example: `=IF(J264="No",J270,0)`
   Location: Earth!J307

---

### Terminal Value

**Description**: How terminal value is calculated

**Formulas**: 2

**Unique Patterns**: 1

**Top Patterns**:

1. `=CELL` (2x)
   Example: `=O99`
   Location: Earth!O117

---

### Taxes & Expenses

**Description**: How taxes and expenses are calculated

**Formulas**: 7

**Unique Patterns**: 5

**Top Patterns**:

1. `=CELL*CELL` (3x)
   Example: `=O147*O149`
   Location: Earth!O148

2. `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL*(NUM+CELL),` (1x)
   Example: `=IF($B$146>=0,MIN($B$145,N146*(1+$B$146)),MAX(N146*(1+$B$146),$B$145))`
   Location: Earth!O146

3. `=MIN(NUM,IF(CELL>=NUM,CELL,CELL*(NUM-(CELL/NUM))))` (1x)
   Example: `=MIN(1,IF(O244>=0,N147,N147*(1-(O244/4))))`
   Location: Earth!O147

4. `=CELL` (1x)
   Example: `=N150`
   Location: Earth!O150

5. `=(CELL+CELL)*CELL` (1x)
   Example: `=(O146+O150)*O119`
   Location: Earth!O152

---

### Option Value Calculation

**Description**: How real option value is calculated (especially Mars)

**Formulas**: 16

**Unique Patterns**: 12

**Top Patterns**:

1. `=CELL` (4x)
   Example: `=J83`
   Location: Earth!K83

2. `=SUM(CELL:CELL)` (2x)
   Example: `=SUM(K25:K26)`
   Location: Earth!K27

3. `=CELL+((CELL*(CELL+CELL))+(CELL*(CELL+CELL)))` (1x)
   Example: `=J86+((K83*(K47+K55))+(K84*(K50+K56)))`
   Location: Earth!K86

4. `=CELL-CELL` (1x)
   Example: `=K86-K87`
   Location: Earth!K89

5. `=IF(OR(CELL=STR,AND(CELL=STR,CELL=STR)),CELL/CELL,NUM)` (1x)
   Example: `=IF(OR(K234="Falcon 9",AND(K265="No",K264="Yes")),K258/K253,0)`
   Location: Earth!K270

6. `=IF(CELL=STR,IF(AND(CELL=STR, CELL=STR),NUM,CELL/CELL),NUM)` (1x)
   Example: `=IF(K234="Starship",IF(AND(K265="No", K264="Yes"),0,K259/K254),0)`
   Location: Earth!K271

7. `=(CELL*CELL)+(CELL*CELL)+(CELL*(CELL+CELL+CELL))+(CELL*(CELL` (1x)
   Example: `=(K267*K210)+(K268*K216)+(K270*(K229+K226+K227))+(K271*(K230+K226+K227))`
   Location: Earth!K273

8. `=IF(CELL>=CELL,STR,STR)` (1x)
   Example: `=IF(K247>=K273,"Yes","No")`
   Location: Earth!K275

9. `=IF(CELL=STR,CELL-CELL,NUM)` (1x)
   Example: `=IF(K275="No",K273-K247,0)`
   Location: Earth!K276

10. `=IFERROR(MAX(CELL,CELL)+(CELL/CELL),MAX(CELL,CELL))` (1x)
   Example: `=IFERROR(MAX(J278,J361)+(K276/K281),MAX(J278,J361))`
   Location: Earth!K278

---

## 📊 **Complete Formula-to-Business-Algorithm Mapping**

| Sheet | Cell | Formula | Business Algorithm(s) | Complexity |
|-------|------|---------|----------------------|------------|
| Valuation Inputs & Logic | C10 | `=QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | D10 | `=AVERAGE('Valuation Outputs'!$M$7:$M$5006)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | E10 | `=QUARTILE('Valuation Outputs'!$M$7:$M$5006,3)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | C11 | `=_xlfn.RRI(((C$8-$B$8)/365),$B$10,C10)` | discounting | Medium |
| Valuation Inputs & Logic | D11 | `=_xlfn.RRI(((D$8-$B$8)/365),$B$10,D10)` | discounting | Medium |
| Valuation Inputs & Logic | E11 | `=_xlfn.RRI(((E$8-$B$8)/365),$B$10,E10)` | discounting | Medium |
| Valuation Inputs & Logic | C15 | `=QUARTILE('Valuation Outputs'!$BZ$7:$BZ$5006,1)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | D15 | `=AVERAGE('Valuation Outputs'!$BZ$7:$BZ$5006)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | E15 | `=QUARTILE('Valuation Outputs'!$BZ$7:$BZ$5006,3)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | C16 | `=_xlfn.RRI(((C$13-$B$13)/365),$B$15,C15)` | discounting | Medium |
| Earth | B7 | `=O153` | other | Simple |
| Earth | C7 | `=O153` | other | Simple |
| Earth | D7 | `=Y153` | other | Simple |
| Earth | C8 | `=B8` | other | Simple |
| Earth | D8 | `=C8` | other | Simple |
| Earth | B9 | `=B7*B8` | other | Simple |
| Earth | C9 | `=C7*C8` | other | Simple |
| Earth | D9 | `=D7*D8` | other | Simple |
| Earth | C10 | `=Mars!K54+Mars!K8-Mars!K27` | marsColonization | Medium |
| Earth | D10 | `=Mars!U54+Mars!U8-Mars!U27` | marsColonization | Medium |
| Mars | L6 | `=K6+1` | marsColonization, timeSeries | Simple |
| Mars | M6 | `=L6+1` | marsColonization, timeSeries | Simple |
| Mars | N6 | `=M6+1` | marsColonization, timeSeries | Simple |
| Mars | O6 | `=N6+1` | marsColonization, timeSeries | Simple |
| Mars | P6 | `=O6+1` | marsColonization, timeSeries | Simple |
| Mars | Q6 | `=P6+1` | marsColonization, timeSeries | Simple |
| Mars | R6 | `=Q6+1` | marsColonization, timeSeries | Simple |
| Mars | S6 | `=R6+1` | marsColonization, timeSeries | Simple |
| Mars | T6 | `=S6+1` | marsColonization, timeSeries | Simple |
| Mars | U6 | `=T6+1` | marsColonization, timeSeries | Simple |
| Valuation Outputs | B7 | `=Earth!O59` | other | Simple |
| Valuation Outputs | C7 | `=Earth!O62` | other | Simple |
| Valuation Outputs | D7 | `=Earth!O58` | other | Simple |
| Valuation Outputs | E7 | `=Earth!O61` | other | Simple |
| Valuation Outputs | F7 | `=Earth!O116` | other | Simple |
| Valuation Outputs | G7 | `=Earth!O117` | other | Simple |
| Valuation Outputs | H7 | `=Earth!O118` | other | Simple |
| Valuation Outputs | I7 | `=Earth!O119` | other | Simple |
| Valuation Outputs | J7 | `=Earth!O144` | other | Simple |
| Valuation Outputs | K7 | `=Earth!O153` | marsColonization | Simple |
| Valuation Inputs & Logic | D16 | `=RRI(((D$13-$B$13)/365),$B$15,D15)` | discounting | Medium |
| Valuation Inputs & Logic | E16 | `=RRI(((E$13-$B$13)/365),$B$15,E15)` | discounting | Medium |
| Valuation Inputs & Logic | C20 | `=QUARTILE('Valuation Outputs'!$CA$7:$CA$5006,1)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | D20 | `=AVERAGE('Valuation Outputs'!$CA$7:$CA$5006)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | E20 | `=QUARTILE('Valuation Outputs'!$CA$7:$CA$5006,3)/10^9` | growth, valuation | Medium |
| Valuation Inputs & Logic | C21 | `=RRI(((C$18-$B$18)/365),$B$20,C20)` | discounting | Medium |
| Valuation Inputs & Logic | D21 | `=RRI(((D$18-$B$18)/365),$B$20,D20)` | discounting | Medium |
| Valuation Inputs & Logic | E21 | `=RRI(((E$18-$B$18)/365),$B$20,E20)` | discounting | Medium |
| Valuation Inputs & Logic | G32 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H32 | `=(E32-D32)/2+D32` | other | Medium |
| Valuation Inputs & Logic | I32 | `=ROUNDDOWN(MAX(IF(H32=D32,H32,IF(NORM.INV(G32,H32,(D32-H32))` | other | Complex |
| Valuation Inputs & Logic | G33 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H33 | `=(E33-D33)/2+D33` | other | Medium |
| Valuation Inputs & Logic | I33 | `=IF(H33=E33,H33,IF(NORM.INV(G33,H33,(E33-H33))<C33,C33,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G34 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H34 | `=(E34-D34)/2+D34` | other | Medium |
| Valuation Inputs & Logic | I34 | `=IF(H34=E34,H34,IF(NORM.INV(G34,H34,(E34-H34))<C34,C34,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G35 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H35 | `=(E35-D35)/2+D35` | other | Medium |
| Valuation Inputs & Logic | I35 | `=IF(H35=E35,H35,IF(NORM.INV(G35,H35,(E35-H35))<C35,C35,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G36 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H36 | `=(E36-D36)/2+D36` | other | Medium |
| Valuation Inputs & Logic | I36 | `=IF(H36=E36,H36,IF(NORM.INV(G36,H36,(E36-H36))<C36,C36,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G37 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H37 | `=(E37-D37)/2+D37` | other | Medium |
| Valuation Inputs & Logic | I37 | `=IF(H37=E37,H37,IF(NORM.INV(G37,H37,(E37-H37))<C37,C37,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G38 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H38 | `=(E38-D38)/2+D38` | other | Medium |
| Valuation Inputs & Logic | I38 | `=ROUNDDOWN(IF(H38=D38,H38,IF(NORM.INV(G38,H38,(D38-H38))<C38` | other | Complex |
| Valuation Inputs & Logic | G39 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H39 | `=(E39-D39)/2+D39` | other | Medium |
| Valuation Inputs & Logic | I39 | `=IF(H39=E39,H39,IF(NORM.INV(G39,H39,(E39-H39))<C39,C39,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G40 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H40 | `=(E40-D40)/2+D40` | other | Medium |
| Valuation Inputs & Logic | I40 | `=IF(H40=E40,H40,IF(NORM.INV(G40,H40,(E40-H40))<C40,C40,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G41 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H41 | `=(E41-D41)/2+D41` | other | Medium |
| Valuation Inputs & Logic | I41 | `=IF(H41=E41,H41,IF(NORM.INV(G41,H41,(E41-H41))<C41,C41,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G42 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H42 | `=(E42-D42)/2+D42` | other | Medium |
| Valuation Inputs & Logic | I42 | `=IF(H42=E42,H42,IF(NORM.INV(G42,H42,(E42-H42))<C42,C42,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G43 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H43 | `=(E43-D43)/2+D43` | other | Medium |
| Valuation Inputs & Logic | I43 | `=IF(H43=E43,H43,IF(NORM.INV(G43,H43,(E43-H43))<C43,C43,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G44 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H44 | `=(E44-D44)/2+D44` | other | Medium |
| Valuation Inputs & Logic | I44 | `=IF(H44=E44,H44,IF(NORM.INV(G44,H44,(E44-H44))<C44,C44,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G45 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H45 | `=(E45-D45)/2+D45` | other | Medium |
| Valuation Inputs & Logic | I45 | `=IF(H45=E45,H45,IF(NORM.INV(G45,H45,(E45-H45))<C45,C45,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G46 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H46 | `=(E46-D46)/2+D46` | other | Medium |
| Valuation Inputs & Logic | I46 | `=IF(H46=E46,H46,IF(NORM.INV(G46,H46,(E46-H46))<C46,C46,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G47 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H47 | `=(E47-D47)/2+D47` | other | Medium |
| Valuation Inputs & Logic | I47 | `=IF(H47=E47,H47,IF(NORM.INV(G47,H47,(E47-H47))<C47,C47,IF(NO` | other | Complex |
| Valuation Inputs & Logic | G48 | `=RAND()` | other | Medium |
| Valuation Inputs & Logic | H48 | `=(E48-D48)/2+D48` | other | Medium |
| Valuation Inputs & Logic | I48 | `=IF(H48=E48,H48,IF(NORM.INV(G48,H48,(E48-H48))<C48,C48,IF(NO` | other | Complex |
| Earth | B11 | `=B9+B10` | other | Simple |
| Earth | C11 | `=C9+C10` | other | Simple |
| Earth | D11 | `=D9+D10` | other | Simple |
| Earth | B12 | `=O408/$I$408` | other | Simple |
| Earth | C12 | `=O408/$I$408` | other | Simple |
| Earth | D12 | `=Y408/$I$408` | other | Simple |
| Earth | B13 | `=B11/B12` | other | Simple |
| Earth | C13 | `=C11/C12` | other | Simple |
| Earth | D13 | `=D11/D12` | other | Simple |
| Earth | J16 | `=I16+1` | timeSeries | Simple |
| Earth | K16 | `=J16+1` | marsColonization, timeSeries | Simple |
| Earth | L16 | `=K16+1` | timeSeries | Simple |
| Earth | M16 | `=L16+1` | timeSeries | Simple |
| Earth | N16 | `=M16+1` | timeSeries | Simple |
| Earth | O16 | `=N16+1` | timeSeries | Simple |
| Earth | P16 | `=O16+1` | timeSeries | Simple |
| Earth | Q16 | `=P16+1` | timeSeries | Simple |
| Earth | R16 | `=Q16+1` | timeSeries | Simple |
| Earth | S16 | `=R16+1` | timeSeries | Simple |
| Earth | T16 | `=S16+1` | timeSeries | Simple |
| Earth | U16 | `=T16+1` | timeSeries | Simple |
| Earth | V16 | `=U16+1` | timeSeries | Simple |
| Earth | W16 | `=V16+1` | timeSeries | Simple |
| Earth | X16 | `=W16+1` | timeSeries | Simple |
| Earth | Y16 | `=X16+1` | timeSeries | Simple |
| Earth | Z16 | `=Y16+1` | timeSeries | Simple |
| Earth | AA16 | `=Z16+1` | timeSeries | Simple |
| Earth | AB16 | `=AA16+1` | timeSeries | Simple |
| Earth | AC16 | `=AB16+1` | timeSeries | Simple |
| Earth | AD16 | `=AC16+1` | timeSeries | Simple |
| Earth | AE16 | `=AD16+1` | timeSeries | Simple |
| Earth | AF16 | `=AE16+1` | timeSeries | Simple |
| Earth | AG16 | `=AF16+1` | timeSeries | Simple |
| Earth | AH16 | `=AG16+1` | timeSeries | Simple |
| Earth | AI16 | `=AH16+1` | timeSeries | Simple |
| Earth | J20 | `=IF(J245="Starlink Constellation Complete",J267,J398)` | penetration, milestones | Medium |
| Earth | K20 | `=IF(K245="Starlink Constellation Complete",K267,K398)` | penetration, marsColonization, milestones | Medium |
| Earth | L20 | `=IF(L245="Starlink Constellation Complete",L267,L398)` | penetration, milestones | Medium |
| Earth | M20 | `=IF(M245="Starlink Constellation Complete",M267,M398)` | penetration, milestones | Medium |
| Earth | N20 | `=IF(N245="Starlink Constellation Complete",N267,N398)` | penetration, milestones | Medium |
| Earth | O20 | `=IF(O245="Starlink Constellation Complete",O267,O398)` | penetration, milestones | Medium |
| Earth | P20 | `=IF(P245="Starlink Constellation Complete",P267,P398)` | penetration, milestones | Medium |
| Earth | Q20 | `=IF(Q245="Starlink Constellation Complete",Q267,Q398)` | penetration, milestones | Medium |
| Earth | R20 | `=IF(R245="Starlink Constellation Complete",R267,R398)` | penetration, milestones | Medium |
| Earth | S20 | `=IF(S245="Starlink Constellation Complete",S267,S398)` | penetration, milestones | Medium |
| Earth | T20 | `=IF(T245="Starlink Constellation Complete",T267,T398)` | penetration, milestones | Medium |
| Earth | U20 | `=IF(U245="Starlink Constellation Complete",U267,U398)` | penetration, milestones | Medium |
| Earth | V20 | `=IF(V245="Starlink Constellation Complete",V267,V398)` | penetration, milestones | Medium |
| Earth | W20 | `=IF(W245="Starlink Constellation Complete",W267,W398)` | penetration, milestones | Medium |
| Earth | X20 | `=IF(X245="Starlink Constellation Complete",X267,X398)` | penetration, milestones | Medium |
| Earth | Y20 | `=IF(Y245="Starlink Constellation Complete",Y267,Y398)` | penetration, milestones | Medium |
| Earth | Z20 | `=IF(Z245="Starlink Constellation Complete",Z267,Z398)` | penetration, milestones | Medium |
| Earth | AA20 | `=IF(AA245="Starlink Constellation Complete",AA267,AA398)` | penetration, milestones | Medium |
| Earth | AB20 | `=IF(AB245="Starlink Constellation Complete",AB267,AB398)` | penetration, milestones | Medium |
| Earth | AC20 | `=IF(AC245="Starlink Constellation Complete",AC267,AC398)` | penetration, milestones | Medium |
| Earth | AD20 | `=IF(AD245="Starlink Constellation Complete",AD267,AD398)` | penetration, milestones | Medium |
| Earth | AE20 | `=IF(AE245="Starlink Constellation Complete",AE267,AE398)` | penetration, milestones | Medium |
| Earth | AF20 | `=IF(AF245="Starlink Constellation Complete",AF267,AF398)` | penetration, milestones | Medium |
| Earth | AG20 | `=IF(AG245="Starlink Constellation Complete",AG267,AG398)` | penetration, milestones | Medium |
| Earth | AH20 | `=IF(AH245="Starlink Constellation Complete",AH267,AH398)` | penetration, milestones | Medium |
| Earth | AI20 | `=IF(AI245="Starlink Constellation Complete",AI267,AI398)` | penetration, milestones | Medium |
| Earth | J21 | `=IF(J245="Starlink Constellation Complete",J268,J399)` | penetration, milestones | Medium |
| Earth | K21 | `=IF(K245="Starlink Constellation Complete",K268,K399)` | penetration, marsColonization, milestones | Medium |
| Earth | L21 | `=IF(L245="Starlink Constellation Complete",L268,L399)` | penetration, milestones | Medium |
| Earth | M21 | `=IF(M245="Starlink Constellation Complete",M268,M399)` | penetration, milestones | Medium |
| Earth | N21 | `=IF(N245="Starlink Constellation Complete",N268,N399)` | penetration, milestones | Medium |
| Earth | O21 | `=IF(O245="Starlink Constellation Complete",O268,O399)` | penetration, milestones | Medium |
| Earth | P21 | `=IF(P245="Starlink Constellation Complete",P268,P399)` | penetration, milestones | Medium |
| Earth | Q21 | `=IF(Q245="Starlink Constellation Complete",Q268,Q399)` | penetration, milestones | Medium |
| Earth | R21 | `=IF(R245="Starlink Constellation Complete",R268,R399)` | penetration, milestones | Medium |
| Earth | S21 | `=IF(S245="Starlink Constellation Complete",S268,S399)` | penetration, milestones | Medium |
| Earth | T21 | `=IF(T245="Starlink Constellation Complete",T268,T399)` | penetration, milestones | Medium |
| Earth | U21 | `=IF(U245="Starlink Constellation Complete",U268,U399)` | penetration, milestones | Medium |
| Earth | V21 | `=IF(V245="Starlink Constellation Complete",V268,V399)` | penetration, milestones | Medium |
| Earth | W21 | `=IF(W245="Starlink Constellation Complete",W268,W399)` | penetration, milestones | Medium |
| Earth | X21 | `=IF(X245="Starlink Constellation Complete",X268,X399)` | penetration, milestones | Medium |
| Earth | Y21 | `=IF(Y245="Starlink Constellation Complete",Y268,Y399)` | penetration, milestones | Medium |
| Earth | Z21 | `=IF(Z245="Starlink Constellation Complete",Z268,Z399)` | penetration, milestones | Medium |
| Earth | AA21 | `=IF(AA245="Starlink Constellation Complete",AA268,AA399)` | penetration, milestones | Medium |
| Earth | AB21 | `=IF(AB245="Starlink Constellation Complete",AB268,AB399)` | penetration, milestones | Medium |
| Earth | AC21 | `=IF(AC245="Starlink Constellation Complete",AC268,AC399)` | penetration, milestones | Medium |
| Earth | AD21 | `=IF(AD245="Starlink Constellation Complete",AD268,AD399)` | penetration, milestones | Medium |
| Earth | AE21 | `=IF(AE245="Starlink Constellation Complete",AE268,AE399)` | penetration, milestones | Medium |
| Earth | AF21 | `=IF(AF245="Starlink Constellation Complete",AF268,AF399)` | penetration, milestones | Medium |
| Earth | AG21 | `=IF(AG245="Starlink Constellation Complete",AG268,AG399)` | penetration, milestones | Medium |
| Earth | AH21 | `=IF(AH245="Starlink Constellation Complete",AH268,AH399)` | penetration, milestones | Medium |
| Earth | AI21 | `=IF(AI245="Starlink Constellation Complete",AI268,AI399)` | penetration, milestones | Medium |
| Earth | I22 | `=SUM(I20:I21)` | other | Medium |
| Earth | J22 | `=SUM(J20:J21)` | other | Medium |
| Earth | K22 | `=SUM(K20:K21)` | marsColonization | Medium |
| Earth | L22 | `=SUM(L20:L21)` | other | Medium |
| Earth | M22 | `=SUM(M20:M21)` | other | Medium |
| Earth | N22 | `=SUM(N20:N21)` | other | Medium |
| Earth | O22 | `=SUM(O20:O21)` | other | Medium |
| Earth | P22 | `=SUM(P20:P21)` | other | Medium |
| Earth | Q22 | `=SUM(Q20:Q21)` | other | Medium |
| Earth | R22 | `=SUM(R20:R21)` | other | Medium |
| Earth | S22 | `=SUM(S20:S21)` | other | Medium |
| Earth | T22 | `=SUM(T20:T21)` | other | Medium |
| Earth | U22 | `=SUM(U20:U21)` | other | Medium |
| Earth | V22 | `=SUM(V20:V21)` | other | Medium |
| Earth | W22 | `=SUM(W20:W21)` | other | Medium |
| Earth | X22 | `=SUM(X20:X21)` | other | Medium |
| Earth | Y22 | `=SUM(Y20:Y21)` | other | Medium |
| Earth | Z22 | `=SUM(Z20:Z21)` | other | Medium |
| Earth | AA22 | `=SUM(AA20:AA21)` | other | Medium |
| Earth | AB22 | `=SUM(AB20:AB21)` | other | Medium |
| Earth | AC22 | `=SUM(AC20:AC21)` | other | Medium |
| Earth | AD22 | `=SUM(AD20:AD21)` | other | Medium |
| Earth | AE22 | `=SUM(AE20:AE21)` | other | Medium |
| Earth | AF22 | `=SUM(AF20:AF21)` | other | Medium |
| Earth | AG22 | `=SUM(AG20:AG21)` | other | Medium |
| Earth | AH22 | `=SUM(AH20:AH21)` | other | Medium |
| Earth | AI22 | `=SUM(AI20:AI21)` | other | Medium |
| Earth | J25 | `=I29` | other | Simple |
| Earth | K25 | `=J29` | marsColonization | Simple |
| Earth | L25 | `=K29` | other | Simple |
| Earth | M25 | `=L29` | other | Simple |
| Earth | N25 | `=M29` | other | Simple |
| Earth | O25 | `=N29` | other | Simple |
| Earth | P25 | `=O29` | other | Simple |
| Earth | Q25 | `=P29` | other | Simple |
| Earth | R25 | `=Q29` | other | Simple |
| Earth | S25 | `=R29` | other | Simple |
| Earth | T25 | `=S29` | other | Simple |
| Earth | U25 | `=T29` | other | Simple |
| Earth | V25 | `=U29` | other | Simple |
| Earth | W25 | `=V29` | other | Simple |
| Earth | X25 | `=W29` | other | Simple |
| Earth | Y25 | `=X29` | other | Simple |
| Earth | Z25 | `=Y29` | other | Simple |
| Earth | AA25 | `=Z29` | other | Simple |
| Earth | AB25 | `=AA29` | other | Simple |
| Earth | AC25 | `=AB29` | other | Simple |
| Earth | AD25 | `=AC29` | other | Simple |
| Earth | AE25 | `=AD29` | other | Simple |
| Earth | AF25 | `=AE29` | other | Simple |
| Earth | AG25 | `=AF29` | other | Simple |
| Earth | AH25 | `=AG29` | other | Simple |
| Earth | AI25 | `=AH29` | other | Simple |
| Earth | I26 | `=I20` | other | Simple |
| Earth | J26 | `=J20` | other | Simple |
| Earth | K26 | `=K20` | marsColonization | Simple |
| Earth | L26 | `=L20` | other | Simple |
| Earth | M26 | `=M20` | other | Simple |
| Earth | N26 | `=N20` | other | Simple |
| Earth | O26 | `=O20` | other | Simple |
| Earth | P26 | `=P20` | other | Simple |
| Earth | Q26 | `=Q20` | other | Simple |
| Earth | R26 | `=R20` | other | Simple |
| Earth | S26 | `=S20` | other | Simple |
| Earth | T26 | `=T20` | other | Simple |
| Earth | U26 | `=U20` | other | Simple |
| Earth | V26 | `=V20` | other | Simple |
| Earth | W26 | `=W20` | other | Simple |
| Earth | X26 | `=X20` | other | Simple |
| Earth | Y26 | `=Y20` | other | Simple |
| Earth | Z26 | `=Z20` | other | Simple |
| Earth | AA26 | `=AA20` | other | Simple |
| Earth | AB26 | `=AB20` | other | Simple |
| Earth | AC26 | `=AC20` | other | Simple |
| Earth | AD26 | `=AD20` | other | Simple |
| Earth | AE26 | `=AE20` | other | Simple |
| Earth | AF26 | `=AF20` | other | Simple |
| Earth | AG26 | `=AG20` | other | Simple |
| Earth | AH26 | `=AH20` | other | Simple |
| Earth | AI26 | `=AI20` | other | Simple |
| Earth | I27 | `=SUM(I25:I26)` | other | Medium |
| Earth | J27 | `=SUM(J25:J26)` | other | Medium |
| Earth | K27 | `=SUM(K25:K26)` | marsColonization, optionValue | Medium |
| Earth | L27 | `=SUM(L25:L26)` | other | Medium |
| Earth | M27 | `=SUM(M25:M26)` | other | Medium |
| Earth | N27 | `=SUM(N25:N26)` | other | Medium |
| Earth | O27 | `=SUM(O25:O26)` | other | Medium |
| Earth | P27 | `=SUM(P25:P26)` | other | Medium |
| Earth | Q27 | `=SUM(Q25:Q26)` | other | Medium |
| Earth | R27 | `=SUM(R25:R26)` | other | Medium |
| Earth | S27 | `=SUM(S25:S26)` | other | Medium |
| Earth | T27 | `=SUM(T25:T26)` | other | Medium |
| Earth | U27 | `=SUM(U25:U26)` | other | Medium |
| Earth | V27 | `=SUM(V25:V26)` | other | Medium |
| Earth | W27 | `=SUM(W25:W26)` | other | Medium |
| Earth | X27 | `=SUM(X25:X26)` | other | Medium |
| Earth | Y27 | `=SUM(Y25:Y26)` | other | Medium |
| Earth | Z27 | `=SUM(Z25:Z26)` | other | Medium |
| Earth | AA27 | `=SUM(AA25:AA26)` | other | Medium |
| Earth | AB27 | `=SUM(AB25:AB26)` | other | Medium |
| Earth | AC27 | `=SUM(AC25:AC26)` | other | Medium |
| Earth | AD27 | `=SUM(AD25:AD26)` | other | Medium |
| Earth | AE27 | `=SUM(AE25:AE26)` | other | Medium |
| Earth | AF27 | `=SUM(AF25:AF26)` | other | Medium |
| Earth | AG27 | `=SUM(AG25:AG26)` | other | Medium |
| Earth | AH27 | `=SUM(AH25:AH26)` | other | Medium |
| Earth | AI27 | `=SUM(AI25:AI26)` | other | Medium |
| Earth | J28 | `=MAX(-J27,-(J58*$B$28))` | other | Medium |
| Earth | K28 | `=MAX(-K27,-(K58*$B$28))` | marsColonization | Medium |
| Earth | L28 | `=MAX(-L27,-(L58*$B$28))` | other | Medium |
| Earth | M28 | `=MAX(-M27,-(M58*$B$28))` | other | Medium |
| Earth | N28 | `=MAX(-N27,-(N58*$B$28))` | other | Medium |
| Earth | O28 | `=MAX(-O27,-(O58*$B$28))` | other | Medium |
| Earth | P28 | `=MAX(-P27,-(P58*$B$28))` | other | Medium |
| Earth | Q28 | `=MAX(-Q27,-(Q58*$B$28))` | other | Medium |
| Earth | R28 | `=MAX(-R27,-(R58*$B$28))` | other | Medium |
| Earth | S28 | `=MAX(-S27,-(S58*$B$28))` | other | Medium |
| Earth | T28 | `=MAX(-T27,-(T58*$B$28))` | other | Medium |
| Earth | U28 | `=MAX(-U27,-(U58*$B$28))` | other | Medium |
| Earth | V28 | `=MAX(-V27,-(V58*$B$28))` | other | Medium |
| Earth | W28 | `=MAX(-W27,-(W58*$B$28))` | other | Medium |
| Earth | X28 | `=MAX(-X27,-(X58*$B$28))` | other | Medium |
| Earth | Y28 | `=MAX(-Y27,-(Y58*$B$28))` | other | Medium |
| Earth | Z28 | `=MAX(-Z27,-(Z58*$B$28))` | other | Medium |
| Earth | AA28 | `=MAX(-AA27,-(AA58*$B$28))` | other | Medium |
| Earth | AB28 | `=MAX(-AB27,-(AB58*$B$28))` | other | Medium |
| Earth | AC28 | `=MAX(-AC27,-(AC58*$B$28))` | other | Medium |
| Earth | AD28 | `=MAX(-AD27,-(AD58*$B$28))` | other | Medium |
| Earth | AE28 | `=MAX(-AE27,-(AE58*$B$28))` | other | Medium |
| Earth | AF28 | `=MAX(-AF27,-(AF58*$B$28))` | other | Medium |
| Earth | AG28 | `=MAX(-AG27,-(AG58*$B$28))` | other | Medium |
| Earth | AH28 | `=MAX(-AH27,-(AH58*$B$28))` | other | Medium |
| Earth | AI28 | `=MAX(-AI27,-(AI58*$B$28))` | other | Medium |
| Earth | I29 | `=I27+I28` | other | Simple |
| Earth | J29 | `=J27+J28` | other | Simple |
| Earth | K29 | `=K27+K28` | marsColonization | Simple |
| Earth | L29 | `=L27+L28` | other | Simple |
| Earth | M29 | `=M27+M28` | other | Simple |
| Earth | N29 | `=N27+N28` | other | Simple |
| Earth | O29 | `=O27+O28` | other | Simple |
| Earth | P29 | `=P27+P28` | other | Simple |
| Earth | Q29 | `=Q27+Q28` | other | Simple |
| Earth | R29 | `=R27+R28` | other | Simple |
| Earth | S29 | `=S27+S28` | other | Simple |
| Earth | T29 | `=T27+T28` | other | Simple |
| Earth | U29 | `=U27+U28` | other | Simple |
| Earth | V29 | `=V27+V28` | other | Simple |
| Earth | W29 | `=W27+W28` | other | Simple |
| Earth | X29 | `=X27+X28` | other | Simple |
| Earth | Y29 | `=Y27+Y28` | other | Simple |
| Earth | Z29 | `=Z27+Z28` | other | Simple |
| Earth | AA29 | `=AA27+AA28` | other | Simple |
| Earth | AB29 | `=AB27+AB28` | other | Simple |
| Earth | AC29 | `=AC27+AC28` | other | Simple |
| Earth | AD29 | `=AD27+AD28` | other | Simple |
| Earth | AE29 | `=AE27+AE28` | other | Simple |
| Earth | AF29 | `=AF27+AF28` | other | Simple |
| Earth | AG29 | `=AG27+AG28` | other | Simple |
| Earth | AH29 | `=AH27+AH28` | other | Simple |
| Earth | AI29 | `=AI27+AI28` | other | Simple |
| Earth | B31 | `='Valuation Inputs & Logic'!I32` | growth, valuation | Simple |
| Earth | J31 | `=I39` | other | Simple |
| Earth | K31 | `=J39` | marsColonization | Simple |
| Earth | L31 | `=K39` | other | Simple |
| Earth | M31 | `=L39` | other | Simple |
| Earth | N31 | `=M39` | other | Simple |
| Earth | O31 | `=N39` | other | Simple |
| Earth | P31 | `=O39` | other | Simple |
| Earth | Q31 | `=P39` | other | Simple |
| Earth | R31 | `=Q39` | other | Simple |
| Earth | S31 | `=R39` | other | Simple |
| Earth | T31 | `=S39` | other | Simple |
| Earth | U31 | `=T39` | other | Simple |
| Earth | V31 | `=U39` | other | Simple |
| Earth | W31 | `=V39` | other | Simple |
| Earth | X31 | `=W39` | other | Simple |
| Earth | Y31 | `=X39` | other | Simple |
| Earth | Z31 | `=Y39` | other | Simple |
| Earth | AA31 | `=Z39` | other | Simple |
| Earth | AB31 | `=AA39` | other | Simple |
| Earth | AC31 | `=AB39` | other | Simple |
| Earth | AD31 | `=AC39` | other | Simple |
| Earth | AE31 | `=AD39` | other | Simple |
| Earth | AF31 | `=AE39` | other | Simple |
| Earth | AG31 | `=AF39` | other | Simple |
| Earth | AH31 | `=AG39` | other | Simple |
| Earth | AI31 | `=AH39` | other | Simple |
| Earth | I32 | `=-(MIN(Mars!E14,Mars!E15)*I43)` | marsColonization | Medium |
| Earth | J32 | `=-(MIN(Mars!F14,Mars!F15)*J43)` | marsColonization | Medium |
| Earth | K32 | `=-(MIN(Mars!G14,Mars!G15)*K43)` | marsColonization | Medium |
| Earth | L32 | `=-(MIN(Mars!H14,Mars!H15)*L43)` | marsColonization | Medium |
| Earth | M32 | `=-(MIN(Mars!I14,Mars!I15)*M43)` | marsColonization | Medium |
| Earth | N32 | `=-(MIN(Mars!J14,Mars!J15)*N43)` | marsColonization | Medium |
| Earth | O32 | `=-(MIN(Mars!K14,Mars!K15)*O43)` | marsColonization | Medium |
| Earth | P32 | `=-(MIN(Mars!L14,Mars!L15)*P43)` | marsColonization | Medium |
| Earth | Q32 | `=-(MIN(Mars!M14,Mars!M15)*Q43)` | marsColonization | Medium |
| Earth | R32 | `=-(MIN(Mars!N14,Mars!N15)*R43)` | marsColonization | Medium |
| Earth | S32 | `=-(MIN(Mars!O14,Mars!O15)*S43)` | marsColonization | Medium |
| Earth | T32 | `=-(MIN(Mars!P14,Mars!P15)*T43)` | marsColonization | Medium |
| Earth | U32 | `=-(MIN(Mars!Q14,Mars!Q15)*U43)` | marsColonization | Medium |
| Earth | V32 | `=-(MIN(Mars!R14,Mars!R15)*V43)` | marsColonization | Medium |
| Earth | W32 | `=-(MIN(Mars!S14,Mars!S15)*W43)` | marsColonization | Medium |
| Earth | X32 | `=-(MIN(Mars!T14,Mars!T15)*X43)` | marsColonization | Medium |
| Earth | Y32 | `=-(MIN(Mars!U14,Mars!U15)*Y43)` | marsColonization | Medium |
| Earth | Z32 | `=-(MIN(Mars!V14,Mars!V15)*Z43)` | marsColonization | Medium |
| Earth | AA32 | `=-(MIN(Mars!W14,Mars!W15)*AA43)` | marsColonization | Medium |
| Earth | AB32 | `=-(MIN(Mars!X14,Mars!X15)*AB43)` | marsColonization | Medium |
| Earth | AC32 | `=-(MIN(Mars!Y14,Mars!Y15)*AC43)` | marsColonization | Medium |
| Earth | AD32 | `=-(MIN(Mars!Z14,Mars!Z15)*AD43)` | marsColonization | Medium |
| Earth | AE32 | `=-(MIN(Mars!AA14,Mars!AA15)*AE43)` | marsColonization | Medium |
| Earth | AF32 | `=-(MIN(Mars!AB14,Mars!AB15)*AF43)` | marsColonization | Medium |
| Earth | AG32 | `=-(MIN(Mars!AC14,Mars!AC15)*AG43)` | marsColonization | Medium |
| Earth | AH32 | `=-(MIN(Mars!AD14,Mars!AD15)*AH43)` | marsColonization | Medium |
| Earth | AI32 | `=-(MIN(Mars!AE14,Mars!AE15)*AI43)` | marsColonization | Medium |
| Earth | I33 | `=I31+I32` | other | Simple |
| Earth | J33 | `=J31+J32` | other | Simple |
| Earth | K33 | `=K31+K32` | marsColonization | Simple |
| Earth | L33 | `=L31+L32` | other | Simple |
| Earth | M33 | `=M31+M32` | other | Simple |
| Earth | N33 | `=N31+N32` | other | Simple |
| Earth | O33 | `=O31+O32` | other | Simple |
| Earth | P33 | `=P31+P32` | other | Simple |
| Earth | Q33 | `=Q31+Q32` | other | Simple |
| Earth | R33 | `=R31+R32` | other | Simple |
| Earth | S33 | `=S31+S32` | other | Simple |
| Earth | T33 | `=T31+T32` | other | Simple |
| Earth | U33 | `=U31+U32` | other | Simple |
| Earth | V33 | `=V31+V32` | other | Simple |
| Earth | W33 | `=W31+W32` | other | Simple |
| Earth | X33 | `=X31+X32` | other | Simple |
| Earth | Y33 | `=Y31+Y32` | other | Simple |
| Earth | Z33 | `=Z31+Z32` | other | Simple |
| Earth | AA33 | `=AA31+AA32` | other | Simple |
| Earth | AB33 | `=AB31+AB32` | other | Simple |
| Earth | AC33 | `=AC31+AC32` | other | Simple |
| Earth | AD33 | `=AD31+AD32` | other | Simple |
| Earth | AE33 | `=AE31+AE32` | other | Simple |
| Earth | AF33 | `=AF31+AF32` | other | Simple |
| Earth | AG33 | `=AG31+AG32` | other | Simple |
| Earth | AH33 | `=AH31+AH32` | other | Simple |
| Earth | AI33 | `=AI31+AI32` | other | Simple |
| Earth | I34 | `=I21` | other | Simple |
| Earth | J34 | `=J21` | other | Simple |
| Earth | K34 | `=K21` | marsColonization | Simple |
| Earth | L34 | `=L21` | other | Simple |
| Earth | M34 | `=M21` | other | Simple |
| Earth | N34 | `=N21` | other | Simple |
| Earth | O34 | `=O21` | other | Simple |
| Earth | P34 | `=P21` | other | Simple |
| Earth | Q34 | `=Q21` | other | Simple |
| Earth | R34 | `=R21` | other | Simple |
| Earth | S34 | `=S21` | other | Simple |
| Earth | T34 | `=T21` | other | Simple |
| Earth | U34 | `=U21` | other | Simple |
| Earth | V34 | `=V21` | other | Simple |
| Earth | W34 | `=W21` | other | Simple |
| Earth | X34 | `=X21` | other | Simple |
| Earth | Y34 | `=Y21` | other | Simple |
| Earth | Z34 | `=Z21` | other | Simple |
| Earth | AA34 | `=AA21` | other | Simple |
| Earth | AB34 | `=AB21` | other | Simple |
| Earth | AC34 | `=AC21` | other | Simple |
| Earth | AD34 | `=AD21` | other | Simple |
| Earth | AE34 | `=AE21` | other | Simple |
| Earth | AF34 | `=AF21` | other | Simple |
| Earth | AG34 | `=AG21` | other | Simple |
| Earth | AH34 | `=AH21` | other | Simple |
| Earth | AI34 | `=AI21` | other | Simple |
| Earth | I35 | `=SUM(I33:I34)` | other | Medium |
| Earth | J35 | `=SUM(J33:J34)` | other | Medium |
| Earth | K35 | `=SUM(K33:K34)` | marsColonization | Medium |
| Earth | L35 | `=SUM(L33:L34)` | other | Medium |
| Earth | M35 | `=SUM(M33:M34)` | other | Medium |
| Earth | N35 | `=SUM(N33:N34)` | other | Medium |
| Earth | O35 | `=SUM(O33:O34)` | other | Medium |
| Earth | P35 | `=SUM(P33:P34)` | other | Medium |
| Earth | Q35 | `=SUM(Q33:Q34)` | other | Medium |
| Earth | R35 | `=SUM(R33:R34)` | other | Medium |
| Earth | S35 | `=SUM(S33:S34)` | other | Medium |
| Earth | T35 | `=SUM(T33:T34)` | other | Medium |
| Earth | U35 | `=SUM(U33:U34)` | other | Medium |
| Earth | V35 | `=SUM(V33:V34)` | other | Medium |
| Earth | W35 | `=SUM(W33:W34)` | other | Medium |
| Earth | X35 | `=SUM(X33:X34)` | other | Medium |
| Earth | Y35 | `=SUM(Y33:Y34)` | other | Medium |
| Earth | Z35 | `=SUM(Z33:Z34)` | other | Medium |
| Earth | AA35 | `=SUM(AA33:AA34)` | other | Medium |
| Earth | AB35 | `=SUM(AB33:AB34)` | other | Medium |
| Earth | AC35 | `=SUM(AC33:AC34)` | other | Medium |
| Earth | AD35 | `=SUM(AD33:AD34)` | other | Medium |
| Earth | AE35 | `=SUM(AE33:AE34)` | other | Medium |
| Earth | AF35 | `=SUM(AF33:AF34)` | other | Medium |
| Earth | AG35 | `=SUM(AG33:AG34)` | other | Medium |
| Earth | AH35 | `=SUM(AH33:AH34)` | other | Medium |
| Earth | AI35 | `=SUM(AI33:AI34)` | other | Medium |
| Earth | I36 | `=MAX(-I35,IF($B$31>I16,-I35,-(I59*$B$28)))` | other | Medium |
| Earth | J36 | `=MAX(-J35,IF($B$31>J16,-J35,-(J59*$B$28)))` | other | Medium |
| Earth | K36 | `=MAX(-K35,IF($B$31>K16,-K35,-(K59*$B$28)))` | marsColonization | Medium |
| Earth | L36 | `=MAX(-L35,IF($B$31>L16,-L35,-(L59*$B$28)))` | other | Medium |
| Earth | M36 | `=MAX(-M35,IF($B$31>M16,-M35,-(M59*$B$28)))` | other | Medium |
| Earth | N36 | `=MAX(-N35,IF($B$31>N16,-N35,-(N59*$B$28)))` | other | Medium |
| Earth | O36 | `=MAX(-O35,IF($B$31>O16,-O35,-(O59*$B$28)))` | other | Medium |
| Earth | P36 | `=MAX(-P35,IF($B$31>P16,-P35,-(P59*$B$28)))` | other | Medium |
| Earth | Q36 | `=MAX(-Q35,IF($B$31>Q16,-Q35,-(Q59*$B$28)))` | other | Medium |
| Earth | R36 | `=MAX(-R35,IF($B$31>R16,-R35,-(R59*$B$28)))` | other | Medium |
| Earth | S36 | `=MAX(-S35,IF($B$31>S16,-S35,-(S59*$B$28)))` | other | Medium |
| Earth | T36 | `=MAX(-T35,IF($B$31>T16,-T35,-(T59*$B$28)))` | other | Medium |
| Earth | U36 | `=MAX(-U35,IF($B$31>U16,-U35,-(U59*$B$28)))` | other | Medium |
| Earth | V36 | `=MAX(-V35,IF($B$31>V16,-V35,-(V59*$B$28)))` | other | Medium |
| Earth | W36 | `=MAX(-W35,IF($B$31>W16,-W35,-(W59*$B$28)))` | other | Medium |
| Earth | X36 | `=MAX(-X35,IF($B$31>X16,-X35,-(X59*$B$28)))` | other | Medium |
| Earth | Y36 | `=MAX(-Y35,IF($B$31>Y16,-Y35,-(Y59*$B$28)))` | other | Medium |
| Earth | Z36 | `=MAX(-Z35,IF($B$31>Z16,-Z35,-(Z59*$B$28)))` | other | Medium |
| Earth | AA36 | `=MAX(-AA35,IF($B$31>AA16,-AA35,-(AA59*$B$28)))` | other | Medium |

*... and 8390 more formulas*

---

## 📈 **Summary Statistics**

| Business Algorithm | Formula Count | % of Total |
|-------------------|---------------|------------|
| Time-Series Projections | 6321 | 71.1% |
| Mars Colonization Economics | 1413 | 15.9% |
| other | 1141 | 12.8% |
| Growth Projection | 830 | 9.3% |
| Milestone-Based Calculations | 624 | 7.0% |
| Market Penetration | 442 | 5.0% |
| Launch Economics | 339 | 3.8% |
| Present Value / Discounting | 196 | 2.2% |
| Revenue Calculation | 57 | 0.6% |
| Market Size / TAM | 53 | 0.6% |
| Valuation Calculation | 27 | 0.3% |
| Option Value Calculation | 16 | 0.2% |
| Taxes & Expenses | 7 | 0.1% |
| Cost Calculation | 3 | 0.0% |
| Terminal Value | 2 | 0.0% |

---

*Total Formulas Analyzed: 8890*
