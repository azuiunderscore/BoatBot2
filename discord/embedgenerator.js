"use strict";
const Discord = require("discord.js");
const UTILS = new (require("../utils.js"))();
const mathjs = require("mathjs");
const HORIZONTAL_SEPARATOR = "------------------------------";
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
		newEmbed.setDescription("Terms of Service:\n- Don't be a bot on a user account and use BoatBot.\n- Don't abuse bugs. If you find a bug, please report it to us.\n- Don't spam useless feedback\n- If you do not want to use BoatBot, let us know and we'll opt you out of our services.\n- We reserve the right to ban users and servers from using BoatBot at our discretion.\nFor additional help, please visit <" + CONFIG.HELP_SERVER_INVITE_LINK + ">\n\n<required parameter> [optional parameter]");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "help`", "Displays this information card.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "invite`", "Provides information on how to add BoatBot to a different server.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "link <username>`", "If your osu ign is different from your discord username, you can set your osu ign using this command, and BoatBot will remember it.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "unlink`", "Aliases:\n`" + CONFIG.DISCORD_COMMAND_PREFIX + "removelink`\n\BoatBot forgets your preferred username.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "shortcuts`", "Displays a list of nicknames you've set for friends with hard to spell names. Visit https://supportbot.tk/ for more information on this family of commands.\n" + HORIZONTAL_SEPARATOR);
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "setting <setting name> <value>`", "Set server preferences for: prefix, auto-opgg, force-prefix, release-notifications. See our website for more details.");
		newEmbed.setFooter("BoatBot " + CONFIG.VERSION);
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
	detailedSummoner(CONFIG, summoner, ranks, championmastery, region, match, challengers) {//region username command
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
		else {
			const game_type = match.gameType == "CUSTOM_GAME" ? "Custom" : queues[match.gameQueueConfigId];
			if (match.gameStartTime != 0) newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Playing:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => { return p.summonerId == summoner.id; }).championId].emoji + "** on " + game_type + " for `" + UTILS.standardTimestamp((new Date().getTime() - match.gameStartTime) / 1000) + "`");
			else newEmbed.setDescription("Level " + summoner.summonerLevel + "\n__**Game Loading:**__ **" + CONFIG.STATIC.CHAMPIONS[match.participants.find(p => p.summonerId == summoner.id).championId].emoji + "** on " + game_type);
		}
		const will = (region === "na" && summoner.id == 50714503) ? true : false;
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
			if (ranks[i].tier != "CHALLENGER") title += ranks[i].rank + " ";
			else {
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
			const challenger_LP = UTILS.randomInt(100, 1000);
			const fake_games = UTILS.randomInt(200, 700);
			const fake_wins = UTILS.randomInt(fake_games / 2, fake_games);
			const fake_losses = fake_games - fake_wins;
			const fake_wr = UTILS.round(100 * fake_wins / (fake_wins + fake_losses), 2);
			newEmbed.addField("<:Challenger:437262128282599424>True Rank: Challenger ~#" + challenger_rank + " " + challenger_LP + "LP", fake_games + "G (" + fake_wr + "%) = " + fake_wins + "W + " + fake_losses + "L", true);
			newEmbed.setColor(RANK_COLOR[RANK_COLOR.length - 1]);
		}
		let cm_description = [];
		let cm_total = 0;
		for (let i = 0; i < championmastery.length; ++i) {
			if (i < 3) cm_description.push("`M" + championmastery[i].championLevel + "` " + CONFIG.STATIC.CHAMPIONS[championmastery[i].championId].emoji + " `" + UTILS.numberWithCommas(championmastery[i].championPoints) + "`pts");
			cm_total += championmastery[i].championLevel;
		}
		if (cm_description.length > 0) newEmbed.addField("Champion Mastery: " + cm_total, cm_description.join("\t") + "\n[op.gg](" + UTILS.opgg(region, summoner.name) + ") [lolnexus](https://lolnexus.com/" + region + "/search?name=" + encodeURIComponent(summoner.name) + "&region=" + region + ") [quickfind](https://quickfind.kassad.in/profile/" + region + "/" + encodeURIComponent(summoner.name) + ") [lolprofile](https://lolprofile.net/summoner/" + region + "/" + encodeURIComponent(summoner.name) + "#update) [matchhistory](https://matchhistory." + region + ".leagueoflegends.com/en/#match-history/" + CONFIG.REGIONS[region.toUpperCase()].toUpperCase() + "/" + summoner.accountId + ") [wol](https://wol.gg/stats/" + region + "/" + encodeURIComponent(summoner.name) + "/)");
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
				const tK = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.kills, 0);
				const tD = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.deaths, 0);
				const tA = teams[teamParticipant.teamId].reduce((total, increment) => total + increment.stats.assists, 0);
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
				newEmbed.addField(CONFIG.STATIC.CHAMPIONS[p.championId].emoji + lane + summoner_spells + " " + pI.solo + " ¦ " + pI.flex5 + " ¦ " + pI.flex3 + " ¦ `M" + pI.mastery + "` lv. `" + (UTILS.exists(pI.player.summonerId) ? summoner_participants.find(p => p.id == pI.player.summonerId).summonerLevel : 0) + "` __" + (pI.player.summonerId == summoner.id ? "**" + username + "**" : username) + "__", "[opgg](" + UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], username) + ") " + "__lv.__ `" + p.stats.champLevel + "`\t`" + p.stats.kills + "/" + p.stats.deaths + "/" + p.stats.assists + "`\t__KDR:__`" + UTILS.KDAFormat(p.stats.kills / p.stats.deaths) + "`\t__KDA:__`" + UTILS.KDAFormat((p.stats.kills + p.stats.assists) / p.stats.deaths) + "` `" + UTILS.KPFormat((100 * (p.stats.assists + p.stats.kills)) / tK) + "%`\t__cs:__`" + (p.stats.totalMinionsKilled + p.stats.neutralMinionsKilled) + "`\t__g:__`" + UTILS.gold(p.stats.goldEarned) + "`");
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
	mmr(CONFIG, summoner) {
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
			tier = RANK_ORDER[0];
			jokeNumber = 1;
		} else if (mmr < MMR_THRESHOLD[2]) {//silver
			tier = RANK_ORDER[1];
			jokeNumber = 2;
		} else if (mmr < MMR_THRESHOLD[3]) {//gold
			tier = RANK_ORDER[2];
			jokeNumber = 3;
		} else if (mmr < MMR_THRESHOLD[4]) {//plat
			tier = RANK_ORDER[3];
			jokeNumber = 4;
		} else if (mmr < MMR_THRESHOLD[5]) {//dia
			tier = RANK_ORDER[4];
			jokeNumber = 5;
		} else if (mmr < MMR_THRESHOLD[6]) {//master
			tier = RANK_ORDER[5];
			jokeNumber = 6;
		} else {//challenger
			tier = RANK_ORDER[6];
			jokeNumber = 7;
		}
		const analysis = UTILS.randomOf(MMR_JOKES[jokeNumber]);
		newEmbed.setAuthor(summoner.name, null, UTILS.opgg(CONFIG.REGIONS_REVERSE[summoner.region], summoner.name));
		newEmbed.setThumbnail("https://ddragon.leagueoflegends.com/cdn/" + CONFIG.STATIC.n.profileicon + "/img/profileicon/" + summoner.profileIconId + ".png");
		newEmbed.setDescription("Level " + summoner.summonerLevel);
		newEmbed.addField("MMR Data", "Tier: " + UTILS.english(tier) + "\nMMR: `" + mmr + "`\n" + analysis);
		if (RANK_ORDER.indexOf(tier) != -1) newEmbed.setColor(RANK_COLOR[RANK_ORDER.indexOf(tier)]);
		newEmbed.setFooter("This information does not reflect this summoner's actual MMR.");
		return newEmbed;
	}
	notify(CONFIG, content, username, displayAvatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTitle("Important message from BoatBot staff");
		newEmbed.setURL(CONFIG.HELP_SERVER_INVITE_LINK);
		newEmbed.setAuthor(username, displayAvatarURL);
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
		let apw =UTILS.round((parseFloat(user_stats.pp_raw) - bonusPP) / 20.0, 2);
		const aim_acc = UTILS.calcAimAcc(mathjs, user_best, user_stats.pp_raw);
		const misses = (totalHits / aim_acc.aimAccuracy) - totalHits;
		let missRate = 100 - (aim_acc.aimAccuracy * 100);
		let cpp = (totalHits + misses) / parseInt(user_stats.playcount);
		aim_acc.pfm = aim_acc.pfm + "\tbonus: >`" +UTILS.round(bonusPP, 1) + "`pp";
		aim_acc.pfmp = aim_acc.pfmp + "\tbonus: >`" +UTILS.round(bonusPP * 100 / user_stats.pp_raw, 1) + "%`";
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
		const playstyle = UTILS.pickPlaystyle(user_page.indexOf("playstyle mouse using") != -1, user_page.indexOf("playstyle keyboard using") != -1, user_page.indexOf("playstyle tablet using") != -1, user_page.indexOf("playstyle touch using") != -1);
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
		newEmbed.addField("More about " + user_stats.username, "[osu!track](https://ameobea.me/osutrack/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!stats](http://osustats.ppy.sh/u/" + encodeURIComponent(user_stats.username) + ")\t[osu!skills](http://osuskills.tk/user/" + encodeURIComponent(user_stats.username) + ")\t[osu!chan](https://syrin.me/osuchan/u/" + user_stats.user_id + "/?m=" + mode + ")\t[pp+](https://syrin.me/pp+/u/" + user_stats.user_id + "/)");
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
			modeCommand = "!sp";
			newEmbed.setColor(16777215);
		}
		else if (mode == 1) {
			wordMode = "Taiko";
			modeCommand = "!spt";
			newEmbed.setColor(16711680);
		}
		else if (mode == 2) {
			wordMode = "CtB";
			modeCommand = "!spm";
			newEmbed.setColor(65280);
		}
		else if (mode == 3) {
			wordMode = "Mania";
			modeCommand = "!spm";
			newEmbed.setColor(255);
		}
		newEmbed.setAuthor(user_stats.username + "'s " + wordMode + " Profile", null, "https://osu.ppy.sh/users/" + user_stats.user_id);
		newEmbed.setImage("https://lemmmy.pw/osusig/sig.php?colour=pink&uname=" + user_stats.user_id + "&pp=2&countryrank&removeavmargin&darktriangles&onlineindicator=undefined&xpbar&xpbarhex&mode=" + mode + "&random=" + UTILS.map(Math.random(), 0, 1, 0, 10000));
		newEmbed.setFooter("use " + modeCommand + " " + user_stats.username + " for more information");
		return newEmbed;
	}
	statsPlusMods(CONFIG, mode, user_stats, user_best) {
		let newEmbed = new Discord.RichEmbed();
		let totalHits = parseInt(user_stats.count300) + parseInt(user_stats.count100) + parseInt(user_stats.count50);
		//let efficiency = (parseInt(user_stats.ranked_score) / parseInt(user_stats.total_score)) * 100;
		let bonusPP = 416.6667 * (1 - Math.pow(.9994, (parseInt(user_stats.count_rank_ss) + parseInt(user_stats.count_rank_s) + parseInt(user_stats.count_rank_a))));
		//let apw = UTILS.round((parseFloat(user_stats.pp_raw) - bonusPP) / 20.0, 2);
		const aim_acc = UTILS.calcAimAcc(mathjs, user_best, user_stats.pp_raw);
		let misses = (totalHits / aim_acc.aimAccuracy) - totalHits;
		//let missRate = 100 - (aim_acc.aimAccuracy * 100);
		//let cpp = (totalHits + misses) / parseInt(user_stats.playcount);
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
				newEmbed.setDescription(msg.cleanContent.substring(UTILS.indexOfInstance(msg.cleanContent, " ", 2) + 1) + "\n\n" + CONFIG.OWNER_DISCORD_IDS[msg.author.id].flags);
			}
			else if (destination === 1) {
				newEmbed.setDescription(msg.cleanContent.substring(UTILS.indexOfInstance(msg.cleanContent, " ", 2) + 1));
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
		const c_location2 = UTILS.indexOfInstance(msg.embeds[0].footer.text, ":", 2);
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
}
