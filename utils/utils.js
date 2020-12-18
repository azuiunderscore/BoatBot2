"use strict";
let ta = require("./timeago.js");
let seq = require("./promise-sequential.js");
const fs = require("fs");
const countries = JSON.parse(fs.readFileSync("../data/countries.json", "utf-8"));
let child_process = require("child_process");

String.prototype.replaceAll = function(search, replacement) {
	let target = this;
	return target.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
}

String.prototype.count = function(search) {
	return (this.match(new RegExp(search, "g")) || []).length;
}

String.prototype.indexOfInstance = function(searchString, index) {
	let answer = -1;
	for (let i = 0, count = 0; i < this.length - searchString.length; ++i) {
		if (this.substring(i, i + searchString.length) == searchString) {
			++count;
			if (count == index) answer = i;
		}
	}
	return answer;
}

String.prototype.limit = function (size) {
	let arr = this.split(" ");
	let ans = "";
	for (let i = 0; i < arr.length; ++i) {
		if (ans.length + arr[i].length > size) break;
		else ans += arr[i] + " ";
	}
	ans = ans.trim();
	if (ans.length === 0) return this.substring(0, size);
	else return ans;
}
String.prototype.sanitizeMentions = function() {
	return this.replaceAll("@", "");
}
String.prototype.sanitizeBeatmapName = function() {
	return this.replaceAll("<", "\\<").replaceAll(">", "\\>");
}
Number.prototype.pad = function(size) {
	let s = String(this);
	while (s.length < (size || 2)) { s = "0" + s; }
	return s;
}

const modnames = [
	{ val: 1, name: "NoFail", short: "NF" },
	{ val: 2, name: "Easy", short: "EZ" },
	//{ val: 4, name: "NoVideo", short: "NV" },//no video or touchscreen
	{ val: 4, name: "TouchDevice", short: "TD" },//no video or touchscreen
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
	{ val: 536870912, name: "ScoreV2", short: "V2" },
	{ val: 1073741824, name: "Mirror", short: "MR" }
];

const doublemods = [
	["NC", "DT"],
	["PF", "SD"]
];

const short_mod_values = {
	"NF": 1,
	"EZ": 2,
	"NV": 4,
	"TD": 4,
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
	"V2": 536870912
};

Number.prototype.round = function(decimal = 0) {
	return Math.round(this * Math.pow(10, decimal)) / Math.pow(10, decimal);
}

