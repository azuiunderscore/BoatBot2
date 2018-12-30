"use strict";
const Discord = require("discord.js");
const UTILS = new (require("../utils.js"))();
const mathjs = require("mathjs");
const crypto = require("crypto");
const child_process = require("child_process");
const HORIZONTAL_SEPARATOR = "------------------------------";
const VERIFIED_ICON = "✅";
const TAB = " ";
const MANIA_KEY_COLOR = [0, 13421823, 13421823, 13421823, 10066431, 6711039, 3289855, 255, 204, 204, 204];
const MODE_COLOR = ["#ffffff", "#ff0000", "#00ff00", "#0000ff"];
function getStars(CONFIG, mode, stars) {
	stars = Math.floor(stars);
	if (stars > 8) stars = 8;
	return CONFIG.EMOJIS.stars[parseInt(mode)][stars];
}
function wholeStarValue(stars) {//for emojis only, returns 1-6
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
		if (exists(short_mod_values[mod_string.substring(i, i + 2).toUpperCase()])) {
			answer += short_mod_values[mod_string.substring(i, i + 2).toUpperCase()];
			answer_object[mod_string.substring(i, i + 2).toUpperCase()] = true;
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
function ppCalculator(pathToOsu, mode, acc = 100) {
	return new Promise((resolve, reject) => {
		if (mode == 0 | mode == 1) {
			child_process.execFile("../oppai", [pathToOsu, getMods(), acc + "%", "-m" + mode, "-ojson"], (err, stdout, stderr) => {
				let oo = JSON.parse(stdout);//oppai object
				if (err) return reject(err);
				if (UTILS.exists(stderr) && stderr != "") return reject(stderr);
				//check stderr
				resolve(oo.pp);
			});
		}
		else if (mode == 2) {//ctb
			resolve(0);
		}
		else if (mode == 3) {//mania
			if (mods != 0) {
				defaultDisplay();
				return;
			}
			let d = stars; //SR
			assert(!isNaN(d));
			if (d < 0) {
				//console.log("invalid SR");
				defaultDisplay();
				return;
			}
			assert(!isNaN(OD));
			if (OD < 0 || OD > 10) {
				//console.log("invalid OD " + beatmap.od());
				defaultDisplay();
				return;
			}
			let h = score; //Score
			assert(!isNaN(h));
			if (h < 0 || h > 1000000) {
				//console.log("invalid score");
				defaultDisplay();
				return;
			}
			let i = acc; //Acc
			assert(!isNaN(i));
			if (i < 0 || i > 100) {
				//console.log("invalid acc");
				defaultDisplay();
				return;
			}
			let e = beatmap.numObjects(); //Objects
			assert(!isNaN(e));
			if (e < 0) {
				//console.log("invalid objects");
				defaultDisplay();
				return;
			}
			let f = 64 - 3 * OD;
			let k = Math.pow((150 / f) * Math.pow(i / 100, 16), 1.8) * 2.5 * Math.min(1.15, Math.pow(e / 1500, 0.3));
			let l = (Math.pow(5 * Math.max(1, d / 0.0825) - 4, 3) / 110000) * (1 + 0.1 * Math.min(1, e / 1500));
			let m = (h < 500000) ? h / 500000 * 0.1 : ((h < 600000) ? (h - 500000) / 100000 * 0.2 + 0.1 : ((h < 700000) ? (h - 600000) / 100000 * 0.35 + 0.3 : ((h < 800000) ? (h - 700000) / 100000 * 0.2 + 0.65 : ((h < 900000) ? (h - 800000) / 100000 * 0.1 + 0.85 : (h - 900000) / 100000 * 0.05 + 0.95))));
			results.pp = Math.pow(Math.pow(k, 1.1) + Math.pow(l * m, 1.1), 1 / 1.1) * 1.1;
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
	const m_level = UTILS.findParticipantIdentityFromPID(match, pID);
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
module.exports = class EmbedGenerator {
	constructor() { }
	test() {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor("Author \\🇺🇸");
		newEmbed.setTitle("Test 🇺🇸");
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
	/*
	summoner(CONFIG, apiobj) {//lsd command
		let newEmbed = new Discord.RichEmbed();
		if (!UTILS.exists(apiobj.id)) {
			newEmbed.setAuthor(apiobj.guess);
			newEmbed.setTitle("This summoner does not exist.");
			newEmbed.setDescription("Please revise your request.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		newEmbed.setAuthor(apiobj.name);
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + apiobj.profileIconId + ".png");
		newEmbed.setDescription("Level " + apiobj.summonerLevel + "\npuuid: `" + apiobj.puuid + "`\nSummoner ID: `" + apiobj.id + "`\nAccount ID: `" + apiobj.accountId + "`");
		newEmbed.setTimestamp(new Date(apiobj.revisionDate));
		newEmbed.setFooter("Last change detected at ");
		return newEmbed;
	}
	detailedSummoner(CONFIG, summoner, ranks, championmastery, region, match, challengers, verified) {//region username command
		let newEmbed = new Discord.RichEmbed();
		if (!UTILS.exists(summoner.id)) {
			newEmbed.setAuthor(summoner.guess);
			newEmbed.setTitle("This summoner does not exist.");
			newEmbed.setDescription("Please revise your request.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		newEmbed.setAuthor(summoner.name + (verified ? VERIFIED_ICON : ""), undefined, UTILS.opgg(region, summoner.name));
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png");
		if (UTILS.exists(match.status)) newEmbed.setDescription("Level " + summoner.summonerLevel);
		else {
			const game_type = match.gameType == "CUSTOM_GAME" ? "Custom" : queues[match.gameQueueConfigId];
			if (match.gameStartTime != 0) newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Playing:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => p.summonerName === summoner.name).championId].emoji + "** on " + game_type + " for `" + UTILS.standardTimestamp((new Date().getTime() - match.gameStartTime) / 1000) + "`");
			else newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Game Loading:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => p.summonerName === summoner.name).championId].emoji + "** on " + game_type);
		}
		const will = (region === "NA" && summoner.id == 50714503) ? true : false;
		let highest_rank = -1;
		for (let i = 0; i < ranks.length; ++i) {
			let description = (ranks[i].wins + ranks[i].losses) + "G (" + UTILS.round(100 * ranks[i].wins / (ranks[i].wins + ranks[i].losses), 2) + "%) = " + ranks[i].wins + "W + " + ranks[i].losses + "L";
			if (UTILS.exists(ranks[i].miniSeries)) description += "\nSeries in Progress: " + ranks[i].miniSeries.progress.replaceAll("N", "\\➖").replaceAll("W", CONFIG.EMOJIS.win).replaceAll("L", CONFIG.EMOJIS.loss);
			let title = CONFIG.EMOJIS.ranks[RANK_ORDER.indexOf(ranks[i].tier)] + {
				"RANKED_FLEX_SR": "Flex 5v5",
				"RANKED_SOLO_5x5": "Solo 5v5",
				"RANKED_FLEX_TT": "Flex 3v3"
			}[ranks[i].queueType] + ": ";
			title += UTILS.english(ranks[i].tier) + " ";
			if (ranks[i].tier != "CHALLENGER" && ranks[i].tier != "MASTER" && ranks[i].tier != "GRANDMASTER") title += ranks[i].rank + " ";
			else if (ranks[i].tier == "MASTER") { }
			else if (ranks[i].tier == "GRANDMASTER") { }
			else {//
				challengers[i].entries.sort((a, b) => b.leaguePoints - a.leaguePoints);//sort by LP
				const candidate = challengers[i].entries.findIndex(cr => summoner.id == cr.playerOrTeamId);//find placing
				if (candidate != -1) title += "#" + (candidate + 1) + " ";//add placing if index found
			}
			title += ranks[i].leaguePoints + "LP";
			newEmbed.addField((will ? "~~" : "") + title + (will ? "~~" : ""), (will ? "~~" : "") + description + (will ? "~~" : ""), true);
			if (RANK_ORDER.indexOf(ranks[i].tier) > highest_rank) highest_rank = RANK_ORDER.indexOf(ranks[i].tier);
		}
		if (highest_rank > -1) newEmbed.setColor(RANK_COLOR[highest_rank]);
		if (will) {
			const challenger_rank = UTILS.randomInt(5, 200);
			const fake_games = UTILS.randomInt(200, 700);
			const fake_wins = UTILS.randomInt(fake_games / 2, fake_games);
			const fake_losses = fake_games - fake_wins;
			const fake_wr = UTILS.round(100 * fake_wins / (fake_wins + fake_losses), 2);
			const challenger_LP = UTILS.round(UTILS.map(fake_wr, 50, 100, 500, 1000));
			newEmbed.addField(CONFIG.EMOJIS.ranks[CONFIG.EMOJIS.ranks.length - 1] + " Challenger ~#" + challenger_rank + " " + challenger_LP + "LP", fake_games + "G (" + fake_wr + "%) = " + fake_wins + "W + " + fake_losses + "L", true);
			newEmbed.setColor(RANK_COLOR[RANK_COLOR.length - 1]);
		}
		let cm_description = [];
		let cm_total = 0;
		for (let i = 0; i < championmastery.length; ++i) {
			if (i < 3) cm_description.push("`M" + championmastery[i].championLevel + "` " + CONFIG.STATIC.CHAMPIONS[championmastery[i].championId].emoji + " `" + UTILS.numberWithCommas(championmastery[i].championPoints) + "`pts");
			cm_total += championmastery[i].championLevel;
		}
		if (cm_description.length > 0) newEmbed.addField("Champion Mastery: " + cm_total, cm_description.join("\t") + "\n[op.gg](" + UTILS.opgg(region, summoner.name) + ") [moba](https://lol.mobalytics.gg/summoner/" + region + "/" + encodeURIComponent(summoner.name) + ") [quickfind](https://quickfind.kassad.in/profile/" + region + "/" + encodeURIComponent(summoner.name) + ") [lolprofile](https://lolprofile.net/summoner/" + region + "/" + encodeURIComponent(summoner.name) + "#update) [matchhistory](https://matchhistory." + region + ".leagueoflegends.com/en/#match-history/" + CONFIG.REGIONS[region.toUpperCase()].toUpperCase() + "/" + summoner.accountId + ") [wol](https://wol.gg/stats/" + region + "/" + encodeURIComponent(summoner.name) + "/) [mmr?](https://" + region + ".whatismymmr.com/" + encodeURIComponent(summoner.name) + ")");
		newEmbed.setTimestamp(new Date(summoner.revisionDate));
		newEmbed.setFooter("Last change detected at ");
		return newEmbed;
	}
	match(CONFIG, summoner, match_meta, matches, verified) {//should show 5 most recent games
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name + (verified ? VERIFIED_ICON : ""), "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		let common_teammates = {};
		//{
		//	"name": {
		//		w: 0,
		//		l: 0
		//	}
		//}
		let all_results = [];
		let all_KDA = {
			K: 0,
			D: 0,
			A: 0
		};
		let all_lanes = [0, 0, 0, 0, 0, 0];
		let all_lanes_w = [0, 0, 0, 0, 0, 0];
		let all_lanes_l = [0, 0, 0, 0, 0, 0];
		let all_lanes_KDA = [UTILS.copy(all_KDA), UTILS.copy(all_KDA), UTILS.copy(all_KDA), UTILS.copy(all_KDA), UTILS.copy(all_KDA), UTILS.copy(all_KDA)];
		let all_champions = {};
		let new_champion = {
			w: 0,
			l: 0,
			K: 0,
			D: 0,
			A: 0
		};
		let individual_match_description = [];
		let lane_record = [];//ordered, sequential
		let champion_record = [];//ordered, sequential
		for (let i = 0; i < match_meta.length && i < 20; ++i) {
			const KDA = UTILS.KDA(summoner.id, matches[i]);
			const stats = UTILS.stats(summoner.id, matches[i]);
			const teamParticipant = UTILS.teamParticipant(summoner.id, matches[i]);
			let teams = {};
			let lane = UTILS.inferLane(match_meta[i].role, match_meta[i].lane, teamParticipant.spell1Id, teamParticipant.spell2Id);
			lane_record.push(lane);
			champion_record.push(match_meta[i].champion);
			const win = UTILS.determineWin(summoner.id, matches[i]);
			++all_lanes[lane];
			win ? ++all_lanes_w[lane] : ++all_lanes_l[lane];
			all_results.push(win);
			if (!UTILS.exists(all_champions[match_meta[i].champion])) all_champions[match_meta[i].champion] = UTILS.copy(new_champion);
			win ? ++all_champions[match_meta[i].champion].w : ++all_champions[match_meta[i].champion].l;
			all_champions[match_meta[i].champion].K += KDA.K;
			all_champions[match_meta[i].champion].D += KDA.D;
			all_champions[match_meta[i].champion].A += KDA.A;
			for (let b in all_KDA) all_KDA[b] += KDA[b];
			for (let b in all_lanes_KDA[lane]) all_lanes_KDA[lane][b] += KDA[b];
			for (let b in matches[i].participants) {
				if (!UTILS.exists(teams[matches[i].participants[b].teamId])) teams[matches[i].participants[b].teamId] = [];
				teams[matches[i].participants[b].teamId].push(matches[i].participants[b]);
			}
			for (let b in teams[teamParticipant.teamId]) {
				const tmPI = UTILS.findParticipantIdentityFromPID(matches[i], teams[teamParticipant.teamId][b].participantId);
				if (tmPI.player.summonerId === summoner.id) continue;
				if (!UTILS.exists(common_teammates[tmPI.player.summonerName])) common_teammates[tmPI.player.summonerName] = { w: 0, l: 0 };
				if (win) common_teammates[tmPI.player.summonerName].w += 1;
				else common_teammates[tmPI.player.summonerName].l += 1;
			}
			if (i < 5) {//printing limit
				const tK = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.kills, 0);
				const tD = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.deaths, 0);
				const tA = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.assists, 0);
				let summoner_spells = "";
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teamParticipant.spell1Id])) summoner_spells += CONFIG.SPELL_EMOJIS[teamParticipant.spell1Id];
				else summoner_spells += "`" + CONFIG.STATIC.SUMMONERSPELLS[teamParticipant.spell1Id].name + "`";
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teamParticipant.spell2Id])) summoner_spells += CONFIG.SPELL_EMOJIS[teamParticipant.spell2Id];
				else summoner_spells += "\t`" + CONFIG.STATIC.SUMMONERSPELLS[teamParticipant.spell2Id].name + "`";
				individual_match_description.push([(win ? "<:win:409617613161758741>" : "<:loss:409618158165688320>") + " " + CONFIG.STATIC.CHAMPIONS[match_meta[i].champion].emoji + CONFIG.EMOJIS.lanes[lane] + " " + summoner_spells + " `" + UTILS.standardTimestamp(matches[i].gameDuration) + "` " + queues[matches[i].queueId + ""] + " " + UTILS.ago(new Date(match_meta[i].timestamp + (matches[i].gameDuration * 1000))), "__lv.__ `" + stats.champLevel + "`\t`" + KDA.K + "/" + KDA.D + "/" + KDA.A + "`\t__KDR:__`" + UTILS.KDAFormat(KDA.KD) + "`\t__KDA:__`" + UTILS.KDAFormat(KDA.KDA) + "` `" + UTILS.KPFormat((100 * (KDA.A + KDA.K)) / tK) + "%`\t__cs:__`" + (stats.totalMinionsKilled + stats.neutralMinionsKilled) + "`\t__g:__`" + UTILS.gold(stats.goldEarned) + "`\n" + getMatchTags(summoner.id, matches[i]).map(s => "`" + s + "`").join(TAB + " ")]);
			}
			// champion
			// match result
			// queue
			// level
			//[items]
			// KDA
			// cs
			// gold
			// length
			// time
			// lane
			// role
			// KP
		}
		let all_champions_a = [];
		for (let b in all_champions) {
			all_champions[b].id = b;
			all_champions_a.push(all_champions[b]);
		}
		all_champions_a.sort((a, b) => b.w + b.l - a.w - a.l);
		all_KDA.KDA = (all_KDA.K + all_KDA.A) / all_KDA.D;
		for (let b in all_lanes_KDA) all_lanes_KDA[b].KDA = (all_lanes_KDA[b].K + all_lanes_KDA[b].A) / all_lanes_KDA[b].D;
		let lane_description = [];
		for (let i = 0; i <= 5; ++i) if (all_lanes[i] > 0) lane_description.push([CONFIG.EMOJIS.lanes[i] + all_lanes[i] + "G (" + UTILS.round(100 * all_lanes_w[i] / (all_lanes_w[i] + all_lanes_l[i]), 0) + "%) = " + all_lanes_w[i] + "W + " + all_lanes_l[i] + "L\tKDA:`" + UTILS.KDAFormat(all_lanes_KDA[i].KDA) + "`", all_lanes[i]]);
		lane_description.sort((a, b) => b[1] - a[1]);
		lane_description = lane_description.map(s => s[0]);
		const total_wins = all_results.reduce((total, increment) => total + (increment ? 1 : 0), 0);
		const total_losses = all_results.reduce((total, increment) => total + (increment ? 0 : 1), 0);
		newEmbed.addField("Recent Games", all_results.length + "G (" + UTILS.round(100 * total_wins / (total_wins + total_losses), 0) + "%) = " + total_wins + "W + " + total_losses + "L " + "\tKDA:`" + UTILS.KDAFormat(all_KDA.KDA) + "`\n" + lane_description.join("\n"), true);
		newEmbed.addField("Recent Champions", all_champions_a.map(c => CONFIG.STATIC.CHAMPIONS[c.id].emoji + (c.w + c.l) + "G (" + UTILS.round(100 * c.w / (c.w + c.l), 0) + "%) = " + c.w + "W + " + c.l + "L\tKDA:`" + UTILS.KDAFormat((c.K + c.A) / c.D) + "`").slice(0, 7).join("\n"), true);
		for (let i = 0; i < individual_match_description.length; ++i) newEmbed.addField(individual_match_description[i][0], individual_match_description[i][1]);
		if (all_results.length > 5) newEmbed.addField("Old Match Results", all_results.slice(5, 13).map(r => r ? CONFIG.EMOJIS.win : CONFIG.EMOJIS.loss).join("") + "\n" + lane_record.slice(5, 13).map(l => CONFIG.EMOJIS.lanes[l]).join("") + "\n" + champion_record.slice(5, 13).map(c => CONFIG.STATIC.CHAMPIONS[c].emoji).join(""), true);
		if (all_results.length > 12) newEmbed.addField("Older Match Results", all_results.slice(13).map(r => r ? CONFIG.EMOJIS.win : CONFIG.EMOJIS.loss).join("") + "\n" + lane_record.slice(13).map(l => CONFIG.EMOJIS.lanes[l]).join("") + "\n" + champion_record.slice(13).map(c => CONFIG.STATIC.CHAMPIONS[c].emoji).join(""), true);
		let rpw = [];//recently played with
		for (let b in common_teammates) rpw.push([b, common_teammates[b].w, common_teammates[b].l]);
		rpw.sort((a, b) => b[1] + b[2] - a[1] - a[2]);
		let rpws = [];//recently played with string
		for (let i = 0; i < rpw.length; ++i) if (rpw[i][1] + rpw[i][2] > 1) rpws.push((rpw[i][1] + rpw[i][2]) + "G (" + UTILS.round(100 * rpw[i][1] / (rpw[i][1] + rpw[i][2]), 0) + "%) = " + rpw[i][1] + "W + " + rpw[i][2] + "L: __[" + rpw[i][0] + "](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], rpw[i][0]) + ")__");
		if (rpws.length == 0) rpws.push("No one");
		newEmbed.addField("Top 10 Recently Played With", rpws.slice(0, 10).join("\n"));
		return newEmbed;
	}
	detailedMatch(CONFIG, summoner, match_meta, match, ranks, masteries, summoner_participants, verified) {//should show detailed information about 1 game
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name + (verified ? VERIFIED_ICON : ""), "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		if (UTILS.exists(match.status)) {
			newEmbed.setAuthor(summoner.guess);
			newEmbed.setTitle("This summoner has no recent matches.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		const avg_iMMR = UTILS.averageMatchMMR(ranks);
		for (let i = 0; i < IMMR_THRESHOLD.length; ++i) if (avg_iMMR >= IMMR_THRESHOLD[i]) newEmbed.setColor(RANK_COLOR[i]);
		UTILS.output("average iMMR is " + Math.round(avg_iMMR) + " or " + UTILS.iMMRtoEnglish(avg_iMMR));
		newEmbed.setTitle(queues[match.queueId] + " `" + UTILS.standardTimestamp(match.gameDuration) + "`");
		newEmbed.setTimestamp(new Date(match_meta.timestamp + (match.gameDuration * 1000)));
		newEmbed.setFooter("Match played " + UTILS.ago(new Date(match_meta.timestamp + (match.gameDuration * 1000))) + " at: ");
		let teams = {};
		for (let b in match.participantIdentities) {
			const pI = match.participantIdentities[b];
			const flex_5 = ranks[b].find(r => r.queueType === "RANKED_FLEX_SR");
			const flex_3 = ranks[b].find(r => r.queueType === "RANKED_FLEX_TT");
			const solo = ranks[b].find(r => r.queueType === "RANKED_SOLO_5x5");
			pI.flex5 = "`" + UTILS.shortRank(flex_5) + "`";
			pI.flex3 = "`" + UTILS.shortRank(flex_3) + "`";
			pI.solo = "`" + UTILS.shortRank(solo) + "`";
			pI.mastery = UTILS.getSingleChampionMastery(masteries[b], match.participants.find(p => p.participantId == pI.participantId).championId);
		}
		for (let b in match.participants) {
			if (!UTILS.exists(teams[match.participants[b].teamId])) teams[match.participants[b].teamId] = [];
			teams[match.participants[b].teamId].push(match.participants[b]);
		}
		let team_count = 0;
		for (let b in teams) {
			++team_count;
			const tK = teams[b].reduce((total, increment) => total + increment.stats.kills, 0);
			const tD = teams[b].reduce((total, increment) => total + increment.stats.deaths, 0);
			const tA = teams[b].reduce((total, increment) => total + increment.stats.assists, 0);
			const tKP = UTILS.round(100 * (tK + tA) / (tK * teams[b].length), 0);
			newEmbed.addField((match.teams.find(t => teams[b][0].teamId == t.teamId).win == "Win" ? CONFIG.EMOJIS["win"] : CONFIG.EMOJIS["loss"]) + "Team " + team_count + " Bans: " + match.teams.find(t => t.teamId == b).bans.map(b => b.championId == -1 ? ":x:" : CONFIG.STATIC.CHAMPIONS[b.championId].emoji).join(""), "__Σlv.__ `" + teams[b].reduce((total, increment) => total + increment.stats.champLevel, 0) + "`\t`" + tK + "/" + tD + "/" + tA + "`\t__KDR:__`" + UTILS.KDAFormat(tK / tD) + "`\t__KDA:__`" + UTILS.KDAFormat((tK + tA) / tD) + "` `" + tKP + "%`\t__Σcs:__`" + teams[b].reduce((total, increment) => total + increment.stats.totalMinionsKilled + increment.stats.neutralMinionsKilled, 0) + "`\t__Σg:__`" + UTILS.gold(teams[b].reduce((total, increment) => total + increment.stats.goldEarned, 0)) + "`");
			teams[b].sort((a, b) => UTILS.inferLane(a.timeline.role, a.timeline.lane, a.spell1Id, a.spell2Id) - UTILS.inferLane(b.timeline.role, b.timeline.lane, b.spell1Id, b.spell2Id));
			for (let c in teams[b]) {
				let p = teams[b][c];
				let pI = match.participantIdentities.find(pI => pI.participantId == p.participantId);
				let summoner_spells = "";
				if (UTILS.exists(pI.player.summonerId)) {//not a bot
					if (UTILS.exists(CONFIG.SPELL_EMOJIS[p.spell1Id])) summoner_spells += CONFIG.SPELL_EMOJIS[p.spell1Id];
					else summoner_spells += "`" + CONFIG.STATIC.SUMMONERSPELLS[p.spell1Id].name + "`";
					if (UTILS.exists(CONFIG.SPELL_EMOJIS[p.spell2Id])) summoner_spells += CONFIG.SPELL_EMOJIS[p.spell2Id];
					else summoner_spells += "\t`" + CONFIG.STATIC.SUMMONERSPELLS[p.spell2Id].name + "`";
				}
				else summoner_spells = ":x::x:";//bot
				const username = pI.player.summonerName;
				const lane = CONFIG.EMOJIS.lanes[UTILS.inferLane(p.timeline.role, p.timeline.lane, p.spell1Id, p.spell2Id)];
				newEmbed.addField(CONFIG.STATIC.CHAMPIONS[p.championId].emoji + lane + summoner_spells + " " + pI.solo + " ¦ " + pI.flex5 + " ¦ " + pI.flex3 + " ¦ `M" + pI.mastery + "` lv. `" + (UTILS.exists(pI.player.summonerId) ? summoner_participants.find(p => p.id == pI.player.summonerId).summonerLevel : 0) + "` __" + (pI.player.summonerId == summoner.id ? "**" + username + "**" : username) + "__" + (pI.player.summonerId == summoner.id && verified ? "\\" + VERIFIED_ICON : ""), "[opgg](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], username) + ") " + "__lv.__ `" + p.stats.champLevel + "`\t`" + p.stats.kills + "/" + p.stats.deaths + "/" + p.stats.assists + "`\t__KDR:__`" + UTILS.KDAFormat(p.stats.kills / p.stats.deaths) + "`\t__KDA:__`" + UTILS.KDAFormat((p.stats.kills + p.stats.assists) / p.stats.deaths) + "` `" + UTILS.KPFormat((100 * (p.stats.assists + p.stats.kills)) / tK) + "%`\t__cs:__`" + (p.stats.totalMinionsKilled + p.stats.neutralMinionsKilled) + "`\t__g:__`" + UTILS.gold(p.stats.goldEarned) + "`\n" + getMatchTags(pI.player.summonerId, match).map(s => "`" + s + "`").join(TAB + " "));
			}
		}
		// champion
		// match result
		// queue
		// level
		//[items]
		// KDA
		// cs
		// gold
		// length
		// time
		// lane
		// role
		// team KDA
		// team CS
		// KP
		return newEmbed;
	}
	liveMatchPremade(CONFIG, summoner, match, matches, ranks, masteries, summoner_participants, verified, trim = true, newlogic = true) {//show current match information
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name + (verified ? VERIFIED_ICON : ""), "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		if (UTILS.exists(match.status)) {
			newEmbed.setAuthor(summoner.guess);
			newEmbed.setTitle("This summoner is currently not in a match.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		const avg_iMMR = UTILS.averageMatchMMR(ranks);
		UTILS.output("average iMMR is " + UTILS.round(avg_iMMR) + " or " + UTILS.iMMRtoEnglish(avg_iMMR));
		for (let i = 0; i < IMMR_THRESHOLD.length; ++i) if (avg_iMMR >= IMMR_THRESHOLD[i]) newEmbed.setColor(RANK_COLOR[i]);
		const game_type = match.gameType == "CUSTOM_GAME" ? "Custom" : queues[match.gameQueueConfigId];
		if (match.gameStartTime != 0) newEmbed.setTitle(game_type + " `" + UTILS.standardTimestamp((new Date().getTime() - match.gameStartTime) / 1000) + "`");
		else newEmbed.setTitle(game_type + " `GAME LOADING`");
		let common_teammates = {};
		//{
		//	"username1": {
		//		"username2": 4
		//	}
		//}
		let teams = {};
		for (let b in match.participants) {
			if (!UTILS.exists(teams[match.participants[b].teamId])) teams[match.participants[b].teamId] = [];
			const flex_5 = ranks[b].find(r => r.queueType === "RANKED_FLEX_SR");
			const flex_3 = ranks[b].find(r => r.queueType === "RANKED_FLEX_TT");
			const solo = ranks[b].find(r => r.queueType === "RANKED_SOLO_5x5");
			match.participants[b].flex5 = UTILS.shortRank(flex_5);
			match.participants[b].flex3 = UTILS.shortRank(flex_3);
			match.participants[b].solo = UTILS.shortRank(solo);
			match.participants[b].mastery = UTILS.getSingleChampionMastery(masteries[b], match.participants[b].championId);
			teams[match.participants[b].teamId].push(match.participants[b]);
			common_teammates[match.participants[b].summonerName] = {};
		}
		if (newlogic) {//new logic
			for (let b in matches) {
				let teams_private = {};
				for (let c in matches[b].participants) {
					if (!UTILS.exists(teams_private[matches[b].participants[c].teamId])) teams_private[matches[b].participants[c].teamId] = [];
					teams_private[matches[b].participants[c].teamId].push(matches[b].participants[c]);
				}
				for (let c in teams_private) teams_private[c] = teams_private[c].map(p => matches[b].participantIdentities.find(pI => pI.participantId === p.participantId));
				for (let c in teams_private) {//team of pIs
					for (let d in teams_private[c]) {//individual pI
						const dsn = teams_private[c][d].player.summonerName;
						if (!UTILS.exists(common_teammates[dsn])) common_teammates[dsn] = {};
						for (let e in teams_private[c]) {
							const esn = teams_private[c][e].player.summonerName;
							if (!UTILS.exists(common_teammates[dsn][esn])) common_teammates[dsn][esn] = 1;
							else common_teammates[dsn][esn] += 1;
						}
					}
				}
			}
		}
		else {//old logic
			for (let b in matches) {
				for (let c in matches[b].participantIdentities) {
					const tC = matches[b].participantIdentities[c];
					if (!UTILS.exists(common_teammates[tC.player.summonerName])) common_teammates[tC.player.summonerName] = {};
					for (let d in matches[b].participantIdentities) {
						const tD = matches[b].participantIdentities[d];
						if (tC.player.summonerId != tD.player.summonerId) { //same guy check
							if (!UTILS.exists(common_teammates[tC.player.summonerName][tD.player.summonerName])) common_teammates[tC.player.summonerName][tD.player.summonerName] = 1;
							else common_teammates[tC.player.summonerName][tD.player.summonerName] += 1;
						}
					}
				}
			}
		}
		if (trim) UTILS.debug(UTILS.trim(common_teammates) + " premade entries trimmed.");
		let team_count = 1;
		let player_count = 0;
		for (let b in teams) {//team
			let team_description_c1 = "";
			let team_description_c2 = "";
			let ban_description = [];
			let networks = teams[b].map(t => UTILS.getGroup(t.summonerName, common_teammates));//for everyone on the team, put the premade group in the network array
			let premade_str = networks.map(g => g.join(","));//array of comma delimited network strings
			let premade_letter = {};//object of network strings
			for (let c in premade_str) {
				if (!UTILS.exists(premade_letter[premade_str[c]])) premade_letter[premade_str[c]] = 1;//if the network doesn't exist as a key in premade_letter, assign 1 to it
				else ++premade_letter[premade_str[c]];//otherwise it exists, and add 1 to it
			}
			let premade_number = 1;
			for (let c in premade_letter) {//for each unique network in premade_letter
				if (premade_letter[c] == 1) premade_letter[c] = 0;//not a premade (group size 1)
				else {
					premade_letter[c] = premade_number;//assign a premade symbol index
					premade_number++;//increment the index
				}
			}
			for (let c in teams[b]) {//player on team
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teams[b][c].spell1Id])) team_description_c1 += CONFIG.SPELL_EMOJIS[teams[b][c].spell1Id];
				else team_description_c1 += "`" + CONFIG.STATIC.SUMMONERSPELLS[teams[b][c].spell1Id].name + "`";
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teams[b][c].spell2Id])) team_description_c1 += CONFIG.SPELL_EMOJIS[teams[b][c].spell2Id];
				else team_description_c1 += "\t`" + CONFIG.STATIC.SUMMONERSPELLS[teams[b][c].spell2Id].name + "`";
				team_description_c1 += " `" + teams[b][c].solo + " " + teams[b][c].flex5 + " " + teams[b][c].flex3 + "`\n";
				team_description_c2 += "`M" + teams[b][c].mastery + "`" + CONFIG.STATIC.CHAMPIONS[teams[b][c].championId].emoji;
				team_description_c2 += "`" + summoner_participants.find(p => p.id == teams[b][c].summonerId).summonerLevel + "`";
				team_description_c2 += " " + PREMADE_EMOJIS[premade_letter[premade_str[c]]];
				team_description_c2 += teams[b][c].summonerId == summoner.id ? "**" : "";//bolding
				team_description_c2 += "__[" + teams[b][c].summonerName + "](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], teams[b][c].summonerName) + ")__";
				team_description_c2 += (teams[b][c].summonerId == summoner.id && verified) ? "\\" + VERIFIED_ICON : "";
				team_description_c2 += teams[b][c].summonerId == summoner.id ? "**" : "";//bolding
				if (UTILS.exists(match.bannedChampions[player_count])) {
					ban_description.push(match.bannedChampions[player_count].championId == -1 ? ":x:" : CONFIG.STATIC.CHAMPIONS[match.bannedChampions[player_count].championId].emoji);
				}
				team_description_c2 += "\n";
				++player_count;
			}
			UTILS.debug("team_description_c1 length: " + team_description_c1.length);
			UTILS.debug("team_description_c2 length: " + team_description_c2.length);
			newEmbed.addField(":x::x: `SOLOQ ¦FLEX5 ¦FLEX3`", team_description_c1, true);
			newEmbed.addField("Bans: " + ban_description.join(""), team_description_c2, true);
			++team_count;
		}
		return newEmbed;
	}
	mmr(CONFIG, summoner, verified) {
		let newEmbed = new Discord.RichEmbed();
		if (!UTILS.exists(summoner.id)) {
			newEmbed.setTitle("This summoner does not exist.");
			newEmbed.setDescription("Please revise your request.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		let tier, jokeNumber;
		let mmr = UTILS.randomInt(-1, MMR_THRESHOLD.length);//pick a tier
		if (mmr === -1) UTILS.randomInt(-100, MMR_THRESHOLD[0])
		else if (mmr < MMR_THRESHOLD.length - 1) mmr = UTILS.randomInt(MMR_THRESHOLD[mmr], MMR_THRESHOLD[mmr + 1]);//-100 to 400
		else UTILS.randomInt(MMR_THRESHOLD[mmr], MMR_THRESHOLD[mmr] + 300);
		if (mmr < MMR_THRESHOLD[0]) {
			tier = UTILS.randomOf(["WOOD", "CLOTH", "IRON", "PLASTIC", "PAPER", "COPPER", "CARDBOARD", "LEAD", "DIRT", "GARBAGE"]);
			jokeNumber = 0;
		} else if (mmr < MMR_THRESHOLD[1]) {//bronze
			tier = RANK_ORDER[1];
			jokeNumber = 1;
		} else if (mmr < MMR_THRESHOLD[2]) {//silver
			tier = RANK_ORDER[2];
			jokeNumber = 2;
		} else if (mmr < MMR_THRESHOLD[3]) {//gold
			tier = RANK_ORDER[3];
			jokeNumber = 3;
		} else if (mmr < MMR_THRESHOLD[4]) {//plat
			tier = RANK_ORDER[4];
			jokeNumber = 4;
		} else if (mmr < MMR_THRESHOLD[5]) {//dia
			tier = RANK_ORDER[5];
			jokeNumber = 5;
		} else if (mmr < MMR_THRESHOLD[6]) {//master
			tier = RANK_ORDER[6];
			jokeNumber = 6;
		} else {//challenger
			tier = RANK_ORDER[8];
			jokeNumber = 7;
		}
		const analysis = UTILS.randomOf(MMR_JOKES[jokeNumber]);
		newEmbed.setAuthor(summoner.name + (verified ? VERIFIED_ICON : ""), null, UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png");
		newEmbed.setDescription("Level " + summoner.summonerLevel);
		newEmbed.addField("MMR Data", "Tier: " + UTILS.english(tier) + "\nMMR: `" + mmr + "`\n" + analysis);
		if (RANK_ORDER.indexOf(tier) != -1) newEmbed.setColor(RANK_COLOR[RANK_ORDER.indexOf(tier)]);
		newEmbed.setFooter("This information does not reflect this summoner's actual MMR.");
		return newEmbed;
}
	*/
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
			let description = docs[i].user ? "uid" : "sid" + ": " + docs[i].target_id + ", ";
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
		newEmbed.setDescription(playstyle + "\nRanked Score: " + UTILS.numberWithCommas(user_stats.ranked_score) + "\nHit Accuracy: " + UTILS.round(user_stats.accuracy, 3) + " ± " + accdev + "%\nPlay Count: " + UTILS.numberWithCommas(user_stats.playcount) + "\nPlay Time: " + UTILS.numberWithCommas(playHours) + " hours\nTotal Score: " + UTILS.numberWithCommas(UTILS.round(parseInt(user_stats.total_score), 2)) + "\nCurrent Level: " + UTILS.round(parseFloat(user_stats.level), 2) + "\nTotal Hits: " + UTILS.numberWithCommas(totalHits) + "\n" + CONFIG.EMOJIS.webXH + ": " + user_stats.count_rank_ssh + "    " + CONFIG.EMOJIS.webX + ": " + user_stats.count_rank_ss + "    " + CONFIG.EMOJIS.webSH + ": " + user_stats.count_rank_sh + "    " + CONFIG.EMOJIS.webS + ": " + user_stats.count_rank_s + "    " + CONFIG.EMOJIS.webA + ": " + user_stats.count_rank_a);

		newEmbed.addField("For mod information", "add `-m` to the command. `!sp-m`, `!spt-m`, `!spc-m`, `!spm-m`");
		/*
		newEmbed.addField("Favorite Mods", fms);
		newEmbed.addField("pp sources (pp)", pfm);
		newEmbed.addField("pp sources (%)", pfmp);
		*/
		user_stats.countmiss = misses;
		newEmbed.addField("Interpolated Information", "Unweighted Hit Accuracy: `" + UTILS.calcAcc(0, user_stats) + "%`\nAverage play worth: `" + apw + "` ± " + aim_acc.ppstddev + "pp\nCumulative unweighted pp, top 100: `" + aim_acc.ppTotal + "` pp\nPP range: " + aim_acc.maxPP + " - " + aim_acc.minPP + " = `" + UTILS.round(aim_acc.ppRange, 3) + "`\nScoring Efficiency: `" + UTILS.round(efficiency, 2) + "%`\tObjects per play: `" + UTILS.round(cpp, 2) + "`\nAppx.Misses: `" + UTILS.numberWithCommas(UTILS.round(misses, 0)) + "`\tMiss rate: `" + UTILS.round(missRate, 3) + "%` or 1 miss every `" + UTILS.round(100 / missRate, 0) + "` hits\nRatio of 0 miss plays in the top 100: `" + UTILS.round(aim_acc.sRatio, 1) + "%` >0 miss plays: `" + UTILS.round(100 - aim_acc.sRatio, 1) + "%`\nAverage Career Hits per second: `" + UTILS.round(totalHits / (playHours * 3600), 2) + "`");
		//newEmbed.addField("For mod information", "add `-m` to the command. `!sp-m`, `!spt-m`, `!spc-m`, `!spm-m`");
		newEmbed.addField("More about " + user_stats.username, "[osu!track](https://ameobea.me/osutrack/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!stats](http://osustats.ppy.sh/u/" + encodeURIComponent(user_stats.username) + ")\t[osu!skills](http://osuskills.com/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!chan](https://syrin.me/osuchan/u/" + user_stats.user_id + "/?m=" + mode + ")\t[pp+](https://syrin.me/pp+/u/" + user_stats.user_id + "/)");
		newEmbed.setTimestamp(new Date());
		newEmbed.setFooter("Requested at local time", "https://s.ppy.sh/images/flags/" + user_stats.country.toLowerCase() + ".gif");
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
		newEmbed.setAuthor(user_stats.username + "'s " + wordMode + " Profile", null, "https://osu.ppy.sh/users/" + user_stats.user_id);
		newEmbed.setImage("https://lemmmy.pw/osusig/sig.php?colour=pink&uname=" + user_stats.user_id + "&pp=2&countryrank&removeavmargin&darktriangles&onlineindicator=undefined&xpbar&xpbarhex&mode=" + mode + "&random=" + UTILS.now());
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
			edit.addField("Responses", "Send message response: `" + CONFIG.DISCORD_COMMAND_PREFIX + "mail " + uid + "`\nNote: `" + CONFIG.DISCORD_COMMAND_PREFIX + "noteuser " + uid + " <reason>`");
			user.setAuthor(username, msg.embeds[0].author.icon, msg.embeds[0].author.url);
			user.setFooter("Approved by " + approver.username, approver.displayAvatarURL);
			user.fields = [];
			user.setTitle("Your feedback was reviewed by our staff and approved for public viewing on our server- click to join");
			user.setURL("https://discord.gg/57Z8Npg");
			public_e.setAuthor(username, user.author.icon_url);
			return { to_user: user, to_user_uid: uid, edit, to_public: public_e, to_public_cid: cid };
		}
		else return {};
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
			if (CONFIG.BANS.USERS[b] == 0 || CONFIG.BANS.USERS[b] > now) ++userbans;
		}
		for (let b in CONFIG.BANS.SERVERS) {
			if (CONFIG.BANS.SERVERS[b] == 0 || CONFIG.BANS.SERVERS[b] > now) ++serverbans;
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
	beatmap(CONFIG, beatmap, creator, mod_string = "") {
		const mods = getModObject(mod_string);
		let other_diffs = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];//1 sub array for each mode
		const diff_count = beatmap.length;
		for (let b in beatmaps) {
			++other_diffs[beatmaps[b].mode][wholeStarValue(beatmaps[b].difficultyrating) - 1];
		}
		let diffstring = "";
		for (let i = 0; i < 4; ++i) {//mode
			for (let j = 0; j < 7; ++j) {//star value
				if (other_diffs[i][j] > 0) diffstring += getStars(CONFIG, i, j) + ": " + other_diffs[i][j] + TAB;
			}
		}
		beatmap = beatmap[0];
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(beatmap.creator, "https://a.ppy.sh/users/" + creator.user_id, "https://osu.ppy.sh/users/" + creator.user_id);
		newEmbed.setThumbnail("https://b.ppy.sh/thumb/" + beatmap.beatmapset_id + "l.jpg");
		const modePrefix = beatmap.mode == 3 ? "[" + parseInt(beatmap.diff_size) + "] " : "";//
		newEmbed.setColor(beatmap.mode == 3 ? MANIA_KEY_COLOR[parseInt(beatmap.diff_size)] : MODE_COLOR[parseInt(beatmap.mode)]);
		newEmbed.setTitle(modePrefix + UTILS.fstr(beatmap.approved < 1, "~~") + beatmap.artist + " - " + beatmap.title + UTILS.fstr(beatmap.approved < 1, "~~"));
		if (mods.value > 0) {
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
		}
		newEmbed.addField(getStars(CONFIG, beatmap.mode, beatmap.difficultyrating) + " \\[" + beatmap.version + "\\]" + UTILS.fstr(mods.value > 0, " ") + mods.string, "Length: `" + UTILS.standardTimestamp(beatmap.total_length) + "` (`" + UTILS.standardTimestamp(beatmap.hit_length) + "`) BPM: `" + beatmap.bpm + "` FC: `x" + beatmap.max_combo + "`\nDownload Beatmap: [" + CONFIG.EMOJIS.download + "](https://osu.ppy.sh/d/" + beatmap.beatmapset_id + ") [" + CONFIG.EMOJIS.downloadNV + "(https://osu.ppy.sh/d/" + beatmap.beatmapset_id + "n) [" + CONFIG.EMOJIS.osu_direct + "](https://iaace.gg/od/" + beatmap.beatmap_id + ") [" + CONFIG.EMOJIS.bloodcat + "](https://bloodcat.com/osu/s/" + beatmap.beatmapset_id + ")");
		if (diff_count > 1) newEmbed.addField("This beatmap has " + diff_count + " other difficulties.", diffstring);
		return newEmbed;
	}
}
