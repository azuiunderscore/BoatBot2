"use strict";
const Discord = require("discord.js");
const UTILS = new (require("../utils.js"))();
const queues = {
	"0": "Custom",
	"70": "SR One for All",
	"72": "HA 1v1 Snowdown Showdown",
	"73": "HA 2v2 Snowdown Showdown",
	"75": "SR 6v6 Hexakill",
	"76": "SR URF",
	"78": "HA One For All: Mirror",
	"83": "SR Co-op vs AI URF",
	"98": "TT 6v6 Hexakill",
	"100": "BB 5v5 ARAM",
	"310": "SR Nemesis",
	"313": "SR Black Market Brawlers",
	"317": "CS Definitely Not Dominion",
	"325": "SR All Random",
	"400": "SR Draft",
	"420": "SR Ranked Solo",
	"430": "SR Blind",
	"440": "SR Ranked Flex",
	"450": "HA ARAM",
	"460": "TT Blind",
	"470": "TT Ranked Flex",
	"600": "SR Blood Hunt",
	"610": "CR Dark Star: Singularity",
	"700": "SR Clash",
	"800": "TT Co-op vs AI Intermediate",
	"810": "TT Co-op vs AI Intro",
	"820": "TT Co-op vs AI Beginner",
	"830": "SR Co-op vs AI Intro",
	"840": "SR Co-op vs AI Beginner",
	"850": "SR Co-op vs AI Intermediate",
	"900": "SR ARURF",
	"910": "CS Ascension",
	"920": "HA Legend of the Poro King",
	"940": "SR Nexus Siege",
	"950": "SR Doom Bots Voting",
	"960": "SR Doom Bots Standard",
	"980": "VCP Star Guardian Invasion: Normal",
	"990": "VCP Star Guardian Invasion: Onslaught",
	"1000": "O Project: Hunters",
	"1010": "SR Snow ARURF",
	"1020": "SR One for All"
};
const RANK_ORDER = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "CHALLENGER"];
const RANK_COLOR = [[153, 51, 0], [179, 179, 179], [255, 214, 51], [0, 255, 152], [179, 240, 255], [255, 153, 255], [255, 0, 0]];
const IMMR_THRESHOLD = [100, 600, 1100, 1600, 2100, 2600, 2700];
const PREMADE_EMOJIS = ["", "\\💙", "\\💛", "\\💚"];
module.exports = class EmbedGenerator {
	constructor() { }
	test() {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Test");
		newEmbed.setDescription("description");
		newEmbed.addField("`j` `      ` test", "nothing");
		return newEmbed;
	}
	help(CONFIG) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Discord Commands");
		newEmbed.setDescription("Terms of Service:\n- Don't be a bot on a user account and use SupportBot.\n- Don't abuse bugs. If you find a bug, please report it to us.\n- Don't spam useless feedback\n- If you do not want to use SupportBot, let us know and we'll opt you out of our services.\n- We reserve the right to ban users and servers from using SupportBot at our discretion.\nFor additional help, please visit <" + CONFIG.HELP_SERVER_INVITE_LINK + ">\n\n<required parameter> [optional parameter]");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "help`", "Displays this information card.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "invite`", "Provides information on how to add SupportBot to a different server.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "ping`", "Checks SupportBot response time.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "link <region> <username>`", "If your LoL ign is different from your discord username, you can set your LoL ign using this command, and SupportBot will remember it.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "getlink`", "Aliases:\n`" + CONFIG.DISCORD_COMMAND_PREFIX + "gl`\n\nTells you what LoL username you currently have registered with SupportBot.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "unlink`", "Aliases:\n`" + CONFIG.DISCORD_COMMAND_PREFIX + "removelink`\n\nSupportBot forgets your preferred username and region.");
		newEmbed.addField("`<region> [username]`", "Aliases:\n`<op.gg link>`\n\nDisplays summoner information.");
		newEmbed.addField("`matchhistory <region> [username]`", "Aliases:\n`mh <region> [username]`\n\nDisplays basic information about the 5 most recent games played.");
		newEmbed.addField("`matchhistory<number> <region> [username]`", "Aliases:\n`mh<number> <region> [username]`\n\nDisplays detailed information about one of your most recently played games.");
		newEmbed.addField("`livegame <region> [username]`", "Aliases:\n`lg <region> [username]`\n`currentgame <region> [username]`\n`cg <region> [username]`\n`livematch <region> [username]`\n`lm <region> [username]`\n`currentmatch <region> [username]`\n`cm <region> [username]`\n\nShows information about a game currently being played.");
		newEmbed.addField("`service status <region>`", "Aliases:\n`servicestatus <region>`\n`status <region>`\n`ss <region>`\n\nShows information on the uptime of LoL services in a region.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "shortcuts`", "Displays a list of nicknames you've set for friends with hard to spell names. Visit https://supportbot.tk/ for more information on this family of commands.")
		newEmbed.setFooter("SupportBot " + CONFIG.VERSION);
		return newEmbed;
	}
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
		newEmbed.setDescription("Level " + apiobj.summonerLevel + "\nSummoner ID: " + apiobj.id + "\nAccount ID: " + apiobj.accountId);
		newEmbed.setTimestamp(new Date(apiobj.revisionDate));
		newEmbed.setFooter("Last change detected at ");
		return newEmbed;
	}
	detailedSummoner(CONFIG, summoner, ranks, championmastery, region, match) {//region username command
		let newEmbed = new Discord.RichEmbed();
		if (!UTILS.exists(summoner.id)) {
			newEmbed.setAuthor(summoner.guess);
			newEmbed.setTitle("This summoner does not exist.");
			newEmbed.setDescription("Please revise your request.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		newEmbed.setAuthor(summoner.name, undefined, UTILS.opgg(region, summoner.name));
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png");
		if (UTILS.exists(match.status)) newEmbed.setDescription("Level " + summoner.summonerLevel);
		else if (match.gameStartTime != 0) newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Playing:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => { return p.summonerId == summoner.id; }).championId].emoji + "** on " + queues[match.gameQueueConfigId] + " for `" + UTILS.standardTimestamp((new Date().getTime() - match.gameStartTime) / 1000) + "`");
		else newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Game Loading:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => { return p.summonerId == summoner.id; }).championId].emoji + "** on " + queues[match.gameQueueConfigId]);
		let highest_rank = -1;
		for (let b in ranks) {
			let description = (ranks[b].wins + ranks[b].losses) + "G (" + UTILS.round(100 * ranks[b].wins / (ranks[b].wins + ranks[b].losses), 2) + "%) = " + ranks[b].wins + "W + " + ranks[b].losses + "L";
			if (UTILS.exists(ranks[b].miniSeries)) description += "\nSeries in Progress: " + ranks[b].miniSeries.progress.replaceAll("N", "\\➖").replaceAll("W", CONFIG.EMOJIS.win).replaceAll("L", CONFIG.EMOJIS.loss);
			newEmbed.addField(CONFIG.EMOJIS.ranks[RANK_ORDER.indexOf(ranks[b].tier)] + {
				"RANKED_FLEX_SR": "Flex 5v5",
				"RANKED_SOLO_5x5": "Solo 5v5",
				"RANKED_FLEX_TT": "Flex 3v3"
			}[ranks[b].queueType] + ": " + UTILS.english(ranks[b].tier) + " " + ranks[b].rank + " " + ranks[b].leaguePoints + "LP", description, true);
			highest_rank = (RANK_ORDER.indexOf(ranks[b].tier) > highest_rank ? RANK_ORDER.indexOf(ranks[b].tier) : highest_rank);
		}
		if (highest_rank > -1) newEmbed.setColor(RANK_COLOR[highest_rank]);
		let cm_description = [];
		let cm_total = 0;
		for (let i = 0; i < championmastery.length; ++i) {
			if (i < 3) cm_description.push("`M" + championmastery[i].championLevel + "` " + CONFIG.STATIC.CHAMPIONS[championmastery[i].championId].emoji + " `" + UTILS.numberWithCommas(championmastery[i].championPoints) + "`pts");
			cm_total += championmastery[i].championLevel;
		}
		if (cm_description.length > 0) newEmbed.addField("Champion Mastery: " + cm_total, cm_description.join("\t"));
		newEmbed.addField("Other 3rd party services", "[op.gg](" + UTILS.opgg(region, summoner.name) + ") [lolnexus](https://lolnexus.com/" + region + "/search?name=" + encodeURIComponent(summoner.name) + "&region=" + region + ") [quickfind](https://quickfind.kassad.in/profile/" + region + "/" + encodeURIComponent(summoner.name) + ") [lolking](https://lolking.net/summoner/" + region + "/" + summoner.id + "/" + encodeURIComponent(summoner.name) + "#/profile) [lolprofile](https://lolprofile.net/summoner/" + region + "/" + encodeURIComponent(summoner.name) + "#update) [matchhistory](https://matchhistory." + region + ".leagueoflegends.com/en/#match-history/" + CONFIG.REGIONS[region.toUpperCase()].toUpperCase() + "/" + summoner.accountId + ") [wol](https://wol.gg/stats/" + region + "/" + encodeURIComponent(summoner.name) + "/)");
		newEmbed.setTimestamp(new Date(summoner.revisionDate));
		newEmbed.setFooter("Last change detected at ");
		return newEmbed;
	}
	match(CONFIG, summoner, match_meta, matches) {//should show 5 most recent games
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name, "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		let common_teammates = {};
		/*{
			"name": {
				w: 0,
				l: 0
			}
		}*/
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
				const tK = teams[teamParticipant.teamId].reduce((total, increment) => { return total + increment.stats.kills; }, 0);
				const tD = teams[teamParticipant.teamId].reduce((total, increment) => { return total + increment.stats.deaths; }, 0);
				const tA = teams[teamParticipant.teamId].reduce((total, increment) => { return total + increment.stats.assists; }, 0);
				let summoner_spells = "";
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teamParticipant.spell1Id])) summoner_spells += CONFIG.SPELL_EMOJIS[teamParticipant.spell1Id];
				else summoner_spells += "`" + CONFIG.STATIC.SUMMONERSPELLS[teamParticipant.spell1Id].name + "`";
				if (UTILS.exists(CONFIG.SPELL_EMOJIS[teamParticipant.spell2Id])) summoner_spells += CONFIG.SPELL_EMOJIS[teamParticipant.spell2Id];
				else summoner_spells += "\t`" + CONFIG.STATIC.SUMMONERSPELLS[teamParticipant.spell2Id].name + "`";
				individual_match_description.push([(win ? "<:win:409617613161758741>" : "<:loss:409618158165688320>") + " " + CONFIG.STATIC.CHAMPIONS[match_meta[i].champion].emoji + CONFIG.EMOJIS.lanes[lane] + " " + summoner_spells + " `" + UTILS.standardTimestamp(matches[i].gameDuration) + "` " + queues[matches[i].queueId + ""] + " " + UTILS.ago(new Date(match_meta[i].timestamp + (matches[i].gameDuration * 1000))), "__lv.__ `" + stats.champLevel + "`\t`" + KDA.K + "/" + KDA.D + "/" + KDA.A + "`\t__KDR:__`" + UTILS.KDAFormat(KDA.KD) + "`\t__KDA:__`" + UTILS.KDAFormat(KDA.KDA) + "` `" + UTILS.KPFormat((100 * (KDA.A + KDA.K)) / tK) + "%`\t__cs:__`" + (stats.totalMinionsKilled + stats.neutralMinionsKilled) + "`\t__g:__`" + UTILS.gold(stats.goldEarned) + "`"]);
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
		all_champions_a.sort((a, b) => { return b.w + b.l - a.w - a.l; });
		all_KDA.KDA = (all_KDA.K + all_KDA.A) / all_KDA.D;
		for (let b in all_lanes_KDA) all_lanes_KDA[b].KDA = (all_lanes_KDA[b].K + all_lanes_KDA[b].A) / all_lanes_KDA[b].D;
		let lane_description = [];
		for (let i = 0; i <= 5; ++i) if (all_lanes[i] > 0) lane_description.push([CONFIG.EMOJIS.lanes[i] + all_lanes[i] + "G (" + UTILS.round(100 * all_lanes_w[i] / (all_lanes_w[i] + all_lanes_l[i]), 0) + "%) = " + all_lanes_w[i] + "W + " + all_lanes_l[i] + "L\tKDA:`" + UTILS.KDAFormat(all_lanes_KDA[i].KDA) + "`", all_lanes[i]]);
		lane_description.sort((a, b) => { return b[1] - a[1]; });
		lane_description = lane_description.map(s => { return s[0]; });
		const total_wins = all_results.reduce((total, increment) => { return total + (increment ? 1 : 0); }, 0);
		const total_losses = all_results.reduce((total, increment) => { return total + (increment ? 0 : 1); }, 0);
		newEmbed.addField("Recent Games", all_results.length + "G (" + UTILS.round(100 * total_wins / (total_wins + total_losses), 0) + "%) = " + total_wins + "W + " + total_losses + "L " + "\tKDA:`" + UTILS.KDAFormat(all_KDA.KDA) + "`\n" + lane_description.join("\n"), true);
		newEmbed.addField("Recent Champions", all_champions_a.map(c => { return CONFIG.STATIC.CHAMPIONS[c.id].emoji + (c.w + c.l) + "G (" + UTILS.round(100 * c.w / (c.w + c.l), 0) + "%) = " + c.w + "W + " + c.l + "L\tKDA:`" + UTILS.KDAFormat((c.K + c.A) / c.D) + "`"; }).slice(0, 7).join("\n"), true);
		for (let i = 0; i < individual_match_description.length; ++i) newEmbed.addField(individual_match_description[i][0], individual_match_description[i][1]);
		if (all_results.length > 5) newEmbed.addField("Old Match Results", all_results.slice(5, 13).map(r => { return r ? CONFIG.EMOJIS.win : CONFIG.EMOJIS.loss; }).join("") + "\n" + lane_record.slice(5, 13).map(l => { return CONFIG.EMOJIS.lanes[l]; }).join("") + "\n" + champion_record.slice(5, 13).map(c => { return CONFIG.STATIC.CHAMPIONS[c].emoji; }).join(""), true);
		if (all_results.length > 12) newEmbed.addField("Older Match Results", all_results.slice(13).map(r => { return r ? CONFIG.EMOJIS.win : CONFIG.EMOJIS.loss; }).join("") + "\n" + lane_record.slice(13).map(l => { return CONFIG.EMOJIS.lanes[l]; }).join("") + "\n" + champion_record.slice(13).map(c => { return CONFIG.STATIC.CHAMPIONS[c].emoji; }).join(""), true);
		let rpw = [];//recently played with
		for (let b in common_teammates) rpw.push([b, common_teammates[b].w, common_teammates[b].l]);
		rpw.sort((a, b) => { return b[1] + b[2] - a[1] - a[2]; });
		let rpws = [];//recently played with string
		for (let i = 0; i < rpw.length; ++i) if (rpw[i][1] + rpw[i][2] > 1) rpws.push((rpw[i][1] + rpw[i][2]) + "G (" + UTILS.round(100 * rpw[i][1] / (rpw[i][1] + rpw[i][2]), 0) + "%) = " + rpw[i][1] + "W + " + rpw[i][2] + "L: __[" + rpw[i][0] + "](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], rpw[i][0]) + ")__");
		if (rpws.length == 0) rpws.push("No one");
		newEmbed.addField("Top 10 Recently Played With", rpws.slice(0, 10).join("\n"));
		return newEmbed;
	}
	detailedMatch(CONFIG, summoner, match_meta, match, ranks, masteries, summoner_participants) {//should show detailed information about 1 game
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name, "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		if (UTILS.exists(match.status)) {
			newEmbed.setAuthor(summoner.guess);
			newEmbed.setTitle("This summoner has no recent matches.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		const avg_iMMR = UTILS.averageMatchMMR(ranks);
		for (let i = 0; i < IMMR_THRESHOLD.length; ++i) if (avg_iMMR >= IMMR_THRESHOLD[i]) newEmbed.setColor(RANK_COLOR[i]);
		UTILS.output("average iMMR is " + UTILS.round(avg_iMMR) + " or " + UTILS.iMMRtoEnglish(avg_iMMR));
		newEmbed.setTitle(queues[match.queueId] + " `" + UTILS.standardTimestamp(match.gameDuration) + "`");
		newEmbed.setTimestamp(new Date(match_meta.timestamp + (match.gameDuration * 1000)));
		newEmbed.setFooter("Match played " + UTILS.ago(new Date(match_meta.timestamp + (match.gameDuration * 1000))) + " at: ");
		let teams = {};
		for (let b in match.participantIdentities) {
			const pI = match.participantIdentities[b];
			const flex_5 = ranks[b].find(r => { return r.queueType === "RANKED_FLEX_SR"; });
			const flex_3 = ranks[b].find(r => { return r.queueType === "RANKED_FLEX_TT"; });
			const solo = ranks[b].find(r => { return r.queueType === "RANKED_SOLO_5x5"; });
			pI.flex5 = "`" + UTILS.shortRank(flex_5) + "`";
			pI.flex3 = "`" + UTILS.shortRank(flex_3) + "`";
			pI.solo = "`" + UTILS.shortRank(solo) + "`";
			pI.mastery = UTILS.getSingleChampionMastery(masteries[b], match.participants.find(p => { return p.participantId == pI.participantId; }).championId);
		}
		for (let b in match.participants) {
			if (!UTILS.exists(teams[match.participants[b].teamId])) teams[match.participants[b].teamId] = [];
			teams[match.participants[b].teamId].push(match.participants[b]);
		}
		let team_count = 0;
		for (let b in teams) {
			++team_count;
			const tK = teams[b].reduce((total, increment) => { return total + increment.stats.kills; }, 0);
			const tD = teams[b].reduce((total, increment) => { return total + increment.stats.deaths; }, 0);
			const tA = teams[b].reduce((total, increment) => { return total + increment.stats.assists; }, 0);
			const tKP = UTILS.round(100 * (tK + tA) / (tK * teams[b].length), 0);
			newEmbed.addField((match.teams.find(t => { return teams[b][0].teamId == t.teamId; }).win == "Win" ? CONFIG.EMOJIS["win"] : CONFIG.EMOJIS["loss"]) + "Team " + team_count + " Bans: " + match.teams.find(t => { return t.teamId == b; }).bans.map(b => { return b.championId == -1 ? ":x:" : CONFIG.STATIC.CHAMPIONS[b.championId].emoji; }).join(""), "__Σlv.__ `" + teams[b].reduce((total, increment) => { return total + increment.stats.champLevel; }, 0) + "`\t`" + tK + "/" + tD + "/" + tA + "`\t__KDR:__`" + UTILS.KDAFormat(tK / tD) + "`\t__KDA:__`" + UTILS.KDAFormat((tK + tA) / tD) + "` `" + tKP + "%`\t__Σcs:__`" + teams[b].reduce((total, increment) => { return total + increment.stats.totalMinionsKilled + increment.stats.neutralMinionsKilled; }, 0) + "`\t__Σg:__`" + UTILS.gold(teams[b].reduce((total, increment) => { return total + increment.stats.goldEarned; }, 0)) + "`");
			teams[b].sort((a, b) => { return UTILS.inferLane(a.timeline.role, a.timeline.lane, a.spell1Id, a.spell2Id) - UTILS.inferLane(b.timeline.role, b.timeline.lane, b.spell1Id, b.spell2Id); });
			for (let c in teams[b]) {
				let p = teams[b][c];
				let pI = match.participantIdentities.find(pI => { return pI.participantId == p.participantId; });
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
				newEmbed.addField(CONFIG.STATIC.CHAMPIONS[p.championId].emoji + lane + summoner_spells + " " + pI.solo + " ¦ " + pI.flex5 + " ¦ " + pI.flex3 + " ¦ `M" + pI.mastery + "` lv. `" + (UTILS.exists(pI.player.summonerId) ? summoner_participants.find(p => { return p.id == pI.player.summonerId; }).summonerLevel : 0) + "` __" + (pI.player.summonerId == summoner.id ? "**" + username + "**" : username) + "__", "[opgg](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], username) + ")" + "__lv.__ `" + p.stats.champLevel + "`\t`" + p.stats.kills + "/" + p.stats.deaths + "/" + p.stats.assists + "`\t__KDR:__`" + UTILS.KDAFormat(p.stats.kills / p.stats.deaths) + "`\t__KDA:__`" + UTILS.KDAFormat((p.stats.kills + p.stats.assists) / p.stats.deaths) + "` `" + UTILS.KPFormat((100 * (p.stats.assists + p.stats.kills)) / tK) + "%`\t__cs:__`" + (p.stats.totalMinionsKilled + p.stats.neutralMinionsKilled) + "`\t__g:__`" + UTILS.gold(p.stats.goldEarned) + "`");
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
	liveMatchPremade(CONFIG, summoner, match, matches, ranks, masteries, summoner_participants, trim = true, newlogic = true) {//show current match information
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setAuthor(summoner.name, "https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png", UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
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
		/*{
			"username1": {
				"username2": 4
			}
		}*/
		let teams = {};
		for (let b in match.participants) {
			if (!UTILS.exists(teams[match.participants[b].teamId])) teams[match.participants[b].teamId] = [];
			const flex_5 = ranks[b].find(r => { return r.queueType === "RANKED_FLEX_SR"; });
			const flex_3 = ranks[b].find(r => { return r.queueType === "RANKED_FLEX_TT"; });
			const solo = ranks[b].find(r => { return r.queueType === "RANKED_SOLO_5x5"; });
			const divs = { "I": "1", "II": "2", "III": "3", "IV": "4", "V": "5" };
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
				for (let c in teams_private) teams_private[c] = teams_private[c].map(p => { return matches[b].participantIdentities.find(pI => { return pI.participantId === p.participantId; }); });
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
			let networks = teams[b].map(t => { return UTILS.getGroup(t.summonerName, common_teammates); });//for everyone on the team, put the premade group in the network array
			let premade_str = networks.map(g => { return g.join(","); });//array of comma delimited network strings
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
				team_description_c2 += "`" + summoner_participants.find(p => { return p.id == teams[b][c].summonerId; }).summonerLevel + "`";
				team_description_c2 += " " + PREMADE_EMOJIS[premade_letter[premade_str[c]]];
				team_description_c2 += teams[b][c].summonerId == summoner.id ? "**" : "";//bolding
				if (teams[b].length > 5) team_description_c2 += "__[" + teams[b][c].summonerName + "](" + UTILS.opggShort(CONFIG.OPGG_SHORT, CONFIG.REGIONS_REVERSE[summoner.region], teams[b][c].summonerName) + ")__";
				else team_description_c2 += "__[" + teams[b][c].summonerName + "](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], teams[b][c].summonerName) + ")__";
				team_description_c2 += teams[b][c].summonerId == summoner.id ? "**" : "";//bolding
				if (UTILS.exists(match.bannedChampions[player_count])) {
					ban_description.push(match.bannedChampions[player_count].championId == -1 ? ":x:" : CONFIG.STATIC.CHAMPIONS[match.bannedChampions[player_count].championId].emoji);
				}
				team_description_c2 += "\n";
				++player_count;
			}
			UTILS.debug("team_description_c1 length: " + team_description_c1.length);
			UTILS.debug("team_description_c2 length: " + team_description_c2.length);
			newEmbed.addField(":x::x: `SOLO Q`¦`FLEX 5`¦`FLEX 3`", team_description_c1, true);
			newEmbed.addField("Bans: " + ban_description.join(""), team_description_c2, true);
			++team_count;
		}
		return newEmbed;
	}
	mmr(CONFIG, summoner, mmr) {
		let newEmbed = new Discord.RichEmbed();
		if (!UTILS.exists(summoner.id)) {
			newEmbed.setTitle("This summoner does not exist.");
			newEmbed.setDescription("Please revise your request.");
			newEmbed.setColor([255, 0, 0]);
			return newEmbed;
		}
		newEmbed.setAuthor(summoner.name);
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png");
		newEmbed.setDescription("Level " + summoner.summonerLevel);
		newEmbed.addField("Official MMR Data", "Tier: " + UTILS.english(mmr.tier) + "\nMMR: `" + mmr.mmr + "`\n" + mmr.analysis);
		if (RANK_ORDER.indexOf(mmr.tier) != -1) newEmbed.setColor(RANK_COLOR[RANK_ORDER.indexOf(mmr.tier)]);
		newEmbed.setFooter("This information is subject to very frequent change.");
		return newEmbed;
	}
	notify(CONFIG, content, author) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTitle("Important message from SupportBot staff");
		newEmbed.setURL(CONFIG.HELP_SERVER_INVITE_LINK);
		newEmbed.setAuthor(author.username, author.displayAvatarURL);
		newEmbed.setDescription(content);
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
					if (incident.updates.length > 0) return str + incident.updates.map(update => { return "**" + update.severity + "**: " + update.content }).join("\n") + "\n";
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
}
