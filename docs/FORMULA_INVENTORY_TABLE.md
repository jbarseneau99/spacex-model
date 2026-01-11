# Complete Formula Inventory

**Total Formulas**: 8890  
**Unique Patterns**: 113  
**Generated**: 2026-01-10T02:44:53.835Z

## Summary Statistics

### By Sheet
- **Valuation Inputs & Logic**: 69 formulas
- **Earth**: 7705 formulas
- **Mars**: 1038 formulas
- **Valuation Outputs**: 78 formulas

### Top Functions
- **IF**: 1605 uses
- **SUM**: 611 uses
- **MAX**: 368 uses
- **MIN**: 339 uses
- **AND**: 277 uses
- **OR**: 259 uses
- **IFERROR**: 233 uses
- **INDEX**: 131 uses
- **MATCH**: 131 uses
- **LN**: 78 uses
- **LOG**: 51 uses
- **COLUMN**: 51 uses
- **ROUNDDOWN**: 28 uses
- **IRR**: 26 uses
- **MOD**: 26 uses
- **EXP**: 26 uses
- **OFFSET**: 26 uses
- **RRI**: 13 uses
- **QUARTILE**: 6 uses
- **AVERAGE**: 3 uses

### Complexity Breakdown
- **Simple**: 4805 (54%)
- **Medium**: 3651 (41%)
- **Complex**: 434 (5%)

---

## Complete Formula Pattern Inventory

