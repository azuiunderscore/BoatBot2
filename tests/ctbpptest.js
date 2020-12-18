"use strict";
ctbPPCalc(0, 99, 1000, 4, 9, 1000);
function ctbPPCalc(miss, acc, combo, stars, ar, mcombo) {
    if (combo == '') combo = mcombo;
    if (acc == '') acc = 100;
    if (miss == '') miss = 0;
    if (parseInt(combo)>parseInt(mcombo)) combo=mcombo;
    if (ar>11) ar=11;

    // Conversion from Star rating to pp
    let final = Math.pow(((5*(stars)/ 0.0049)-4),2)/100000;
    // Length Bonus
    let lengthbonus = (0.95 + 0.3 * Math.min(1.0, mcombo / 2500.0) + (mcombo > 2500 ? Math.log10(mcombo / 2500.0) * 0.475 : 0.0));
    final *= lengthbonus;
    // Miss Penalty
    final *= Math.pow(0.97, miss);
    // Not FC combo penalty
    final *= Math.pow(combo/mcombo,0.8);
    // AR Bonus
    let arbonus = 1;
    if (ar>9)
        arbonus+= 0.1 * (ar - 9.0);
    if (ar>10)
        arbonus+= 0.1 * (ar - 10.0);
    if (ar<8)
        arbonus+= 0.025 * (8.0 - ar);
    final *= arbonus;
    // Hidden bonus
    let hiddenbonus = 1;
    if (ar>10)
        hiddenbonus= 1.01 + 0.04 * (11 - Math.min(11,ar));
    else
        hiddenbonus= 1.05 + 0.075 * (10 - ar);
    // Acc Penalty
    final *=  Math.pow(acc/100, 5.5);
    console.log( Math.round(100*final)/100 + "pp");
    console.log( Math.round(100*final*hiddenbonus)/100+ "pp (+HD) " );
    console.log( Math.round(100*final* 1.35 * lengthbonus)/100+ "pp (+FL) " );
    console.log( Math.round(100*final* 1.35 * lengthbonus* hiddenbonus)/100+ "pp (+HDFL) " );
    function dt()
    {
        let ms;
        if (ar>5)	ms = 200+(11-ar)*100;
        else ms = 800+(5-ar)*80;

        if (ms<300) ar = 11;
        else if (ms<1200) ar = Math.round((11-(ms-300)/150)*100)/100;
        else ar = Math.round((5-(ms-1200)/120)*100)/100;
    }
    function ht()
    {
        let ms;
        if (ar>5)	ms = 400+(11-ar)*200;
        else ms = 1600+(5-ar)*160;

        if (ms<600) ar = 10;
        else if (ms<1200) ar = Math.round((11-(ms-300)/150)*100)/100;
        else ar = Math.round((5-(ms-1200)/120)*100)/100;
    }
}

