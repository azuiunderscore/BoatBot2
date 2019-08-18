"use strict";
const Discord = require("discord.js");
const UTILS = new (require("../utils/utils.js"))();
const JSON5 = require("json5");
const mathjs = require("mathjs");
const crypto = require("crypto");
const regression = require("regression");
const child_process = require("child_process");
const HORIZONTAL_SEPARATOR = "------------------------------";
const VERIFIED_ICON = "✅";
const TAB = " ";
const MANIA_KEY_COLOR = [0, 13421823, 13421823, 13421823, 10066431, 6711039, 3289855, 255, 204, 204, 204];
const MODE_COLOR = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
function getStars(CONFIG, mode, stars, diff_aim) {
	UTILS.assert(UTILS.exists(CONFIG));
	UTILS.assert(UTILS.exists(mode));
	UTILS.assert(!isNaN(stars) || !isNaN(diff_aim));
	if (isNaN(stars)) stars = diff_aim;
	stars = Math.floor(stars);
	if (stars >= 8) stars = 7;
	return CONFIG.EMOJIS.stars[parseInt(mode)][stars];
}
function wholeStarValue(stars, diff_aim) {//for emojis only, returns 1-6
	if (isNaN(stars) || !UTILS.exists(stars)) stars = diff_aim;
	stars = Math.floor(stars);
	if (stars >= 8) stars = 7;
	else if (stars < 1) stars = 1;
	return stars;
}
// the below code related to mod code interpretation was not written by me. it was taken off github here: https://github.com/limjeck/osuplus/blob/master/osuplus.user.js
// I do not take credit for this portion of code.
const modnames = [
	{ val: 1, name: "NoFail", short: "NF" },
	{ val: 2, name: "Easy", short: "EZ" },
	//{ val: 4, name: "NoVideo", short: "NV" },//no video or TouchDevice
	{ val: 4, name: "TouchDevice", short: "TD" },//no video or TouchDevice
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
function getModObject(mod_string) {//takes in a string of mods non-comma separated and turns it into the raw value
	let answer = 0;
	let answer_object = {};
	for (let b in short_mod_values) {
		answer_object[b] = false;
	}
	for (let i = 0; i < mod_string.length; i += 2) {
		const candidate_mod = mod_string.substring(i, i + 2).toUpperCase();
		if (UTILS.exists(short_mod_values[candidate_mod])) {
			answer += short_mod_values[candidate_mod];
			answer_object[candidate_mod] = true;
			for (let b in doublemods) {
				if (doublemods[b][0] === candidate_mod) {
					answer += short_mod_values[doublemods[b][1]];
				}
			}
		}
	}
	let answerstring = getMods(answer);
	answer_object.value = answer;
	answer_object.string = answerstring;
	return answer_object;
}
function getMods(modnum) {
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
function getProgress(mode, oppai, score) {//returns float between 0-1 or null if unavailable
	if (mode === 0 || mode === 1) {
		return (score.countmiss + score.count50 + score.count100 + score.count300) /
		(oppai.num_circles + oppai.num_spinners + oppai.num_sliders);
	}
	else return -1;//possible to implement for ctb or mania, autoconvert status needs to be detected
}
function maxPPCalculator(pathToOsu, mode, options) {//options.acc, options.combo, options.mods, options.stars, options.OD, options.score, options.objects
	return new Promise((resolve, reject) => {
		if (mode == 0 | mode == 1) {//specific score or general acc FC
			let args = [pathToOsu, "-m" + mode, "-ojson"];
			if (UTILS.exists(options.mods)) args.push(getMods(options.mods));
			if (UTILS.exists(options.acc)) args.push(options.acc + "%");
			if (UTILS.exists(options.combo)) args.push(options.combo + "x");
			child_process.execFile("../oppai", args, { timeout: 2500 }, (err, stdout, stderr) => {
				try {
					let oo = JSON.parse(stdout);//oppai object
					if (err) return reject(err);
					if (UTILS.exists(stderr) && stderr != "") return reject(stderr);
					//check stderr
					resolve(oo);
				}
				catch(e) { reject(e); }
			});
		}
		/*
		else if (mode == 3) {//mania (mods, stars, OD, score, acc, objects) (specific score only)
			if (options.mods != 0) resolve(0);
			let d = options.stars; //SR
			let OD = options.OD;
			UTILS.assert(!isNaN(d));
			if (d < 0) return reject(new Error("invalid SR"));
			UTILS.assert(!isNaN(OD));
			if (OD < 0 || OD > 10) return reject(new Error("invalid OD " + options.OD));
			let h = options.score; //Score
			UTILS.assert(!isNaN(h));
			if (h < 0 || h > 1000000) return reject(new Error("invalid score"));
			let i = options.acc; //Acc
			UTILS.assert(!isNaN(i));
			if (i < 0 || i > 100) return reject(new Error("invalid acc"));
			let e = options.objects; //Objects
			UTILS.assert(!isNaN(e));
			if (e < 0) return reject(new Error("invalid objects"));
			let f = 64 - 3 * OD;
			let k = Math.pow((150 / f) * Math.pow(i / 100, 16), 1.8) * 2.5 * Math.min(1.15, Math.pow(e / 1500, 0.3));
			let l = (Math.pow(5 * Math.max(1, d / 0.0825) - 4, 3) / 110000) * (1 + 0.1 * Math.min(1, e / 1500));
			let m = (h < 500000) ? h / 500000 * 0.1 : ((h < 600000) ? (h - 500000) / 100000 * 0.2 + 0.1 : ((h < 700000) ? (h - 600000) / 100000 * 0.35 + 0.3 : ((h < 800000) ? (h - 700000) / 100000 * 0.2 + 0.65 : ((h < 900000) ? (h - 800000) / 100000 * 0.1 + 0.85 : (h - 900000) / 100000 * 0.05 + 0.95))));
			resolve(Math.pow(Math.pow(k, 1.1) + Math.pow(l * m, 1.1), 1 / 1.1) * 1.1);
		}*/
		else reject(new Error("invalid osu mode: " + mode))
	});
}
function ppCalculator(pathToOsu, mode, options) {
	//std: options.combo, options.mods, count300, count100, count50, countmiss
	//mania: options.combo, options.mods, options.stars, options.OD, options.score, options.objects
	return new Promise((resolve, reject) => {
		if (mode == 0 | mode == 1) {//specific score or general acc FC
			let args = [pathToOsu, "-m" + mode, `${options.count100}x100`, `${options.count50}x50`, `${options.countmiss}xm`, "-ojson"];
			if (UTILS.exists(options.mods)) args.push(getMods(options.mods));
			if (UTILS.exists(options.acc)) args.push(options.acc + "%");
			if (UTILS.exists(options.combo)) args.push(options.combo + "x");
			if (UTILS.exists(options.end)) args.push(`-end${options.end}`);
			UTILS.debug("args: " + args.join(" "));
			child_process.execFile("../oppai", args, { timeout: 2500 }, (err, stdout, stderr) => {
				try {
					UTILS.debug("PP Calculator, specific score output:");
					UTILS.debug(stdout);
					let oo = JSON.parse(stdout);//oppai object
					if (err) return reject(err);
					if (UTILS.exists(stderr) && stderr != "") return reject(stderr);
					//check stderr
					resolve(oo.pp);
				}
				catch(e) { reject(e); }
			});
		}
		else if (mode == 3) {//mania (mods, stars, OD, score, acc, objects) (specific score only)
			if (options.mods != 0) reject(new Error("mania mods not 0"));
			let d = options.stars; //SR
			let OD = options.OD;
			UTILS.assert(!isNaN(d));
			if (d < 0) return reject(new Error("invalid SR"));
			UTILS.assert(!isNaN(OD));
			if (OD < 0 || OD > 10) return reject(new Error("invalid OD " + options.OD));
			let h = options.score; //Score
			UTILS.assert(!isNaN(h));
			if (h < 0 || h > 1000000) return reject(new Error("invalid score"));
			let i = options.acc; //Acc
			UTILS.assert(!isNaN(i));
			if (i < 0 || i > 100) return reject(new Error("invalid acc"));
			let e = options.objects; //Objects
			UTILS.assert(!isNaN(e));
			if (e < 0) return reject(new Error("invalid objects"));
			let f = 64 - 3 * OD;
			let k = Math.pow((150 / f) * Math.pow(i / 100, 16), 1.8) * 2.5 * Math.min(1.15, Math.pow(e / 1500, 0.3));
			let l = (Math.pow(5 * Math.max(1, d / 0.0825) - 4, 3) / 110000) * (1 + 0.1 * Math.min(1, e / 1500));
			let m = (h < 500000) ? h / 500000 * 0.1 : ((h < 600000) ? (h - 500000) / 100000 * 0.2 + 0.1 : ((h < 700000) ? (h - 600000) / 100000 * 0.35 + 0.3 : ((h < 800000) ? (h - 700000) / 100000 * 0.2 + 0.65 : ((h < 900000) ? (h - 800000) / 100000 * 0.1 + 0.85 : (h - 900000) / 100000 * 0.05 + 0.95))));
			resolve(Math.pow(Math.pow(k, 1.1) + Math.pow(l * m, 1.1), 1 / 1.1) * 1.1);
		}
		else reject(new Error("invalid osu mode: " + mode))
	});
}
function getMatchTags(summonerID, match) {
	let answer = [];
	if (!UTILS.exists(summonerID)) return answer;//bot
	if (match.gameDuration < 300) return answer;
	const stats = UTILS.stats(summonerID, match);
	if (stats.largestMultiKill === 3) answer.push("TRIPLE");
	else if (stats.largestMultiKill === 4) answer.push("QUADRA");
	else if (stats.largestMultiKill >= 5) answer.push("PENTA");
	const pID = UTILS.teamParticipant(summonerID, match).participantId;
	const m_level = UTILS.exists(UTILS.findParticipantIdentityFromPID(match, pID).mastery) ? UTILS.findParticipantIdentityFromPID(match, pID).mastery : mastery;
	if (m_level === 0) answer.push("First_Time");
	else if (m_level === 1) answer.push("\"First_Time\"");
	let sortable_all = UTILS.copy(match);//match with both teams
	const teamID = UTILS.teamParticipant(summonerID, match).teamId;
	for (let b in sortable_all.participants) {
		const KDA = UTILS.KDAFromStats(sortable_all.participants[b].stats);
		sortable_all.participants[b].stats.KDA = KDA.KDA;
		sortable_all.participants[b].stats.KDANoPerfect = KDA.KDANoPerfect;
		sortable_all.participants[b].stats.KDNoPerfect = KDA.KDNoPerfect;
		sortable_all.participants[b].stats.inverseKDA = KDA.inverseKDA;
		sortable_all.participants[b].stats.totalCS = sortable_all.participants[b].stats.totalMinionsKilled + sortable_all.participants[b].stats.neutralMinionsKilled;
		sortable_all.participants[b].stats.damageTaken = sortable_all.participants[b].stats.totalDamageTaken + sortable_all.participants[b].stats.damageSelfMitigated;
		sortable_all.participants[b].stats.KP = KDA.K + KDA.A;
		sortable_all.participants[b].stats.inverseDeaths = -KDA.D;
	}
	let sortable_team = UTILS.copy(sortable_all);//match with ally team only
	UTILS.removeAllOccurances(sortable_team.participants, p => p.teamId !== teamID);
	const criteria = [{ statName: "totalCS", designation: "Most_CS", direct: true },
	{ statName: "totalDamageDealtToChampions", designation: "Most_Champion_Damage", direct: true },
	{ statName: "totalDamageDealt", designation: "Most_Damage", direct: true },
	{ statName: "visionScore", designation: "Most_Vision", direct: true },
	{ statName: "assists", designation: "Selfless", direct: true },
	{ statName: "inverseKDA", designation: "Heavy", direct: true },
	{ statName: "damageDealtToObjectives", designation: "Objective_Focused", direct: true },
	{ statName: "damageTaken", designation: "Most_Damage_Taken", direct: true },
	{ statName: "KP", designation: "Highest_KP", direct: true },
	{ statName: "timeCCingOthers", designation: "Most_CC", direct: true },
	{ statName: "largestKillingSpree", designation: "Scary", direct: true },
	{ statName: "inverseDeaths", designation: "Slippery", direct: true },
	{ statName: "goldEarned", designation: "Most_Gold", direct: true },
	{ statName: "KDANoPerfect", designation: "KDA", direct: false },
	{ statName: "KDNoPerfect", designation: "KD", direct: false }];//simple, single stat criteria only
	let non_direct = [];
	for (let c in criteria) {
		UTILS.assert(UTILS.exists(sortable_all.participants[0].stats[criteria[c].statName]));
		sortable_all.participants.sort((a, b) => b.stats[criteria[c].statName] - a.stats[criteria[c].statName]);
		sortable_team.participants.sort((a, b) => b.stats[criteria[c].statName] - a.stats[criteria[c].statName]);
		//UTILS.debug(criteria[c].statName + ": " + sortable_all.participants.map(p => p.participantId + ":" + p.stats[criteria[c].statName]).join(", "));
		//UTILS.debug("team " + criteria[c].statName + ": " + sortable_team.participants.map(p => p.participantId + ":" + p.stats[criteria[c].statName]).join(", "));
		if (criteria[c].direct) {
			if (sortable_all.participants[0].participantId === pID) answer.push(criteria[c].designation);
			else if (sortable_team.participants[0].participantId === pID) answer.push("*" + criteria[c].designation);
		}
		else {
			if (sortable_team.participants[0].participantId === pID) non_direct.push(criteria[c].designation);
		}
	}
	if ((non_direct.indexOf("KDA") !== -1 && non_direct.indexOf("KD") !== -1) || (answer.indexOf("*Most_Champion_Damage") !== -1 || answer.indexOf("Most_Champion_Damage") !== -1)) answer.push("Carry");
	const win = UTILS.determineWin(summonerID, match);
	const ally_K = sortable_team.participants.reduce((total, increment) => total + increment.stats.kills, 0);
	const enemy_K = sortable_all.participants.reduce((total, increment) => total + increment.stats.kills, 0) - ally_K;
	if (win && (ally_K + enemy_K >= 5) && (ally_K >= (enemy_K * 3)) && match.gameDuration < (30 * 60)) answer.push("Easy");
	if ((ally_K + enemy_K) >= (match.gameDuration / 30)) answer.push("Bloody");
	if (match.teams[0].inhibitorKills > 0 && match.teams[1].inhibitorKills > 0) answer.push("Close");
	return answer;
}
function transformTimelineToArray(match, timeline) {
	let teams = {};
	for (let b in match.participants) teams[match.participants[b].participantId + ""] = match.participants[b].teamId + "";
	let answer = [];
	for (let i = 0; i < timeline.frames.length; ++i) {
		let team_total_gold = { "100": 0, "200": 0 };
		for (let j = 1; j <= Object.keys(timeline.frames[i].participantFrames).length; ++j) {//for each participant frame
			team_total_gold[teams[j + ""]] += timeline.frames[i].participantFrames[j + ""].totalGold;
		}
		answer.push({ x: i, y: team_total_gold["200"] - team_total_gold["100"] });
	}
	return answer;
}
function getLikelyLanes(CONFIG, champion_ids) {
	UTILS.assert(champion_ids.length === 5);
	let lane_permutations = UTILS.permute([0, 1, 2, 3, 4]);
	let probabilities = lane_permutations.map((lane_assignments => {
		let sum = 0;
		for (let i = 0; i < lane_assignments.length; ++i) {//use specific lane assignment element from lane_permutations array
			sum += LANE_PCT[champion_ids[i]][lane_assignments[i]];
		}
		return sum;
	}));
	let max = probabilities[0];//highest probability seen so far
	let index_of_max = 0;//index of the above
	for (let i = 1; i < probabilities.length; ++i) {
		if (probabilities[i] > max) {
			max = probabilities[i];
			index_of_max = i;
		}
	}
	let answer = {};
	answer.assignments = lane_permutations[index_of_max].map(lane_number => lane_number + 1);
	answer.confidence = max / 5;
	UTILS.debug("highest probability lane assignments are:\n" + answer.assignments.map((lane_number, index) => CONFIG.STATIC.CHAMPIONS[champion_ids[index]].name + ": " + ["Top", "Jungle", "Mid", "Support", "Bot"][lane_number - 1] + " : " + LANE_PCT[champion_ids[index]][lane_number - 1] + "%").join("\n") + "\nwith total probability: " + (max / 5) + "%");
	return answer;
}
module.exports = class EmbedGenerator {
	constructor() { }
	test(x = "") {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor("Author \\🇺🇸");
		newEmbed.setTitle("Test 🇺🇸: " + x);
		newEmbed.setDescription("description 🇺🇸");
		newEmbed.addField("field title 🇺🇸", "field desc 🇺🇸");
		newEmbed.setFooter("Footer 🇺🇸");
		return newEmbed;
	}
	help(CONFIG) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Discord Commands");
		newEmbed.setDescription("Terms of Service:\n- Don't be a bot on a user account and use BoatBot.\n- Don't abuse bugs. If you find a bug, please report it to us.\n- Don't spam useless feedback\n- If you do not want to use BoatBot, let us know and we'll opt you out of our services.\n- We reserve the right to ban users and servers from using BoatBot at our discretion.\n- We collect data on BoatBot usage to improve user experience and to prevent abuse.\nFor additional help, please visit <" + CONFIG.HELP_SERVER_INVITE_LINK + ">\n\n<required parameter> [optional parameter]");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "help`", "Displays this information card.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "invite`", "Provides information on how to add BoatBot to a different server.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "link <username>`", "If your osu ign is different from your discord username, you can set your osu ign using this command, and BoatBot will remember it.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "unlink`", "Aliases:\n`" + CONFIG.DISCORD_COMMAND_PREFIX + "removelink`\n\BoatBot forgets your preferred username.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "shortcuts`", "Displays a list of nicknames you've set for friends with hard to spell names. Visit https://supportbot.tk/ for more information on this family of commands.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "setting <setting name> <value>`", "Set server preferences for: prefix, auto-opgg, force-prefix, release-notifications. See our website for more details.");
		newEmbed.setFooter("BoatBot " + CONFIG.VERSION);
		return newEmbed;
	}

	notify(CONFIG, content, username, displayAvatarURL, release) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTitle("Important message from BoatBot staff");
		newEmbed.setURL(CONFIG.HELP_SERVER_INVITE_LINK);
		newEmbed.setAuthor(username, displayAvatarURL);
		newEmbed.setDescription(content);
		if (release) newEmbed.addField("To disable this kind of release notif,", "Use the command `Lsetting release-notifications off`");
		newEmbed.setTimestamp();
		newEmbed.setFooter("Message sent ");
		return newEmbed;
	}
	status(status_object) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle(status_object.name);//region
		newEmbed.setURL("http://status.leagueoflegends.com/#" + status_object.slug);
		let status_color = [0, 255, 0];//green
		for (let b in status_object.services) {
			if (status_object.services[b].status !== "online") status_color = [255, 255, 0];
			if (status_object.services[b].status === "offline") {
				status_color = [255, 0, 0];
				break;
			}
		}
		newEmbed.setColor(status_color);
		for (let b in status_object.services) {
			let service_description = "";
			if (status_object.services[b].incidents.length > 0) {
				service_description += status_object.services[b].incidents.reduce((str, incident) => {
					if (incident.updates.length > 0) return str + incident.updates.map(update => "**" + update.severity + "**: " + update.content).join("\n") + "\n";
					else return str;
				}, "");
			}
			if (service_description === "") service_description = "*No incidents to report.*";
			newEmbed.addField(status_object.services[b].name + ": " + status_object.services[b].status, service_description);
		}
		newEmbed.setTimestamp();
		newEmbed.setThumbnail("https://cdn.discordapp.com/attachments/423261885262069771/433465885420945409/cby4p-fp0aj-0.png");
		return newEmbed;
	}
	serverBan(CONFIG, server, reason, date, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		if (date == 0) {
			newEmbed.setTitle("This server (" + server.name + ") has been permanently banned from using BoatBot");
			newEmbed.setColor([1, 1, 1]);
			newEmbed.addField("Duration", "Permanent", true);
		}
		else {
			const date_date = new Date(date);
			newEmbed.setTitle("This server (" + server.name + ") has been temporarily suspended from using BoatBot");
			newEmbed.setColor([255, 0, 0]);
			newEmbed.addField("Duration", UTILS.until(date_date), true);
			newEmbed.setFooter("This suspension expires at");
			newEmbed.setTimestamp(date_date);
		}
		newEmbed.addField("While this ban is effective", "BoatBot will ignore all messages sent from this server.", true);
		newEmbed.addField("Help", "If you believe this is a mistake, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " and state your case to an admin.", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	userBan(CONFIG, reason, date, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		if (date == 0) {
			newEmbed.setTitle("You have been permanently banned from using BoatBot");
			newEmbed.setColor([1, 1, 1]);
			newEmbed.addField("Duration", "Permanent", true);
		}
		else {
			const date_date = new Date(date);
			newEmbed.setTitle("You have been temporarily suspended from using BoatBot");
			newEmbed.setColor([255, 0, 0]);
			newEmbed.addField("Duration", UTILS.until(date_date), true);
			newEmbed.setFooter("This suspension expires at");
			newEmbed.setTimestamp(date_date);
		}
		newEmbed.addField("While this ban is effective", "BoatBot will ignore all messages sent from your account.", true);
		newEmbed.addField("Help", "If you believe this is a mistake, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " and state your case to an admin.", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	serverWarn(CONFIG, server, reason, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This is an official warning for your server (" + server.name + ")");
		newEmbed.setTimestamp();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.addField("This server can be temporarily or permanently banned from using BoatBot", "if you continue to violate our policies.", true);
		newEmbed.addField("No further action is required from anyone.", "Please ensure everyone is familiar with our Terms and Conditions, which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	userWarn(CONFIG, reason, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This is an official warning");
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("You can be temporarily or permanently banned from using BoatBot", "if you continue to violate our policies.", true);
		newEmbed.addField("No further action is required from you.", "Please ensure you are familiar with our Terms and Conditions, which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	serverUnban(CONFIG, server, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This server (" + server.name + ") has been unbanned");
		newEmbed.setColor([0, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("Please ensure you are familiar with our Terms and Conditions", "which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .");
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		return newEmbed;
	}
	userUnban(CONFIG, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("You have been unbanned");
		newEmbed.setColor([0, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("Please ensure you are familiar with our Terms and Conditions", "which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .");
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		return newEmbed;
	}
	disciplinaryHistory(CONFIG, id, user, docs) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Disciplinary History");
		const status = UTILS.disciplinaryStatus(docs);
		if (status.active_ban == 0) {
			newEmbed.setColor([1, 1, 1]);
			newEmbed.setDescription("This " + (user ? "user" : "server") + " has an active permanent ban.\nHere are the 10 most recent events:");
		}
		else if (status.active_ban == -1) {
			if (status.recent_warning) {
				newEmbed.setColor([255, 255, 0]);
				newEmbed.setDescription("This " + (user ? "user" : "server") + " has been warned recently.\nHere are the 10 most recent events:");
			}
			else {
				newEmbed.setColor([0, 255, 0]);
				newEmbed.setDescription("This " + (user ? "user" : "server") + " has no active bans.\nHere are the 10 most recent events:");
			}
		}
		else {
			newEmbed.setColor([255, 0, 0]);
			newEmbed.setDescription("This " + (user ? "user" : "server") + " has an active temporary ban. It expires in " + UTILS.until(new Date(status.active_ban)) + ".\nHere are the 10 most recent events:");
		}
		for (let i = 0; i < docs.length && i < 10; ++i) {
			newEmbed.addField("By " + CONFIG.OWNER_DISCORD_IDS[docs[i].issuer_id].name + ", " + UTILS.ago(new Date(docs[i].id_timestamp)) + (docs[i].ban && docs[i].active ? (new Date(docs[i].date).getTime() == 0 ? ", Permanent Ban" : ", Ban Expires in " + UTILS.until(new Date(docs[i].date))) : ""), docs[i].reason);
		}
		newEmbed.setAuthor(id);
		return newEmbed;
	}
	actionReport(CONFIG, id, docs) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Administrative Actions Report");
		newEmbed.setDescription("Showing 10 most recent events:");
		newEmbed.setAuthor(CONFIG.OWNER_DISCORD_IDS[id].name + " (" + id + ")");
		for (let i = 0; i < docs.length && i < 10; ++i) {
			let description = (docs[i].user ? "uid" : "sid") + ": " + docs[i].target_id + ", ";
			description += UTILS.ago(new Date(docs[i].id_timestamp)) + ", ";
			if (docs[i].ban) {
				description += new Date(docs[i].date).getTime() == 0 ? "Permanent Ban Issued" : "Temporary Ban Issued, duration " + UTILS.duration(new Date(docs[i].id_timestamp), new Date(docs[i].date));
			}
			else if (docs[i].reason.substring(0, 9) == ":warning:") description += "Warning Issued";
			else if (docs[i].reason.substring(0, 15) == ":no_entry_sign:") description += "Bans Cleared (unbanned)";
			else description += "Note Added";
			newEmbed.addField(description, docs[i].reason);
		}
		return newEmbed;
	}
	statsPlus(CONFIG, mode, user_stats, user_best, php_profile_leader, user_page, php_profile_general) {
		let newEmbed = new Discord.RichEmbed();
		let totalHits = parseInt(user_stats.count300) + parseInt(user_stats.count100) + parseInt(user_stats.count50);
		let efficiency = (parseInt(user_stats.ranked_score) / parseInt(user_stats.total_score)) * 100;
		let bonusPP = 416.6667 * (1 - Math.pow(.9994, (parseInt(user_stats.count_rank_ss) + parseInt(user_stats.count_rank_s) + parseInt(user_stats.count_rank_a))));
		let apw = UTILS.round((parseFloat(user_stats.pp_raw) - bonusPP) / 20.0, 2);
		const aim_acc = UTILS.calcAimAcc(mathjs, user_best, user_stats.pp_raw);
		const misses = (totalHits / aim_acc.aimAccuracy) - totalHits;
		let missRate = 100 - (aim_acc.aimAccuracy * 100);
		let cpp = (totalHits + misses) / parseInt(user_stats.playcount);
		aim_acc.pfm = aim_acc.pfm + "\tbonus: >`" + UTILS.round(bonusPP, 1) + "`pp";
		aim_acc.pfmp = aim_acc.pfmp + "\tbonus: >`" + UTILS.round(bonusPP * 100 / user_stats.pp_raw, 1) + "%`";
		if (mode == 0) newEmbed.setColor(16777215);
		else if (mode == 1) newEmbed.setColor(16711680);
		else if (mode == 2) newEmbed.setColor(65280);
		else if (mode == 3) newEmbed.setColor(255);
		let accs = [];
		while (php_profile_leader.indexOf("</b> (") != -1) {
			if (php_profile_leader.indexOf("%)", php_profile_leader.indexOf("</b> (") + "</b> (".length) < php_profile_leader.indexOf("<", php_profile_leader.indexOf("</b> (") + "</b> (".length)) {
				accs.push(parseFloat(php_profile_leader.substring(php_profile_leader.indexOf("</b> (") + "</b> (".length, php_profile_leader.indexOf("%)", php_profile_leader.indexOf("</b> (") + "</b> (".length))));
			}
			php_profile_leader = php_profile_leader.substring(php_profile_leader.indexOf("</b> (") + "</b> (".length);
		}
		const accdev = accs.length === 0 ? 0 : UTILS.round(mathjs.std(accs, "uncorrected"), 3);
		//UTILS.output(accs);
		const playstyle = UTILS.pickPlaystyle(CONFIG, user_page.indexOf("playstyle mouse using") != -1, user_page.indexOf("playstyle keyboard using") != -1, user_page.indexOf("playstyle tablet using") != -1, user_page.indexOf("playstyle touch using") != -1);
		const playHours = parseInt(php_profile_general.substring(php_profile_general.indexOf("<b>Play Time</b>: ") + "<b>Play Time</b>: ".length, php_profile_general.indexOf(" hours", php_profile_general.indexOf("<b>Play Time</b>: ") + "<b>Play Time</b>: ".length)).replace(/,/g, ""));
		newEmbed.setAuthor("Stats for " + user_stats.username, "", "https://osu.ppy.sh/users/" + user_stats.user_id);
		newEmbed.setThumbnail("https://a.ppy.sh/" + user_stats.user_id);
		newEmbed.setTitle("Performance: " + user_stats.pp_raw + "pp    (#" + UTILS.numberWithCommas(user_stats.pp_rank) + ")    :flag_" + user_stats.country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_stats.pp_country_rank));
		newEmbed.setDescription(playstyle + "\nRanked Score: " + UTILS.numberWithCommas(user_stats.ranked_score) + "\nHit Accuracy: " + UTILS.round(user_stats.accuracy, 3) + " ± " + accdev + "%\nPlay Count: " + UTILS.numberWithCommas(user_stats.playcount) + "\nPlay Time: " + UTILS.numberWithCommas((user_stats.total_seconds_played / 3600).round(1)) + " hours\nTotal Score: " + UTILS.numberWithCommas(UTILS.round(parseInt(user_stats.total_score), 2)) + "\nCurrent Level: " + UTILS.round(parseFloat(user_stats.level), 2) + "\nTotal Hits: " + UTILS.numberWithCommas(totalHits) + "\n" + CONFIG.EMOJIS.webXH + user_stats.count_rank_ssh + TAB + CONFIG.EMOJIS.webX + user_stats.count_rank_ss + TAB + CONFIG.EMOJIS.webSH + user_stats.count_rank_sh + TAB + CONFIG.EMOJIS.webS + user_stats.count_rank_s + TAB + CONFIG.EMOJIS.webA + user_stats.count_rank_a);

		newEmbed.addField("For mod information", "add `-m` to the command. `!sp-m`, `!spt-m`, `!spc-m`, `!spm-m`");
		/*
		newEmbed.addField("Favorite Mods", fms);
		newEmbed.addField("pp sources (pp)", pfm);
		newEmbed.addField("pp sources (%)", pfmp);
		*/
		user_stats.countmiss = misses;
		newEmbed.addField("Interpolated Information", "Unweighted Hit Accuracy: `" + UTILS.calcAcc(0, user_stats) + "%`\nAverage play worth: `" + apw + "` ± " + aim_acc.ppstddev + "pp\nCumulative unweighted pp, top 100: `" + aim_acc.ppTotal + "` pp\nPP range: " + aim_acc.maxPP + " - " + aim_acc.minPP + " = `" + UTILS.round(aim_acc.ppRange, 3) + "`\nScoring Efficiency: `" + UTILS.round(efficiency, 2) + "%`\tObjects per play: `" + UTILS.round(cpp, 2) + "`\nAppx.Misses: `" + UTILS.numberWithCommas(UTILS.round(misses, 0)) + "`\tMiss rate: `" + UTILS.round(missRate, 3) + "%` or 1 miss every `" + UTILS.round(100 / missRate, 0) + "` hits\nRatio of 0 miss plays in the top 100: `" + UTILS.round(aim_acc.sRatio, 1) + "%` >0 miss plays: `" + UTILS.round(100 - aim_acc.sRatio, 1) + "%`\nAverage Career Hits per second: `" + UTILS.round(totalHits / (playHours * 3600), 2) + "`\nAverage play length: `" + UTILS.standardTimestamp(user_stats.total_seconds_played / user_stats.playcount) + "`");
		//newEmbed.addField("For mod information", "add `-m` to the command. `!sp-m`, `!spt-m`, `!spc-m`, `!spm-m`");
		newEmbed.addField("More about " + user_stats.username, "[osu!track](https://ameobea.me/osutrack/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!stats](http://osustats.ppy.sh/u/" + encodeURIComponent(user_stats.username) + ")\t[osu!skills](http://osuskills.com/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!chan](https://syrin.me/osuchan/u/" + user_stats.user_id + "/?m=" + mode + ")\t[pp+](https://syrin.me/pp+/u/" + user_stats.user_id + "/)");
		//newEmbed.setTimestamp(new Date());
		//newEmbed.setFooter("Requested at local time", "https://s.ppy.sh/images/flags/" + user_stats.country.toLowerCase() + ".gif");
		//output(pfm);
		return newEmbed;
	}
	signature(CONFIG, mode, user_stats) {
		let newEmbed = new Discord.RichEmbed();
		let wordMode;
		let modeCommand;
		if (mode == 0) {
			wordMode = "Standard";
			modeCommand = CONFIG.DISCORD_COMMAND_PREFIX + "sp";
			newEmbed.setColor(16777215);
		}
		else if (mode == 1) {
			wordMode = "Taiko";
			modeCommand = CONFIG.DISCORD_COMMAND_PREFIX + "spt";
			newEmbed.setColor(16711680);
		}
		else if (mode == 2) {
			wordMode = "CtB";
			modeCommand = CONFIG.DISCORD_COMMAND_PREFIX + "spc";
			newEmbed.setColor(65280);
		}
		else if (mode == 3) {
			wordMode = "Mania";
			modeCommand = CONFIG.DISCORD_COMMAND_PREFIX + "spm";
			newEmbed.setColor(255);
		}
		newEmbed.setAuthor(user_stats.username, "", "https://osu.ppy.sh/users/" + user_stats.user_id);
		//newEmbed.setImage("https://lemmmy.pw/osusig/sig.php?colour=pink&uname=" + user_stats.user_id + "&pp=2&countryrank&removeavmargin&darktriangles&onlineindicator=undefined&xpbar&xpbarhex&mode=" + mode + "&random=" + UTILS.now());
		newEmbed.setDescription(`**${user_stats.pp_raw}pp (#${UTILS.numberWithCommas(user_stats.pp_rank)}) :flag_${user_stats.country.toLowerCase()}:#${UTILS.numberWithCommas(user_stats.pp_country_rank)}**\nlv. ${user_stats.level.round(1)}${TAB}${user_stats.accuracy.toFixed(2)}%\n${UTILS.numberWithCommas(user_stats.playcount)} plays${TAB}${(user_stats.total_seconds_played / 3600).round(0)} hours`);
		newEmbed.setThumbnail("https://a.ppy.sh/" + user_stats.user_id);
		newEmbed.setFooter("use " + modeCommand + " " + user_stats.username + " for more information");
		return newEmbed;
	}
	statsPlusMods(CONFIG, mode, user_stats, user_best) {
		let newEmbed = new Discord.RichEmbed();
		let totalHits = parseInt(user_stats.count300) + parseInt(user_stats.count100) + parseInt(user_stats.count50);
		let bonusPP = 416.6667 * (1 - Math.pow(.9994, (parseInt(user_stats.count_rank_ss) + parseInt(user_stats.count_rank_s) + parseInt(user_stats.count_rank_a))));
		const aim_acc = UTILS.calcAimAcc(mathjs, user_best, user_stats.pp_raw);
		let misses = (totalHits / aim_acc.aimAccuracy) - totalHits;
		aim_acc.pfm = aim_acc.pfm + "\tbonus: >`" + UTILS.round(bonusPP, 1) + "`pp";
		aim_acc.pfmp = aim_acc.pfmp + "\tbonus: >`" + UTILS.round(bonusPP * 100 / user_stats.pp_raw, 1) + "%`";
		if (mode == 0) newEmbed.setColor(16777215);
		else if (mode == 1) newEmbed.setColor(16711680);
		else if (mode == 2) newEmbed.setColor(65280);
		else if (mode == 3) newEmbed.setColor(255);
		newEmbed.setAuthor("Stats for " + user_stats.username, "", "https://osu.ppy.sh/u/" + user_stats.user_id);
		newEmbed.setThumbnail("https://a.ppy.sh/" + user_stats.user_id);
		newEmbed.setTitle("Performance: " + user_stats.pp_raw + "pp    (#" + UTILS.numberWithCommas(user_stats.pp_rank) + ")    :flag_" + user_stats.country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_stats.pp_country_rank));
		newEmbed.addField("Favorite Mods, combined", aim_acc.fms);
		newEmbed.addField("Favorite Mods, segregated", aim_acc.ms);
		newEmbed.addField("pp sources (pp)", aim_acc.pfm);
		newEmbed.addField("pp sources (%)", aim_acc.pfmp);
		newEmbed.setTimestamp(new Date());
		newEmbed.setFooter("Requested at local time", "https://s.ppy.sh/images/flags/" + user_stats.country.toLowerCase() + ".gif");
		//output(aim_acc.pfm);
		return newEmbed;
	}
	feedback(CONFIG, type, destination, msg, user_history, server_history, usertag) {
		/*type = 0: general message from user (destination 1)
		type = 1: complaint (destination 1->2)
		type = 2: praise (destination 1->2)
		type = 3: suggestion (destination 1->2)
		type = 4: question (destination 1)
		type = 5: general message to user (destination 0)
		destination = 0: user PM
		destination = 1: admin channel
		destination = 2: public
		(t, d)
		(0, 1): user to admin channel
		(1-3, 1): feedback awaiting public approval in admin channel
		X(1-3, 2): feedback approved, to be published publicly. handled by function below, reviewFeedback()
		X(1-3, 0): feedback approved, to be sent to original user. handled by function below, reviewFeedback()
		(4, 1): question submitted to admin channel
		(5, 0): management to user
		(5, 1): management to user admin channel audit
		*/
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(msg.author.tag + (msg.PM ? " via PM" : " from server " + msg.guild.name + "::" + msg.guild.id), msg.author.displayAvatarURL);
		newEmbed.setTimestamp();
		newEmbed.setTitle("Message from a user");
		newEmbed.setDescription(msg.cleanContent);
		if (type === 0) {//Lsay
			newEmbed.setColor("#ffffff");//white
		}
		else if (type === 1) {//Lcomplain
			newEmbed.setColor("#ff0000");//red
			newEmbed.setFooter(CONFIG.FEEDBACK.COMPLAINT_CID + ":" + msg.author.id + ":" + msg.author.username);
		}
		else if (type === 2) {//Lpraise
			newEmbed.setColor("#00ff00");//green
			newEmbed.setFooter(CONFIG.FEEDBACK.PRAISE_CID + ":" + msg.author.id + ":" + msg.author.username);
		}
		else if (type === 3) {//Lsuggest
			newEmbed.setColor("#0000ff");//blue
			newEmbed.setFooter(CONFIG.FEEDBACK.SUGGESTION_CID + ":" + msg.author.id + ":" + msg.author.username);
		}
		else if (type === 4) {//Lask/Lquestion
			newEmbed.setColor("#ff00ff");//magenta (yellow reserved for warnings)
		}
		else if (type === 5) {
			newEmbed.setAuthor(msg.author.username, msg.author.displayAvatarURL);
			newEmbed.setTitle("Message from management to " + usertag);//reset title
			if (destination === 0) {
				newEmbed.setURL(CONFIG.HELP_SERVER_INVITE_LINK);
				newEmbed.addField("This is a private conversation with management.", "You can reply to this message by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "say <your response goes here>`");
				newEmbed.setDescription(msg.cleanContent.substring(msg.cleanContent.indexOfInstance(" ", 2) + 1) + "\n\n" + CONFIG.OWNER_DISCORD_IDS[msg.author.id].flags);
			}
			else if (destination === 1) {
				newEmbed.setDescription(msg.cleanContent.substring(msg.cleanContent.indexOfInstance(" ", 2) + 1));
			}
		}//Lmail
		if (type < 5) {
			let user_status = UTILS.disciplinaryStatusString(UTILS.disciplinaryStatus(user_history), true);
			let server_status = UTILS.exists(server_history) ? "\n" + UTILS.disciplinaryStatusString(UTILS.disciplinaryStatus(server_history), false) : "";
			newEmbed.addField("Background Checks", user_status + server_status);
			if (destination === 1) {
				newEmbed.addField("Responses", "Send message response: `" + CONFIG.DISCORD_COMMAND_PREFIX + "mail " + msg.author.id + " <text>`\nBan: `" + CONFIG.DISCORD_COMMAND_PREFIX + "banuser " + msg.author.id + " <duration> <reason>`\nWarn: `" + CONFIG.DISCORD_COMMAND_PREFIX + "warnuser " + msg.author.id + " <reason>`\nNote: `" + CONFIG.DISCORD_COMMAND_PREFIX + "noteuser " + msg.author.id + " <reason>`");
			}
		}
		return newEmbed;
	}
	reviewFeedback(CONFIG, msg, approver, approved) {
		if (!UTILS.exists(msg.embeds[0])) return 1;//no embed detected
		if (!UTILS.exists(msg.embeds[0].footer) || !UTILS.exists(msg.embeds[0].footer.text)) return 2;//not approvable
		const c_location = msg.embeds[0].footer.text.indexOf(":");
		const c_location2 = msg.embeds[0].footer.text.indexOfInstance(":", 2);
		if (c_location == -1 || c_location2 == -1) return 3;//not approvable
		if (approved) {
			let public_e = new Discord.RichEmbed(msg.embeds[0]);
			let edit = new Discord.RichEmbed(msg.embeds[0]);
			let user = new Discord.RichEmbed(msg.embeds[0]);
			const cid = msg.embeds[0].footer.text.substring(0, c_location);
			const uid = msg.embeds[0].footer.text.substring(c_location + 1, c_location2);
			const username = msg.embeds[0].footer.text.substring(c_location2 + 1);
			public_e.setFooter("Approved by " + approver.username, approver.displayAvatarURL);
			public_e.fields = [];
			public_e.setAuthor(username, public_e.author.icon_url);
			edit.setFooter("Approved by " + approver.username, approver.displayAvatarURL);
			edit.fields = [];
			edit.addField("Responses", "Send message response: `" + CONFIG.DISCORD_COMMAND_PREFIX + "mail " + uid + " <text>`\nNote: `" + CONFIG.DISCORD_COMMAND_PREFIX + "noteuser " + uid + " <reason>`");
			user.setAuthor(username, msg.embeds[0].author.icon, msg.embeds[0].author.url);
			user.setFooter("Approved by " + approver.username, approver.displayAvatarURL);
			user.fields = [];
			user.setTitle("Your feedback was reviewed by our staff and approved for public viewing on our server- click to join");
			user.setURL("https://discord.gg/57Z8Npg");
			public_e.setAuthor(username, user.author.icon_url);
			return { to_user: user, to_user_uid: uid, edit, to_public: public_e, to_public_cid: cid };
		}
		else {
			let edit = new Discord.RichEmbed(msg.embeds[0]);
			const cid = msg.embeds[0].footer.text.substring(0, c_location);
			const uid = msg.embeds[0].footer.text.substring(c_location + 1, c_location2);
			const username = msg.embeds[0].footer.text.substring(c_location2 + 1);
			edit.setFooter("Denied by " + approver.username, approver.displayAvatarURL);
			edit.fields = [];
			edit.addField("Responses", "Send message response: `" + CONFIG.DISCORD_COMMAND_PREFIX + "mail " + uid + " <text>`\nNote: `" + CONFIG.DISCORD_COMMAND_PREFIX + "noteuser " + uid + " <reason>`");
			edit.setColor("#010101");
			return { edit };
		}
	}
	raw(embed_object) {
		return new Discord.RichEmbed(embed_object);
	}
	verify(CONFIG, summoner, uid) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Verify ownership of LoL account");
		const now = new Date().getTime();
		let code = now + "-" + uid + "-" + summoner.puuid;
		code = now + "-" + crypto.createHmac("sha256", CONFIG.TPV_KEY).update(code).digest("hex");
		newEmbed.setDescription("Verifying your LoL account gives you a \\" + VERIFIED_ICON + " which is displayed next to your name to prove you own an account. It is displayed when you run a LoL statistics command on an account you own. The ownership period expires after 1 year. 1 discord account can own multiple LoL accounts and 1 LoL account can be owned by multiple discord accounts.\nYour code is: ```" + code + "```");
		newEmbed.addField("If you have already followed the instructions below, there is a problem with the code you provided.", "Reread the instructions below and try again.");
		newEmbed.addField("Instructions", "See the below image to save the code provided above to your account. Once you have done this, resend the `" + CONFIG.DISCORD_COMMAND_PREFIX + "verify <region> <ign>` command again within the next 5 minutes **__after first waiting 30 seconds__**.");
		newEmbed.setImage("https://supportbot.tk/f/tpv.png");//tpv tutorial image
		newEmbed.setFooter("This code does not need to be kept secret. It expires in 5 minutes, and will only work on this discord and LoL account.");
		return newEmbed;
	}
	debug(CONFIG, client, iapi_stats, c_eval) {
		let newEmbed = new Discord.RichEmbed();
		let serverbans = 0, userbans = 0;
		newEmbed.setTimestamp();
		const now = new Date().getTime();
		for (let b in CONFIG.BANS.USERS) {
			if (CONFIG.BANS.USERS[b] == 0 || CONFIG.BANS.USERS[b] > now)++userbans;
		}
		for (let b in CONFIG.BANS.SERVERS) {
			if (CONFIG.BANS.SERVERS[b] == 0 || CONFIG.BANS.SERVERS[b] > now)++serverbans;
		}
		newEmbed.setAuthor("Shard $" + process.env.SHARD_ID);
		newEmbed.setTitle("Diagnostic Information");
		newEmbed.addField("System", "iAPI request rate: " + UTILS.round(iapi_stats["0"].total_rate, 1) + " req/min\niAPI total requests: " + iapi_stats["0"].total_count + "\nNode.js " + process.versions.node + "\nNODE_ENV: " + process.env.NODE_ENV + "\nSoftware Version: " + CONFIG.VERSION + "\nShards configured: " + CONFIG.SHARD_COUNT, true);
		newEmbed.addField("Uptime Information", "Time since last disconnect: " + UTILS.round(client.uptime / 3600000.0, 2) + " hours\nTime since last restart: " + UTILS.round(process.uptime() / 3600.0, 2) + " hours\nIAPI time since last restart: " + UTILS.round(iapi_stats.uptime / 3600.0, 2) + " hours", true);
		newEmbed.addField("Discord Stats", "Guilds: " + c_eval[0] + "\nUsers: " + c_eval[1] + "\nMembers: " + c_eval[2] + "\nBanned Servers: " + serverbans + "\nBanned Users: " + userbans, true);
		newEmbed.addField("Discord Load", "Load Average 1/5/15/30/60: " + iapi_stats.discord.min1.round(1) + "/" + iapi_stats.discord.min5.round(1) + "/" + iapi_stats.discord.min15.round(1) + "/" + iapi_stats.discord.min30.round(1) + "/" + iapi_stats.discord.min60.round(1) + "\nCommands / min: " + iapi_stats.discord.total_rate.round(1) + "\nCommand count: " + iapi_stats.discord.total_count, true);
		newEmbed.setColor(255);
		return newEmbed;
	}
	beatmap(CONFIG, beatmap, beatmapset, mod_string = "", mode, footerauthor = false) {//returns a promise
		return new Promise((resolve, reject) => {
			UTILS.debug("mod_string is \"" + mod_string + "\"");
			if (UTILS.exists(mode)) beatmap.mode = mode;
			const mods = getModObject(mod_string.substring(1));
			let other_diffs = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];//1 sub array for each mode
			const diff_count = beatmapset.length;
			for (let b in beatmapset) {
				++other_diffs[beatmapset[b].mode][wholeStarValue(beatmapset[b].difficultyrating, beatmapset[b].diff_aim)];
			}
			let diffstring = "";
			for (let i = 0; i < 4; ++i) {//mode
				for (let j = 0; j < 8; ++j) {//star value
					if (other_diffs[i][j] > 0) diffstring += getStars(CONFIG, i, j) + other_diffs[i][j] + TAB;
				}
			}
			let ppstring = "";
			if (beatmap.mode == 0 | beatmap.mode == 1) {
				const accs = [95, 98, 99, 100];
				let calculations = Promise.all(accs.map(acc => maxPPCalculator(CONFIG.BEATMAP_CACHE_LOCATION + beatmap.beatmap_id + ".osu", beatmap.mode, { mods: mods.value, acc })));
				calculations.then(results => {
					ppstring = "\n" + results.map((oo, i) => accs[i] + "%: " + oo.pp.round(0) + "pp").join(" | ");
					if (isNaN(beatmap.max_combo) || beatmap.max_combo === 0) beatmap.max_combo = results[0].max_combo;
					step2(results[0]);
				}).catch(e => {
					console.error(e);
					step2();
				});
			}
			else step2();
			function step2(oo) {
				let newEmbed = new Discord.RichEmbed();
				newEmbed.setAuthor(beatmap.creator, `https://a.ppy.sh/${beatmap.creator_id}?${UTILS.now()}`, "https://osu.ppy.sh/users/" + beatmap.creator_id);
				//newEmbed.setURL("https://osu.ppy.sh/beatmapsets/" + beatmap.beatmapset_id + "#" + ["osu", "taiko", "fruits", "mania"][beatmap.mode] + "/" + beatmap.beatmap_id);
				newEmbed.setURL("https://osu.ppy.sh/b/" + beatmap.beatmap_id + "&m=" + beatmap.mode);//old link for compatibility
				newEmbed.setThumbnail("https://b.ppy.sh/thumb/" + beatmap.beatmapset_id + "l.jpg");
				let mode_prefix = beatmap.approved === 4 ? "❤️" : "";
				if (beatmap.mode != 3) {
					if (beatmap.mode == 1) mode_prefix = "";
					else if (beatmap.mode == 2) mode_prefix = ""
					newEmbed.setColor(MODE_COLOR[beatmap.mode]);
				}
				else {
					mode_prefix = "[" + parseInt(beatmap.diff_size) + "K] ";//
					newEmbed.setColor(MANIA_KEY_COLOR[beatmap.diff_size]);
				}
				UTILS.debug("eg.beatmap() mode is " + beatmap.mode);
				newEmbed.setTitle(mode_prefix + UTILS.fstr(beatmap.approved < 1, "~~") + beatmap.artist + " - " + beatmap.title + UTILS.fstr(beatmap.approved < 1, "~~"));
				if (mods.value > 0) {
					//timing
					if (mods.DT) {
						beatmap.total_length /= 1.5;
						beatmap.hit_length /= 1.5;
						beatmap.bpm *= 1.5;
					}
					else if (mods.HT) {
						beatmap.total_length *= 1.5;
						beatmap.hit_length *= 1.5;
						beatmap.bpm /= 1.5;
					}
					beatmap.bpm = beatmap.bpm.round(2);
					//CS, AR, OD, HP
					if ((beatmap.mode == 0 || beatmap.mode == 1) && UTILS.exists(oo)) {
						beatmap.diff_size = oo.cs.round(2);
						beatmap.diff_overall = oo.od.round(2);
						beatmap.diff_approach = oo.ar.round(2);
						beatmap.diff_drain = oo.hp.round(2);
						beatmap.mod_dr = oo.stars;//mod difficulty rating
					}
					else {
						beatmap.diff_size = beatmap.diff_size.round(2);
						beatmap.diff_approach = beatmap.diff_approach.round(2);
						beatmap.diff_overall = beatmap.diff_overall.round(2);
						beatmap.diff_drain = beatmap.diff_drain.round(2);
					}
				}
				const stars = UTILS.exists(beatmap.mod_dr) ? beatmap.mod_dr.round(2) : (isNaN(beatmap.difficultyrating) ? beatmap.diff_aim.round(2) : beatmap.difficultyrating.round(2));
				newEmbed.addField("\\[" + getStars(CONFIG, beatmap.mode, beatmap.difficultyrating, beatmap.diff_aim) + " " + beatmap.version + "\\]" + UTILS.fstr(mods.value > 0, " ") + (UTILS.exists(beatmap.mod_dr) ? getStars(CONFIG, beatmap.mode, beatmap.mod_dr) : "") + mods.string, "Length: `" + UTILS.standardTimestamp(beatmap.total_length) + "` (`" + UTILS.standardTimestamp(beatmap.hit_length) + "`) BPM: `" + beatmap.bpm + "` FC: `" + beatmap.max_combo + "x`\nCS: `" + beatmap.diff_size + "` AR: `" + beatmap.diff_approach + "` OD: `" + beatmap.diff_overall + "` HP: `" + beatmap.diff_drain + "` Stars: `" + stars + "`" + ppstring + "\nDownload Beatmap: [" + CONFIG.EMOJIS.download + "](https://osu.ppy.sh/d/" + beatmap.beatmapset_id + ") [" + CONFIG.EMOJIS.downloadNV + "](https://osu.ppy.sh/d/" + beatmap.beatmapset_id + "n) [" + CONFIG.EMOJIS.osu_direct + "](https://iaace.gg/od/" + beatmap.beatmap_id + ") [" + CONFIG.EMOJIS.bloodcat + "](https://bloodcat.com/osu/s/" + beatmap.beatmapset_id + ")");
				if (diff_count == 500) newEmbed.addField("This beatmap set has at least " + diff_count + " difficulties.", diffstring);
				else if (diff_count > 1) newEmbed.addField("This beatmap set has " + diff_count + " difficulties.", diffstring);
				newEmbed.setFooter(`Map${footerauthor ? `ped by ${beatmap.creator},` : ""} ${beatmap.approved > 0 ? [null, "ranked", "approved", "qualified", "loved"][beatmap.approved] : "last updated"} ${UTILS.ago(beatmap.approved_date.getTime() !== 0 ? beatmap.approved_date : beatmap.last_update)} at/on`, footerauthor ? `https://a.ppy.sh/${beatmap.creator_id}?${UTILS.now()}` : undefined);
				newEmbed.setTimestamp(beatmap.last_update);
				resolve(newEmbed);
			}
		});
	}
	recent(CONFIG, mode, play_index = 0, recent_scores, beatmap, leaderboard, user_scores, user_best, user_stats) {
		let that = this;
		UTILS.assert(UTILS.exists(recent_scores[play_index]));
		recent_scores[play_index].best_play_index = UTILS.scoreIsUserTop100(recent_scores[play_index], user_best);//0-indexed
		recent_scores[play_index].leaderboard_index = UTILS.scoreIsUserTop100(recent_scores[play_index], leaderboard);
		user_scores.sort((a, b) => b.pp - a.pp);//used to determine pp validity
		const user_play_index = UTILS.scoreIsUserTop100(recent_scores[play_index], user_scores);
		recent_scores[play_index].progress = -1;
		if (recent_scores[play_index].rank === "F" || user_play_index === -1) {//if play gets rank "F" or play is not top 100 of user
			recent_scores[play_index].pp = 0;
			recent_scores[play_index].pp_valid = false;
		}
		if (user_play_index >= 0) {//one of user's top 100 scores on beatmap
			recent_scores[play_index].pp = user_scores[user_play_index].pp;
			if (user_play_index === 0) recent_scores[play_index].pp_valid = true;
			else recent_scores[play_index].pp_valid = false;
		}
		else if (recent_scores[play_index].best_play_index >= 0) {//one of user's top 100 scores, ever
			recent_scores[play_index].pp = user_best[recent_scores[play_index].best_play_index].pp;
			recent_scores[play_index].pp_valid = true;
		}
		if (!UTILS.exists(beatmap.max_combo) || isNaN(beatmap.max_combo)) beatmap.max_combo = 0;
		user_stats.pp_delta = 0;//hardcoded for now, intended to be used with score tracking
		return new Promise((resolve, reject) => {//calculates max pp
			//UTILS.inspect("mode", mode);
			if (mode === 0 || mode === 1) {
				maxPPCalculator(CONFIG.BEATMAP_CACHE_LOCATION + beatmap.beatmap_id + ".osu", mode, { mods: recent_scores[play_index].enabled_mods, acc: 100 }).then(results => {
					UTILS.debug("100% pp calc results:");
					recent_scores[play_index].max_pp = results.pp;
					if (beatmap.approved <= 0 || beatmap.approved >= 3) recent_scores[play_index].max_pp_valid = false;
					else recent_scores[play_index].max_pp_valid = true;
					beatmap.object_count = results.num_circles + results.num_sliders + results.num_spinners;
					if (beatmap.max_combo === 0) beatmap.max_combo = results.max_combo;
					step2();
				}).catch(e => {
					console.error(e);
					recent_scores[play_index].max_pp = 0;
					recent_scores[play_index].max_pp_valid = false;
					beatmap.object_count = 0;
					step2();
				});
			}
			else {
				recent_scores[play_index].max_pp = 0;
				recent_scores[play_index].max_pp_valid = false;
				beatmap.object_count = 0;
				step2();
			}

			//try count #
			//probably best to run oppai and compare to API result.
			function step2() {
				if ((mode === 0 || mode === 1) && (recent_scores[play_index].rank === "F" || !UTILS.exists(recent_scores[play_index].pp) || recent_scores[play_index].pp === 0 || beatmap.approved === 4 || beatmap.approved === 3)) {//calculates specific pp for a recent fail or if the pp isn't one of the user's best scores on a beatmap
					recent_scores[play_index].pp_valid = false;
					ppCalculator(CONFIG.BEATMAP_CACHE_LOCATION + beatmap.beatmap_id + ".osu", mode, {
						mods: recent_scores[play_index].enabled_mods,
						count100: recent_scores[play_index].count100,
						count50: recent_scores[play_index].count50,
						countmiss: recent_scores[play_index].countmiss,
						combo: recent_scores[play_index].maxcombo,
						acc: UTILS.calcAcc(mode, recent_scores[play_index]),
						end: recent_scores[play_index].count300 + recent_scores[play_index].count100 + recent_scores[play_index].count50 + recent_scores[play_index].countmiss
					}).then(pp => {
						recent_scores[play_index].pp = pp;
						if (recent_scores[play_index].rank === "F") recent_scores[play_index].progress = (recent_scores[play_index].count300 + recent_scores[play_index].count100 + recent_scores[play_index].count50 + recent_scores[play_index].countmiss) / beatmap.object_count;
						step3();
					}).catch(e => {
						console.log(e);
						recent_scores[play_index].pp = 0;
						step3();
					});
				}
				else {
					//UTILS.inspect("mode", mode);
					//UTILS.inspect(".rank", recent_scores[play_index].rank);
					//UTILS.inspect(".pp", recent_scores[play_index].pp);
					//UTILS.inspect(".approved", beatmap.approved);
					step3();
				}
				function step3() {
					that.fullScorecardRaw(CONFIG, user_stats, beatmap, recent_scores[play_index]).then(resolve).catch(reject);
				}
			}
		});
	}
	fullScorecardRaw(CONFIG, user, beatmap, score) {
		const user_format = {
			user_id: "string",
			username: "string",
			pp_raw: "number",//float
			pp_rank: "number",//int
			pp_country_rank: "number",//int
			pp_delta: "number"//set to 0 if no change
		};
		const beatmap_format = {
			approved: "number",//int
			mode: "number",//int
			beatmap_id: "string",
			beatmapset_id: "string",
			object_count: "number",//int
			max_combo: "number",//int
			creator_id: "string",
			creator: "string",
			last_update: "object",//date
			approved_date: "object",//date
			diff_aim: "number",//float, ctb diff rating
			diff_speed: "number",//float
			difficultyrating: "number",//float
			bpm: "number"//float
		};
		const score_format = {
			score: "number",//int
			best_play_index: "number",//int; -1 = not best play
			leaderboard_index: "number",//int; -1 = not on leaderboard
			pp: "number",//float
			pp_valid: "boolean",
			max_pp: "number",//float
			max_pp_valid: "boolean",
			maxcombo: "number",//int
			perfect: "boolean",//perfect combo (FC)
			countmiss: "number",//int
			count50: "number",//int
			count100: "number",//int
			countkatu: "number",//int, mania200
			count300: "number",//int
			countgeki: "number",//int, maniarainbow
			enabled_mods: "number",//int
			date: "object",
			rank: "string",
			progress: "number"//float, 1 if pass, between 0-1 if rank is "F", -1 if progress unavailable
		};
		for (let b in user_format) UTILS.assert(typeof (user[b]) === user_format[b], `user[${b}] expects ${user_format[b]} but is type ${typeof (user[b])} with value ${user[b]}`);
		for (let b in beatmap_format) UTILS.assert(typeof (beatmap[b]) === beatmap_format[b], `beatmap[${b}] expects ${beatmap_format[b]} but is type ${typeof (beatmap[b])} with value ${beatmap[b]}`);
		for (let b in score_format) UTILS.assert(typeof (score[b]) === score_format[b], `score[${b}] expects ${score_format[b]} but is type ${typeof (score[b])} with value ${score[b]}`);
		return new Promise((resolve, reject) => {
			const mod_string = getMods(score.enabled_mods);
			this.beatmap(CONFIG, beatmap, [beatmap], mod_string, beatmap.mode, true).then(beatmap_embed => {
				beatmap_embed = UTILS.embedRaw(beatmap_embed);
				let newEmbed = new Discord.RichEmbed();
				newEmbed.setURL(beatmap_embed.url);
				newEmbed.setThumbnail(beatmap_embed.thumbnail.url);
				let dpp = "";//delta pp
				if (UTILS.round(user.pp_delta, 2) !== 0) {
					if (user.pp_delta >= 0) dpp = ` +${user.pp_delta.round(2)}`;
					else dpp = ` ${user.pp_delta.round(2)}`;
				}
				newEmbed.setAuthor(`${user.username}: ${UTILS.numberWithCommas(user.pp_raw)}${dpp}pp (#${UTILS.numberWithCommas(user.pp_rank)} ${user.country}${UTILS.numberWithCommas(user.pp_country_rank)})`, `https://a.ppy.sh/${user.user_id}?${UTILS.now()}`, `https://osu.ppy.sh/u/${user.user_id}`);
				newEmbed.setTitle(`${getStars(CONFIG, beatmap.mode, beatmap.difficultyrating, beatmap.diff_aim)} ${beatmap_embed.title} [${beatmap.version}]`);

				if (score.best_play_index !== -1) {//if is best play, set embed color and description
					newEmbed.setColor([255 * ((99 - score.best_play_index) / 99), 255 * ((99 - score.best_play_index) / 99), 0]);
					newEmbed.setDescription(`**__Personal Best #${score.best_play_index + 1}!__**`);//personal best indicator
				}
				else newEmbed.setColor(["#ffffff", "#ff0000", "#00ff00", "#0000ff"][beatmap.mode]);//otherwise, set color based on mode
				const pcl_str = `**${score.pp_valid ? `${score.pp.round(2)}pp` : `~~${score.pp.round(2)}pp~~`}**${score.max_pp_valid ? `/${score.max_pp.round(2)}PP` : `${score.max_pp === 0 ? TAB : `~~/${score.max_pp.round(2)}PP~~`}`} **${score.maxcombo}x**${beatmap.max_combo !== 0 ? `/${beatmap.max_combo}X` : ""}${TAB}{${beatmap.mode === 3 ? ` ${score.countgeki}/${score.count300}/${score.countkatu}/${score.count100}/${score.count50}/${score.countmiss} ` : ` ${score.count300} / ${score.count100} / ${score.count50} / ${score.countmiss} `}}`;//pp combo line string

				//compact scorecard
				let compact = new Discord.RichEmbed(UTILS.embedRaw(newEmbed));
				compact.addField(`${UTILS.exists(beatmap.mod_dr) ? getStars(CONFIG, beatmap.mode, beatmap.mod_dr) : ""}${CONFIG.EMOJIS[score.rank]}${score.rank === "F" && score.progress !== -1 ? `${UTILS.pickCircle(score.progress)}` : ""} ${score.enabled_mods !== 0 ? getMods(score.enabled_mods) : ""}${score.leaderboard_index !== -1 ? ` **__r#${score.leaderboard_index + 1}__**` : TAB} ${UTILS.numberWithCommas(score.score)}${TAB}(${UTILS.calcAcc(beatmap.mode, score)}%)${TAB}${UTILS.ago(score.date)}`, pcl_str);

				//full scorecard
				newEmbed.setFooter(beatmap_embed.footer.text, beatmap_embed.footer.icon_url);
				newEmbed.setTimestamp(beatmap_embed.timestamp);
				newEmbed.addField(`Rank+Mods${TAB}Score${TAB}${TAB}Acc.${TAB}When`, `${UTILS.exists(beatmap.mod_dr) ? getStars(CONFIG, beatmap.mode, beatmap.mod_dr) : ""}${CONFIG.EMOJIS[score.rank]}${score.rank === "F" && score.progress !== -1 ? ` ${(score.progress * 100).round()}%` : ""} ${score.enabled_mods !== 0 ? getMods(score.enabled_mods) : ""}${score.leaderboard_index !== -1 ? ` **__r#${score.leaderboard_index + 1}__**` : ""} ${UTILS.numberWithCommas(score.score)} (${UTILS.calcAcc(beatmap.mode, score)}%) ${UTILS.ago(score.date)}`);
				newEmbed.addField(`pp/PP${TAB}${TAB}${TAB}${TAB}${TAB}${TAB}Combo${TAB}${TAB}${TAB}${TAB}Hits`, pcl_str);
				newEmbed.addField(`Beatmap Information`, beatmap_embed.fields[0].value);//add beatmap embed info

				resolve({ full: newEmbed, compact });
			}).catch(reject);
		});
	}
	slsd(CONFIG, user, beatmaps, scores, end_index) {
		let newEmbed = new Discord.RichEmbed();
		UTILS.assert(beatmaps.length === scores.length);
		UTILS.assert(end_index <= scores.length);
		newEmbed.setTitle(`Top ${end_index} scores`);
		newEmbed.setAuthor(`${user.username}: ${UTILS.numberWithCommas(user.pp_raw)}pp (#${UTILS.numberWithCommas(user.pp_rank)} ${user.country}${UTILS.numberWithCommas(user.pp_country_rank)})`, `https://a.ppy.sh/${user.user_id}?${UTILS.now()}`, `https://osu.ppy.sh/u/${user.user_id}`);
		let sl_scores = [];//single line scores
		for (let i = 0; i < end_index; ++i) {
			sl_scores.push(this.slsdRaw(CONFIG, beatmaps[i], scores[i]));
		}
		for (let i = 0; i < Math.ceil(sl_scores.length / 5); ++i) {
			const fd = sl_scores.slice(i * 5, (i + 1) * 5).join("\n");
			UTILS.debug("field length: " + fd.length);
			newEmbed.addField("#" + ((i * 5) + 1) + " - #" + ((i + 1) * 5), fd);
		}
		newEmbed.setFooter("Beatmap artist, title, and difficulty names have been truncated.");
		return newEmbed;
	}
	slsdRaw(CONFIG, beatmap, score, title = true) {//single line score display
		const beatmap_format = {
			approved: "number",//int
			mode: "number",//int
			beatmap_id: "string",
			beatmapset_id: "string",
			max_combo: "number",//int
			creator_id: "string",
			creator: "string",
			last_update: "object",//date
			approved_date: "object",//date
			diff_aim: "number",//float, ctb diff rating
			diff_speed: "number",//float
			difficultyrating: "number",//float
			bpm: "number",//float
			title: "string",
			artist: "string"
		};
		const score_format = {
			score: "number",//int
			pp: "number",//float
			pp_valid: "boolean",
			maxcombo: "number",//int
			perfect: "boolean",//perfect combo (FC)
			countmiss: "number",//int
			count50: "number",//int
			count100: "number",//int
			countkatu: "number",//int, mania200
			count300: "number",//int
			countgeki: "number",//int, maniarainbow
			enabled_mods: "number",//int
			date: "object",
			rank: "string"
		};
		for (let b in beatmap_format) UTILS.assert(typeof (beatmap[b]) === beatmap_format[b], `beatmap[${b}] expects ${beatmap_format[b]} but is type ${typeof (beatmap[b])} with value ${beatmap[b]}`);
		for (let b in score_format) UTILS.assert(typeof (score[b]) === score_format[b], `score[${b}] expects ${score_format[b]} but is type ${typeof (score[b])} with value ${score[b]}`);
		let choke = "";
		if (beatmap.max_combo !== 0) {//modes with defined maxcombos
			if (score.maxcombo === beatmap.max_combo) choke = "PC" + (title ? " " : TAB);
			else if (score.maxcombo > .98 * beatmap.max_combo && score.countmiss === 0) choke = "FC" + (title ? " " : TAB);
			else if (score.countmiss === 0) choke = (score.maxcombo - beatmap.max_combo) + "x" + (title ? " " : TAB);
			else choke = score.countmiss + CONFIG.EMOJIS.miss;//default display (just misses)
		}
		else choke = score.countmiss + CONFIG.EMOJIS.miss;//default display (just misses)
		const beatmap_title = `${beatmap.artist.limit(12)} - ${beatmap.title.limit(18)} [${beatmap.version.limit(12)}]`;
		if (title) {
			return `${CONFIG.EMOJIS[score.rank]}${getStars(CONFIG, beatmap.mode, beatmap.difficultyrating, beatmap.diff_aim)}**${score.pp_valid ? `${score.pp.round(0)}pp` : `~~${score.pp.round(0)}pp~~`} ${UTILS.calcAcc(beatmap.mode, score).toFixed(2)}% ${choke}${score.enabled_mods !== 0 ? getMods(score.enabled_mods) + " " : ""}**${beatmap_title}`;
		}
		else {
			if (isNaN(score.pp)) score.pp = 0;
			return `${CONFIG.EMOJIS[score.rank]}**${score.pp_valid ? `${score.pp.round(0)}pp` : `~~${score.pp.round(0)}pp~~`}${TAB}${UTILS.calcAcc(beatmap.mode, score).toFixed(2)}%${TAB}${choke}${score.enabled_mods !== 0 ? getMods(score.enabled_mods) + TAB : ""}**${UTILS.numberWithCommas(score.score)}${TAB}${score.maxcombo}x`;
		}
	}
	matchRequest(match_object, user_object, beatmap_object) {
		let newEmbed = new Discord.RichEmbed();
		let game = match_object.games[match_object.games.length - 1];
		newEmbed.setAuthor(match_object.match.name, "", "https://osu.ppy.sh/mp/" + match_object.match.match_id);
		newEmbed.setTitle(UTILS.round(beatmap_object[0].difficultyrating, 2) + "★ " + beatmap_object[0].artist + " - " + beatmap_object[0].title + "[" + beatmap_object[0].version + "] by " + beatmap_object[0].creator);
		newEmbed.setURL("https://osu.ppy.sh/b/" + game.beatmap_id);
		newEmbed.setThumbnail("https://b.ppy.sh/thumb/" + beatmap_object[0].beatmapset_id + "l.jpg");
		newEmbed.setTimestamp(new Date(game.end_time));
		newEmbed.setFooter(UTILS.ago(new Date(game.end_time)));
		if (game.team_type == "0" || game.team_type == "1") {//head to head
			let players = game.scores.sort(function (a, b) {
				return parseInt(b.score) - parseInt(a.score);
			});
			newEmbed.setDescription(user_object[players[0].user_id].username + " wins");//add time ago
			newEmbed.addField("Players", players.map(function (value, index, array) {
				if (value.pass == "1") {
					return "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
				else {
					return "F" + "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
			}).join("\n"));
			return newEmbed;
		}
		else if (game.team_type == "2" || game.team_type == "3") {//team vs
			let red_score = 0;
			let blue_score = 0;
			let red_team = [];
			let blue_team = [];
			for (let i in game.scores) {
				if (game.scores[i].pass == "1") {//player passed
					if (game.scores[i].team == "1") {//blue
						blue_score += parseInt(game.scores[i].score);
						blue_team.push(game.scores[i]);
					}
					else if (game.scores[i].team == "2") {//red
						red_score += parseInt(game.scores[i].score);
						red_team.push(game.scores[i]);
					}
					else {//unsupported
						throw new Error("player on invalid team " + game.scores[i].team);
					}
				}
				else {//player failed
				}
			}
			if (red_score > blue_score) {
				newEmbed.setColor([255, 0, 0]);
				newEmbed.setDescription("Red wins");//add time ago
			}
			else if (blue_score > red_score) {
				newEmbed.setColor([0, 0, 255]);
				newEmbed.setDescription("Blue wins");//add time ago
			}
			else {//tie
				newEmbed.setColor([255, 255, 255]);
				newEmbed.setDescription("Tie");//add time ago
			}
			newEmbed.addField(UTILS.numberWithCommas(red_score) + " Red", red_team.map(function (value, index, array) {
				if (value.pass == "1") {
					return "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
				else {
					return "F" + "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
			}).join("\n"));
			newEmbed.addField(UTILS.numberWithCommas(blue_score) + " Blue", blue_team.map(function (value, index, array) {
				if (value.pass == "1") {
					return "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
				else {
					return "F" + "`" + UTILS.numberWithCommas(value.score) + "` by [" + user_object[value.user_id].username + "](https://osu.ppy.sh/u/" + value.user_id + ") " + UTILS.numberWithCommas(UTILS.round(user_object[value.user_id].pp_raw, 0)) + "pp (#" + UTILS.numberWithCommas(user_object[value.user_id].pp_rank) + ") :flag_" + user_object[value.user_id].country.toLowerCase() + ": #" + UTILS.numberWithCommas(user_object[value.user_id].pp_country_rank);
				}
			}).join("\n"));
			return newEmbed;
		}
		else {
			throw new Error("game mode unsupported");
		}
	}
	whatif(CONFIG, user, mode, top, new_score, new_pp, beatmap) {//new_score (is this a new score?) new_pp (what is the new pp value?)
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(`${user.username}: ${UTILS.numberWithCommas(user.pp_raw)}pp (#${UTILS.numberWithCommas(user.pp_rank)} ${user.country}${UTILS.numberWithCommas(user.pp_country_rank)})`, null, `https://osu.ppy.sh/u/${user.user_id}`);
		newEmbed.setThumbnail(`https://a.ppy.sh/${user.user_id}?${UTILS.now()}`);
		newEmbed.setFooter(["standard mode", "taiko", "catch the beat", "mania"][mode]);
		const INSERT = 1;
		const REPLACE = 2;
		let operation = new_score ? INSERT : REPLACE;
		let replace_index;
		if (operation === REPLACE) {
			replace_index = top.findIndex(s => s.beatmap_id === beatmap.beatmap_id);
			if (replace_index === -1) {//if trying to replace score and we can't find the score in the top 100,
				operation = INSERT;//change operation to insert
			}
		}
		newEmbed.setTitle(`What if ${user.username} got ${operation === INSERT ? `a new ${new_pp}pp score` : `${new_pp}pp on ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] by ${beatmap.creator}`}?`);

		const current_top_pp = top.map(s => s.pp);

		function setColor(dpp) {
			if (dpp > 0) newEmbed.setColor([0, 255, 0]);
			else if (dpp < 0) newEmbed.setColor([255, 0, 0]);
		}

		let current_weighted_pp = 0;
		for (let i = 0; i < current_top_pp.length; ++i) current_weighted_pp += current_top_pp[i] * Math.pow(0.95, i);
		let current_bonus_pp = user.pp_raw - current_weighted_pp;
		if (operation === REPLACE) {
			let new_top_pp = [];
			for (let i = 0; i < current_top_pp.length; ++i) new_top_pp.push(current_top_pp[i]);
			new_top_pp[replace_index] = new_pp;

			new_top_pp.sort((a, b) => b - a);
			const new_index = new_top_pp.indexOf(new_pp);
			if (new_index === new_top_pp.length - 1) {//attempt interpolation; linear regression, last 10% scores
				let last10pct = current_top_pp.map((v, i) => [i, v]).slice(Math.floor(current_top_pp.length * 0.9), current_top_pp.length);
				//UTILS.inspect("last10pct", last10pct);
				let result = regression.linear(last10pct);
				let prediction = result.predict(current_top_pp.length - 1);//predict #100 play
				if (prediction[1] > current_top_pp[current_top_pp.length - 1]) prediction[1] = current_top_pp[current_top_pp.length - 1];//if the prediction is higher than the last play, just set it to the last play
				new_top_pp[new_index] = prediction[1];//set #100
				let new_weighted_pp = 0;
				for (let i = 0; i < new_top_pp.length; ++i) new_weighted_pp += new_top_pp[i] * Math.pow(0.95, i);
				const dpp = new_weighted_pp - current_weighted_pp;
				newEmbed.setDescription(`If ${user.username}'s existing top play on ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] were replaced by a ${new_pp}pp play, their #${replace_index + 1} best play worth ${current_top_pp[replace_index]}pp would likely fall below their #100 best play.\nBased on a linear regression performed on the 10% lowest pp values of the user's top 100 plays, we think that their new #100 play would be worth ${prediction[1]}pp.\nTheir pp would change by **${new_weighted_pp - current_weighted_pp > 0 ? "+" : ""}${dpp.round(3)}** to **${UTILS.numberWithCommas((current_bonus_pp + new_weighted_pp).round(3))}pp**.`);
				setColor(dpp);
			}
			else {
				let new_weighted_pp = 0;
				for (let i = 0; i < new_top_pp.length; ++i) new_weighted_pp += new_top_pp[i] * Math.pow(0.95, i);
				const dpp = new_weighted_pp - current_weighted_pp;
				newEmbed.setDescription(`If ${user.username}'s existing top play on ${beatmap.artist} - ${beatmap.title} [${beatmap.version}] were replaced by a ${new_pp}pp play, their #${replace_index + 1} best play worth ${current_top_pp[replace_index]}pp would become their #${new_index + 1} best play worth ${new_pp}pp.\nTheir pp would change by **${new_weighted_pp - current_weighted_pp > 0 ? "+" : ""}${dpp.round(3)}** to **${UTILS.numberWithCommas((current_bonus_pp + new_weighted_pp).round(3))}pp**.`);
				setColor(dpp);
			}
		}
		else {//insert
			let insert_index = -1;
			if (current_top_pp.length < 100) insert_index = current_top_pp.length;//if user doesn't have 100 scores, prepare to add it to the end
			for (let i = 0; i < current_top_pp.length; ++i) {
				if (new_pp >= current_top_pp[i]) {
					insert_index = i;
					break;
				}
			}
			if (insert_index === -1) {
				newEmbed.setDescription(`A ${new_pp}pp play wouldn't even be in ${user.username}'s top 100 plays.\nThere would not be any significant pp change.`);
			}
			else {
				let new_top_pp = [];
				for (let i = 0; i < current_top_pp.length; ++i) {
					if (i === insert_index) new_top_pp.push(new_pp);
					new_top_pp.push(current_top_pp[i]);
				}
				new_top_pp = new_top_pp.slice(0, 100);
				let new_weighted_pp = 0;
				for (let i = 0; i < new_top_pp.length; ++i) new_weighted_pp += new_top_pp[i] * Math.pow(0.95, i);
				const dpp = new_weighted_pp - current_weighted_pp;
				newEmbed.setDescription(`A ${new_pp}pp play would be ${user.username}'s #${insert_index + 1} best play.\nTheir pp would change by **+${dpp.round(3)}** to **${UTILS.numberWithCommas((new_weighted_pp + current_bonus_pp).round(3))}pp**.`);
				setColor(dpp);
			}
		}
		return newEmbed;
	}
}
