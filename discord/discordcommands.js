"use strict";
let embedgenerator = new (require("./embedgenerator.js"))();
let textgenerator = new (require("./textgenerator.js"))();
let child_process = require("child_process");
const UTILS = new (require("../utils.js"))();
let LOLAPI = require("./lolapi.js");
let Profiler = require("../timeprofiler.js");
let ctable = require("console.table");
const crypto = require("crypto");
module.exports = function (CONFIG, client, msg, wsapi, sendToChannel, sendEmbedToChannel, preferences, ACCESS_LEVEL, server_RL, user_RL) {
	if (msg.author.bot || msg.author.id === client.user.id) return;//ignore all messages from [BOT] users and own messages
	if (!msg.PM && !msg.channel.permissionsFor(client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return;//dont read messages that can't be responded to
	if (!UTILS.exists(CONFIG.BANS) || !UTILS.exists(CONFIG.BANS.USERS) || !UTILS.exists(CONFIG.BANS.SERVERS)) {
		wsapi.getUserBans();
		wsapi.getServerBans();
		return UTILS.output("message " + msg.id + " could not be processed because ban data has not been loaded yet");
	}
	if (UTILS.exists(CONFIG.BANS.USERS[msg.author.id]) && (CONFIG.BANS.USERS[msg.author.id] == 0 || CONFIG.BANS.USERS[msg.author.id] > msg.createdTimestamp)) return;//ignore messages from banned users
	if (!msg.PM && UTILS.exists(CONFIG.BANS.SERVERS[msg.guild.id])) {
		if (CONFIG.BANS.SERVERS[msg.guild.id] == 0) {//permanent ban
			reply(":no_entry: This server is banned from using BoatBot. Please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " for assistance.", () => {
				msg.guild.leave().catch(console.error);//leave server
			}, () => {
				msg.guild.leave().catch(console.error);//leave server
			});
		}
		else if (CONFIG.BANS.SERVERS[msg.guild.id] > msg.createdTimestamp);//temporary ban
		return;
	}//ignore messages from banned servers

	const msg_receive_time = new Date().getTime();
	let request_profiler = new Profiler("r#" + msg.id)
	let lolapi = new LOLAPI(CONFIG, msg.id);
	request_profiler.mark("lolapi instantiated");

	command(["boatsetprefix "], true, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index, parameter) => {
		const candidate = parameter.trim().toLowerCase();
		if (candidate.length > 100) return reply(":x: This prefix is too long.");
		preferences.set("prefix", candidate).then(() => reply(":white_check_mark: The prefix was set to " + candidate)).catch(reply);
	});
	command(["boatsetprefix"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
		preferences.set("prefix", "").then(() => reply(":white_check_mark: Prefixless operation enabled")).catch(reply);
	});
	command([preferences.get("prefix") + "owner", preferences.get("prefix") + "owners"], false, false, (original, index) => {
		reply(textgenerator.owners(CONFIG));
	});
	//respondable server message or PM
	command([preferences.get("prefix") + "banuser "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lbanuser <uid> <duration> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOfInstance(" ", 2) + 1);
		let duration = parameter.substring(parameter.indexOfInstance(" ", 1) + 1, parameter.indexOfInstance(" ", 2));
		duration = duration == "0" ? duration = 0 : UTILS.durationParse(duration);
		if (isNaN(duration)) return reply(":x: The duration is invalid.");
		const end_date = duration == 0 ? 0 : new Date().getTime() + duration;
		if (id.length < 1 || reason.length < 1 || typeof(duration) != "number") return reply(":x: The id, duration, or reason could not be found.");
		if (id == msg.author.id) return reply(":x: You cannot ban yourself.");
		if (id == client.user.id) return reply(":x: You cannot ban me.");
		if (isOwner(id, false)) return reply(":x: The id you are trying to ban has elevated permissions.");
		lolapi.banUser(id, reason, end_date, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry: User banned, id " + id + " by " + msg.author.tag + " for : " + reason);
			reply(":no_entry: User banned, id " + id + " by " + msg.author.tag + " for : " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "banserver "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lbanserver <sid> <duration> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOfInstance(" ", 2) + 1);
		let duration = parameter.substring(parameter.indexOfInstance(" ", 1) + 1, parameter.indexOfInstance(" ", 2));
		duration = duration == "0" ? duration = 0 : UTILS.durationParse(duration);
		if (isNaN(duration)) return reply(":x: The duration is invalid.");
		const end_date = duration == 0 ? 0 : new Date().getTime() + duration;
		if (id.length < 1 || reason.length < 1 || typeof(duration) != "number") return reply(":x: The id, duration, or reason could not be found.");
		lolapi.banServer(id, reason, end_date, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry: Server banned, id " + id + " by " + msg.author.tag + " for " + duration + ": " + reason);
			reply(":no_entry: Server banned, id " + id + " by " + msg.author.tag + " for " + duration + ": " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "warnuser "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lwarnuser <uid> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOf(" ") + 1);
		if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
		if (id == msg.author.id) return reply(":x: You cannot warn yourself.");
		if (id == client.user.id) return reply(":x: You cannot warn me.");
		lolapi.warnUser(id, reason, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":warning: User warned, id " + id + " by " + msg.author.tag + ": " + reason);
			reply(":warning: User warned, id " + id + " by " + msg.author.tag + ": " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "warnserver "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lwarnserver <uid> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOf(" ") + 1);
		if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
		lolapi.warnServer(id, reason, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":warning: Server warned, id " + id + " by " + msg.author.tag + ": " + reason);
			reply(CONFIG.LOG_CHANNEL_ID, ":warning: Server warned, id " + id + " by " + msg.author.tag + ": " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "noteuser "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lnoteuser <uid> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOf(" ") + 1);
		if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
		lolapi.noteUser(id, reason, msg.author.id).then(result => {
			reply(":information_source: User note added, id " + id + " by " + msg.author.tag + ": " + reason);
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":information_source: User note added, id " + id + " by " + msg.author.tag + ": " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "noteserver "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lnoteserver <sid> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(parameter.indexOf(" ") + 1);
		if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
		lolapi.noteServer(id, reason, msg.author.id).then(result => {
			reply(":information_source: Server note added, id " + id + " by " + msg.author.tag + ": " + reason);
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":information_source: Server note added, id " + id + " by " + msg.author.tag + ": " + reason);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "userhistory "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Luserhistory <uid>
		lolapi.userHistory(parameter).then(results => {
			replyEmbed(embedgenerator.disciplinaryHistory(CONFIG, parameter, true, results[parameter]));
		}).catch();
	});
	command([preferences.get("prefix") + "serverhistory "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lserverhistory <sid>
		lolapi.serverHistory(parameter).then(results => {
			replyEmbed(embedgenerator.disciplinaryHistory(CONFIG, parameter, false, results[parameter]));
		}).catch();
	});
	command([preferences.get("prefix") + "unbanserver "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lunbanserver <sid>
		lolapi.unbanServer(parameter, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			reply(":no_entry_sign: Server unbanned, id " + parameter + " by " + msg.author.tag);
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry_sign: Server unbanned, id " + parameter + " by " + msg.author.tag);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "unbanuser "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lunbanuser <uid>
		lolapi.unbanUser(parameter, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
			reply(":no_entry_sign: User unbanned, id " + parameter + " by " + msg.author.tag);
			sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry_sign: User unbanned, id " + parameter + " by " + msg.author.tag);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "actionreport "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lactionreport <uid>
		if (!UTILS.exists(CONFIG.OWNER_DISCORD_IDS[parameter])) return reply(":x: This user is not a current or previously registered admin.");
		lolapi.getActions(parameter).then(results => {
			replyEmbed(embedgenerator.actionReport(CONFIG, parameter, results[parameter]));
		}).catch();
	});
	command([preferences.get("prefix") + "complain ", preferences.get("prefix") + "praise ", preferences.get("prefix") + "suggest "], true, false, (original, index) => {
		lolapi.userHistory(msg.author.id).then(uH => {
			if (!msg.PM) lolapi.serverHistory(msg.guild.id).then(gH => step2(gH[msg.guild.id])).catch(console.error);
			else step2(null);
			function step2(gH) {
				sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, index + 1, 1, msg, uH[msg.author.id], gH), true);
				reply(":white_check_mark: Thank you for your feedback!");
			}
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "question ", preferences.get("prefix") + "ask "], true, false, (original, index) => {
		lolapi.userHistory(msg.author.id).then(uH => {
			if (!msg.PM) lolapi.serverHistory(msg.guild.id).then(gH => step2(gH[msg.guild.id]));
			else step2(null);
			function step2(gH) {
				sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 4, 1, msg, uH[msg.author.id], gH));
				reply(":white_check_mark: Thank you for your question! Someone from our staff will respond by BoatBot PM as soon as possible.");
			}
		});
	});
	command([preferences.get("prefix") + "permissionstest", preferences.get("prefix") + "pt"], false, false, () => {
		reply("You have " + (isOwner(undefined, false) ? "owner" : "normal") + " permissions.");
	});
	command([preferences.get("prefix") + "permissionstest ", preferences.get("prefix") + "pt "], true, false, () => {
		if (msg.mentions.users.size != 1) return reply(":x: A user must be mentioned.");
		reply(msg.mentions.users.first().tag + " has " + (isOwner(msg.mentions.users.first().id, false) ? "owner" : "normal") + " permissions.");
	});
	command([preferences.get("prefix") + "cs"], false, CONFIG.CONSTANTS.BOTOWNERS, () => {
		lolapi.stats().then(iapi_stats => {
			UTILS.aggregateClientEvals(client, [["this.guilds.size", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"],
				["this.users.size", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"],
				["this.guilds.map(g => g.memberCount).reduce((prev, val) => prev + val, 0)", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"]]).then(c_eval => {
				replyEmbed(embedgenerator.debug(CONFIG, client, iapi_stats, c_eval));
			});
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "ping", preferences.get("prefix") + "latency"], false, false, () => {
		reply("command to response time: ", nMsg => textgenerator.ping_callback(msg, nMsg));
	});
	command(["iping"], false, false, () => {
		lolapi.ping().then(times => reply(textgenerator.internal_ping(times))).catch(console.error);
	});
	command(["wping"], false, false, () => {
		wsapi.ping(times => reply(textgenerator.ws_ping(times)));
	});
	command([preferences.get("prefix") + "ping "], true, false, function (original, index, parameter) {
		reply("you said: " + parameter);
	});
	command(["eval "], true, CONFIG.CONSTANTS.BOTOWNERS, function (original, index, parameter) {
		try {
			reply("```" + eval(parameter) + "```");
		}
		catch (e) {
			reply("```" + e + "```");
		}
	});
	command(["iapi eval "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		lolapi.IAPIEval(parameter).then(result => reply("```" + result.string + "```")).catch(console.error);
	});
	command([preferences.get("prefix") + "notify "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		wsapi.lnotify(msg.author.username, msg.author.displayAvatarURL, parameter, false);
	});
	command([preferences.get("prefix") + "releasenotify "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		wsapi.lnotify(msg.author.username, msg.author.displayAvatarURL, parameter, true);
	});
	command([preferences.get("prefix") + "testembed"], false, false, () => {
		replyEmbed(embedgenerator.test());
	});
	command([preferences.get("prefix") + "migratelinks"], false, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
		const fs = require("fs");
		const prev_links = JSON.parse(fs.readFileSync("/home/iaace/bbs/data/local/userlinks.json"));
		let tasks = [];
		for (let b in prev_links) tasks.push(function () { return lolapi.setLink(b, prev_links[b]); });
		UTILS.sequential(tasks).then(results => {
			let errors = 0, successes = 0;
			for (let b in results) results[b] ? ++successes : ++errors;
			reply("There were " + successes + " successes and " + errors + " failures.");
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "link "], true, false, (original, index, parameter) => {
		if (msg.mentions.users.size == 0) {
			lolapi.osuGetUser(parameter, 0, false, CONFIG.API_MAXAGE.LINK).then(user => {
				if (!UTILS.exists(user)) return reply(":x: The username appears to be invalid.");
				lolapi.setLink(msg.author.id, user.username).then(result => {
					result.success ? reply(":white_check_mark: Your discord account is now linked to osu!:" + user.username) : reply(":x: Something went wrong.");
				}).catch(console.error);
			}).catch(console.error);
		}
		else if (msg.mentions.users.size == 1 && isOwner()) {
			lolapi.osuGetUser(parameter.substring(0, parameter.indexOf(" <")), 0, false, CONFIG.API_MAXAGE.LINK).then(user => {
				if (!UTILS.exists(user)) return reply(":x: The username appears to be invalid. Follow the format: `" + CONFIG.DISCORD_COMMAND_PREFIX + "link <username> <@mention>`");
				lolapi.setLink(msg.mentions.users.first().id, user.username).then(result => {
					result.success ? reply(":white_check_mark: " + msg.mentions.users.first().tag + "'s discord account is now linked to osu!:" + user.username) : reply(":x: Something went wrong.");
				}).catch(console.error);
			}).catch(console.error);
		}
	});
	command([preferences.get("prefix") + "unlink", preferences.get("prefix") + "removelink"], false, false, (original, index) => {
		lolapi.setLink(msg.author.id, "").then(result => {
			result.success ? reply(":white_check_mark: Your discord account is no longer associated with any username. We'll try to use your discord username when you use a username-optional osu stats command.") : reply(":x: Something went wrong.");
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "unlink ", preferences.get("prefix") + "removelink "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
		if (!UTILS.exists(msg.mentions.users.first())) return reply(":x: No user mention specified.");
		lolapi.setLink(msg.mentions.users.first().id, "").then(result => {
			result.success ? reply(":white_check_mark: " + msg.mentions.users.first().tag + "'s discord account is no longer associated with any username.") : reply(":x: Something went wrong.");
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "gl", preferences.get("prefix") + "getlink"], false, false, (original, index) => {
		lolapi.getLink(msg.author.id).then(result => {
			if (UTILS.exists(result.username) && result.username != "") reply(":white_check_mark: You're `" + result.username + "`");
			else reply(":x: No records for user id " + msg.author.id);
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "gl ", preferences.get("prefix") + "getlink "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
		if (!UTILS.exists(msg.mentions.users.first())) return reply(":x: No user mention specified.");
		lolapi.getLink(msg.mentions.users.first().id).then(result => {
			if (UTILS.exists(result.username) && result.username != "") reply(":white_check_mark: " + msg.mentions.users.first().tag + " is `" + result.username + "`");
			else reply(":x: No records for user id " + msg.mentions.users.first().id);
		}).catch(console.error);
	});
	/*
	command([preferences.get("prefix") + "invite"], false, false, (original, index) => {
		reply("This is the link to add BoatBot to other servers: <" + CONFIG.BOT_ADD_LINK + ">\nAdding it requires the \"Manage Server\" permission.");
	});
	command([preferences.get("prefix") + "help"], false, false, (original, index) => {
		reply(":white_check_mark: A PM has been sent to you with information on how to use BoatBot.");
		replyEmbedToAuthor(embedgenerator.help(CONFIG));
	});*/
	command([preferences.get("prefix") + "setshortcut ", preferences.get("prefix") + "ss ", preferences.get("prefix") + "createshortcut ", preferences.get("prefix") + "addshortcut "], true, false, (original, index, parameter) => {
		if (parameter[0] !== "$") return reply(":x: The shortcut must begin with an `$`. Please try again.");
		else if (parameter.indexOf(" ") === -1) return reply(":x: The shortcut word and the username must be separated by a space. Please try again.");
		else if (parameter.length > 60) return reply(":x: The shortcut name or the username is too long.");
		const from = parameter.substring(1, parameter.indexOf(" ")).toLowerCase();
		if (from.length === 0) return reply(":x: The shortcut name was not specified. Please try again.");
		const to = parameter.substring(parameter.indexOf(" ") + 1);
		if (to.length === 0) return reply(":x: The username was not specified. Please try again.");
		else if (parameter.substring(1).indexOf("$") !== -1) return reply(":x: The shortcut cannot contain more than 1 `$` character.");
		lolapi.createShortcut(msg.author.id, from, to).then(result => {
			if (result.success) reply(":white_check_mark: `$" + from + "` will now point to `" + to + "`.");
			else reply(":x: You can only have up to 50 shortcuts. Please remove some and try again.");
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "removeshortcut ", preferences.get("prefix") + "deleteshortcut ", preferences.get("prefix") + "ds "], true, false, (original, index, parameter) => {
		if (parameter[0] !== "$") return reply(":x: The shortcut must begin with an `$`. Please try again.");
		const from = parameter.substring(1).toLowerCase();
		if (from.length === 0) return reply(":x: The shortcut name was not specified. Please try again.");
		lolapi.removeShortcut(msg.author.id, from).then(result => {
			if (result.success) reply(":white_check_mark: `$" + from + "` removed (or it did not exist already).");
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "shortcuts", preferences.get("prefix") + "shortcut"], false, false, (original, index) => {
		lolapi.getShortcuts(msg.author.id).then(result => {
			reply(textgenerator.shortcuts(CONFIG, result));
		}).catch(console.error);
	});
	command([preferences.get("prefix") + "removeallshortcuts"], false, false, (original, index) => {
		lolapi.removeAllShortcuts(msg.author.id).then(result => {
			reply(":white_check_mark: All shortcuts were removed.")
		}).catch(console.error);
	});
	command(["boatsetprefix "], true, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index, parameter) => {
		parameter = parameter.toLowerCase();
		preferences.set("prefix", parameter) ? reply(":white_check_mark: The prefix to use this bot has been changed to:" + parameter) : reply(":x: An error has occurred while setting the prefix.");
	});
	command(["boatsetprefix"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
		preferences.set("prefix", "") ? reply(":white_check_mark: The prefix to use this bot has been removed. No prefix is needed to use commands.") : reply(":x: An error has occurred while setting the prefix.");
	});
	commandGuessUsername([preferences.get("prefix") + "d1"], false, (index, id, user, parameter) => {
		reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` parameter: `" + parameter + "`");
	});
	commandGuessUsernameNumber([preferences.get("prefix") + "d2"], false, (index, id, user, number, guess_method) => {
		reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` number: `" + number + "` guess_method: `" + guess_method + "`");
	});
	commandGuessUsername([preferences.get("prefix") + "statsplus", preferences.get("prefix") + "sp", preferences.get("prefix") + "osu", preferences.get("prefix") + "std", preferences.get("prefix") + "taiko", preferences.get("prefix") + "sptaiko", preferences.get("prefix") + "spt", preferences.get("prefix") + "ctb", preferences.get("prefix") + "spctb", preferences.get("prefix") + "spc", preferences.get("prefix") + "mania", preferences.get("prefix") + "spmania", preferences.get("prefix") + "spm"], false, (index, id, user, parameter) => {
		let mode;
		if (index < 4) mode = 0;
		else if (index < 7) mode = 1;
		else if (index < 10) mode = 2;
		else mode = 3;
		lolapi.osuGetUser(user, mode, id, CONFIG.API_MAXAGE.SP.GET_USER).then(user_stats => {
			if (!UTILS.exists(user_stats)) return reply(":x: This user could not be found.");
			lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.SP.GET_USER_BEST).then(user_best => {
				Promise.all([lolapi.osuPHPProfileLeader(user_stats.user_id, mode, 0, CONFIG.API_MAXAGE.SP.PHP_PROFILE_LEADER), lolapi.osuPHPProfileLeader(user_stats.user_id, mode, 1, CONFIG.API_MAXAGE.SP.PHP_PROFILE_LEADER)]).then(php_profile_leader => {
					php_profile_leader = php_profile_leader.join("");
					lolapi.osuOldUserPage(user_stats.user_id, CONFIG.API_MAXAGE.SP.OLD_USER_PAGE).then(user_page => {
						lolapi.osuPHPProfileGeneral(user_stats.user_id, mode, CONFIG.API_MAXAGE.SP.PHP_PROFILE_GENERAL).then(php_profile_general => {
							replyEmbed(embedgenerator.statsPlus(CONFIG, mode, user_stats, user_best, php_profile_leader, user_page, php_profile_general));
						}).catch(console.error);
					}).catch(console.error);
				}).catch(console.error);
			}).catch(console.error);
		}).catch(console.error);
	});
	/*
	command([preferences.get("prefix") + "verify "], true, false, (original, index, parameter) => {
		let region = assertRegion(parameter.substring(0, parameter.indexOf(" ")));
		lolapi.getSummonerIDFromName(region, parameter.substring(parameter.indexOf(" ") + 1), CONFIG.API_MAXAGE.VERIFY.SUMMONER_ID).then(summoner => {
			summoner.region = region;
			summoner.guess = parameter.substring(parameter.indexOf(" ") + 1);
			if (UTILS.exists(summoner.status)) return reply(":x: The username appears to be invalid.");
			lolapi.getVerifiedAccounts(msg.author.id).then(result => {
				if (UTILS.exists(result.verifiedAccounts[summoner.puuid])) {
					reply(":white_check_mark: You have already linked your discord account to " + summoner.name + ". This will expire in " + UTILS.until(new Date(result.verifiedAccounts[summoner.puuid])) + ".");//verified
				}
				else {//not verified yet
					lolapi.getThirdPartyCode(region, summoner.id, CONFIG.API_MAXAGE.VERIFY.THIRD_PARTY_CODE).then(tpc => {
						let valid_code = 0;
						const tpc_timestamp_ms = parseInt(tpc.substring(0, tpc.indexOf("-")));
						const tpc_HMAC_input = tpc_timestamp_ms + "-" + msg.author.id + "-" + summoner.puuid;
						const tpc_HMAC_output = tpc.substring(tpc.indexOf("-") + 1);
						UTILS.debug("tpc_timestamp_ms: " + tpc_timestamp_ms);
						UTILS.debug("tpc_HMAC_input: " + tpc_HMAC_input);
						UTILS.debug("tpc_HMAC_output: " + tpc_HMAC_output);
						if (tpc_timestamp_ms < new Date().getTime() - (5 * 60 * 1000)) valid_code += 1;//not expired
						else if (tpc_HMAC_output !== crypto.createHmac("sha256", CONFIG.TPV_KEY).update(tpc_HMAC_input).digest("hex")) valid_code += 2;//same HMAC
						if (valid_code === 0) {
							lolapi.setVerifiedAccount(msg.author.id, summoner.puuid, region, new Date().getTime() + (365 * 24 * 60 * 60000)).then(result2 => {
								reply(":white_check_mark: You have linked your discord account to " + summoner.name + " for 1 year.");
							}).catch(console.error);
						}
						else {
							UTILS.debug("valid_code: " + valid_code);
							replyEmbed(embedgenerator.verify(CONFIG, summoner, msg.author.id));
						}
					}).catch();
				}
			}).catch(console.error);
		}).catch(console.error);
	});
	*/

	commandGuessUsername([preferences.get("prefix") + "statsplus-m", preferences.get("prefix") + "sp-m", preferences.get("prefix") + "osu-m", preferences.get("prefix") + "std-m", preferences.get("prefix") + "taiko-m", preferences.get("prefix") + "sptaiko-m", preferences.get("prefix") + "spt-m", preferences.get("prefix") + "ctb-m", preferences.get("prefix") + "spctb-m", preferences.get("prefix") + "spc-m", preferences.get("prefix") + "mania-m", preferences.get("prefix") + "spmania-m", preferences.get("prefix") + "spm-m"], false, (index, id, user, parameter) => {
		let mode;
		if (index < 4) mode = 0;
		else if (index < 7) mode = 1;
		else if (index < 10) mode = 2;
		else mode = 3;
		lolapi.osuGetUser(user, mode, id, CONFIG.API_MAXAGE.SPM.GET_USER).then(user_stats => {
			if (!UTILS.exists(user_stats)) return reply(":x: This user could not be found.");
			lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.SPM.GET_USER_BEST).then(user_best => {
				replyEmbed(embedgenerator.statsPlusMods(CONFIG, mode, user_stats, user_best));
			}).catch(console.error);
		}).catch(console.error);
	});
	command(["https://osu.ppy.sh/u/", "http://osu.ppy.sh/u/", "https://osu.ppy.sh/users/", "http://osu.ppy.sh/users/"], true, false, (original, index, parameter) => {
		const id = UTILS.arbitraryLengthInt(parameter);
		lolapi.osuMostRecentMode(id, true, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
			lolapi.osuGetUser(id, mrm, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				replyEmbed(embedgenerator.signature(CONFIG, mrm, user_stats));
			}).catch(console.error);
		}).catch(e => {
			lolapi.osuGetUser(id, 0, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				replyEmbed(embedgenerator.signature(CONFIG, 0, user_stats));
			}).catch(console.error);
		});
	});
	commandGuessUsername([preferences.get("prefix") + "osusignature", preferences.get("prefix") + "osusign", preferences.get("prefix") + "osusig"], false, (index, id, user, parameter) => {
		lolapi.osuMostRecentMode(user, id, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
			lolapi.osuGetUser(user, mrm, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				replyEmbed(embedgenerator.signature(CONFIG, mrm, user_stats));
			}).catch(console.error);
		}).catch(e => {
			lolapi.osuGetUser(user, 0, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				replyEmbed(embedgenerator.signature(CONFIG, 0, user_stats));
			}).catch(console.error);
		});
	});
	command([preferences.get("prefix") + "roll"], false, false, (original, index) => {
		reply(textgenerator.roll(100, msg.author));
	});
	command([preferences.get("prefix") + "roll "], true, false, (original, index, parameter) => {
		reply(textgenerator.roll(parameter, msg.author));
	});
	command([preferences.get("prefix") + "coinflip", preferences.get("prefix") + "flipcoin", preferences.get("prefix") + "coin"], false, false, (original, index) => {
		reply(textgenerator.coin());
	});
	command([preferences.get("prefix") + "stats ", preferences.get("prefix") + "stat "], true, false, (original, index, parameter) => {
		lolapi.osuMostRecentMode(parameter, false, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
			lolapi.osuGetUser(parameter, mrm, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply(textgenerator.stats(mrm, user_stats));
			}).catch(console.error);
		}).catch(e => {
			lolapi.osuGetUser(parameter, 0, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply(textgenerator.stats(0, user_stats));
			}).catch(console.error);
		});
	});
	command([preferences.get("prefix") + "where "], true, false, (original, index, parameter) => {
		lolapi.osuGetUser(parameter, 0, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
			reply(textgenerator.where(user_stats));
		}).catch(console.error);
	});
	if (preferences.get("abi")) {
		let id, type, mode, mod_string, beatmap;
		command(["https://osu.ppy.sh/b/", "http://osu.ppy.sh/b/"], true, false, (original, index, parameter) => {//old format beatmap link
			id = UTILS.arbitraryLengthInt(parameter);
			type = "b";
			mode = original.indexOf("&m=") != -1 ? parseInt(original[original.indexOf("&m=") + 3]) : null;
			mod_string = parameter.substring(parameter.indexOf(" ") + 1);//only get the string after the url
			mod_string = mod_string.substring(mod_string.indexOf("+"));//only get the string after the '+'
			lolapi.osuBeatmap(id, type, mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(new_beatmap => {
				beatmap = new_beatmap;
				id = new_beatmap.beatmapset_id;
				type = "s";
				step2();
			}).catch();
		});
		command(["https://osu.ppy.sh/s/", "http://osu.ppy.sh/s/", "https://osu.ppy.sh/d/", "http://osu.ppy.sh/d/"], true, false, (original, index, parameter) => {//old format set links
			id = UTILS.arbitraryLengthInt(parameter);
			type = "s";
			mode = original.indexOf("&m=") != -1 ? parseInt(original[original.indexOf("&m=") + 3]) : null;
			mod_string = parameter.substring(parameter.indexOf(" ") + 1);//only get the string after the url
			mod_string = mod_string.substring(mod_string.indexOf("+"));//only get the string after the '+'
			step2();
		});
		command(["https://osu.ppy.sh/beatmapsets/"], true, false, (original, index, parameter) => {
			let url = original;
			if (original.indexOf(" ") != -1) url = url.substring(0, url.indexOf(" "));//more comes after the url
			id = UTILS.arbitraryLengthInt(parameter);
			type = "s";
			mode = null;
			if (url.indexOf("#osu") != -1) mode = 0;
			else if (url.indexOf("#taiko") != -1) mode = 1;
			else if (url.indexOf("#fruits") != -1) mode = 2;
			else if (url.indexOf("#mania") != -1) mode = 3;
			mod_string = parameter.substring(parameter.indexOf(" ") + 1);//only get the string after the url
			mod_string = mod_string.substring(mod_string.indexOf("+"));//only get the string after the '+'
			if (url.indexOfInstance("/", url, 5) != -1) {
				lolapi.osuBeatmap(UTILS.arbitraryLengthInt(url.substring(indexOfInstance("/", url, 5) + 1)), "b", mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(new_beatmap => {
					beatmap = new_beatmap;
					step2();
				}).catch();
			}
			else step2();
		});
		function step2() {
			UTILS.assert(type === "s");
			lolapi.osuBeatmap(id, type, mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(beatmapset => {
				lolapi.osuBeatmapFile(beatmapset[0].beatmap_id, beatmapset[0].last_updated.getTime(), CONFIG.API_MAXAGE.BEATMAP_AUTO.OSU_FILE).then(osu_file => {
					lolapi.osuGetUser(beatmapset[0].creator_id, beatmapset[0].mode, true, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_USER).then(creator => {
						embedgenerator.beatmap(CONFIG, UTILS.exists(beatmap) ? beatmap : beatmapset[0], beatmapset, creator, mod_string).then(replyEmbed).catch(console.error);
					}).catch(console.error);
				}).catch(console.error);
			}).catch(console.error);
		}
	}
	if (UTILS.exists(msg.guild)) {//respondable server message only
		/*
		command([preferences.get("prefix") + "shutdown"], false, CONFIG.CONSTANTS.BOTOWNERS, () => {
			reply(":white_check_mark: shutdown initiated", shutdown, shutdown);
		});
		command([preferences.get("prefix") + "restart"], false, CONFIG.CONSTANTS.BOTOWNERS, () => {
			reply(":white_check_mark: restart initiated", restart, restart);
		});
		command([preferences.get("prefix") + "refresh", preferences.get("prefix") + "clearcache"], false, CONFIG.CONSTANTS.BOTOWNERS, () => {
			reply(":white_check_mark: restart initiated + clearing cache", step2, step2);
			function step2() {
				lolapi.clearCache();
				restart();
			}
		});*/
		command([preferences.get("prefix") + "setting force-prefix on", preferences.get("prefix") + "setting force-prefix off"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
			const new_setting = index === 0 ? true : false;
			preferences.set("force_prefix", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will require prefixes on all osu commands." : "BoatBot will not require prefixes on all LoL commands."))).catch(reply);
		});
		command([preferences.get("prefix") + "setting release-notifications on", preferences.get("prefix") + "setting release-notifications off"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
			const new_setting = index === 0 ? true : false;
			preferences.set("release_notifications", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will show new release notifications." : "BoatBot will not show new release notifications."))).catch(reply);
		});
		command([preferences.get("prefix") + "setting abi on", preferences.get("prefix") + "setting abi off"], false, CONFIG.CONSTANTS.MODERATORS, (original, index) => {
			const new_setting = index === 0 ? true : false;
			preferences.set("abi", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will show beatmap information when a beatmap link is posted." : "BoatBot will not show beatmap information when a beatmap link is posted."))).catch(reply);
		});
		/*
		command(["boatbot settings reset all"], false, CONFIG.CONSTANTS.ADMINISTRATORS, () => reply(":warning: You are about to reset all the preferences associated with this server. To confirm this action, please send the command: `boatbot settings reset all confirm`"));
		command(["boatbot settings reset all confirm"], false, CONFIG.CONSTANTS.ADMINISTRATORS, () => {
			preferences.resetToDefault().then(() => reply(":white_check_mark: This server's settings were reset to defaults.")).catch(reply);
		});*/
		command([preferences.get("prefix") + "mail "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
			const uid = parameter.substring(0, parameter.indexOf(" "))
			getUsernameFromUID(uid).then(usertag => {
				sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 5, 1, msg, null, null, usertag));
				wsapi.embedPM(uid, embedgenerator.feedback(CONFIG, 5, 0, msg, null, null, usertag));
			}).catch(console.error);
		});
		command([preferences.get("prefix") + "approve "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
			const mid = parameter;
			if (!UTILS.isInt(mid)) return reply(":x: Message ID not recognizable.");
			msg.channel.fetchMessage(mid).then(approvable => {
				if (approvable.author.id != client.user.id) return reply(":x: Cannot approve messages not sent from this account.");
				const candidate = embedgenerator.reviewFeedback(CONFIG, approvable, msg.author, true);
				if (typeof(candidate) == "number") {
					UTILS.debug(CONFIG.DISCORD_COMMAND_PREFIX + "approve error type " + candidate);
					if (candidate == 1) return reply(":x: No embed found.");
					else return reply(":x: This type of message is not approvable.");
				}
				else {//success
					wsapi.embedPM(candidate.to_user_uid, candidate.to_user);//notify user of success
					approvable.edit({ embed: candidate.edit });//change internal feedback message
					sendEmbedToChannel(candidate.to_public_cid, candidate.to_public);//publish to public feedback channel
				}
			}).catch(console.error);
		});
	}
	else {//PM/DM only
		command([preferences.get("prefix") + "say "], true, false, (original, index, parameter) => {
			lolapi.userHistory(msg.author.id).then(uH => {
				sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 0, 1, msg, uH[msg.author.id]));
				reply(":e_mail: Message delivered.");
			});
		});
	}

	function command(trigger_array,//array of command aliases, prefix needs to be included
		parameters_expected,//boolean
		elevated_permissions,//requires owner permissions
		callback,//optional callback only if successful
		external = true) {//external call means not inside commandGuessUsername & commandGuessUsernameNumber
		for (let i = 0; i < trigger_array.length; ++i) {
			if (parameters_expected && msg.content.trim().toLowerCase().substring(0, trigger_array[i].length) === trigger_array[i].toLowerCase()) {
				if (external && !processRateLimit()) return false;
				if (elevated_permissions && !is(elevated_permissions)) return false;
				else {
					if (elevated_permissions === CONFIG.CONSTANTS.BOTOWNERS) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);
					if (UTILS.exists(callback)) {
						try {
							callback(trigger_array[i], i, msg.content.trim().substring(trigger_array[i].length));
						}
						catch (e) {
							console.error(e);
						}
						return true;
					}
				}
			}
			else if (!parameters_expected && msg.content.trim().toLowerCase() === trigger_array[i].toLowerCase()) {
				if (external && !processRateLimit()) return false;
				if (elevated_permissions && !is(elevated_permissions)) return false;
				else {
					if (elevated_permissions === CONFIG.CONSTANTS.BOTOWNERS) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);
					if (UTILS.exists(callback)) {
						try {
							callback(trigger_array[i], i);
						}
						catch (e) {
							console.error(e);
						}
						return true;
					}
				}
			}
		}
	}

	function commandGuessUsername(trigger_array,//array of command aliases, prefix needs to be included
		elevated_permissions,//requires owner permissions
		callback) {//optional callback only if successful
		//returns (index, boolean: user_id = true / username = false, user_id or username, parameter)
		//this command does not validate the existance of a username on the server
		/*returns (region, username, parameter, username guess method)
		username guess method 0: username provided
		username guess method 1: shortcut provided
		username guess method 2: link
		username guess method 3: implicit discord username
		username guess method 4: explicit discord mention
		username guess method 5: recently used command
		*/
		command(trigger_array, true, elevated_permissions, (original, index, parameter) => {
			if (parameter.length !== 0) {//username explicitly provided
				if (parameter.length < 70 && parameter[0] === " ") {//longest query should be less than 70 characters (required trailing space after command trigger)
					if (!processRateLimit()) return false;
					parameter = parameter.trim();
					if (msg.mentions.users.size == 1) {
						lolapi.getLink(msg.mentions.users.first().id).then(result => {
							let username = msg.mentions.users.first().username;//suppose the link doesn't exist in the database
							if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
							callback(index, false, username, parameter);
						}).catch(console.error);
					}
					else if (parameter[0] === "$") {//shortcut
						lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(1)).then(result => {
							callback(index, false, result[parameter.toLowerCase().substring(1)], parameter);
						}).catch(e => {
							if (e) reply(":x: An error has occurred. The shortcut may not exist.");
						});
					}
					else if (parameter[0] === "^") {
						msg.channel.fetchMessages({ before: msg.id, limit: 30 }).then(msgs => {
							msgs = msgs.array();
							let user_id;
							for (let i = 0; i < msgs.length; ++i) {
								if (msgs[i].author.id == client.user.id && //message was sent by bot
									msgs[i].embeds.length == 1 && //embedded response
									UTILS.exists(msgs[i].embeds[0].author) && //author present
									UTILS.exists(msgs[i].embeds[0].author.url) && //url present
									msgs[i].embeds[0].author.url.substring(0, 25) === "https://osu.ppy.sh/users/") {//https://osu.ppy.sh/users/4374286
									const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(25));
									if (candidate !== "") user_id = parseInt(candidate);
									break;
								}
							}
							if (!UTILS.exists(user_id)) reply(":x: Could not find a recent username queried.");
							else callback(index, true, user_id, parameter);
						}).catch(e => {
							console.error(e);
							reply(":x: Could not find a recent username queried.");
						});
					}
					else callback(index, false, parameter.trim(), parameter);//explicit
					return true;
				}
				else return false;
			}
			else {//username not provided
				if (!processRateLimit()) return false;
				lolapi.getLink(msg.author.id).then(result => {
					let username = msg.author.username;//suppose the link doesn't exist in the database
					if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
					callback(index, false, username, parameter);
				}).catch(console.error);
				return true;
			}
		}, false);
	}

	function commandGuessUsernameNumber(trigger_array,//array of command aliases, prefix needs to be included
		elevated_permissions,//requires owner permissions
		callback) {//optional callback only if successful
		//returns (index, boolean: user_id = true / username = false, user_id or username, number)
		//this command does not validate the existance of a username on the server
		/*
		username guess method 0: username provided
		username guess method 1: shortcut provided
		username guess method 2: link
		username guess method 3: implicit discord username
		username guess method 4: explicit discord mention
		username guess method 5: recently used command
		*/
		command(trigger_array, true, elevated_permissions, (original, index, parameter) => {
			/*
			valid: number explicitly specified
			invalid: number implicit (#1, index 0)

			valid: no username specified
			valid: username explicit
			valid: discord mention
			valid: $shortcut
			valid: ^
			*/
			let number;
			const space_index = parameter.indexOf(" ");
			if (parameter === "") number = 1;//no number specified, no username specified
			else if (space_index === -1) {
				number = parseInt(parameter);//it's either "!c" or "!c123" with params "" or "123"
				parameter = "";
			}
			else if (space_index === 0) number = 1;//"!c user" with params " user"
			else {
				number = parseInt(parameter.substring(0, space_index));//number specified. either it's "!c123 user"
				parameter = parameter.substring(space_index);
			}
			if (isNaN(number)) return false;
			if (parameter.length != 0) {//username explicitly provided
				if (parameter.length < 70) {//longest query should be less than 70 characters
					if (!processRateLimit()) return false;
					if (msg.mentions.users.size == 1) {
						lolapi.getLink(msg.mentions.users.first().id).then(result => {
							let username = msg.mentions.users.first().username;//suppose the link doesn't exist in the database
							if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
							callback(index, false, username, number, 4);
						}).catch(console.error);
					}
					else if (parameter.substring(0, 2) == " $") {//shortcut
						lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(2)).then(result => {
							callback(index, false, result[parameter.toLowerCase().substring(2)], number, 1);
						}).catch(e => {
							if (e) reply(":x: An error has occurred. The shortcut may not exist.");
						});
					}
					else if (parameter.substring(parameter.indexOf(" ") + 1) == "^") {//pull from recent command
						msg.channel.fetchMessages({ before: msg.id, limit: 30 }).then(msgs => {
							msgs = msgs.array();
							let user_id;
							for (let i = 0; i < msgs.length; ++i) {
								if (msgs[i].author.id == client.user.id && //message was sent by bot
									msgs[i].embeds.length == 1 && //embedded response
									UTILS.exists(msgs[i].embeds[0].author) && //author present
									UTILS.exists(msgs[i].embeds[0].author.url) && //url present
									msgs[i].embeds[0].author.url.substring(0, 25) === "https://osu.ppy.sh/users/") {//https://osu.ppy.sh/users/4374286
									const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(25));
									if (candidate !== "") user_id = parseInt(candidate);
									break;
								}
							}
							if (!UTILS.exists(user_id)) reply(":x: Could not find a recent username queried.");
							else callback(index, true, user_id, number, 5);
						}).catch(e => {
							console.error(e);
							reply(":x: Could not find a recent username queried.");
						});
					}
					else if (parameter[0] == " ") callback(index, false, parameter.substring(1).trim(), number, 0);//explicit (required trailing space after command trigger)
					else return false;
				}
			}
			else {//username not provided
				if (!processRateLimit()) return false;
				lolapi.getLink(msg.author.id).then(result => {
					let username = msg.author.username;//suppose the link doesn't exist in the database
					if (UTILS.exists(result.username) && result.username != "") {
						username = result.username;//link exists
						callback(index, false, username, number, 2);
					}
					else callback(index, false, username, number, 3);
				}).catch(console.error);
				return true;
			}
		}, false);
	}
	function is(PLEVEL, candidate = msg.author.id, notify = true) {
		if (candidate === msg.author.id) {
			if (ACCESS_LEVEL >= PLEVEL) return true;
			else if (notify) {
				if (PLEVEL === CONFIG.CONSTANTS.BOTOWNERS);//do not notify when this permission fails
				else if (PLEVEL === CONFIG.CONSTANTS.SERVEROWNERS) reply(":x: Server Owner permissions required. You must be the owner of this server to use this command.");
				else if (PLEVEL === CONFIG.CONSTANTS.ADMINISTRATORS) reply(":x: Server Administrator permissions required.");
				else if (PLEVEL === CONFIG.CONSTANTS.MODERATORS) reply(":x: Server Moderator permissions required.");
				else if (PLEVEL === CONFIG.CONSTANTS.BOTCOMMANDERS) reply(":x: Bot Commander permissions required.");
				else;//normal member permissions
			}
			return false;
		}
		else {
			const other_ACCESS_LEVEL = UTILS.accessLevel(CONFIG, msg);
			return other_ACCESS_LEVEL >= PLEVEL;//never notifies
		}
	}
	function isOwner(candidate = msg.author.id, notify = true) {
		const answer = UTILS.exists(CONFIG.OWNER_DISCORD_IDS[candidate]) && CONFIG.OWNER_DISCORD_IDS[candidate].active;
		if (!answer) {
			printMessage("insufficient permissions");
			if (notify) msg.channel.send(":x: Owner permissions required. Ask for help at " + CONFIG.HELP_SERVER_INVITE_LINK + " .").catch(console.error);
		}
		return answer;
	}
	function reply(reply_text, callback, errorCallback) {
		printMessage("reply (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
		lolapi.terminate(msg, ACCESS_LEVEL, reply_text);
		msg.channel.send(reply_text, { split: true }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(errorCallback)) errorCallback(e);
		});
	}

	function replyToAuthor(reply_text, callback, errorCallback) {
		printMessage("reply to author (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
		lolapi.terminate(msg, ACCESS_LEVEL, reply_text);
		msg.author.send(reply_text, { split: true }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(errorCallback)) errorCallback(e);
		});
	}

	function replyEmbed(reply_embed, callback, errorCallback) {
		if (!msg.PM && !msg.channel.permissionsFor(client.user).has(["EMBED_LINKS"])) {//doesn't have permission to embed links in server
			lolapi.terminate(msg, ACCESS_LEVEL, ":x: I cannot respond to your request without the \"embed links\" permission.");
			reply(":x: I cannot respond to your request without the \"embed links\" permission.");
		}
		else {//has permission to embed links, or is a DM/PM
			printMessage("reply embedded (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
			lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed);
			msg.channel.send("", { embed: reply_embed }).then((nMsg) => {
				if (UTILS.exists(callback)) callback(nMsg);
			}).catch((e) => {
				console.error(e);
				if (UTILS.exists(errorCallback)) errorCallback(e);
			});
		}
	}

	function replyEmbedToAuthor(reply_embed, callback, errorCallback) {
		printMessage("reply embedded to author (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
		lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed);
		msg.author.send("", { embed: reply_embed }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(errorCallback)) errorCallback(e);
		});
	}

	function printMessage(x = "") {
		let answer = x + "\n";
		const MSG_LEN = 50;
		let ctt;
		if (!msg.PM) {
			ctt = [{ content: msg.id, author: msg.author.id, P: ACCESS_LEVEL, channel: msg.channel.id, guild: msg.guild.id, size_region: msg.guild.memberCount }, { content: msg.cleanContent.substring(0, MSG_LEN), author: msg.author.tag, P: CONFIG.CONSTANTS.PERMISSION_LEVEL_REVERSE[ACCESS_LEVEL], channel: msg.channel.name, guild: msg.guild.name, size_region: msg.guild.region }];
		}
		else {
			ctt = [{ content: msg.id, author: msg.author.id, P: ACCESS_LEVEL, channel: msg.channel.id }, { content: msg.cleanContent.substring(0, MSG_LEN), author: msg.author.tag, P: CONFIG.CONSTANTS.PERMISSION_LEVEL_REVERSE[ACCESS_LEVEL], channel: msg.channel.name }];
		}
		for (let i = MSG_LEN; i < msg.cleanContent.length; i += MSG_LEN) ctt.push({ content: msg.cleanContent.substring(i, i + MSG_LEN) });
		answer += ctable.getTable(ctt);
		UTILS.output(answer);
	}
	function suggestLink(guess_method) {
		return guess_method === 3 ? " We tried using your discord username but could not find a player with the same name. Let us know what your osu username is using `" + CONFIG.DISCORD_COMMAND_PREFIX + "link <ign>` and we'll remember it for next time!" : "";
	}
	function forcePrefix(triggers) {
		return preferences.get("force_prefix") ? triggers.map(t => preferences.get("prefix") + t) : triggers;
	}
	function processRateLimit() {
		//return true if valid. return false if limit reached.
		if (is(CONFIG.CONSTANTS.BOTOWNERS, msg.author.id, false)) return true;//owners bypass rate limits
		let valid = 0;//bitwise
		if (!msg.PM) {
			if (!server_RL.check()) {
				sendToChannel(CONFIG.RATE_LIMIT.CHANNEL_ID, ":no_entry::busts_in_silhouette: Server exceeded rate limit. uID: `" + msg.author.id + "` sID: `" + msg.guild.id + "`\n" + msg.author.tag + " on " + msg.guild.name);
				valid += 1;//bit 0
			}
		}
		if (!user_RL.check()) {
			sendToChannel(CONFIG.RATE_LIMIT.CHANNEL_ID, ":no_entry::bust_in_silhouette: User exceeded rate limit. uID: `" + msg.author.id + "` sID: `" + (msg.PM ? "N/A" : msg.guild.id) + "`\n" + msg.author.tag + " on " + (msg.PM ? "N/A" : msg.guild.name));
			valid += 2;//bit 1
		}
		if (valid === 0) {
			if (!msg.PM) server_RL.add();
			user_RL.add();
		}
		else if (valid === 3) {//both rate limits reached
			if (!server_RL.warned && !user_RL.warned) {
				reply(":no_entry::alarm_clock::busts_in_silhouette::bust_in_silhouette: The server and user rate limits have been exceeded. Please wait a while before trying the next command.");
			}
			server_RL.warn();
			user_RL.warn();
		}
		else if (valid === 2) {//user rate limit reached
			if (!user_RL.warned) reply(":no_entry::alarm_clock::bust_in_silhouette: The user rate limits have been exceeded. Please wait a while before trying the next command.");
			user_RL.warn();
		}
		else if (valid === 1) {//server rate limit reached
			if (!server_RL.warned) reply(":no_entry::alarm_clock::busts_in_silhouette: The server rate limits have been exceeded. Please wait a while before trying the next command.");
			server_RL.warn();
		}
		return valid === 0;
	}
	function getUsernameFromUID(uid) {
		return new Promise((resolve, reject) => {
			if (UTILS.isInt(uid)) {
				client.shard.broadcastEval("let candidate_user = this.users.get(\"" + uid + "\"); candidate_user != undefined ? candidate_user.tag : null;").then(possible_usernames => {
					for (let b in possible_usernames) if (UTILS.exists(possible_usernames[b])) return resolve(possible_usernames[b]);
					resolve(uid);
				}).catch(reject);
			}
			else resolve(uid);
		});
	}
	function shutdown() {
		sendToChannel(CONFIG.LOG_CHANNEL_ID, ":x: Shutdown initiated.");
		client.user.setStatus("invisible").then(step2).catch(step2);
		function step2() {
			client.destroy().catch();
			UTILS.output("reached shutdown point");
			setTimeout(function () {
				child_process.spawnSync("pm2", ["stop", "all"]);
			}, 5000);
		}
	}
	function restart() {
		sendToChannel(CONFIG.LOG_CHANNEL_ID, ":repeat: Restart initiated.");
		client.user.setStatus("invisible").then(step2).catch(step2);
		function step2() {
			client.destroy().catch();
			UTILS.output("reached restart point");
			setTimeout(function () {
				child_process.spawnSync("pm2", ["restart", "all"]);
			}, 5000);
		}
	}
}
