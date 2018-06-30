"use strict";
let ta = require("./timeago.js");
let seq = require("./promise-sequential.js");
const mathjs = require("mathjs");
const fs = require("fs");
const countries = JSON.parse(fs.readFileSync("../data/countries.json", "utf-8"));
String.prototype.replaceAll = function(search, replacement) {
	let target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
}
Number.prototype.pad = function(size) {
	let s = String(this);
	while (s.length < (size || 2)) {s = "0" + s;}
	return s;
}
const modnames = [
	{ val: 1, name: "NoFail", short: "NF" },
	{ val: 2, name: "Easy", short: "EZ" },
	//{ val: 4, name: "NoVideo", short: "NV" },//no video or touchscreen
	{ val: 4, name: "TouchScreen", short: "TS" },//no video or touchscreen
	{ val: 8, name: "Hidden", short: "HD" },
	{ val: 16, name: "HardRock", short: "HR" },
	{ val: 32, name: "SuddenDeath", short: "SD" },
	{ val: 64, name: "DoubleTime", short: "DT" },
	{ val: 128, name: "Relax", short: "RX" },
	{ val: 256, name: "HalfTime", short: "HT" },
	{ val: 512, name: "Nightcore", short: "NC" },
	{ val: 1024, name: "Flashlight", short: "FL" },
	{ val: 2048, name: "Autoplay", short: "AT" },
	{ val: 4096, name: "SpunOut", short: "SO" },
	{ val: 8192, name: "Autopilot", short: "AP" },
	{ val: 16384, name: "Perfect", short: "PF" },
	{ val: 32768, name: "Key4", short: "4K" },
	{ val: 65536, name: "Key5", short: "5K" },
	{ val: 131072, name: "Key6", short: "6K" },
	{ val: 262144, name: "Key7", short: "7K" },
	{ val: 524288, name: "Key8", short: "8K" },
	{ val: 1048576, name: "FadeIn", short: "FI" },
	{ val: 2097152, name: "Random", short: "RD" },
	{ val: 4194304, name: "LastMod", short: "LM" },
	{ val: 16777216, name: "Key9", short: "9K" },
	{ val: 33554432, name: "Key10", short: "XK" },
	{ val: 67108864, name: "Key1", short: "1K" },
	{ val: 134217728, name: "Key3", short: "3K" },
	{ val: 268435456, name: "Key2", short: "2K" },
	{ val: 268435456 * 2, name: "ScoreV2", short: "V2" },
];
const doublemods = [
	["NC", "DT"],
	["PF", "SD"]
];
const short_mod_values = {
	"NF": 1,
	"EZ": 2,
	"NV": 4,
	"TS": 4,
	"HD": 8,
	"HR": 16,
	"SD": 32,
	"DT": 64,
	"RX": 128,
	"RL": 128,
	"HT": 256,
	"NC": 512,
	"FL": 1024,
	"AT": 2048,
	"SO": 4096,
	"AP": 8192,
	"PF": 16384,
	"4K": 32768,
	"5K": 65536,
	"6K": 131072,
	"7K": 262144,
	"8K": 524288,
	"FI": 1048576,
	"RD": 2097152,
	"LM": 4194304,
	"9K": 16777216,
	"XK": 33554432,
	"1K": 67108864,
	"3K": 134217728,
	"2K": 268435456,
	"V2": 268435456 * 2
};
module.exports = class UTILS {
	output(t) {//general utility function
		if (this.exists(t)) {
			let n = new Date().toISOString().slice(0, 19).replace('T', ' ');;
			console.log(n + "." + new Date().getMilliseconds().pad(3) + " " + (this.exists(process.env.SHARD_ID) ? "$" + process.env.SHARD_ID : "") + ": " + t);
		}
	}
	debug(t, override) {
		if (this.exists(override)) {
			if (override) this.output(t);
		}
		else if (process.env.DEBUG == "true") this.output(t);
	}
	exists(anyObject) {//general utility function
		if (anyObject !== null && anyObject !== undefined) return true;
		else return false;
	}
	numberWithCommas(x) {//general utility function
		if (this.exists(x)) {
			let parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}
		else return "";
	}
	round(num, decimal = 0) {
		return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
	}
	assert(condition) {
		if (typeof (condition) != "boolean") throw new Error("asserting non boolean value: " + typeof (condition));
		if (!condition) throw new Error("assertion false");
		return true;
	}
	ago(date) {
		return ta.ago(date);
	}
	until(date) {
		const now = new Date().getTime();
		let answer = ta.ago(now - (date.getTime() - now));
		answer = answer.substring(0, answer.length - 4);
		return answer;
	}
	duration(now, date) {
		now = now.getTime();
		let answer = ta.ago(now - (date.getTime() - now));
		answer = answer.substring(0, answer.length - 4);
		return answer;
	}
	english(text) {
		return text.split("_").map(t => t.substring(0, 1).toUpperCase() + t.substring(1).toLowerCase()).join(" ");
	}
	standardTimestamp(sec) {
		let mins = Math.floor(parseInt(sec) / 60);
		let hours = Math.floor(parseInt(mins) / 60);
		mins = mins % 60;
		let secs = Math.floor(parseInt(sec) % 60);
		if (secs < 10) secs = "0" + secs;
		if (mins < 10) mins = "0" + mins;
		if (hours < 10) hours = "0" + hours;
		if (hours == "00") return mins + ":" + secs;
		else return hours + ":" + mins + ":" + secs;
	}
	gold(number) {
		number /= 1000;
		return this.round(number, 1) + "k";
	}
	indexOfInstance(string, searchString, index) {
		let answer = -1;
		for (let i = 0, count = 0; i < string.length - searchString.length; ++i) {
			if (string.substring(i, i + searchString.length) == searchString) {
				++count;
				if (count == index) answer = i;
			}
		}
		return answer;
	}
	preferredTextChannel(client, collection, type, names, permissions) {
		for (let i = 0; i < names.length; ++i) {
			let candidate = collection.find(ch => {
				if (ch.type === type && ch.name.toLowerCase() === names[i].toLowerCase() && ch.permissionsFor(client.user).has(permissions)) return true;
			});
			if (this.exists(candidate)) return candidate;
		}
		return collection.find(ch => { if (ch.type === type && ch.permissionsFor(client.user).has(permissions)) return true; });
	}
	trim(network) {
		let count = 0;
		for (let a in network) for (let b in network[a]) if (network[a][b] < 2) { delete network[a][b]; ++count; }
		return count;
	}
	getGroup(candidate, graph, visited = {}) {//traverse graph
		//this.output("candidate: " + candidate);
		for (let b in graph[candidate]) {
			if (!this.exists(visited[b])) {
				visited[b] = true;
				this.getGroup(b, graph, visited);
			}
		}
		let answer = [];
		for (let b in visited) answer.push(b);
		answer.sort();
		return answer;
	}
	sequential(tasks) {
		return seq(tasks);
	}
	copy(obj) {//no functions
		return JSON.parse(JSON.stringify(obj));
	}
	removeAllOccurances(arr, deletable) {
		while (arr.indexOf(deletable) != -1) arr.splice(arr.indexOf(deletable), 1);
	}
	defaultChannelNames() {
		return ["general", "bot", "bots", "bot-commands", "botcommands", "commands", "league", "osu", "games", "standard", "taiko", "mania", "ctb", "catch-the-beat", "fruit", "fruits", "spam"];
	}
	durationParse(duration) {
		let multiplier = duration.substring(duration.length - 1, duration.length).toUpperCase();
		if (multiplier == "D") multiplier = 24 * 60 * 60 * 1000;//days
		else if (multiplier == "H") multiplier = 60 * 60 * 1000;//hours
		else return NaN;
		return parseInt(duration) * multiplier;
	}
	map(x, in_min, in_max, out_min, out_max) {
		return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	}
	conditionalFormat(text, surrounds, condition = true) {
		return condition ? surrounds + text + surrounds : text;
	}
	arbitraryLengthInt(text) {//returns string
		let answer = "";
		for (let i = 0; i < text.length; ++i) {
			if (!isNaN(parseInt(text[i]))) answer += text[i];
			else break;
		}
		return answer;
	}
	calcAimAcc(parsed, pp_raw) {
		let topHits = 0;
		let topMisses = 0;
		let fms = "";
		let pfm = "";
		let pfmp = "";
		let modCount = {};//counts the frequency of mods
		let modObject = [];//array of strings which contain the mod identifier and frequency by percentage
		let modPP = {};//let p in modPP where p is modID and modPP[p] is weighted sum
		let ppObject = [];//array of strings which contain the mod identifier and sum of pp
		let pppObject = [];//array of strings which contain the mod identifier and share of pp
		let modFrequency = 0;
		let minPP = parsed.length === 0 ? 0 : parsed[parsed.length - 1].pp;
		let maxPP = parsed.length === 0 ? 0 : parsed[0].pp;
		let ppRange = parseFloat(maxPP) - parseFloat(minPP);
		let sRatio = 0;
		let modsegregated = {};
		let ppstddev = [];
		let ppTotal = 0;

		//output("parsed.length is " + parsed.length);
		for (let i = 0; i < parsed.length; i++) {
			topHits = topHits + parseInt(parsed[i].count50) + parseInt(parsed[i].count100) + parseInt(parsed[i].count300);
			topMisses = topMisses + parseInt(parsed[i].countmiss);
			//output (topHits + " m: " + topMisses);
			if (!this.exists(modPP[parsed[i].enabled_mods])) modPP[parsed[i].enabled_mods] = parseFloat(parsed[i].pp) * Math.pow(0.95, i);
			else modPP[parsed[i].enabled_mods] = modPP[parsed[i].enabled_mods] + (parseFloat(parsed[i].pp) * Math.pow(0.95, i));
			if (!this.exists(modCount[parsed[i].enabled_mods])) modCount[parsed[i].enabled_mods] = 1;
			else ++modCount[parsed[i].enabled_mods];
			++modFrequency;
			if (parsed[i].rank == "S" || parsed[i].rank == "X" || parsed[i].rank == "SH" || parsed[i].rank == "XH") sRatio = sRatio + 1;
			if (!this.exists(modsegregated[parsed[i].enabled_mods])) modsegregated[parsed[i].enabled_mods] = 1;
			else ++modsegregated[parsed[i].enabled_mods];
			ppstddev.push(parseFloat(parsed[i].pp));
			ppTotal += parseFloat(parsed[i].pp);
		}
		sRatio = this.round((sRatio / modFrequency) * 100, 1);
		let aimAccuracy = (topHits) / (topHits + topMisses);
		for (let i in modCount) {//stringifying modCount to modObject
			if (i == "0") modObject.push(["\tNone: `" + this.round((modCount[i] / modFrequency) * 100, 1) + "%`", modCount[i]]);
			else modObject.push(["\t" + this.getMods(i) + ":`" + this.round((modCount[i] / modFrequency) * 100, 1) + "%`", modCount[i]]);
		}
		for (let i in modPP) {//stringifying modPP to ppObject
			if (i == "0") {
				ppObject.push(["\tNone: `" + this.round(modPP[i], 1) + "`pp", modPP[i]]);
				pppObject.push(["\tNone: `" + this.round(modPP[i] * 100 / parseFloat(pp_raw), 1) + "%`", modPP[i] / parseFloat(pp_raw)])
			}
			else {
				ppObject.push(["\t" + this.getMods(i) + ":`" + this.round(modPP[i], 1) + "`pp", modPP[i]]);
				pppObject.push(["\t" + this.getMods(i) + ":`" + this.round(modPP[i] * 100 / parseFloat(pp_raw), 1) + "%`", modPP[i] / parseFloat(pp_raw)]);
			}
		}
		let mns = {};
		for (let i in modsegregated) {
			if (i != "0") {
				const gml = this.getMods(i).length - 1;
				for (let c = 1; c < gml + 1; c += 2) {
					//output(getMods(i) + ":" + getMods(i).substring(c, c + 2));
					if (this.exists(mns[this.getMods(i).substring(c, c + 2)])) mns[this.getMods(i).substring(c, c + 2)] += modsegregated[i];
					else mns[this.getMods(i).substring(c, c + 2)] = modsegregated[i];
				}
			}
			else {
				if (this.exists(mns[i])) mns[i] += modsegregated[i];
				else mns[i] = modsegregated[i];
			}
		}
		let msarray = [];
		for (let i in mns) {
			if (i == "0") msarray.push(["\tNone: `" + this.round((mns[i] * 100) / modFrequency, 1) + "%`", mns[i]]);
			else msarray.push(["\t+" + i + ": `" + this.round((mns[i] * 100) / modFrequency, 1) + "%`", mns[i]]);
		}
		msarray.sort((a, b) => b[1] - a[1]);
		let ms = msarray.map(a => a[0]).join("");
		let modMax = modObject.length;
		for (let i = 0; i < modMax; i++) {
			let currentMaxFrequency = 0;
			let indexMaxFrequency = 0;
			for (let j in modObject) {
				if (modObject[j][1] > currentMaxFrequency) {
					indexMaxFrequency = j;
					currentMaxFrequency = modObject[j][1];
				}
			}
			fms = fms + modObject[indexMaxFrequency][0];
			modObject.splice(indexMaxFrequency, 1);
		}
		modMax = ppObject.length;
		for (let i = 0; i < modMax; i++) {
			let currentMaxFrequency = 0;
			let indexMaxFrequency = 0;
			for (let j in ppObject) {
				if (ppObject[j][1] > currentMaxFrequency) {
					indexMaxFrequency = j;
					currentMaxFrequency = ppObject[j][1];
				}
			}
			pfm = pfm + ppObject[indexMaxFrequency][0];
			ppObject.splice(indexMaxFrequency, 1);
		}
		modMax = pppObject.length;
		for (let i = 0; i < modMax; i++) {
			let currentMaxFrequency = 0;
			let indexMaxFrequency = 0;
			for (let j in pppObject) {
				if (pppObject[j][1] > currentMaxFrequency) {
					indexMaxFrequency = j;
					currentMaxFrequency = pppObject[j][1];
				}
			}
			pfmp = pfmp + pppObject[indexMaxFrequency][0];
			pppObject.splice(indexMaxFrequency, 1);
		}
		//this.output(aimAccuracy);
		return { aimAccuracy, fms, minPP, maxPP, ppRange, sRatio, pfm, pfmp, ms, ppstddev: (parsed.length === 0 ? 0 : this.round(mathjs.std(ppstddev, "uncorrected"), 2)), ppTotal: this.numberWithCommas(this.round(ppTotal, 2)) };
	}
	calcAcc(mode, scoreObject) {
		let hits = (parseInt(scoreObject.count300) * 300) + (parseInt(scoreObject.count100) * 100) + (parseInt(scoreObject.count50) * 50);
		//output("hits are " + hits);
		let objects_hit = parseInt(scoreObject.count300) + parseInt(scoreObject.count100) + parseInt(scoreObject.count50) + parseInt(scoreObject.countmiss);//objects encountered
		let total = objects_hit * 300;
		//output("total is " + total);
		let acc = this.round(hits * 100 / total, 2);
		if (mode == 1) {
			hits = (parseInt(scoreObject.count300) + (parseInt(scoreObject.count100) * .5)) * 300;
			total = (parseInt(scoreObject.count300) + parseInt(scoreObject.count100) + parseInt(scoreObject.countmiss)) * 300;
			objects_hit = parseInt(scoreObject.count300) + parseInt(scoreObject.count100) + parseInt(scoreObject.countmiss);
			acc = this.round((hits * 100) / total, 2);
		}
		else if (mode == 2) {
			hits = parseInt(scoreObject.count50) + parseInt(scoreObject.count100) + parseInt(scoreObject.count300);
			total = parseInt(scoreObject.countkatu) + parseInt(scoreObject.count50) + parseInt(scoreObject.count100) + parseInt(scoreObject.count300) + parseInt(scoreObject.countmiss);
			objects_hit = parseInt(scoreObject.countkatu) + parseInt(scoreObject.count50) + parseInt(scoreObject.count100) + parseInt(scoreObject.count300) + parseInt(scoreObject.countmiss);
			acc = this.round((hits * 100) / total, 2);
		}
		else if (mode == 3) {
			hits = (parseInt(scoreObject.count300) * 300) + (parseInt(scoreObject.count100) * 100) + (parseInt(scoreObject.count50) * 50) + (parseInt(scoreObject.countgeki) * 300) + (parseInt(scoreObject.countkatu) * 200);
			total = (parseInt(scoreObject.count300) + parseInt(scoreObject.count100) + parseInt(scoreObject.count50) + parseInt(scoreObject.countmiss) + parseInt(scoreObject.countgeki) + parseInt(scoreObject.countkatu)) * 300;
			objects_hit = parseInt(scoreObject.count300) + parseInt(scoreObject.count100) + parseInt(scoreObject.count50) + parseInt(scoreObject.countmiss) + parseInt(scoreObject.countgeki) + parseInt(scoreObject.countkatu);
			acc = this.round(hits * 100 / total, 2);
		}
		return acc;
	}
	getModNumber(mod_string) {
		let answer = 0;
		let answer_object = {};
		for (let b in short_mod_values) {
			answer_object[b] = false;
		}
		for (let i = 0; i < mod_string.length; i += 2) {
			if (this.exists(short_mod_values[mod_string.substring(i, i + 2).toUpperCase()])) {
				answer += short_mod_values[mod_string.substring(i, i + 2).toUpperCase()];
				answer_object[mod_string.substring(i, i + 2).toUpperCase()] = true;
			}
		}
		let answerstring = this.getMods(answer);
		answer_object.value = answer;
		answer_object.string = answerstring;
		return answer_object;
	}
	getMods(modnum) {
		modnum = parseInt(modnum);
		let mods = [];
		for (let i = modnames.length - 1; i >= 0; i--) {
			if (modnames[i].val <= modnum) {
				if (modnames[i].short !== "") {
					mods.push(modnames[i].short);
				}
				modnum -= modnames[i].val;
			}
		}
		// handle doublemods
		for (let i = 0; i < doublemods.length; i++) {
			if (mods.indexOf(doublemods[i][0]) >= 0) {
				mods.splice(mods.indexOf(doublemods[i][1]), 1);
			}
		}
		if (mods.length === 0) return "";
		else return "+" + mods.reverse().join("");
	}
	pickPlaystyle(mouse, keyboard, tablet, touchscreen) {
		let answer = "";
		if (mouse) answer += "<:mouse:382248628259127307>";
		if (keyboard) answer += "<:keyboard:382247276422103040>";
		if (tablet) answer += "<:tablet:382246804449918977>";
		if (touchscreen) answer += "<:touchscreen:382248053895200780>";
		return answer;
	}
	accessLevel(CONFIG, msg, uid) {
		if (!this.exists(uid)) uid = msg.author.id;
		if (this.exists(CONFIG.OWNER_DISCORD_IDS[uid]) && CONFIG.OWNER_DISCORD_IDS[uid].active) return CONFIG.CONSTANTS.BOTOWNERS;
		const MEMBER = uid === msg.author.id ? msg.member : msg.guild.members.get(uid);
		if (!this.exists(MEMBER)) return CONFIG.CONSTANTS.NORMALMEMBERS;//PM
		else if (MEMBER.id === msg.guild.ownerID) return CONFIG.CONSTANTS.SERVEROWNERS;
		else if (MEMBER.hasPermission(["BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_MESSAGES", "MANAGE_ROLES", "MANAGE_CHANNELS"])) return CONFIG.CONSTANTS.ADMINISTRATORS;
		else if (MEMBER.hasPermission(["KICK_MEMBERS", "MANAGE_MESSAGES"])) return CONFIG.CONSTANTS.MODERATORS;
		else if (this.exists(MEMBER.roles.find(r => r.name.toLowerCase() === "bot commander"))) return CONFIG.CONSTANTS.BOTCOMMANDERS;
		else return CONFIG.CONSTANTS.NORMALMEMBERS;
	}
	getCountryName(country_code) {
		return this.exists(countries[country_code]) ? countries[country_code] : country_code;
	}
}