module.exports = class UTILS {
	/** Prints a message to the console
	 * 	@param t	 {string}	The message to print.
	 * **/
	output(t) {
		if (this.exists(t)) {
			let n = new Date().toISOString().slice(0, 19).replace('T', ' ');;
			console.log(n + "." + new Date().getMilliseconds().pad(3) + " " + (this.exists(process.env.SHARD_ID) ? "$" + process.env.SHARD_ID : "") + ": " + t);
		}
	}
	/**	Only prints the message to the console if debug mode is on
	 *	@param 	t			{string}	The message to print.
	 *	@param	override	{boolean}	If the message should be printed anyway.
	 * **/
	debug(t, override) {
		if (this.exists(override)) {
			if (override) this.output(t);
		}
		else if (process.env.DEBUG == "true") this.output(t);
	}

	/** Checks an object to make sure it isn't undefined or null
	 * @param 	anyObject	The object to check.
	 * @returns {boolean}
	 */
	exists(anyObject) {
		if (anyObject !== null && anyObject !== undefined) return true;
		else return false;
	}

	/** Outputs a comma-seperated number
	 * 	@param 	x 	{number}	The number to comma-seperate
	 * 	@return 	{string}
	 * **/
	numberWithCommas(x) {//general utility function
		if (this.exists(x)) {
			let parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}
		else return "";
	}

	/**	Rounds the input to the next integer
	 * 	@param num 	{number}	The number to round
	 * 	@return {number}		The number rounded to the next integer
	 * **/
	round(num, decimal = 0) {
		return Math.round(num * Math.pow(10, decimal)) / Math.pow(10, decimal);
	}

	/** Throws an error if the condition is false
	 * 	@param condition				The condition to validate.
	 * 	@param message		{string}	A message to be appended to the error.
	 * **/
	assert(condition, message) {
		if (typeof (condition) != "boolean") {
			console.trace();
			throw new Error("Asserting non boolean value: " + typeof (condition));
		}
		if (!condition) {
			console.trace();
			throw new Error("Assertion false" + (this.exists(message) ? ": " + message : ""));
		}
		return true;
	}

	/** Determines how long ago a date was
	 * 	@param 	date
	 * 	@return	{string}
	 * **/
	ago(date) {
		return ta.ago(date);
	}

	/** Determines how long ago a date was, indicated in short form
	 * 	@param 	date
	 * 	@return {string}
	 * **/
	shortAgo(date) {
		return ta.ago(date, true);
	}

	until(date) {
		const now = new Date().getTime();
		let answer = ta.ago(now - (date.getTime() - now));
		answer = answer.substring(0, answer.length - 4);
		return answer;
	}
	duration(now, date) {
		now = now.getTime();
		date = date.getTime();
		const diff = Math.abs(now - date);
		let answer = ta.ago(new Date().getTime() - diff);
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
		secs = secs.pad(2);
		if (hours == 0) {
			return mins + ":" + secs;
		}
		else {
			mins = mins.pad(2);
			hours = hours.pad(2);
			return hours + ":" + mins + ":" + secs;
		}
	}
	gold(number) {
		number /= 1000;
		return number.toFixed(1) + "k";
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
		return collection.find(ch => ch.type === type && ch.permissionsFor(client.user).has(permissions));
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
	removeAllOccurances(arr, deletable) {//in place deletion
		let deleted = 0;
		if (typeof(deletable) === "function") {
			for (let i = 0; i < arr.length; ++i) {
				if (deletable(arr[i])) {
					arr.splice(i, 1);
					--i;
					++deleted;
				}
			}
		}
		else {
			while (arr.indexOf(deletable) != -1) {
				arr.splice(arr.indexOf(deletable), 1);
				++deleted;
			}
		}
		return deleted;//number of deleted items
	}
	defaultChannelNames() {
		return ["general", "bot", "bots", "bot-commands", "botcommands", "commands", "osu", "games", "standard", "taiko", "mania", "ctb", "catch-the-beat", "fruit", "fruits", "boatbot", "boat-bot", "spam"];
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
	constrain(x, min, max) {
		if (x <= min) return min;
		else if (x >= max) return max;
		return x;
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
	calcAimAcc(mathjs, parsed, pp_raw) {
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
		let answer = 0;//mod number
		let answer_object = {};
		for (let b in short_mod_values) {
			answer_object[b] = false;
		}
		for (let i = 0; i < mod_string.length; i += 2) {
			const candidate = mod_string.substring(i, i + 2).toUpperCase();
			if (this.exists(short_mod_values[candidate])) {
				answer += short_mod_values[candidate];
				answer_object[candidate] = true;
				for (let b in doublemods) {
					if (doublemods[b][0] === candidate) {
						answer += short_mod_values[doublemods[b][1]];
						answer_object[doublemods[b][1]] = true;
					}
				}
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
	pickPlaystyle(CONFIG, mouse, keyboard, tablet, touchscreen) {
		let answer = "";
		if (mouse) answer += CONFIG.EMOJIS.mouse;
		if (keyboard) answer += CONFIG.EMOJIS.keyboard;
		if (tablet) answer += CONFIG.EMOJIS.tablet;
		if (touchscreen) answer += CONFIG.EMOJIS.touchscreen;
		return answer;
	}
	constrain(x, min, max) {
		if (x <= min) return min;
		else if (x >= max) return max;
		return x;
	}
	conditionalFormat(text, surrounds, condition = true) {
		return condition ? surrounds + text + surrounds : text;
	}
	fstr(condition, tstr = "", fstr = "") {
		return condition ? tstr : fstr;
	}
	accessLevel(CONFIG, msg, uid) {//uid optional
		if (!this.exists(uid)) uid = msg.author.id;
		if (this.exists(CONFIG.OWNER_DISCORD_IDS[uid]) && CONFIG.OWNER_DISCORD_IDS[uid].active) return CONFIG.CONSTANTS.BOTOWNERS;//if it's an owner id
		const MEMBER = uid === msg.author.id ? msg.member : msg.guild.members.cache.get(uid);
		if (!this.exists(MEMBER)) {
			this.output(`ERROR: unable to read msg.member for message ${msg.id}`);
			return CONFIG.CONSTANTS.NORMALMEMBERS;//PM
		}
		else {
			//this.output(`msg.member is valid for message ${msg.id}`);
		}
		if (MEMBER.id === msg.guild.ownerID) return CONFIG.CONSTANTS.SERVEROWNERS;
		else if (MEMBER.hasPermission(["BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_MESSAGES", "MANAGE_ROLES", "MANAGE_CHANNELS"])) return CONFIG.CONSTANTS.ADMINISTRATORS;
		else if (MEMBER.hasPermission(["KICK_MEMBERS", "MANAGE_MESSAGES"])) return CONFIG.CONSTANTS.MODERATORS;
		else if (this.exists(MEMBER.roles.cache.find(r => r.name.toLowerCase() === "bot commander"))) return CONFIG.CONSTANTS.BOTCOMMANDERS;
		else return CONFIG.CONSTANTS.NORMALMEMBERS;
	}
	getCountryName(country_code) {
		return this.exists(countries[country_code]) ? countries[country_code] : country_code;
	}
	generateTeams(summoners) {//generates all possible teams
		/*summoners is an array of summoner objects from the API
		00000 00000: 0: invalid
		00000 11111: 31: valid
		00001 00000: 32: invalid
		11111 00000: 992: valid
		11111 00001: 993: invalid
		team 0 is always the larger team
		*/
		let combinations = [];
		let min_team_size = Math.trunc(summoners.length / 2);
		let max_team_size = Math.ceil(summoners.length / 2);
		for (let i = 0; i < Math.pow(2, summoners.length); ++i) {
			const candidate = i.toString(2).padStart(summoners.length, "0");
			if (candidate.count("1") == min_team_size) combinations.push(candidate);
		}
		return min_team_size === max_team_size ? combinations.slice(0, combinations.length / 2) : combinations;
	}
	calculateTeamStatistics(mathjs, team, data) {
		/*
		team = "1100010011"
		data = []
		*/
		let temp = {
			raw: [[], []],//raw values
			min: [0, 0],//minimum values
			med: [0, 0],//median
			max: [0, 0],//maximum values
			avg: [0, 0],//team averages
			stdev: [0, 0],//standard deviation
			sum: [0, 0],//team_0 sum, team_1 sum
			diff: 0,//absolute difference of sum
			abs: 0//team 0 - team 1
		}
		for (let i = 0; i < team.length; ++i) {
			temp.sum[parseInt(team[i])] += data[i];
			temp.raw[parseInt(team[i])].push(data[i]);
		}
		for (let t = 0; t < 2; ++t) {
			temp.min[t] = mathjs.min(temp.raw[t]);
			temp.max[t] = mathjs.max(temp.raw[t]);
			temp.avg[t] = mathjs.mean(temp.raw[t]);
			temp.med[t] = mathjs.median(temp.raw[t]);
			temp.stdev[t] = mathjs.std(temp.raw[t], "uncorrected");//σ: population standard deviation
		}
		temp.diff = temp.sum[0] - temp.sum[1];//team 0 - team 1
		temp.abs = Math.abs(temp.sum[0] - temp.sum[1]);
		return temp;
	}
	randomOf(choices) {
		return choices[Math.trunc(Math.random() * choices.length)];
	}
	randomInt(a, b) {//[a, b)
		a = Math.ceil(a);
		b = Math.floor(b);
		return Math.trunc(Math.random() * (b - a)) + a;
	}
	disciplinaryStatus(docs) {
		const now = new Date().getTime();
		let active_ban = -1;//-1 = no ban, 0 = perma, other = temp ban
		for (let b in docs) {
			if (docs[b].ban && docs[b].active) {
				const ban_date = new Date(docs[b].date);
				if (ban_date.getTime() == 0) {
					active_ban = 0;
					break;
				}
				else if (ban_date.getTime() > now) {
					if (ban_date.getTime() > active_ban) active_ban = ban_date.getTime();
				}
			}
		}
		let recent_ban = false;
		for (let b in docs) {
			if (docs[b].ban) {
				const ban_date = new Date(docs[b].date);
				if (now - (180 * 24 * 60 * 60 * 1000) < ban_date.getTime()) {//180 day
					recent_ban = true;
					break;
				}
			}
		}
		let recent_warning = false;
		for (let b in docs) {
			if (!docs[b].ban && docs[b].reason.substring(0, 9) == ":warning:") {
				const warn_date = new Date(docs[b].date);
				if (now - (180 * 24 * 60 * 60 * 1000) < warn_date.getTime()) {//180 day
					recent_warning = true;
					break;
				}
			}
		}
		let most_recent_note;
		for (let i = 0; i < docs.length; ++i) {
			if (!docs[i].ban && docs[i].reason.substring(0, 20) == ":information_source:") {
				most_recent_note = docs[i].reason;
				break;
			}
		}
		return { active_ban, recent_ban, recent_warning, most_recent_note };
	}
	disciplinaryStatusString(status, user) {
		this.assert(this.exists(user), "UTILS.dSS(status, user): user doesn't exist");
		let answer = user ? "User: " : "Server: ";
		if (status.active_ban == -1 && !status.recent_ban && !status.recent_warning) answer += ":white_check_mark: Good standing.";
		else {
			if (status.active_ban >= 0) {
				if (status.active_ban == 0) answer += ":no_entry: Permabanned";
				else answer += ":no_entry: Temporarily banned until " + this.until(new Date(status.active_ban));
			}
			else {
				if (status.recent_ban && status.recent_warning) answer += ":warning: Recently banned\n:warning: Recently warned";
				else if (status.recent_warning) answer += ":warning: Recently warned";
				else if (status.recent_ban) answer += ":warning: Recently banned";
			}
		}
		if (this.exists(status.most_recent_note)) answer += "\nMost recent note: " + status.most_recent_note;
		return answer;
	}
	isInt(x) {
		x = x + "";
		let valid = false;
		for (let i = 0; i < x.length; ++i) {
			if (!isNaN(parseInt(x[i]))) valid = true;
			else return false;
		}
		return valid;
	}
	embedRaw(richembed) {
		return {
			author: this.exists(richembed.author) ? this.copy(richembed.author) : undefined,
			color: richembed.color,
			description: richembed.description,
			fields: this.exists(richembed.fields) ? this.copy(richembed.fields) : undefined,
			footer: this.exists(richembed.footer) ? this.copy(richembed.footer) : undefined,
			image: this.exists(richembed.image) ? this.copy(richembed.image) : undefined,
			thumbnail: this.exists(richembed.thumbnail) ? this.copy(richembed.thumbnail) : undefined,
			timestamp: this.exists(richembed.timestamp) ? new Date(richembed.timestamp) : undefined,
			title: richembed.title,
			url: richembed.url
		};
	}
	expectNumber(str) {
		let newStr = "";
		for (let i = 0; i < str.length; ++i) {
			if (!isNaN(parseInt(str[i]))) {
				newStr += str[i];
			}
		}
		newStr = parseInt(newStr);
		if (isNaN(newStr)) return NaN;
		else return newStr;
	}
	parseQuery(queryString) {//do not pass in full URL
		var query = {};
		var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i].split('=');
			if (this.exists(query[decodeURIComponent(pair[0])])) {//already exists, so must be a set
				if (typeof(query[decodeURIComponent(pair[0])]) !== "object") {//is not an array yet
					query[decodeURIComponent(pair[0])] = [query[decodeURIComponent(pair[0])]];//make array
				}
				query[decodeURIComponent(pair[0])].push(pair[1]);//put at end of array
			}
			else query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
		}
		return query;
	}
	aggregateClientEvals(client, arr) {//numerical only
		let par = [];
		let that = this;
		for (let b of arr) {
			par.push(new Promise((resolve, reject) => {
				client.shard.broadcastEval(b[0]).then(r => {
					resolve(that.exists(b[1]) ? b[1](r) : r);
				}).catch(reject);
			}));
		}
		return Promise.all(par);
	}
	generateGraph(mathjs, raw, height = 5, width = 35) {
		let answer = "";
		let min = raw[0][0];//start time
		let max = raw[raw.length - 1][0];//end time
		const y_vals = raw.map(point => point[1]);
		const y_min = mathjs.min(y_vals);
		const y_max = mathjs.max(y_vals);
		const raw_normalized = raw.map(point => {
			point[1] = this.map(point[1], y_min, y_max, 0, 1);
			return point;
		});
		for (let r = 0; r < height; ++r) {
			answer += "\n";
			for (let i = 0; i < width; ++i) {
				const targetTime = this.map(i, 0, width, min, max);
				let closestTimeLeft = min;
				let closestHealthLeft = raw_normalized[0][1];
				let closestTimeRight = max;
				let closestHealthRight = raw_normalized[raw_normalized.length - 1][1];
				for (let j = 1; j < raw_normalized.length; ++j) {
					if (raw_normalized[j][0] >= targetTime) {
						closestTimeLeft = raw_normalized[j - 1][0];
						closestHealthLeft = raw_normalized[j - 1][1];
						closestTimeRight = raw_normalized[j][0];
						closestHealthRight = raw_normalized[j][1];
						break;
					}
				}
				let slope = (closestHealthRight - closestHealthLeft) / (closestTimeRight - closestTimeLeft);
				let healthValue = (slope * (targetTime - closestTimeRight)) + closestHealthRight;
				//output("(" + r + "," + i + ") is " + healthValue);
				if (healthValue >= 0.95 - (r * 0.2)) {
					answer += "█";
				}
				else if (healthValue < 0.95 - (r * 0.2) && healthValue >= 1 - ((r + 1) * 0.2)) {
					answer += "▄";
				}
				else {
					answer += " ";
				}
			}
			if (r === 0) answer += y_max;
			else if (r === height - 1) answer += y_min;
		}
		return "```" + answer + "```";
	}
	fstr(condition, tstr = "", fstr = "") {
		return condition ? tstr : fstr;
	}
	now() {
		return new Date().getTime();
	}
	strictParseInt(str) {
		let ans = ""
		for (let i = 0; i < str.length; ++i) {
			const temp = parseInt(str[i]);
			if (!isNaN(temp)) ans += temp;
			else return NaN;
		}
		return parseInt(ans);
	}
	gnuPlotGoldAdvantageGraph(array_of_points, x_size = 52, y_size = 18) {//[{x, y}, ...]
		let that = this;
		return new Promise((resolve, reject) => {
			const wincmd = "powershell.exe -Command \"\\\"" + array_of_points.map(p => p.x + " " + p.y).join("`n") + "\\\" | gnuplot -e \\\"set terminal dumb nofeed " + x_size + " " + y_size + "; set xlabel 'Minutes'; set tics scale 0; plot '-' with filledcurves y=0 notitle\\\"\"";
			const linuxcmd = "printf \"" + array_of_points.map(p => p.x + " " + p.y).join("\\n") + "\\\" | gnuplot -e \"set terminal dumb nofeed " + x_size + " " + y_size + "; set xlabel 'Minutes'; set tics scale 0; plot '-' with filledcurves y=0 notitle\"";
			if (process.platform === "win32") {
				child_process.exec(wincmd, { timeout: 1000 }, (err, stdout, stderr) => {
					if (err) reject(err);
					if (that.exists(stderr) && stderr != "") reject(stderr);
					else {
						let answer = stdout.split("\n");
						answer.splice(0, 1);//remove first line
						answer.splice(answer.length - 1, 1);//remove last line
						resolve(answer.join("\n"));
					}
				});
			}
			else {
				child_process.exec(linuxcmd, { timeout: 1000 }, (err, stdout, stderr) => {
					if (err) reject(err);
					if (that.exists(stderr) && stderr != "") reject(stderr);
					else {
						let answer = stdout.split("\n");
						answer.splice(0, 1);//remove first line
						answer.splice(answer.length - 1, 1);//remove last line
						resolve(answer.join("\n"));
					}
				});
			}
		});
	}

	permute(ext_input) {
		let permArr = [];
		let usedChars = [];
		internal_permute(ext_input);
		function internal_permute(input) {
			for (let i = 0; i < input.length; i++) {
				let ch = input.splice(i, 1)[0];
				usedChars.push(ch);
				if (input.length == 0) {
				permArr.push(usedChars.slice());
				}
				internal_permute(input);
				input.splice(i, 0, ch);
				usedChars.pop();
			}
		}
		return permArr;
	}
	defaultObjectValues(template, original) {
		template = this.copy(template);
		for (let i in template) {
			if (!this.exists(original[i])) original[i] = template[i];
		}
	}

	now() {
		return new Date().getTime();
	}

	scoreIsUserTop100(score, user_best) {
		if (!this.exists(user_best)) return -1;
		let that = this;
		let candidate = user_best.findIndex(v => {
			that.assert(that.exists(v.date));
			that.assert(that.exists(score.date));
			that.assert(that.exists(v.beatmap_id));
			that.assert(that.exists(score.beatmap_id));
			that.assert(that.exists(v.score));
			that.assert(that.exists(score.score));
			that.assert(that.exists(v.enabled_mods));
			that.assert(that.exists(score.enabled_mods));
			return v.date.getTime() === score.date.getTime() &&
				v.score === score.score &&
				v.beatmap_id === score.beatmap_id &&
				v.enabled_mods === score.enabled_mods;
		});
		return candidate;//returns -1 if score is not top 100 of user's best plays
	}
	pickCircle(num) {//max is 1.00
		if (num < .125) {
			return "◯";
		}
		else if (num < .375) {
			return "◔";
		}
		else if (num < .625) {
			return "◑"
		}
		else if (num < .875) {
			return "◕";
		}
		else {
			return "⬤";
		}
	}
	inspect(name, object) {
		let ostr = "";
		if (typeof(object) === "object") {
			try {
				this.output(`${name} is type ${typeof(object)} with value ${JSON.stringify(object, null, "\t")}`);
			}
			catch(e) {
				//console.error(e);
				this.output(`${name} is type ${typeof(object)} as circularly referencing Object`);
			}
		}
		else if (typeof (object) === "string") {
			this.output(`${name} is type ${typeof(object)} with value(${object.length}) ${object}`);
		}
		else {
			this.output(`${name} is type ${typeof(object)} with value ${object}`);
		}
	}
	tryCount(recents, index) {
		let trycount = 1;
		const beatmapid = recents[index].beatmap_id;
		const mods = recents[index].enabled_mods;
		for (let i = index + 1; i < recents.length; ++i) {//start 1 off
			if (recents[i].beatmap_id == beatmapid && recents[i].enabled_mods == mods) {
				++trycount;
			}
		}
		return trycount;
	}
	cleanContent(str, msg) {
		return str.replace(/@(everyone|here)/g, '@\u200b$1')
		.replace(/<@!?[0-9]+>/g, input => {
			const id = input.replace(/<|!|>|@/g, '');
			if (msg.channel.type === 'dm' || msg.channel.type === 'group') {
				return msg.client.users.has(id) ? `@${msg.client.users.get(id).username}` : input;
			}

			const member = msg.channel.guild.members.get(id);
			if (member) {
				if (member.nickname) return `@${member.nickname}`;
				return `@${member.user.username}`;
			} else {
				const user = msg.client.users.get(id);
				if (user) return `@${user.username}`;
				return input;
			}
		})
		.replace(/<#[0-9]+>/g, input => {
			const channel = msg.client.channels.cache.get(input.replace(/<|#|>/g, ''));
			if (channel) return `#${channel.name}`;
			return input;
		})
		.replace(/<@&[0-9]+>/g, input => {
			if (msg.channel.type === 'dm' || msg.channel.type === 'group') return input;
			const role = msg.guild.roles.get(input.replace(/<|@|>|&/g, ''));
			if (role) return `@${role.name}`;
			return input;
		});
	}
	generateBeatmapLink(beatmap) {
		return `https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}#${["osu", "taiko", "fruits", "mania"][parseInt(beatmap.mode)]}/${beatmap.beatmap_id}`
	}
	zeroArray(length) {
		let ans = [];
		for (let i = 0; i < length; ++i) {
			ans.push(0);
		}
		return ans;
	}
}