| # | Pattern | Count | Complexity | Sheets | Functions | Example | Status | Priority |
|---|---------|-------|------------|--------|-----------|---------|--------|----------|
| 1 | `=CELL` | 2230 | Simple | Earth, Mars | None | `=O153` | ✅ Implemented | P0 - Critical |
| 2 | `=CELL*CELL` | 908 | Simple | Earth, Mars | None | `=B7*B8` | ✅ Implemented | P0 - Critical |
| 3 | `=SUM(CELL:CELL)` | 401 | Medium | Earth, Mars | SUM | `=SUM(I20:I21)` | 🟡 Partial | P0 - Critical |
| 4 | `=CELL/CELL` | 380 | Simple | Earth, Mars | None | `=O408/$I$408` | ✅ Implemented | P0 - Critical |
| 5 | `SHEET!CELL` | 367 | Medium | Earth, Valuation Outputs, Mars | MIN | `=Mars!K54+Mars!K8-Mars!K27` | 🟡 Partial | P0 - Critical |
| 6 | `=CELL+CELL` | 348 | Simple | Earth, Mars | None | `=B9+B10` | ✅ Implemented | P0 - Critical |
| 7 | `=IF(CELL=STR,CELL,CELL)` | 312 | Medium | Earth | IF | `=IF(J245="Starlink Constellation Complete",J267,J398)` | 🟡 Partial | P0 - Critical |
| 8 | `=CELL-CELL` | 183 | Simple | Earth, Mars | None | `=J86-J87` | ✅ Implemented | P0 - Critical |
| 9 | `=IF(CELL=STR,CELL,NUM)` | 130 | Medium | Earth, Mars | IF | `=IF(J264="No",J270,0)` | 🟡 Partial | P0 - Critical |
| 10 | `=IF(CELL=STR,NUM,CELL)` | 104 | Medium | Earth | IF | `=IF(J245="Launch",0,J431)` | 🟡 Partial | P0 - Critical |
| 11 | `=IF(CELL=STR,CELL-CELL,NUM)` | 104 | Medium | Earth | IF | `=IF(J275="No",J273-J247,0)` | 🟡 Partial | P0 - Critical |
| 12 | `=IFERROR(CELL*(CELL/CELL),NUM)` | 104 | Medium | Earth | OR, IFERROR | `=IFERROR(J298*(J290/J292),0)` | 🟡 Partial | P0 - Critical |
| 13 | `=(CELL+CELL)*CELL` | 81 | Medium | Earth | None | `=(I47+I55)*I65` | 🟡 Partial | P1 - High |
| 14 | `=CELL*CELL*CELL` | 80 | Medium | Earth | None | `=I48*I65*$B$70` | 🟡 Partial | P1 - High |
| 15 | `=NUM-CELL` | 80 | Simple | Earth, Mars | None | `=1-I128` | ✅ Implemented | P1 - High |
| 16 | `=CELL+(CELL/CELL)` | 78 | Medium | Earth | None | `=I171+(J189/J174)` | 🟡 Partial | P1 - High |
| 17 | `=IF(CELL>CELL,STR,STR)` | 78 | Medium | Earth | IF | `=IF($B$234>J16,"Falcon 9","Starship")` | 🟡 Partial | P1 - High |
| 18 | `=MIN(CELL,CELL)` | 78 | Medium | Earth | MIN | `=MIN(J341,J345)` | 🟡 Partial | P1 - High |
| 19 | `=INDEX(CELL:CELL,MATCH(CELL-CELL,CELL:CELL))` | 78 | Medium | Earth | INDEX, MATCH | `=INDEX($E$428:J$428,MATCH(J410-$B411,$E$410:J$410))` | ❌ Not Implemented | P1 - High |
| 20 | `=CELL+NUM` | 76 | Simple | Mars, Earth | None | `=K6+1` | ✅ Implemented | P1 - High |
| 21 | `=CELL*(NUM-CELL)` | 76 | Simple | Earth, Mars | None | `=J329*(1-J331)` | ✅ Implemented | P1 - High |
| 22 | `=(CELL*CELL)` | 57 | Simple | Earth | None | `=(J249*J250)` | ✅ Implemented | P1 - High |
| 23 | `=CELL+CELL+CELL+CELL` | 54 | Medium | Earth | None | `=I35+I36+I37+I38` | 🟡 Partial | P1 - High |
| 24 | `=SUM(CELL:CELL,CELL)` | 54 | Medium | Earth | SUM | `=SUM(I47:I48,I55)` | 🟡 Partial | P1 - High |
| 25 | `=CELL/(NUM-CELL)` | 54 | Simple | Earth | None | `=I127/(1-I106)` | ✅ Implemented | P1 - High |
| 26 | `=(CELL+CELL)/CELL` | 54 | Medium | Earth | None | `=(I130+I159)/I65` | 🟡 Partial | P1 - High |
| 27 | `=CELL-CELL-CELL` | 54 | Medium | Earth | None | `=I119-I144-I152` | 🟡 Partial | P1 - High |
| 28 | `=CELL+CELL+CELL` | 54 | Medium | Earth | None | `=I171+I172+I173` | 🟡 Partial | P1 - High |
| 29 | `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL*(` | 52 | Complex | Earth | IF, MAX, MIN | `=IF($B$106>=0,MIN($B$105,I106*(1+$B$106)),MAX(I106*(1+$B$106` | 🟡 Partial | P1 - High |
| 30 | `=(CELL*CELL*CELL)+(CELL*CELL)` | 52 | Medium | Earth | None | `=(J219*J221*J222)+(J225*J219)` | 🟡 Partial | P1 - High |
| 31 | `=(CELL/CELL)/(NUM/CELL)` | 52 | Medium | Earth | None | `=(J258/J253)/(1/J42)` | 🟡 Partial | P1 - High |
| 32 | `=IF(AND(CELL=STR,CELL=STR,CELL=STR),CELL-CELL,NUM)` | 52 | Medium | Earth | IF, AND | `=IF(AND(J264="No",J265="No",J234="Falcon 9"),J261-J25,0)` | 🟡 Partial | P1 - High |
| 33 | `=IF(CELL>=CELL,STR,STR)` | 52 | Medium | Earth | IF | `=IF(J247>=J273,"Yes","No")` | 🟡 Partial | P1 - High |
| 34 | `=IFERROR(MAX(CELL,CELL)+(CELL/CELL),MAX(CELL,CELL)` | 52 | Complex | Earth | MAX, OR, IFERROR | `=IFERROR(MAX(I278,I361)+(J276/J281),MAX(I278,I361))` | 🟡 Partial | P1 - High |
| 35 | `=IF(AND(CELL=STR,CELL=STR),CELL+CELL,NUM)` | 52 | Medium | Earth | IF, AND | `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),J` | 🟡 Partial | P1 - High |
| 36 | `=IF(AND(CELL=STR,CELL=STR),(CELL/CELL)-CELL,NUM)` | 52 | Medium | Earth | IF, AND | `=IF(AND(J245="Starlink Constellation Complete",J275="Yes"),(` | 🟡 Partial | P1 - High |
| 37 | `=CELL*(NUM+CELL)` | 52 | Simple | Earth | None | `=I295*(1+$B$295)` | ✅ Implemented | P1 - High |
| 38 | `=IF(CELL=STR,(SUM(CELL,CELL)/CELL)-CELL,CELL-CELL)` | 52 | Medium | Earth | IF, SUM | `=IF(J275="No",(SUM(J25,J26)/J42)-J270,J290-J299)` | 🟡 Partial | P1 - High |
| 39 | `=CELL+((CELL+CELL+CELL)*(NUM/CELL))` | 52 | Medium | Earth | None | `=J380+((J382+J226+J227)*(1/J385))` | 🟡 Partial | P1 - High |
| 40 | `=MAX(CELL:CELL)*(NUM+CELL)` | 52 | Medium | Earth | MAX | `=MAX($I$20:I20)*(1+$B$394)` | 🟡 Partial | P1 - High |
| 41 | `SHEET!CELL)*CELL)` | 27 | Medium | Earth | MIN | `=-(MIN(Mars!E14,Mars!E15)*I43)` | 🟡 Partial | P2 - Medium |
| 42 | `=MAX(-CELL,IF(CELL>CELL,-CELL,-(CELL*CELL)))` | 27 | Medium | Earth | IF, MAX | `=MAX(-I35,IF($B$31>I16,-I35,-(I59*$B$28)))` | 🟡 Partial | P2 - Medium |
| 43 | `=-CELL` | 27 | Simple | Earth | None | `=-I32` | ✅ Implemented | P2 - Medium |
| 44 | `=CELL/NUM` | 27 | Simple | Earth | None | `=I66/0.75` | ✅ Implemented | P2 - Medium |
| 45 | `SHEET!CELL))*(IF((CELL*(NUM-CELL))>MAX(SHEET!CELL:` | 27 | Complex | Earth | IF, INDEX, MATCH, MAX | `=$B$95*(((1+$B$94)*(1+$B$96))^(Earth!I16-Earth!$I$16))*(IF((` | 🟡 Partial | P2 - Medium |
| 46 | `=(CELL-CELL)*CELL*CELL` | 27 | Medium | Earth | None | `=(I86-H86)*I426*I122` | 🟡 Partial | P2 - Medium |
| 47 | `=CELL+CELL+CELL+CELL+CELL+CELL` | 27 | Medium | Earth | None | `=I187+I186+I185+I189+I190+I191` | 🟡 Partial | P2 - Medium |
| 48 | `=CELL-CELL+CELL` | 27 | Medium | Earth | None | `=I182-I192+I196` | 🟡 Partial | P2 - Medium |
| 49 | `=MAX(CELL,CELL)` | 27 | Medium | Earth | MAX | `=MAX(I361,I278)` | 🟡 Partial | P2 - Medium |
| 50 | `=MAX(-CELL,-(CELL*CELL))` | 26 | Medium | Earth | MAX | `=MAX(-J27,-(J58*$B$28))` | 🟡 Partial | P2 - Medium |
| 51 | `=(CELL/NUM)*(CELL/CELL)^((LN(NUM-CELL)/LN(NUM)))+(` | 26 | Medium | Earth | LN | `=($B$42/365)*(I77/$B$77)^((LN(1-$B$43)/LN(2)))+(2/365)` | 🟡 Partial | P2 - Medium |
| 52 | `=IF(CELL>CELL,NUM,((CELL/NUM)*(CELL/CELL)^((LN(NUM` | 26 | Medium | Earth | IF, LN | `=IF($B$31>J16,1,(($B$42/365)*(I80/$B$80)^((LN(1-$B$43)/LN(2)` | 🟡 Partial | P2 - Medium |
| 53 | `=IF(CELL>=NUM,MIN(CELL,CELL*(NUM+CELL)),MAX(CELL,C` | 26 | Complex | Earth | IF, MAX, MIN | `=IF($B$65>=0,MIN($B$64,I66*(1+$B$65)),MAX($B$66,I66*(1+$B$65` | 🟡 Partial | P2 - Medium |
| 54 | `=CELL+((CELL*(CELL+CELL))+(CELL*(CELL+CELL)))` | 26 | Medium | Earth | None | `=I86+((J83*(J47+J55))+(J84*(J50+J56)))` | 🟡 Partial | P2 - Medium |
| 55 | `=CELL+(CELL*CELL)-(CELL*CELL)` | 26 | Medium | Earth | None | `=I90+(J426*J428)-(J431*J435)` | 🟡 Partial | P2 - Medium |
| 56 | `=(CELL+(CELL*CELL)-(CELL*CELL))` | 26 | Medium | Earth | None | `=(I91+(J428*J425)-(J431*J434))` | 🟡 Partial | P2 - Medium |
| 57 | `=(CELL/(CELL*(NUM-CELL)))*(CELL/(CELL/(CELL*(NUM-C` | 26 | Medium | Earth | None | `=(J95/(J91*(1-J92)))*($I$98/($I$95/($I$91*(1-$I$92))))` | 🟡 Partial | P2 - Medium |
| 58 | `=MIN(((CELL-(NUM/(NUM*NUM)))*CELL)/(CELL-(NUM/(NUM` | 26 | Medium | Earth | MIN | `=MIN(((J43-(1/(24*365)))*$I$128)/($I$42-(1/(24*365))),1)` | 🟡 Partial | P2 - Medium |
| 59 | `=MIN(NUM,IF(CELL>=NUM,CELL,CELL*(NUM-(CELL/NUM))))` | 26 | Medium | Earth | IF, MIN | `=MIN(1,IF(J244>=0,I147,I147*(1-(J244/4))))` | 🟡 Partial | P2 - Medium |
| 60 | `=CELL*(CELL-CELL)` | 26 | Medium | Earth | None | `=$B$189*(J86-I86)` | 🟡 Partial | P2 - Medium |
| 61 | `=(CELL*(NUM-CELL))` | 26 | Simple | Earth | None | `=(I91*(1-I92))` | ✅ Implemented | P2 - Medium |
| 62 | `=-IF(CELL=STR,(CELL+CELL+CELL+CELL)/(CELL*CELL),(C` | 26 | Complex | Earth | IF | `=-IF(J234="Starship",(J230+J215+J226+J227)/(J423*J220),(J229` | 🟡 Partial | P2 - Medium |
| 63 | `=(IF((CELL+NUM)>MAX(SHEET!CELL:CELL),INDEX(SHEET!C` | 26 | Complex | Earth | IF, INDEX, MATCH, MAX | `=(IF((J236+1)>MAX('Earth Bandwidth TAM'!$A$8:$A$1012),INDEX(` | 🟡 Partial | P2 - Medium |
| 64 | `=IFERROR(IRR(CELL:CELL),NUM)` | 26 | Complex | Earth | OR, IFERROR, IRR | `=IFERROR(IRR(J237:J242),0)` | ❌ Not Implemented | P2 - Medium |
| 65 | `=IF(CELL=STR,STR,IF(CELL=STR,IF(CELL>CELL,STR,STR)` | 26 | Medium | Earth | IF | `=IF(I245="Starlink Constellation Complete","Starlink Constel` | 🟡 Partial | P2 - Medium |
| 66 | `=IF(CELL=STR,NUM,IF(CELL>=NUM,CELL,NUM))` | 26 | Medium | Earth | IF | `=IF(J245="Launch",0,IF(J232>=0,J232,0))` | 🟡 Partial | P2 - Medium |
| 67 | `=IF(OR(CELL=STR,AND(CELL=STR,CELL=STR)),CELL/CELL,` | 26 | Complex | Earth | IF, AND, OR | `=IF(OR(J234="Falcon 9",AND(J265="No",J264="Yes")),J258/J253,` | 🟡 Partial | P2 - Medium |
| 68 | `=IF(CELL=STR,IF(AND(CELL=STR, CELL=STR),NUM,CELL/C` | 26 | Medium | Earth | IF, AND | `=IF(J234="Starship",IF(AND(J265="No", J264="Yes"),0,J259/J25` | 🟡 Partial | P2 - Medium |
| 69 | `=(CELL*CELL)+(CELL*CELL)+(CELL*(CELL+CELL+CELL))+(` | 26 | Complex | Earth | None | `=(J267*J210)+(J268*J216)+(J270*(J229+J226+J227))+(J271*(J230` | 🟡 Partial | P2 - Medium |
| 70 | `=CELL/SUM(CELL:CELL)` | 26 | Medium | Earth | SUM | `=J283/SUM(J226:J227)` | 🟡 Partial | P2 - Medium |
| 71 | `=MIN(CELL,CELL,CELL)` | 26 | Medium | Earth | MIN | `=MIN(J296,J292,J284)` | 🟡 Partial | P2 - Medium |
| 72 | `=CELL*(CELL+CELL)` | 26 | Medium | Earth | None | `=J298*(J226+J227)` | 🟡 Partial | P2 - Medium |
| 73 | `=CELL-CELL+CELL-CELL` | 26 | Medium | Earth | None | `=J247-J273+J276-J303` | 🟡 Partial | P2 - Medium |
| 74 | `=IF(CELL=STR,IF(CELL>=NUM,CELL,NUM),NUM)` | 26 | Medium | Earth | IF | `=IF(J245="Launch",IF(J232>=0,J232,0),0)` | 🟡 Partial | P2 - Medium |
| 75 | `=IF(CELL=STR,NUM%,NUM)` | 26 | Medium | Earth | IF | `=IF(J234="Falcon 9",66%,0)` | 🟡 Partial | P2 - Medium |
| 76 | `=IF(CELL>=NUM,MIN(NUM,CELL*(NUM+CELL)),MAX(CELL*(N` | 26 | Complex | Earth | IF, MAX, MIN | `=IF($B$334>=0,MIN(1,I332*(1+$B$334)),MAX(I332*(1+$B$334),$B$` | 🟡 Partial | P2 - Medium |
| 77 | `=IF(CELL=STR,CELL*CELL,NUM)` | 26 | Medium | Earth | IF | `=IF(J245="Launch",J344*$B$345,0)` | 🟡 Partial | P2 - Medium |
| 78 | `=(CELL+CELL)*(CELL+CELL)` | 26 | Medium | Earth | None | `=(J337+J347)*(J226+J227)` | 🟡 Partial | P2 - Medium |
| 79 | `=IF(CELL=STR,CELL/CELL,NUM)` | 26 | Medium | Earth | IF | `=IF(J234="Falcon 9",J378/J388,0)` | 🟡 Partial | P2 - Medium |
| 80 | `=IF(CELL=STR,NUM,CELL/CELL)` | 26 | Medium | Earth | IF | `=IF(J234="Falcon 9",0,J378/J389)` | 🟡 Partial | P2 - Medium |
| 81 | `=IF(CELL=STR,IF(CELL<CELL,(CELL-CELL)*CELL,NUM),IF` | 26 | Complex | Earth | IF | `=IF(J234="Falcon 9",IF(J398<J391,(J391-J398)*J388,0),IF(J399` | 🟡 Partial | P2 - Medium |
| 82 | `=(CELL)*(CELL/CELL)^((LN(NUM+CELL)/LN(NUM)))` | 26 | Medium | Earth | LN | `=($B$423)*(I413/$B$422)^((LN(1+$B$421)/LN(2)))` | 🟡 Partial | P2 - Medium |
| 83 | `=SUM(CELL:CELL)-SUM(CELL:CELL)` | 26 | Medium | Mars | SUM | `=SUM($F7:F7)-SUM($E27:E27)` | 🟡 Partial | P2 - Medium |
| 84 | `SHEET!CELL,MOD(CELL,NUM)=NUM),STR,STR)` | 26 | Complex | Mars | IF, AND, MOD | `=IF(AND(F6>=Earth!$B234,MOD(F6,2)=0),"Go For Launch","It Ain` | 🟡 Partial | P2 - Medium |
| 85 | `SHEET!CELL+CELL/CELL` | 26 | Medium | Mars | None | `=Earth!J139*Earth!J135*(F37+1)+F38*Earth!J216/Earth!J66+F43/` | 🟡 Partial | P2 - Medium |
| 86 | `=IFERROR(CELL/CELL,STR)` | 26 | Medium | Mars | OR, IFERROR | `=IFERROR(F10/F11,"")` | 🟡 Partial | P2 - Medium |
| 87 | `=CELL*(CELL+NUM)` | 26 | Simple | Mars | None | `=F12*(F37+1)` | ✅ Implemented | P2 - Medium |
| 88 | `=IF(CELL<=CELL,SHEET!STR)` | 26 | Medium | Mars | IF | `=IF(F15<=F14,"We Need More Rockets!","We Need More Money!")` | 🟡 Partial | P2 - Medium |
| 89 | `=ROUNDDOWN(MIN(CELL:CELL)/(CELL+NUM),NUM)*(NUM+CEL` | 26 | Medium | Mars | MIN, ROUNDDOWN | `=ROUNDDOWN(MIN(F22:F23)/(F37+1),0)*(1+F37)` | 🟡 Partial | P2 - Medium |
| 90 | `=IF(CELL=NUM,NUM,IF(AND(CELL>NUM,CELL=NUM),CELL,CE` | 26 | Complex | Mars | IF, AND, LOG | `=IF(F29=0,0,IF(AND(F29>0,E30=0),$B30,E30*(1-$B31)^LOG(F29/E2` | 🟡 Partial | P2 - Medium |
| 91 | `=SUM(CELL,CELL)*(NUM+CELL)` | 26 | Medium | Mars | SUM | `=SUM(F19,F25)*(1+F37)` | 🟡 Partial | P2 - Medium |
| 92 | `SHEET!CELL/NUM)` | 26 | Medium | Mars | EXP | `=(((Earth!J67/1000)+(0.186*(39.68*(Earth!J67/1000)^0.766)^0.` | 🟡 Partial | P2 - Medium |
| 93 | `=CELL/CELL*CELL` | 26 | Medium | Mars | None | `=F31/$B45*$B40` | 🟡 Partial | P2 - Medium |
| 94 | `=SUM(CELL:CELL)-OFFSET(CELL,NUM,MAX(-CELL,-(COLUMN` | 26 | Complex | Mars | SUM, MAX, OFFSET, COLUMN | `=SUM($F47:F47)-OFFSET(F52,0,MAX(-$B51,-(COLUMN()-5)))` | 🟡 Partial | P2 - Medium |
| 95 | `=CELL+CELL*(NUM-NUM/CELL)` | 26 | Medium | Mars | None | `=F53+E54*(1-1/$B54)` | 🟡 Partial | P2 - Medium |
| 96 | `=IFERROR((CELL-CELL)/CELL,NUM)` | 25 | Medium | Earth | OR, IFERROR | `=IFERROR((K243-J243)/J243,0)` | 🟡 Partial | P2 - Medium |
| 97 | `=(CELL+CELL)*(NUM-CELL)` | 25 | Medium | Mars | None | `=(F25+F19)*(1-F30)` | 🟡 Partial | P2 - Medium |
| 98 | `=CELL*(NUM+CELL)^(LOG(COLUMN()-COLUMN(CELL)+NUM,NU` | 25 | Medium | Mars | LOG, COLUMN | `=$F44*(1+$B52)^(LOG(COLUMN()-COLUMN($F44)+1,2))` | 🟡 Partial | P2 - Medium |
| 99 | `=RAND()` | 17 | Medium | Valuation Inputs & Logic | AND | `=RAND()` | 🟡 Partial | P2 - Medium |
| 100 | `=(CELL-CELL)/NUM+CELL` | 17 | Medium | Valuation Inputs & Logic | None | `=(E32-D32)/2+D32` | 🟡 Partial | P2 - Medium |
| 101 | `=SHEET!CELL` | 16 | Simple | Earth, Mars | None | `='Valuation Inputs & Logic'!I32` | ✅ Implemented | P2 - Medium |
| 102 | `=IF(CELL=CELL,CELL,IF(NORM.INV(CELL,CELL,(CELL-CEL` | 15 | Complex | Valuation Inputs & Logic | IF | `=IF(H33=E33,H33,IF(NORM.INV(G33,H33,(E33-H33))<C33,C33,IF(NO` | 🟡 Partial | P2 - Medium |
| 103 | `=QUARTILE(SHEET!CELL:CELL,NUM)/NUM^NUM` | 6 | Medium | Valuation Inputs & Logic | QUARTILE | `=QUARTILE('Valuation Outputs'!$M$7:$M$5006,1)/10^9` | ❌ Not Implemented | P3 - Low |
| 104 | `=RRI(((CELL-CELL)/NUM),CELL,CELL)` | 5 | Medium | Valuation Inputs & Logic | RRI | `=RRI(((D$13-$B$13)/365),$B$15,D15)` | 🟡 Partial | P3 - Low |
| 105 | `=_xlfn.RRI(((CELL-CELL)/NUM),CELL,CELL)` | 4 | Medium | Valuation Inputs & Logic | RRI | `=_xlfn.RRI(((C$8-$B$8)/365),$B$10,C10)` | 🟡 Partial | P3 - Low |
| 106 | `=RRI(NUM,CELL,CELL)` | 4 | Medium | Earth | RRI | `=RRI(6,I66,B66)` | 🟡 Partial | P3 - Low |
| 107 | `=AVERAGE(SHEET!CELL:CELL)/NUM^NUM` | 3 | Medium | Valuation Inputs & Logic | AVERAGE | `=AVERAGE('Valuation Outputs'!$M$7:$M$5006)/10^9` | 🟡 Partial | P3 - Low |
| 108 | `=NUM/CELL` | 2 | Simple | Earth | None | `=1/$B$28` | ✅ Implemented | P3 - Low |
| 109 | `=NUM/NUM` | 2 | Simple | Earth, Mars | None | `=96/575` | 🟡 Partial | P3 - Low |
| 110 | `=ROUNDDOWN(MAX(IF(CELL=CELL,CELL,IF(NORM.INV(CELL,` | 1 | Complex | Valuation Inputs & Logic | IF, MAX, ROUNDDOWN | `=ROUNDDOWN(MAX(IF(H32=D32,H32,IF(NORM.INV(G32,H32,(D32-H32))` | 🟡 Partial | P3 - Low |
| 111 | `=ROUNDDOWN(IF(CELL=CELL,CELL,IF(NORM.INV(CELL,CELL` | 1 | Complex | Valuation Inputs & Logic | IF, ROUNDDOWN | `=ROUNDDOWN(IF(H38=D38,H38,IF(NORM.INV(G38,H38,(D38-H38))<C38` | 🟡 Partial | P3 - Low |
| 112 | `=CELL/(CELL*CELL)` | 1 | Medium | Earth | None | `=I99/(I91*I92)` | 🟡 Partial | P3 - Low |
| 113 | `=CELL*CELL*CELL*NUM` | 1 | Medium | Mars | None | `=$B50*$B49*$B47*365` | 🟡 Partial | P3 - Low |

---

## Implementation Legend

- ✅ **Implemented**: Fully working in valuation-algorithms.js
- 🟡 **Partial**: Some functions implemented, needs completion
- ❌ **Not Implemented**: Missing critical functions

## Priority Legend

- **P0 - Critical**: Used 100+ times, must implement
- **P1 - High**: Used 50-99 times, should implement soon
- **P2 - Medium**: Used 10-49 times, implement when time allows
- **P3 - Low**: Used <10 times, low priority

---

## Notes

1. Patterns are normalized (cell references → CELL, numbers → NUM, strings → STR)
2. Example formulas show the first occurrence found
3. Function counts include all occurrences across all formulas
4. Implementation status is based on current valuation-algorithms.js capabilities

---

*This inventory accounts for all 8890 formulas across 113 unique patterns.*
