"use strict";
let embedgenerator = new (require("./embedgenerator.js"))();
let textgenerator = new (require("./textgenerator.js"))();
let child_process = require("child_process");
const UTILS = new (require("../utils.js"))();
let LOLAPI = require("./lolapi.js");
let Profiler = require("../timeprofiler.js");
module.exports = function (CONFIG, client, msg, wsapi, sendToChannel, preferences, ACCESS_LEVEL) {
	if (msg.author.bot || msg.author.id === client.user.id) return;//ignore all messages from [BOT] users and own messages
	if (UTILS.exists(msg.guild) && !msg.channel.permissionsFor(client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return;//dont read messages that can't be responded to
	if (!UTILS.exists(CONFIG.BANS) || !UTILS.exists(CONFIG.BANS.USERS) || !UTILS.exists(CONFIG.BANS.SERVERS)) return UTILS.output("message " + msg.id + " could not be processed because ban data has not been loaded yet");
	if (UTILS.exists(CONFIG.BANS.USERS[msg.author.id]) && (CONFIG.BANS.USERS[msg.author.id] == 0 || CONFIG.BANS.USERS[msg.author.id] > msg.createdTimestamp)) return;//ignore messages from banned users
	if (UTILS.exists(msg.guild) && UTILS.exists(CONFIG.BANS.SERVERS[msg.guild.id])) {
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

	//respondable server message or PM
	command([preferences.get("prefix") + "banuser "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lbanuser <uid> <duration> <reason>
		const id = parameter.substring(0, parameter.indexOf(" "));
		const reason = parameter.substring(UTILS.indexOfInstance(parameter, " ", 2) + 1);
		let duration = parameter.substring(UTILS.indexOfInstance(parameter, " ", 1) + 1, UTILS.indexOfInstance(parameter, " ", 2));
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
		const reason = parameter.substring(UTILS.indexOfInstance(parameter, " ", 2) + 1);
		let duration = parameter.substring(UTILS.indexOfInstance(parameter, " ", 1) + 1, UTILS.indexOfInstance(parameter, " ", 2));
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
			reply_embed(embedgenerator.disciplinaryHistory(CONFIG, parameter, true, results[parameter]));
		}).catch();
	});
	command([preferences.get("prefix") + "serverhistory "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
		//Lserverhistory <sid>
		lolapi.serverHistory(parameter).then(results => {
			reply_embed(embedgenerator.disciplinaryHistory(CONFIG, parameter, false, results[parameter]));
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
			reply_embed(embedgenerator.actionReport(CONFIG, parameter, results[parameter]));
		}).catch();
	});
	command([preferences.get("prefix") + "permissionstest", preferences.get("prefix") + "pt"], false, false, () => {
		reply("You have " + (isOwner(undefined, false) ? "owner" : "normal") + " permissions.");
	});
	command([preferences.get("prefix") + "permissionstest ", preferences.get("prefix") + "pt "], true, false, () => {
		if (msg.mentions.users.size != 1) return reply(":x: A user must be mentioned.");
		reply(msg.mentions.users.first().tag + " has " + (isOwner(msg.mentions.users.first().id, false) ? "owner" : "normal") + " permissions.");
	});
	command([preferences.get("prefix") + "cs"], false, CONFIG.CONSTANTS.BOTOWNERS, () => {
		reply("This is shard " + process.env.SHARD_ID);
	});
	command([preferences.get("prefix") + "ping", preferences.get("prefix") + "latency"], false, false, () => {
		reply("command to response time: ", nMsg => textgenerator.ping_callback(msg, nMsg));
	});
	command(["iping"], false, false, () => {
		lolapi.ping().then(times => reply(textgenerator.internal_ping(times))).catch(console.error);
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
		wsapi.lnotify(msg.author.username, msg.author.displayAvatarURL, parameter);
	});
	command([preferences.get("prefix") + "testembed"], false, false, () => {
		reply_embed(embedgenerator.test());
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
		reply_embed_to_author(embedgenerator.help(CONFIG));
	});*/
	command([preferences.get("prefix") + "setshortcut ", preferences.get("prefix") + "ss ", preferences.get("prefix") + "createshortcut ", preferences.get("prefix") + "cs ", preferences.get("prefix") + "addshortcut "], true, false, (original, index, parameter) => {
		if (parameter[0] !== "$") return reply(":x: The shortcut must begin with an `$`. Please try again.");
		if (parameter.indexOf(" ") === -1) return reply(":x: The shortcut word and the username must be separated by a space. Please try again.");
		if (parameter.length > 60) return reply(":x: The shortcut name or the username is too long.");
		const from = parameter.substring(1, parameter.indexOf(" ")).toLowerCase();
		if (from.length === 0) return reply(":x: The shortcut name was not specified. Please try again.");
		const to = parameter.substring(parameter.indexOf(" ") + 1);
		if (to.length === 0) return reply(":x: The username was not specified. Please try again.");
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
	command(["http://", "https://"], true, false, (original, index, parameter) => {
	});
	commandGuessUsername([preferences.get("prefix") + "d1"], false, (index, id, user, parameter) => {
		reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` parameter: `" + parameter + "`");
	});
	commandGuessUsernameNumber([preferences.get("prefix") + "d2"], false, (index, id, user, parameter, number) => {
		reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` parameter: `" + parameter + "`" + " number: `" + number + "`");
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
							reply_embed(embedgenerator.statsPlus(CONFIG, mode, user_stats, user_best, php_profile_leader, user_page, php_profile_general));
						}).catch(console.error)
					}).catch(console.error);
				}).catch(console.error);
			}).catch(console.error);
		}).catch(console.error);
	});
	command(["https://osu.ppy.sh/u/", "http://osu.ppy.sh/u/", "https://osu.ppy.sh/users/", "http://osu.ppy.sh/users/"], true, false, (original, index, parameter) => {
		const id = UTILS.arbitraryLengthInt(parameter);
		lolapi.osuMostRecentMode(id, true, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
			lolapi.osuGetUser(id, mrm, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply_embed(embedgenerator.signature(CONFIG, mrm, user_stats));
			}).catch(console.error);
		}).catch(e => {
			lolapi.osuGetUser(id, 0, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply_embed(embedgenerator.signature(CONFIG, 0, user_stats));
			}).catch(console.error);
		});
	});
	commandGuessUsername([preferences.get("prefix") + "osusignature", preferences.get("prefix") + "osusign", preferences.get("prefix") + "osusig"], false, (index, id, user, parameter) => {
		lolapi.osuMostRecentMode(user, id, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
			lolapi.osuGetUser(user, mrm, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply_embed(embedgenerator.signature(CONFIG, mrm, user_stats));
			}).catch(console.error);
		}).catch(e => {
			lolapi.osuGetUser(user, 0, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
				reply_embed(embedgenerator.signature(CONFIG, 0, user_stats));
			}).catch(console.error);
		});
	});

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
	}
	else {//PM/DM only
	}

	function command(trigger_array,//array of command aliases, prefix needs to be included
		parameters_expected,//boolean
		elevated_permissions,//requires owner permissions
		callback) {//optional callback only if successful
		for (let i in trigger_array) {
			if (parameters_expected && msg.content.trim().toLowerCase().substring(0, trigger_array[i].length) === trigger_array[i].toLowerCase()) {
				if (elevated_permissions && !is(elevated_permissions)) return false;
				else {
					if (elevated_permissions) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);
					if (UTILS.exists(callback)) {
						try {
							callback(trigger_array[i], i, msg.content.trim().substring(trigger_array[i].length));
						}
						catch (e) {
							console.error(e);
						}
					}
				}
			}
			else if (!parameters_expected && msg.content.trim().toLowerCase() === trigger_array[i].toLowerCase()) {
				if (elevated_permissions && !is(elevated_permissions)) return false;
				else {
					if (elevated_permissions) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);
					if (UTILS.exists(callback)) {
						try {
							callback(trigger_array[i], i);
						}
						catch (e) {
							console.error(e);
						}
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
		command(trigger_array, true, elevated_permissions, (original, index, parameter) => {
			if (parameter.length != 0) {//username explicitly provided
				if (parameter.length < 70) {//longest query should be less than 70 characters
					if (msg.mentions.users.size == 1) {
						lolapi.getLink(msg.mentions.users.first().id).then(result => {
							let username = msg.mentions.users.first().username;//suppose the link doesn't exist in the database
							if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
							callback(index, false, username, parameter);
						}).catch(console.error);
					}
					else if (parameter.substring(0, 2) == " $") {//shortcut
						lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(2)).then(result => {
							callback(index, false, result[parameter.toLowerCase().substring(2)], parameter);

						}).catch(e => {
							if (e) reply(":x: An error has occurred. The shortcut may not exist.");
						});
					}
					else if (parameter.substring(0, 2) == " ^") {//pull from recent command
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
					else if (parameter[0] == " ") callback(index, false, parameter.substring(1).trim(), parameter);//explicit (required trailing space after command trigger)
				}
			}
			else {//username not provided
				lolapi.getLink(msg.author.id).then(result => {
					let username = msg.author.username;//suppose the link doesn't exist in the database
					if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
					callback(index, false, username, parameter);
				}).catch(console.error);
			}
		});
	}

	function commandGuessUsernameNumber(trigger_array,//array of command aliases, prefix needs to be included
		elevated_permissions,//requires owner permissions
		callback) {//optional callback only if successful
		//returns (index, boolean: user_id = true / username = false, user_id or username, parameter, number)
		//this command does not validate the existance of a username on the server
		command(trigger_array, true, elevated_permissions, (original, index, parameter) => {
			let number = UTILS.arbitraryLengthInt(parameter);
			if (number === "") number = 1;//number not specified
			else {//number specified
				number = parseInt(number);
				const space_index = parameter.indexOf(" ");
				if (space_index == -1) parameter = "";
				else parameter = parameter.substring(space_index);
			}
			if (parameter.length != 0) {//username explicitly provided
				if (parameter.length < 70) {//longest query should be less than 70 characters
					if (msg.mentions.users.size == 1) {
						lolapi.getLink(msg.mentions.users.first().id).then(result => {
							let username = msg.mentions.users.first().username;//suppose the link doesn't exist in the database
							if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
							callback(index, false, username, parameter, number);
						}).catch(console.error);
					}
					else if (parameter.substring(0, 2) == " $") {//shortcut
						lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(2)).then(result => {
							callback(index, false, result[parameter.toLowerCase().substring(2)], parameter, number);

						}).catch(e => {
							if (e) reply(":x: An error has occurred. The shortcut may not exist.");
						});
					}
					else if (parameter.substring(0, 2) == " ^") {//pull from recent command
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
							else callback(index, true, user_id, parameter, number);
						}).catch(e => {
							console.error(e);
							reply(":x: Could not find a recent username queried.");
						});
					}
					else if (parameter[0] == " ") callback(index, false, parameter.substring(1).trim(), parameter, number);//explicit (required trailing space after command trigger)
				}
			}
			else {//username not provided
				lolapi.getLink(msg.author.id).then(result => {
					let username = msg.author.username;//suppose the link doesn't exist in the database
					if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
					callback(index, false, username, parameter, number);
				}).catch(console.error);
			}
		});
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
			UTILS.output("insufficient permissions");
			print_message();
			if (notify) msg.channel.send(":x: Owner permissions required. Ask for help at " + CONFIG.HELP_SERVER_INVITE_LINK + " .").catch(console.error);
		}
		return answer;
	}
	function reply(reply_text, callback, error_callback) {
		print_message();
		lolapi.terminate();
		console.log("reply (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
		msg.channel.send(reply_text, { split: true }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(error_callback)) error_callback(e);
		});
	}

	function reply_to_author(reply_text, callback, error_callback) {
		print_message();
		lolapi.terminate();
		console.log("reply to author (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
		msg.author.send(reply_text, { split: true }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(error_callback)) error_callback(e);
		});
	}

	function reply_embed(reply_embed, callback, error_callback) {
		if (UTILS.exists(msg.guild) && !msg.channel.permissionsFor(client.user).has(["EMBED_LINKS"])) {//doesn't have permission to embed links in server
			lolapi.terminate();
			reply(":x: I cannot respond to your request without the \"embed links\" permission.");
		}
		else {//has permission to embed links, or is a DM/PM
			print_message();
			lolapi.terminate();
			console.log("reply embedded (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
			msg.channel.send("", { embed: reply_embed }).then((nMsg) => {
				if (UTILS.exists(callback)) callback(nMsg);
			}).catch((e) => {
				console.error(e);
				if (UTILS.exists(error_callback)) error_callback(e);
			});
		}
	}

	function reply_embed_to_author(reply_embed, callback, error_callback) {
		print_message();
		lolapi.terminate();
		console.log("reply embedded to author (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
		msg.author.send("", { embed: reply_embed }).then((nMsg) => {
			if (UTILS.exists(callback)) callback(nMsg);
		}).catch((e) => {
			console.error(e);
			if (UTILS.exists(error_callback)) error_callback(e);
		});
	}

	function print_message() {
		const basic = msg.id + "\ncontent: " + msg.content +
			"\nauthor: " + msg.author.tag + " :: " + msg.author.id +
			"\nchannel: " + msg.channel.name + " :: " + msg.channel.id;
		if (UTILS.exists(msg.guild)) UTILS.output("received server message :: " + basic + "\nguild: " + msg.guild.name + " :: " + msg.guild.id);
		else {
			UTILS.output("received PM/DM message :: " + basic);
		}
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
