"use strict";
let fs = require("fs");
let tracking = JSON.parse(fs.readFileSync("./trackingfalse.json", { encoding: "utf8" }));
let deleted = 0;
for (let b in tracking) {
    for (let c in tracking[b].mode) {
        for (let d = 0; d < tracking[b].mode[c].channels.length; ++d) {
            if (tracking[b].mode[c].channels[d].crank != undefined) {//refresh country ranks
                tracking[b].mode[c].channels.splice(d, 1);
                --d;
                ++deleted;
            }
        }
    }
}
function strictParseInt(str) {
    let ans = ""
    for (let i = 0; i < str.length; ++i) {
        const temp = parseInt(str[i]);
        if (!isNaN(temp)) ans += temp;
        else return NaN;
    }
    return parseInt(ans);
}
for (let b in tracking) {
    if (isNaN(strictParseInt(b))) {
        delete tracking[b];
    }
}
console.log(deleted);
fs.writeFileSync("./tracking.json", JSON.stringify(tracking, null, "\t"));