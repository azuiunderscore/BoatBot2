"use strict";
let embedgenerator = new (require("./embedgenerator.js"))();
let textgenerator = new (require("./textgenerator.js"))();
let child_process = require("child_process");
const UTILS = new (require("../utils/utils.js"))();
let LOLAPI = require("../utils/lolapi.js");
let Profiler = require("../utils/timeprofiler.js");
let ctable = require("console.table");
const crypto = require("crypto");

module.exports = function (CONFIG, client, msg, wsapi, sendToChannel, sendEmbedToChannel, preferences, ACCESS_LEVEL, server_RL, user_RL) {

    if (msg.author.bot || msg.author.id === client.user.id) return; //Ignore all messages from bot accounts

    if (!msg.PM && !msg.channel.permissionsFor(client.user).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) return; // Ignore messages in channels without message send permission

    // Output an error if the ban data hasn't finished loading
    if (!UTILS.exists(CONFIG.BANS) || !UTILS.exists(CONFIG.BANS.USERS) || !UTILS.exists(CONFIG.BANS.SERVERS)) {
        wsapi.getUserBans();
        wsapi.getServerBans();
        return UTILS.output("message " + msg.id + " could not be processed because ban data has not been loaded yet");
    }

    // Ignore messages from banned users
    if (UTILS.exists(CONFIG.BANS.USERS[msg.author.id]) && (CONFIG.BANS.USERS[msg.author.id] == 0 || CONFIG.BANS.USERS[msg.author.id] > msg.createdTimestamp)) return;

    // Check if the server is banned
    if (!msg.PM && UTILS.exists(CONFIG.BANS.SERVERS[msg.guild.id])) {
        if (CONFIG.BANS.SERVERS[msg.guild.id] == 0) {
            reply(":no_entry: This server is banned from using BoatBot. Please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " for assistance.", () => {
                msg.guild.leave().catch(console.error); // Leave the server
            }, () => {
                msg.guild.leave().catch(console.error);// Leave the server
            });
        } else if (CONFIG.BANS.SERVERS[msg.guild.id] > msg.createdTimestamp) ;//temporary ban
        return;
    }

    const CURRENT_PREFIX = preferences.get("prefix");
    const msg_receive_time = new Date().getTime();
    let RL_activated = false; // Prevents RL processor from acting on multiple replies
    let request_profiler = new Profiler("r#" + msg.id)
    let lolapi = new LOLAPI(CONFIG, msg.id, wsapi);
    request_profiler.mark("lolapi instantiated");

    // Impersonate command handler
    if (!msg.PM) {
        let cancel = false;
        //Las <target uid> <full command to run under target uid>
        command(usePrefix(["as "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
            const target_uid = parameter.substring(0, parameter.indexOf(" "));
            //ensure user object exists within the server
            const candidate_member = msg.guild.members.get(target_uid);
            if (!UTILS.exists(candidate_member)) {
                reply("Unable to find UID " + target_uid + " in cache. Try running the command again shortly.");
                client.fetchUser(target_uid).then(t_user => {
                    msg.guild.fetchMember(t_user).then(() => {
                    }).catch(console.error);
                }).catch(console.error);
                cancel = true;
            } else {
                reply("Running command as " + candidate_member.user.tag);
                cancel = true;
                msg.author = candidate_member.user;
                msg.member = candidate_member;
                msg.content = parameter.substring(parameter.indexOf(" ") + 1);
                ACCESS_LEVEL = UTILS.accessLevel(CONFIG, msg);//recalculate access level
                cancel = false;
            }
        });
        if (cancel) return;//cancel processing execution of command (the rest of this file) if impersonate fails to find target uid
    }

    /** @command boatsetprefix
     *  @description Changes the bot's prefix. Not entering a new prefix will remove the prefix entirely.
     *  @noprefixrequired
     *  @permissionlevel 3
     *  @param [new prefix]
     * **/
    command(["boatsetprefix "], true, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index, parameter) => {
        const candidate = parameter.trim().toLowerCase();
        if (candidate.length > 100) return reply(":x: This prefix is too long.");
        preferences.set("prefix", candidate).then(() => reply(":white_check_mark: The prefix was set to " + candidate)).catch(reply);
    });

    command(["boatsetprefix"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
        preferences.set("prefix", "").then(() => reply(":white_check_mark: The prefix to use this bot has been removed. No prefix is needed to use commands.")).catch(reply);
    });

    command(usePrefix(["owner", "owners"]), false, false, (original, index) => {
        reply(textgenerator.owners(CONFIG));
    });

    /** @command banuser
     *  @alias shadowbanuser
     *  @description Bans a user from using the bot, applies across all servers. A `duration` of 0 results in a permaban. The alias `shadowbanuser` results in the user not being notified.
     *  @permissionlevel 5
     *  @param <user id> <duration> <reason>
     * **/
    command(usePrefix(["banuser ", "shadowbanuser "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        //Lbanuser <uid> <duration> <reason>
        const id = parameter.substring(0, parameter.indexOf(" "));
        const reason = parameter.substring(parameter.indexOfInstance(" ", 2) + 1);
        let duration = parameter.substring(parameter.indexOfInstance(" ", 1) + 1, parameter.indexOfInstance(" ", 2));
        duration = duration == "0" ? duration = 0 : UTILS.durationParse(duration);
        if (isNaN(duration)) return reply(":x: The duration is invalid.");
        const end_date = duration == 0 ? 0 : new Date().getTime() + duration;
        if (id.length < 1 || reason.length < 1 || typeof (duration) != "number") return reply(":x: The id, duration, or reason could not be found.");
        if (id == msg.author.id) return reply(":x: You cannot ban yourself.");
        if (id == client.user.id) return reply(":x: You cannot ban me.");
        if (isOwner(id, false)) return reply(":x: The id you are trying to ban has elevated permissions.");
        lolapi.banUser(id, reason, end_date, msg.author.id, msg.author.tag, msg.author.displayAvatarURL, index === 0).then(result => {
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry: User banned, id " + id + " by " + msg.author.tag + " for : " + reason);
            reply(":no_entry: User banned, id " + id + " by " + msg.author.tag + " for : " + reason);
        }).catch(console.error);
    });

    /** @command banserver
     *  @alias shadowbanserver
     *  @description Bans a server from using the bot, also results in the bot leaving the server. A `duration` of 0 results in a permaban. The alias `shadowbanserver` results in the server not being notified.
     *  @permissionlevel 5
     *  @param <server id> <duration> <reason>
     * **/
    command(usePrefix(["banserver ", "shadowbanserver "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        const id = parameter.substring(0, parameter.indexOf(" "));
        const reason = parameter.substring(parameter.indexOfInstance(" ", 2) + 1);
        let duration = parameter.substring(parameter.indexOfInstance(" ", 1) + 1, parameter.indexOfInstance(" ", 2));
        duration = duration == "0" ? duration = 0 : UTILS.durationParse(duration);
        if (isNaN(duration)) return reply(":x: The duration is invalid.");
        const end_date = duration == 0 ? 0 : new Date().getTime() + duration;
        if (id.length < 1 || reason.length < 1 || typeof (duration) != "number") return reply(":x: The id, duration, or reason could not be found.");
        lolapi.banServer(id, reason, end_date, msg.author.id, msg.author.tag, msg.author.displayAvatarURL, index === 0).then(result => {
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry: Server banned, id " + id + " by " + msg.author.tag + " for " + duration + ": " + reason);
            reply(":no_entry: Server banned, id " + id + " by " + msg.author.tag + " for " + duration + ": " + reason);
        }).catch(console.error);
    });

    /** @command warnuser
     *  @description Warns a user, sending them a message informing them to not abuse the bot.
     *  @permissionlevel 5
     *  @param <user id> <reason>
     * **/
    command(usePrefix(["warnuser "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
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

    /** @command warnserver
     *  @description Warns a server, sending them a message informing them to not abuse the bot.
     *  @permissionlevel 5
     *  @param <server id> <reason>
     * **/
    command(usePrefix(["warnserver "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        const id = parameter.substring(0, parameter.indexOf(" "));
        const reason = parameter.substring(parameter.indexOf(" ") + 1);
        if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
        lolapi.warnServer(id, reason, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":warning: Server warned, id " + id + " by " + msg.author.tag + ": " + reason);
            reply(":warning: Server warned, id " + id + " by " + msg.author.tag + ": " + reason);
        }).catch(console.error);
    });

    /** @command noteuser
     *  @description Creates an internal note for the user. The user is not informed of this action.
     *  @permissionlevel 5
     *  @param <user id> <reason>
     * **/
    command(usePrefix(["noteuser "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        const id = parameter.substring(0, parameter.indexOf(" "));
        const reason = parameter.substring(parameter.indexOf(" ") + 1);
        if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
        lolapi.noteUser(id, reason, msg.author.id).then(result => {
            reply(":information_source: User note added, id " + id + " by " + msg.author.tag + ": " + reason);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":information_source: User note added, id " + id + " by " + msg.author.tag + ": " + reason);
        }).catch(console.error);
    });

    /** @command noteserver
     *  @description Creates an internal note for the server. The server is not informed of this action.
     *  @permissionlevel 5
     *  @param <server id> <reason>
     * **/
    command(usePrefix(["noteserver "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        const id = parameter.substring(0, parameter.indexOf(" "));
        const reason = parameter.substring(parameter.indexOf(" ") + 1);
        if (id.length < 1 || reason.length < 1) return reply(":x: The id or the reason could not be found.");
        lolapi.noteServer(id, reason, msg.author.id).then(result => {
            reply(":information_source: Server note added, id " + id + " by " + msg.author.tag + ": " + reason);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":information_source: Server note added, id " + id + " by " + msg.author.tag + ": " + reason);
        }).catch(console.error);
    });

    /** @command userhistory
     *  @description Views user disciplinary records and notes.
     *  @permissionlevel 5
     *  @param <user id>
     * **/
    command(usePrefix(["userhistory "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        lolapi.userHistory(parameter).then(results => {
            replyEmbed(embedgenerator.disciplinaryHistory(CONFIG, parameter, true, results[parameter]));
        }).catch();
    });

    /** @command serverhistory
     *  @description Views server disciplinary records and notes.
     *  @permissionlevel 5
     *  @param <server id>
     * **/
    command(usePrefix(["serverhistory "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        //Lserverhistory <sid>
        lolapi.serverHistory(parameter).then(results => {
            replyEmbed(embedgenerator.disciplinaryHistory(CONFIG, parameter, false, results[parameter]));
        }).catch();
    });

    /** @command unbanserver
     *  @description Unbans a currently banned server.
     *  @permissionlevel 5
     *  @param <server id>
     * **/
    command(usePrefix(["unbanserver "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        lolapi.unbanServer(parameter, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
            reply(":no_entry_sign: Server unbanned, id " + parameter + " by " + msg.author.tag);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry_sign: Server unbanned, id " + parameter + " by " + msg.author.tag);
        }).catch(console.error);
    });

    /** @command unbanuser
     *  @description Unbans a currently banned user.
     *  @permissionlevel 5
     *  @param <user id>
     * **/
    command(usePrefix(["unbanuser "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        lolapi.unbanUser(parameter, msg.author.id, msg.author.tag, msg.author.displayAvatarURL).then(result => {
            reply(":no_entry_sign: User unbanned, id " + parameter + " by " + msg.author.tag);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":no_entry_sign: User unbanned, id " + parameter + " by " + msg.author.tag);
        }).catch(console.error);
    });

    /** @command actionreport
     *  @description Shows disciplinary actions issues by any BoatBot admin.
     *  @permissionlevel 5
     *  @param <user id>
     * **/
    command(usePrefix(["actionreport "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        if (!UTILS.exists(CONFIG.OWNER_DISCORD_IDS[parameter])) return reply(":x: This user is not a current or previously registered admin.");
        lolapi.getActions(parameter).then(results => {
            replyEmbed(embedgenerator.actionReport(CONFIG, parameter, results[parameter]));
        }).catch();
    });

    if (preferences.get("feedback_enabled")) {
        /** @command feedback
         *  @alias complain, praise, suggest
         *  @description Gives feedback to the bot developers and community managers. Use the aliases to give an indication of what type of feedback you're giving.
         *  @permissionlevel 0
         *  @param {feedback}
         * **/
        command(usePrefix(["complain ", "praise ", "suggest "]), true, false, (original, index) => {
            lolapi.userHistory(msg.author.id).then(uH => {
                if (!msg.PM) lolapi.serverHistory(msg.guild.id).then(gH => step2(gH[msg.guild.id])).catch(console.error);
                else step2(null);

                function step2(gH) {
                    sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, index + 1, 1, msg, uH[msg.author.id], gH), true);
                    reply(":white_check_mark: Thank you for your feedback!");
                }
            }).catch(console.error);
        });
        /** @command ask
         *  @alias question
         *  @description Asks a question to the BoatBot team, we aim to reply within a day.
         *  @permissionlevel 0
         *  @param {question}
         * **/
        command(usePrefix(["question ", "ask "]), true, false, (original, index) => {
            lolapi.userHistory(msg.author.id).then(uH => {
                if (!msg.PM) lolapi.serverHistory(msg.guild.id).then(gH => step2(gH[msg.guild.id]));
                else step2(null);

                function step2(gH) {
                    sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 4, 1, msg, uH[msg.author.id], gH));
                    reply(":white_check_mark: Thank you for your question! Someone from our staff will respond by BoatBot PM as soon as possible.");
                }
            });
        });
    }

    /** @command permissionstest
     *  @alias pt
     *  @description Replies with your permissions level.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["permissionstest", "pt"]), false, false, () => {
        reply("You have " + ["normal", "bot commander", "moderator", "server admin", "server owner", "bot owner"][ACCESS_LEVEL] + " permissions.");
    });

    /** @command permissionstest
     *  @alias pt
     *  @description Replies with the mentioned user's permission level.
     *  @permissionlevel 0
     *  @param <user>
     * **/
    command(usePrefix(["permissionstest ", "pt "]), true, false, () => {
        if (msg.mentions.users.size != 1) return reply(":x: A user must be mentioned.");
        reply(msg.mentions.users.first().tag + " has " + ["normal", "bot commander", "moderator", "server admin", "server owner", "bot owner"][UTILS.accessLevel(CONFIG, msg, msg.mentions.users.first().id)] + " permissions.");
    });

    /** @command cs
     *  @description Outputs detailed stats about the software and hardware systems.
     *  @permissionlevel 5
     * **/
    command(usePrefix(["cs"]), false, CONFIG.CONSTANTS.BOTOWNERS, () => {
        lolapi.stats().then(iapi_stats => {
            UTILS.aggregateClientEvals(client, [["this.guilds.size", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"],
                ["this.users.size", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"],
                ["this.guilds.map(g => g.memberCount).reduce((prev, val) => prev + val, 0)", r => r.reduce((prev, val) => prev + val, 0) + " (" + r.join(", ") + ")"]]).then(c_eval => {
                replyEmbed(embedgenerator.debug(CONFIG, client, iapi_stats, c_eval));
            });
        }).catch(console.error);
    });

    /** @command ping
     *  @alias latency
     *  @description Displays the time from command being receieved to the command being completely processed.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["ping", "latency"]), false, false, () => {
        reply("V2 command to response time: ", nMsg => textgenerator.ping_callback(msg, nMsg));
    });

    /** @command iping
     *  @noprefix
     *  @description Displays the ping to the connection to the internal api server.
     *  @permissionlevel 5
     * **/
    command(["iping"], false, false, () => {
        lolapi.ping().then(times => reply(textgenerator.internal_ping(times))).catch(console.error);
    });

    /** @command wping
     *  @noprefix
     *  @description Displays the ping to the websocket connection to the internal api server.
     *  @permissionlevel 5
     * **/
    command(["wping"], false, false, () => {
        wsapi.ping(times => reply(textgenerator.ws_ping(times)));
    });

    /** @command eval
     *  @noprefix
     *  @description Evaluates javascript and outputs the results.
     *  @permissionlevel 5
     *  @param {statement}
     * **/
    command(["eval "], true, CONFIG.CONSTANTS.BOTOWNERS, function (original, index, parameter) {
        try {
            reply("```" + eval(parameter) + "```");
        } catch (e) {
            reply("```" + e + "```");
        }
    });

    /** @command iapi evel
     *  @noprefix
     *  @description Evaluates javascript on the internal API process and outputs the results.
     *  @permissionlevel 5
     *  @param {statement}
     * **/
    command(["iapi eval "], true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        lolapi.IAPIEval(parameter).then(result => reply("```" + result.string + "```")).catch(console.error);
    });

    /** @command notify
     *  @description Sends a message to every server BoatBot is connected to.
     *  @permissionlevel 5
     *  @param {message}
     * **/
    command(usePrefix(["notify "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        wsapi.lnotify(msg.author.username, msg.author.displayAvatarURL, parameter, false);
    });

    /** @command releasenotify
     *  @description Sends a message to all servers BoatBot is connected to. This type of notification is typically used for new release notifications and can be disabled on a server.
     *  @permissionlevel 5
     *  @pararm {message}
     * **/
    command(usePrefix(["releasenotify "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
        wsapi.lnotify(msg.author.username, msg.author.displayAvatarURL, parameter, true);
    });

    command(usePrefix(["testembed"]), false, CONFIG.CONSTANTS.BOTOWNERS, () => {
        replyEmbed(embedgenerator.test("Original behavior"));
        replyEmbed([{r: embedgenerator.test("t=0 only"), t: 0}]);
        replyEmbed([{r: embedgenerator.test("t=0"), t: 0}, {
            r: embedgenerator.test("t=5000"),
            t: 5000
        }, {r: embedgenerator.test("t=10000"), t: 10000}, {r: embedgenerator.test("t=15000"), t: 15000}]);
    });

    command(usePrefix(["testreply"]), false, CONFIG.CONSTANTS.BOTOWNERS, () => {
        reply("Original behavior");
        reply([{r: "t=0 only", t: 0}]);
        reply([{r: "t=0", t: 0}, {r: "t=5000", t: 5000}, {r: "t=10000", t: 10000}, {r: "t=15000", t: 15000}]);
    });

    /** @command migratelinks
     *  @protected
     *  @description Migrates links from v1 to v2 database. Will overwrite.
     *  @permissionlevel 5
     * **/
    command(usePrefix(["migratelinks"]), false, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
        const fs = require("fs");
        const prev_links = JSON.parse(fs.readFileSync("/home/iaace/bbs/data/local/userlinks.json"));
        let tasks = [];
        for (let b in prev_links) tasks.push(function () {
            return lolapi.setLink(b, prev_links[b]);
        });
        UTILS.sequential(tasks).then(results => {
            let errors = 0, successes = 0;
            for (let b in results) results[b] ? ++successes : ++errors;
            reply("There were " + successes + " successes and " + errors + " failures.");
        }).catch(console.error);
    });

    /** @command link
     *  @description Sets a username to use for commands that infer your osu username if your osu username is different than your discord username.
     *  @permissionlevel 0
     *  @param <osu username>
     * **/
    command(usePrefix(["link "]), true, false, (original, index, parameter) => {
        if (msg.mentions.users.size == 0) {
            lolapi.osuGetUser(parameter, 0, false, CONFIG.API_MAXAGE.LINK).then(user => {
                if (!UTILS.exists(user)) return reply(":x: The username appears to be invalid.");
                lolapi.setLink(msg.author.id, user.username).then(result => {
                    result.success ? reply(":white_check_mark: Your discord account is now linked to osu!:" + user.username) : reply(":x: Something went wrong.");
                }).catch(console.error);
            }).catch(console.error);
        } else if (msg.mentions.users.size == 1 && isOwner()) {
            lolapi.osuGetUser(parameter.substring(0, parameter.indexOf(" <")), 0, false, CONFIG.API_MAXAGE.LINK).then(user => {
                if (!UTILS.exists(user)) return reply(":x: The username appears to be invalid. Follow the format: `" + CONFIG.DISCORD_COMMAND_PREFIX + "link <username> <@mention>`");
                lolapi.setLink(msg.mentions.users.first().id, user.username).then(result => {
                    result.success ? reply(":white_check_mark: " + msg.mentions.users.first().tag + "'s discord account is now linked to osu!:" + user.username) : reply(":x: Something went wrong.");
                }).catch(console.error);
            }).catch(console.error);
        }
    });

    /** @command unlink
     *  @alias removelink
     *  @description Use to remove your linked username from your discord account.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["unlink", "removelink"]), false, false, (original, index) => {
        lolapi.setLink(msg.author.id, "").then(result => {
            result.success ? reply(":white_check_mark: Your discord account is no longer associated with any username. We'll try to use your discord username when you use a username-optional osu stats command.") : reply(":x: Something went wrong.");
        }).catch(console.error);
    });

    /** @command unlink
     *  @alias removelink
     *  @description Mentioned user will have their osu username forcibly unlinked from their discord account.
     *  @permissionlevel 5
     *  @param <user>
     * **/
    command(usePrefix(["unlink ", "removelink "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
        if (!UTILS.exists(msg.mentions.users.first())) return reply(":x: No user mention specified.");
        lolapi.setLink(msg.mentions.users.first().id, "").then(result => {
            result.success ? reply(":white_check_mark: " + msg.mentions.users.first().tag + "'s discord account is no longer associated with any username.") : reply(":x: Something went wrong.");
        }).catch(console.error);
    });

    /** @command getlink
     *  @alias gl
     *  @description Returns the current osu username linked to your account.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["gl", "getlink"]), false, false, (original, index) => {
        lolapi.getLink(msg.author.id).then(result => {
            if (UTILS.exists(result.username) && result.username != "") reply(":white_check_mark: You're `" + result.username + "`");
            else reply(":x: No records for user id " + msg.author.id);
        }).catch(console.error);
    });

    /** @command getlink
     *  @alias gl
     *  @description Displays the linked osu username of the mentioned user.
     *  @permissionlevel 5
     *  @param <user>
     * **/
    command(usePrefix(["gl ", "getlink "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index) => {
        if (!UTILS.exists(msg.mentions.users.first())) return reply(":x: No user mention specified.");
        lolapi.getLink(msg.mentions.users.first().id).then(result => {
            if (UTILS.exists(result.username) && result.username != "") reply(":white_check_mark: " + msg.mentions.users.first().tag + " is `" + result.username + "`");
            else reply(":x: No records for user id " + msg.mentions.users.first().id);
        }).catch(console.error);
    });

    /** @command invite
     *  @description Gives you an invite link to add BoatBot to other servers.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["invite"]), false, false, (original, index) => {
        reply("This is the link to add BoatBot to other servers: <" + CONFIG.BOT_ADD_LINK + ">\nAdding it requires the \"Manage Server\" permission.");
    });

    /** @command help
     *  @alias docs documentation
     *  @description Gives you a link to this documentation page.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["help", "docs", "documentation"]), false, false, (original, index) => {
        reply("Please see <https://docs.iaace.gg/> for documentation on how to use BoatBot Lazer, as well as our terms and conditions of service. If you have any questions/issues, feel free to let us know by sending `!ask _your question here_?` wherever BoatBot can be used. We try to answer all questions within 24 hours.");
    });

    /** @command setshortcut
     *  @alias ss createshortcut addshortcut
     *  @description Adds a nickname to your preferences. It must start with $.
     *  @permissionlevel 0
     *  @param <nickname> <osu username>
     * **/
    command(usePrefix(["setshortcut ", "ss ", "createshortcut ", "addshortcut "]), true, false, (original, index, parameter) => {
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

    /** @command removeshortcut
     *  @alias deleteshortcut ds
     *  @description Removes a nickname from your preferences.
     *  @permissionlevel 0
     *  @param <nickname>
     * **/
    command(usePrefix(["removeshortcut ", "deleteshortcut ", "ds "]), true, false, (original, index, parameter) => {
        if (parameter[0] !== "$") return reply(":x: The shortcut must begin with an `$`. Please try again.");
        const from = parameter.substring(1).toLowerCase();
        if (from.length === 0) return reply(":x: The shortcut name was not specified. Please try again.");
        lolapi.removeShortcut(msg.author.id, from).then(result => {
            if (result.success) reply(":white_check_mark: `$" + from + "` removed (or it did not exist already).");
        }).catch(console.error);
    });

    /** @command shortcuts
     *  @alias shortcut
     *  @description Returns a list of all your custom nicknames.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["shortcuts", "shortcut"]), false, false, (original, index) => {
        lolapi.getShortcuts(msg.author.id).then(result => {
            reply(textgenerator.shortcuts(CONFIG, result));
        }).catch(console.error);
    });

    /** @command removeallshortcuts
     *  @description Removes all your shortcuts. Use with care.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["removeallshortcuts"]), false, false, (original, index) => {
        lolapi.removeAllShortcuts(msg.author.id).then(result => {
            reply(":white_check_mark: All shortcuts were removed.")
        }).catch(console.error);
    });

    /** @command d1
     *  @protected
     *  @description Debugs command arguments and username guessing
     *  @permissionlevel 5
     * **/
    commandGuessUsername(usePrefix(["d1"]), CONFIG.CONSTANTS.BOTOWNERS, (index, id, user, parameter) => {
        reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` parameter: `" + parameter + "`");
    });

    /** @command d2
     *  @protected
     *  @description Ask iaace
     *  @permissionlevel 5
     * **/
    commandGuessUsernameNumber(usePrefix(["d2"]), CONFIG.CONSTANTS.BOTOWNERS, (index, id, user, number, guess_method) => {
        reply(":white_check_mark: i: `" + index + "` id: `" + id + "` user: `" + user + "` number: `" + number + "` guess_method: `" + guess_method + "`");
    });

    // I'm splitting this command into multiple documentation entries so its easier for users to understand
    /** @command taiko
     *  @alias sptaiko spt
     *  @description Returns an overview of you or the inputted user's taiko stats.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command ctb
     *  @alias spctb spc
     *  @description Returns an overview of you or the inputted user's ctb stats.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command mania
     *  @alias spmania spm
     *  @description Returns an overview of you or the inputted user's mania stats.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command osu
     *  @alias sp std
     *  @description Returns an overview of you or the inputted user's osu stats.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    commandGuessUsername(usePrefix(["taiko", "sptaiko", "spt", "ctb", "spctb", "spc", "mania", "spmania", "spm", "statsplus", "sp", "osu", "std"]), false, (index, id, user, parameter) => {
        let mode;
        if (index < 3) mode = 1;
        else if (index < 6) mode = 2;
        else if (index < 9) mode = 3;
        else mode = 0;
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
            }).catch(e => {
                reply(":x: We're unable to retrieve this user's top 100 plays.");
                console.error(e);
            });
        }).catch(e => {
            reply(":x: Could not find the user `" + user + "`.");
            console.error(e);
        });
    });

    // Once again making multiple documentation entries

    /** @command taiko-m
     *  @alias sptaiko-m spt-m
     *  @description Returns a mod breakdown of the top 100 taiko scores for you or the inputted user.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command ctb-m
     *  @alias spctb-m spc-m
     *  @description Returns a mod breakdown of the top 100 ctb scores for you or the inputted user.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command mania-m
     *  @alias spmania-m spm-m
     *  @description Returns a mod breakdown of the top 100 mania scores for you or the inputted user.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command osu-m
     *  @alias sp-m std-m
     *  @description Returns a mod breakdown of the top 100 osu scores for you or the inputted user.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    commandGuessUsername(usePrefix(["statsplus-m", "sp-m", "osu-m", "std-m", "taiko-m", "sptaiko-m", "spt-m", "ctb-m", "spctb-m", "spc-m", "mania-m", "spmania-m", "spm-m"]), false, (index, id, user, parameter) => {
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

    /** @command osu signature
     *  @alias https://osu.ppy.sh/u/ http://osu.ppy.sh/u/ https://osu.ppy.sh/users/ http://osu.ppy.sh/users/
     *  @description Returns a simple stats embed on the linked user
     *  @permissionlevel 0
     *  @param <URL path starting with the user_id>
     * **/
    command(["https://osu.ppy.sh/u/", "http://osu.ppy.sh/u/", "https://osu.ppy.sh/users/", "http://osu.ppy.sh/users/"], true, false, (original, index, parameter) => {
        const id = UTILS.arbitraryLengthInt(parameter);
        lolapi.osuMostRecentMode(id, true, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
            lolapi.osuGetUserTyped(id, mrm, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
                replyEmbed(embedgenerator.signature(CONFIG, mrm, user_stats));
            }).catch(console.error);
        }).catch(e => {
            lolapi.osuGetUserTyped(id, 0, true, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
                replyEmbed(embedgenerator.signature(CONFIG, 0, user_stats));
            }).catch(console.error);
        });
    });

    /** @command about
     *  @alias credits acknowledgements contributors contributions
     *  @description Outputs information about contributors and donators.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["about", "credits", "acknowledgements", "contributors", "contributions"]), false, false, (original, index) => reply(CONFIG.ACKNOWLEDGEMENTS));

    /** @command osusignature
     *  @alias osusignature osusign osusig
     *  @description Outputs basic player information.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/
    commandGuessUsername(usePrefix(["osusignature", "osusign", "osusig"]), false, (index, id, user, parameter) => {
        lolapi.osuMostRecentMode(user, id, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER_RECENT).then(mrm => {
            lolapi.osuGetUserTyped(user, mrm, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
                replyEmbed(embedgenerator.signature(CONFIG, mrm, user_stats));
            }).catch(console.error);
        }).catch(e => {
            lolapi.osuGetUserTyped(user, 0, id, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
                replyEmbed(embedgenerator.signature(CONFIG, 0, user_stats));
            }).catch(console.error);
        });
    });

    /** @command roll
     *  @description Generates a number between 0 and 100 if a custom upper limit is not given.
     *  @permissionlevel 0
     *  @param [upper limit]
     * **/
    command(usePrefix(["roll"]), false, false, (original, index) => {
        reply(textgenerator.roll(100, msg.author));
    });

    command(usePrefix(["roll "]), true, false, (original, index, parameter) => {
        reply(textgenerator.roll(parameter, msg.author));
    });

    /** @command coinflip
     *  @description Flips a coin.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["coinflip", "flipcoin", "coin"]), false, false, (original, index) => {
        reply(textgenerator.coin());
    });

    /** @command stats
     *  @alias stat
     *  @description Outputs stats of a user in plaintext.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/
    command(usePrefix(["stats ", "stat "]), true, false, (original, index, parameter) => {
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

    /** @command where
     *  @description Tells you where the specified user's account is registered to.
     *  @permissionlevel 0
     *  @param <osu username>
     * **/
    command(usePrefix(["where "]), true, false, (original, index, parameter) => {
        lolapi.osuGetUser(parameter, 0, false, CONFIG.API_MAXAGE.SIGNATURE_AUTO.GET_USER).then(user_stats => {
            reply(textgenerator.where(user_stats));
        }).catch(console.error);
    });

    /** @command oppai
     *  @description Outputs information about the beatmap contained in the most recent scorecard.
     *  @permissionlevel 0
     * **/
    command(usePrefix(["oppai"]), true, false, (original, index, parameter) => {
        parameter = parameter.trim();
        msg.channel.fetchMessages({limit: 50}).then(msgs => {
            msgs = msgs.array();
            let id;
            for (let i = 0; i < msgs.length; ++i) {
                if (msgs[i].author.id === client.user.id && msgs[i].embeds.length === 1 && UTILS.exists(msgs[i].embeds[0].url)) {
                    const url = msgs[i].embeds[0].url;
                    if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/beatmapsets/") !== -1) {
                        id = UTILS.arbitraryLengthInt(url.substring(url.indexOfInstance("/", 5) + 1));
                        break;
                    } else if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/b/") !== -1) {
                        id = UTILS.arbitraryLengthInt(url.substring(url.indexOfInstance("/", 4) + 1));
                        break;
                    }
                }
            }
            if (UTILS.exists(id)) {
                lolapi.osuBeatmap(id, "b", null, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(beatmapset => {
                    lolapi.osuBeatmapFile(beatmapset[0].beatmap_id, beatmapset[0].last_update.getTime(), CONFIG.API_MAXAGE.BEATMAP_AUTO.OSU_FILE).then(osu_file => {
                        textgenerator.oppai(CONFIG.BEATMAP_CACHE_LOCATION + beatmapset[0].beatmap_id + ".osu", parameter).then(a => reply("```" + a + "```")).catch(a => reply("```" + a + "```"));
                    }).catch(console.error);
                }).catch(console.error);
            } else reply(":x: Could not find a recent scorecard or beatmap.");
        }).catch(e => {
            console.error(e);
            reply(":x: I need the \"read message history\" permission to process this request.");
        });
    });

    /** @command alltop
     *  @protected
     *  @description Prints out the top 30 scores of you or the specified user.
     *  @permissionlevel 5
     *  @param [osu username]
     * **/
    commandGuessUsername(usePrefix(["alltop"]), CONFIG.CONSTANTS.BOTOWNERS, (index, id, user, parameter) => {
        lolapi.osuGetUserTyped(user, 0, id, CONFIG.API_MAXAGE.ALL_TOP.GET_USER).then(user_stats => {
            lolapi.osuGetUserBest(user_stats.user_id, 0, 30, true, CONFIG.API_MAXAGE.ALL_TOP.GET_USER_BEST).then(user_best => {
                user_best.map(s => {
                    s.pp_valid = true;
                    return s;
                });
                let jobs = [];
                for (let i = 0; i < user_best.length; ++i) {
                    jobs.push(lolapi.osuBeatmap(user_best[i].beatmap_id, "b", 0, CONFIG.API_MAXAGE.ALL_TOP.GET_BEATMAP));
                }
                Promise.all(jobs).then(beatmaps => {
                    beatmaps = beatmaps.map(bs => bs[0]);
                    replyEmbed(embedgenerator.slsd(CONFIG, user_stats, beatmaps, user_best, 30));
                }).catch(console.error);
            }).catch(console.error);
        }).catch(console.error);
    });

    // You know the drill...

    /** @command recentstandard
     *  @alias r rstandard rstd
     *  @description Displays the most recent osu play of yours or another users. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command recenttaiko
     *  @alias rstaiko rtaiko rtaiko
     *  @description Displays the most recent taiko play of yours or another users. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command recentmania
     *  @alias rsmania rmania rm
     *  @description Displays the most recent mania play of yours or another users. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command recentctb
     *  @alias rctb rsctb rc
     *  @description Displays the most recent ctb play of yours or another users. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/
    commandGuessUsername(usePrefix(["recent", "r"]), false, (index, id, user, parameter) => {//this doesn't support play #s
        request_profiler.begin("mode_detect");
        lolapi.osuMostRecentMode(user, id, false, CONFIG.API_MAXAGE.RECENT.GET_USER_RECENT).then(mode => {
            request_profiler.end("mode_detect");
            request_profiler.begin("user_recent");
            lolapi.osuGetUserRecent(user, mode, undefined, id, CONFIG.API_MAXAGE.RECENT.GET_USER_RECENT).then(recent_plays => {
                request_profiler.end("user_recent");
                request_profiler.begin("beatmap");
                lolapi.osuBeatmap(recent_plays[0].beatmap_id, "b", mode, CONFIG.API_MAXAGE.RECENT.GET_BEATMAP).then(beatmap => {
                    beatmap = beatmap[0];
                    beatmap.mode = mode;//force assigning mode (autoconvert)
                    request_profiler.end("beatmap");
                    request_profiler.begin("dynamic");
                    let jobs = [];
                    let jobtype = [];
                    jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.RECENT.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                    jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                    //UTILS.inspect("beatmap.approved", beatmap.approved);
                    if (recent_plays[0].rank !== "F" && (beatmap.approved === 1 || beatmap.approved === 2)) {//ranked or approved (possible top pp change)
                        jobs.push(lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.RECENT.GET_USER_BEST));//get user best
                        jobtype.push(CONFIG.CONSTANTS.USER_BEST);
                    }
                    if (beatmap.approved > 0) {//leaderboarded score (check beatmap leaderboards)
                        jobs.push(lolapi.osuScore(mode, recent_plays[0].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE));
                        jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                        jobs.push(lolapi.osuScoreUser(user, id, mode, recent_plays[0].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE_USER));
                        jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
                    }
                    jobs.push(lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.RECENT.GET_USER));
                    jobtype.push(CONFIG.CONSTANTS.USER);
                    Promise.all(jobs).then(jra => {//job result array
                        request_profiler.end("dynamic");
                        UTILS.debug("\n" + ctable.getTable(request_profiler.endAllCtable()));
                        let user_best = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER_BEST)];
                        let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        let user_stats = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER)];
                        embedgenerator.recent(CONFIG, mode, 0, recent_plays, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                            let s;//try count string
                            if (preferences.get("replaycount")) s = `Try #${UTILS.tryCount(recent_plays, 0)}`;
                            const p_scm = preferences.get("scorecardmode");
                            if (p_scm === CONFIG.CONSTANTS.SCM_REDUCED) {
                                replyEmbed([{r: embeds.full, t: 0, s},
                                    {r: embeds.compact, t: 60000, s}]);
                            } else if (p_scm === CONFIG.CONSTANTS.SCM_FULL) replyEmbed([{r: embeds.full, t: 0, s}]);
                            else if (p_scm === CONFIG.CONSTANTS.SCM_COMPACT) replyEmbed([{r: embeds.compact, t: 0, s}]);
                            else {
                                replyEmbed([{r: embeds.full, t: 0, s},
                                    {r: embeds.compact, t: 60000, s}]);
                                throw new Error("SCM not recognized: " + p_scm);
                            }
                        }).catch(e => {
                            console.error(e);
                            reply(":x: Failed generating an embed for this score.");
                        });
                    }).catch(e => {
                        console.error(e);
                        reply(":x: We're unable to retrieve score/leaderboard information for this user's most recent play.");
                    });
                }).catch(e => {
                    console.error(e);
                    reply(":x: We're unable to retrieve the beatmap data for this user's most recent play.");
                });
            }).catch(e => {
                console.error(e);
                reply(":x: We're unable to retrieve this user's most recent plays.");
            });
        }).catch(e => {
            console.error(e);
            reply(":x: This user has no recent plays.");
        });
    });

    // TODO: This one is weird
    command(["http://osu.ppy.sh/mp/", "https://osu.ppy.sh/mp/", "https://osu.ppy.sh/community/matches/", "http://osu.ppy.sh/community/matches/"], true, false, (original, index, parameter) => {
        const mpID = parameter;
        request_profiler.begin("get_match_info");
        lolapi.osuMatch(mpID, CONFIG.API_MAXAGE.MP.OSU_MATCH).then(robj => {
            request_profiler.end("get_match_info");
            request_profiler.begin("get_beatmap_info");
            lolapi.osuBeatmap(robj.games[robj.games.length - 1].beatmap_id, "b", robj.games[robj.games.length - 1].play_mode, CONFIG.API_MAXAGE.MP.GET_BEATMAP).then(beatmap_object => {
                request_profiler.end("get_beatmap_info");
                request_profiler.begin("get_user_info");
                let promise_array = [];
                for (let i in robj.games[robj.games.length - 1].scores) {
                    promise_array.push(lolapi.osuGetUser(robj.games[robj.games.length - 1].scores[i].user_id, robj.games[robj.games.length - 1].play_mode, true, CONFIG.API_MAXAGE.MP.GET_USER));
                }
                Promise.all(promise_array).then(answer_array => {
                    request_profiler.end("get_user_info");
                    let answer_object = {};
                    for (let i in answer_array) {
                        answer_object[answer_array[i].user_id] = answer_array[i];
                    }
                    request_profiler.begin("generate_embed");
                    const ans = embedgenerator.matchRequest(robj, answer_object, beatmap_object);
                    request_profiler.end("generate_embed");
                    replyEmbed(ans);
                }).catch(console.error);
            }).catch(console.error);
        }).catch(console.error);
    });

    commandGuessUsernameNumber(usePrefix(["recentstandard", "recentstd", "rstandard", "rstd", "rs", "recenttaiko", "rtaiko", "rt", "recentctb", "rctb", "rc", "recentmania", "rmania", "rm"]), false, (index, id, user, number, guess_method) => {
        request_profiler.begin("mode_detect");
        let mode;
        if (index < 6) mode = 0;
        else if (index < 9) mode = 1;
        else if (index < 12) mode = 2;
        else mode = 3;
        UTILS.output("mode is " + mode);
        if (number > 50 || number < 1) return reply(":x: Number out of range 1-50.");
        --number;//0-index
        lolapi.osuGetUserRecent(user, mode, undefined, id, CONFIG.API_MAXAGE.RECENT.GET_USER_RECENT).then(recent_plays => {
            if (recent_plays.length === 0) return reply(`:x: This user hasn't ${["clicked any circles", "played any taiko", "caught any fruits", "smashed any keys"][mode]} in the last 24 hours.`);
            else if (!UTILS.exists(recent_plays[number])) return reply(":x: We only have the most recent data up to score #" + recent_plays.length + ".");
            lolapi.osuBeatmap(recent_plays[number].beatmap_id, "b", mode, CONFIG.API_MAXAGE.RECENT.GET_BEATMAP).then(beatmap => {
                beatmap = beatmap[0];
                beatmap.mode = mode;//force assigning mode (autoconvert)
                let jobs = [];
                let jobtype = [];
                jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.RECENT.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                if (beatmap.approved === 1 || beatmap.approved === 2) {//ranked or approved (possible top pp change)
                    jobs.push(lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.RECENT.GET_USER_BEST));//get user best
                    jobtype.push(CONFIG.CONSTANTS.USER_BEST);
                }
                if (beatmap.approved > 0) {//leaderboarded score (check beatmap leaderboards)
                    jobs.push(lolapi.osuScore(mode, recent_plays[number].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE));
                    jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                    jobs.push(lolapi.osuScoreUser(user, id, mode, recent_plays[number].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE_USER));
                    jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
                }
                jobs.push(lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.RECENT.GET_USER));
                jobtype.push(CONFIG.CONSTANTS.USER);
                Promise.all(jobs).then(jra => {//job result array
                    let user_best = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER_BEST)];
                    let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                        v.beatmap_id = beatmap.beatmap_id;
                        return v;
                    });
                    let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => {
                        v.beatmap_id = beatmap.beatmap_id;
                        return v;
                    });
                    let user_stats = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER)];
                    embedgenerator.recent(CONFIG, mode, number, recent_plays, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                        let s;//try count string
                        if (preferences.get("replaycount")) s = `Try #${UTILS.tryCount(recent_plays, number)}`;
                        const p_scm = preferences.get("scorecardmode");
                        if (p_scm === CONFIG.CONSTANTS.SCM_REDUCED) {
                            replyEmbed([{r: embeds.full, t: 0, s},
                                {r: embeds.compact, t: 60000, s}]);
                        } else if (p_scm === CONFIG.CONSTANTS.SCM_FULL) replyEmbed([{r: embeds.full, t: 0, s}]);
                        else if (p_scm === CONFIG.CONSTANTS.SCM_COMPACT) replyEmbed([{r: embeds.compact, t: 0, s}]);
                        else {
                            replyEmbed([{r: embeds.full, t: 0, s},
                                {r: embeds.compact, t: 60000, s}]);
                            throw new Error("SCM not recognized: " + p_scm);
                        }
                    }).catch(e => {
                        console.error(e);
                        reply(":x: Failed generating an embed for this score.");
                    });
                }).catch(e => {
                    console.error(e);
                    reply(":x: We're unable to retrieve score/leaderboard information for this user's most recent play.");
                });
            }).catch(e => {
                console.error(e);
                reply(":x: We're unable to retrieve the beatmap data for this user's most recent play.");
            });
        }).catch(e => {
            console.error(e);
            reply(":x: Failed to retrieve this user's most recent plays.");
        });
    });

    // Who doesn't love documentation?

    /** @command rsstandardpass
     *  @alias recentpassstandard
     *  @description Displays the most recent osu play of yours or another users which is a pass. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rstaikopass
     *  @alias recentpasstaiko
     *  @description Displays the most recent taiko play of yours or another users which is a pass. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rsctbpass
     *  @alias recentpassctb
     *  @description Displays the most recent ctb play of yours or another users which is a pass. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rsmaniapass
     *  @alias recentpassmania
     *  @description Displays the most recent mania play of yours or another users which is a pass. Additionally, if a number is appended to the command, it will return the nth recent play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    commandGuessUsernameNumber(usePrefix(["recentpassstandard", "recentstandardpass", "recentpassstd", "recentstdpass", "rpstandard", "rstandardp", "rpstd", "rstdp", "rps", "rsp", "recenttaikopass", "recentpasstaiko", "rptaiko", "rtaikop", "rpt", "rtp", "recentctbpass", "recentpassctb", "rpctb", "rctbp", "rpc", "rcp", "recentmaniapass", "recentpassmania", "rpmania", "rmaniap", "rmp", "rpm"]), false, (index, id, user, number, guess_method) => {
        request_profiler.begin("mode_detect");
        let mode;
        if (index < 10) mode = 0;
        else if (index < 16) mode = 1;
        else if (index < 22) mode = 2;
        else mode = 3;
        UTILS.output("mode is " + mode);
        if (number > 50 || number < 1) return reply(":x: Number out of range 1-50.");
        --number;//0-index
        lolapi.osuGetUserRecent(user, mode, undefined, id, CONFIG.API_MAXAGE.RECENT.GET_USER_RECENT).then(recent_plays => {
            UTILS.removeAllOccurances(recent_plays, a => a.rank === "F");//remove all fails
            if (recent_plays.length === 0) return reply(`:x: This user hasn't ${["clicked any circles", "played any taiko", "caught any fruits", "smashed any keys"][mode]} in the last 24 hours.`);
            else if (!UTILS.exists(recent_plays[number])) return reply(":x: We only have the most recent pass up to score #" + recent_plays.length + ".");
            lolapi.osuBeatmap(recent_plays[number].beatmap_id, "b", mode, CONFIG.API_MAXAGE.RECENT.GET_BEATMAP).then(beatmap => {
                beatmap = beatmap[0];
                beatmap.mode = mode;//force assigning mode (autoconvert)
                let jobs = [];
                let jobtype = [];
                jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.RECENT.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                if (beatmap.approved === 1 || beatmap.approved === 2) {//ranked or approved (possible top pp change)
                    jobs.push(lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.RECENT.GET_USER_BEST));//get user best
                    jobtype.push(CONFIG.CONSTANTS.USER_BEST);
                }
                if (beatmap.approved > 0) {//leaderboarded score (check beatmap leaderboards)
                    jobs.push(lolapi.osuScore(mode, recent_plays[number].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE));
                    jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                    jobs.push(lolapi.osuScoreUser(user, id, mode, recent_plays[number].beatmap_id, CONFIG.API_MAXAGE.RECENT.GET_SCORE_USER));
                    jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
                }
                jobs.push(lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.RECENT.GET_USER));
                jobtype.push(CONFIG.CONSTANTS.USER);
                Promise.all(jobs).then(jra => {//job result array
                    let user_best = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER_BEST)];
                    let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                        v.beatmap_id = beatmap.beatmap_id;
                        return v;
                    });
                    let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => {
                        v.beatmap_id = beatmap.beatmap_id;
                        return v;
                    });
                    let user_stats = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER)];
                    embedgenerator.recent(CONFIG, mode, number, recent_plays, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                        let s;//try count string
                        //if (preferences.get("replaycount")) s = `Try #${UTILS.tryCount(recent_plays, number)}`;
                        const p_scm = preferences.get("scorecardmode");
                        if (p_scm === CONFIG.CONSTANTS.SCM_REDUCED) {
                            replyEmbed([{r: embeds.full, t: 0, s},
                                {r: embeds.compact, t: 60000, s}]);
                        } else if (p_scm === CONFIG.CONSTANTS.SCM_FULL) replyEmbed([{r: embeds.full, t: 0, s}]);
                        else if (p_scm === CONFIG.CONSTANTS.SCM_COMPACT) replyEmbed([{r: embeds.compact, t: 0, s}]);
                        else {
                            replyEmbed([{r: embeds.full, t: 0, s},
                                {r: embeds.compact, t: 60000, s}]);
                            throw new Error("SCM not recognized: " + p_scm);
                        }
                    }).catch(e => {
                        console.error(e);
                        reply(":x: Failed generating an embed for this score.");
                    });
                }).catch(e => {
                    console.error(e);
                    reply(":x: We're unable to retrieve score/leaderboard information for this user's most recent pass.");
                });
            }).catch(e => {
                console.error(e);
                reply(":x: We're unable to retrieve the beatmap data for this user's most recent pass.");
            });
        }).catch(e => {
            console.error(e);
            reply(":x: Failed to retrieve this user's most recent passes.");
        });
    });

    // I'm beginning to hate documenting all these commands which are basically the same command but with a different name

    /** @command best
     *  @alias top
     *  @description Displays the top osu play of yours or another users. Additionally, if a number is appended to the command, it will return the nth top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command besttaiko
     *  @alias toptaiko
     *  @description Displays the top taiko play of yours or another users. Additionally, if a number is appended to the command, it will return the nth top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command bestctb
     *  @alias topctb
     *  @description Displays the top ctb play of yours or another users. Additionally, if a number is appended to the command, it will return the nth top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command bestmania
     *  @alias topmania
     *  @description Displays the top mania play of yours or another users. Additionally, if a number is appended to the command, it will return the nth top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    commandGuessUsernameNumber(usePrefix(["besttaiko", "toptaiko", "btaiko", "ttaiko", "bt", "tt", "bestctb", "topctb", "bctb", "tctb", "bc", "tc", "bestmania", "topmania", "bmania", "tmania", "bm", "tm", "beststandard", "beststd", "best", "top"]), false, (index, id, user, number, guess_method) => {
        let mode;
        if (index < 6) mode = 1;
        else if (index < 12) mode = 2;
        else if (index < 18) mode = 3;
        else mode = 0;
        UTILS.output("mode is " + mode);
        if (number > 100 || number < 1) return reply(":x: Number out of range 1-100.");
        --number;//0-index
        lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.TOP.GET_USER).then(user_stats => {
            lolapi.osuGetUserBest(user, mode, undefined, id, CONFIG.API_MAXAGE.TOP.GET_USER_BEST).then(user_best => {
                if (!UTILS.exists(user_best[number])) return reply(":x: We only have the most recent pass up to score #" + user_best.length + ".");
                lolapi.osuBeatmap(user_best[number].beatmap_id, "b", mode, CONFIG.API_MAXAGE.TOP.GET_BEATMAP).then(beatmap => {
                    beatmap = beatmap[0];
                    beatmap.mode = mode;//force assigning mode (autoconvert)
                    let jobs = [];
                    let jobtype = [];
                    jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.TOP.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                    jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                    jobs.push(lolapi.osuScore(mode, user_best[number].beatmap_id, CONFIG.API_MAXAGE.TOP.GET_SCORE));
                    jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                    jobs.push(lolapi.osuScoreUser(user, id, mode, user_best[number].beatmap_id, CONFIG.API_MAXAGE.TOP.GET_SCORE_USER));
                    jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
                    Promise.all(jobs).then(jra => {//job result array
                        UTILS.debug("\n" + ctable.getTable(request_profiler.endAllCtable()));
                        let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        embedgenerator.recent(CONFIG, mode, number, user_best, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                            const p_scm = preferences.get("scorecardmode");
                            if (p_scm === CONFIG.CONSTANTS.SCM_REDUCED) {
                                replyEmbed([{r: embeds.full, t: 0},
                                    {r: embeds.compact, t: 60000}]);
                            } else if (p_scm === CONFIG.CONSTANTS.SCM_FULL) replyEmbed([{r: embeds.full, t: 0}]);
                            else if (p_scm === CONFIG.CONSTANTS.SCM_COMPACT) replyEmbed([{r: embeds.compact, t: 0}]);
                            else {
                                replyEmbed([{r: embeds.full, t: 0},
                                    {r: embeds.compact, t: 60000}]);
                                throw new Error("SCM not recognized: " + p_scm);
                            }
                        }).catch(e => {
                            console.error(e);
                            reply(":x: Failed generating an embed for this score.");
                        });
                    }).catch(e => {
                        console.error(e);
                        reply(":x: We're unable to retrieve score/leaderboard information for this user's play.");
                    });
                }).catch(e => {
                    console.error(e);
                    reply(":x: We're unable to retrieve the beatmap data for this play.");
                });
            }).catch(e => {
                console.error(e);
                reply(":x: Failed to retrieve this user's top plays.");
            });
        }).catch(e => {
            console.error(e);
            reply(":x: The user `" + user + "` doesn't exist.");
        });
    });

    // Oh boy

    /** @command rbest
     *  @alias rtop
     *  @description Displays the most recent top osu play of yours or another users. Additionally, if a number is appended to the command, it will return the nth most recent top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rbesttaiko
     *  @alias rtoptaiko
     *  @description Displays the most recent top taiko play of yours or another users. Additionally, if a number is appended to the command, it will return the nth most recent top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rbestctb
     *  @alias rtopctb
     *  @description Displays the most recent top ctb play of yours or another users. Additionally, if a number is appended to the command, it will return the nth most recent top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    /** @command rbestmania
     *  @alias rtopmania
     *  @description Displays the most recent top mania play of yours or another users. Additionally, if a number is appended to the command, it will return the nth most recent top play.
     *  @permissionlevel 0
     *  @param [osu username]
     * **/

    commandGuessUsernameNumber(usePrefix(["recentbesttaiko", "rbtaiko", "rbt", "recentbestctb", "rbctb", "rbc", "recentbestmania", "rbmania", "rbm", "recentbeststandard", "recentbeststd", "recentbest", "rbstd", "rbs", "rb"]), false, (index, id, user, number, guess_method) => {
        let mode;
        if (index < 3) mode = 1;
        else if (index < 6) mode = 2;
        else if (index < 9) mode = 3;
        else mode = 0;
        UTILS.output("mode is " + mode);
        if (number > 100 || number < 1) return reply(":x: Number out of range 1-100.");
        --number;//0-index
        lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.TOP.GET_USER).then(user_stats => {
            lolapi.osuGetUserBest(user, mode, undefined, id, CONFIG.API_MAXAGE.TOP.GET_USER_BEST).then(user_best => {
                if (!UTILS.exists(user_best[number])) return reply(":x: We only have the most recent pass up to score #" + user_best.length + ".");
                const user_best_ds = user_best.map(v => v).sort((a, b) => b.date.getTime() - a.date.getTime());//user best date sorted
                lolapi.osuBeatmap(user_best_ds[number].beatmap_id, "b", mode, CONFIG.API_MAXAGE.TOP.GET_BEATMAP).then(beatmap => {
                    beatmap = beatmap[0];
                    beatmap.mode = mode;//force assigning mode (autoconvert)
                    let jobs = [];
                    let jobtype = [];
                    jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.TOP.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                    jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                    jobs.push(lolapi.osuScore(mode, user_best_ds[number].beatmap_id, CONFIG.API_MAXAGE.TOP.GET_SCORE));
                    jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                    jobs.push(lolapi.osuScoreUser(user, id, mode, user_best_ds[number].beatmap_id, CONFIG.API_MAXAGE.TOP.GET_SCORE_USER));
                    jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
                    Promise.all(jobs).then(jra => {//job result array
                        UTILS.debug("\n" + ctable.getTable(request_profiler.endAllCtable()));
                        let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => {
                            v.beatmap_id = beatmap.beatmap_id;
                            return v;
                        });
                        embedgenerator.recent(CONFIG, mode, number, user_best_ds, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                            const p_scm = preferences.get("scorecardmode");
                            if (p_scm === CONFIG.CONSTANTS.SCM_REDUCED) {
                                replyEmbed([{r: embeds.full, t: 0},
                                    {r: embeds.compact, t: 60000}]);
                            } else if (p_scm === CONFIG.CONSTANTS.SCM_FULL) replyEmbed([{r: embeds.full, t: 0}]);
                            else if (p_scm === CONFIG.CONSTANTS.SCM_COMPACT) replyEmbed([{r: embeds.compact, t: 0}]);
                            else {
                                replyEmbed([{r: embeds.full, t: 0},
                                    {r: embeds.compact, t: 60000}]);
                                throw new Error("SCM not recognized: " + p_scm);
                            }
                        }).catch(e => {
                            console.error(e);
                            reply(":x: Failed generating an embed for this score.");
                        });
                    }).catch(e => {
                        console.error(e);
                        reply(":x: We're unable to retrieve score/leaderboard information for this user's play.");
                    });
                }).catch(e => {
                    console.error(e);
                    reply(":x: We're unable to retrieve the beatmap data for this play.");
                });
            }).catch(e => {
                console.error(e);
                reply(":x: Failed to retrieve this user's top plays.");
            });
        }).catch(e => {
            console.error(e);
            reply(":x: The user `" + user + "` doesn't exist.");
        });
    });

    // WHY IS THERE MORE

    /** @command whatif
     *  @description Calculates the net pp change if a new osu score with the specified pp value made it to the user's top 100. Omit the + if you want to replace a beatmap.
     *  @permissionlevel 0
     *  @param [osu username] +<new pp value>
     * **/

    /** @command whatiftaiko
     *  @description Calculates the net pp change if a new taiko score with the specified pp value made it to the user's top 100. Omit the + if you want to replace a beatmap.
     *  @permissionlevel 0
     *  @param [osu username] +<new pp value>
     * **/

    /** @command whatifctb
     *  @description Calculates the net pp change if a new ctb score with the specified pp value made it to the user's top 100. Omit the + if you want to replace a beatmap.
     *  @permissionlevel 0
     *  @param [osu username] +<new pp value>
     * **/

    /** @command whatifmania
     *  @description Calculates the net pp change if a new mania score with the specified pp value made it to the user's top 100. Omit the + if you want to replace a beatmap.
     *  @permissionlevel 0
     *  @param [osu username] +<new pp value>
     * **/

    commandGuessUsername(usePrefix(["whatiftaiko", "whatifctb", "whatifmania", "whatif"]), false, (index, id, username, parameter, ending_parameter) => {
        UTILS.debug("username: " + username);
        UTILS.debug("ending_parameter: " + ending_parameter);
        let mode;
        if (index === 0) mode = 1;
        else if (index === 1) mode = 2;
        else if (index === 2) mode = 3;
        else if (index === 3) mode = 0;
        else return reply(":x: Invalid mode");
        const new_pp = parseFloat(ending_parameter);
        const new_score = parameter.indexOf("+") !== -1;
        if (isNaN(new_pp) || new_pp < 0) return reply(":x: The pp value of the new score must be a positive number.");
        lolapi.osuGetUser(username, mode, id, CONFIG.API_MAXAGE.WHAT_IF.GET_USER).then(user => {
            lolapi.osuGetUserBest(user.user_id, mode, 100, true, CONFIG.API_MAXAGE.WHAT_IF.GET_USER_BEST).then(top => {
                if (new_score) {
                    replyEmbed(embedgenerator.whatif(CONFIG, user, mode, top, new_score, new_pp, null));
                } else {
                    let id, type, beatmap;
                    msg.channel.fetchMessages({limit: 50}).then(msgs => {
                        msgs = msgs.array();
                        for (let i = 0; i < msgs.length; ++i) {
                            if (msgs[i].author.id === client.user.id && msgs[i].embeds.length === 1 && UTILS.exists(msgs[i].embeds[0].url)) {
                                if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/beatmapsets/") !== -1) return newLink(msgs[i].embeds[0].url);
                                else if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/b/") !== -1) return oldLink(msgs[i].embeds[0].url.substring(21));
                            }
                        }
                        reply(":x: Could not find a recent scorecard or beatmap.");
                    }).catch(e => {
                        console.error(e);
                        reply(":x: I need the \"read message history\" permission to process this request.");
                    });

                    function newLink(url) {// handles https://osu.ppy.sh/beatmapsets/ type links (include URL and mod string)
                        let parameter = url.substring(url.indexOfInstance("/", 4) + 1);
                        if (url.indexOf(" ") != -1) url = url.substring(0, url.indexOf(" "));//more comes after the url
                        id = UTILS.arbitraryLengthInt(parameter);
                        type = "s";
                        //mode = null;
                        UTILS.debug("url is: " + url);
                        if (url.indexOfInstance("/", 5) != -1 && !isNaN(parseInt(url[url.indexOfInstance("/", 5) + 1]))) {//if the link is beatmap specific
                            UTILS.debug("new url: s/b");
                            lolapi.osuBeatmap(UTILS.arbitraryLengthInt(url.substring(url.indexOfInstance("/", 5) + 1)), "b", mode, CONFIG.API_MAXAGE.WHAT_IF.GET_BEATMAP).then(new_beatmap => {//retrieve the entire set
                                beatmap = new_beatmap[0];
                                step2();
                            }).catch(console.error);
                        } else step2();
                    }

                    function oldLink(parameter) {
                        id = UTILS.arbitraryLengthInt(parameter);
                        type = "b";
                        //mode = parameter.indexOf("&m=") != -1 ? parseInt(parameter[parameter.indexOf("&m=") + 3]) : null;
                        lolapi.osuBeatmap(id, type, mode, CONFIG.API_MAXAGE.WHAT_IF.GET_BEATMAP).then(new_beatmap => {
                            beatmap = new_beatmap[0];
                            id = new_beatmap[0].beatmapset_id;
                            type = "s";
                            step2();
                        }).catch(console.error);
                    }

                    function step2() {
                        replyEmbed(embedgenerator.whatif(CONFIG, user, mode, top, new_score, new_pp, beatmap));
                    }
                }
            }).catch(console.error);
        }).catch(e => {
            reply(":x: The user `" + username + "` doesn't seem to exist.");
        });
    }, {trigger: "", accepts_opts: CONFIG.CONSTANTS.CGU_OPTS.MANDATORY});

    if (preferences.get("compare_mode") > 0) {
        commandGuessUsername(usePrefix(["scorecompare", "scompare", "compare", "scorevs", "c"]), false, (index, id, user, parameter, ending_parameter) => {
            //UTILS.inspect("username", user);
            //UTILS.inspect("ending_parameter", ending_parameter);
            let beatmap_id, type, beatmap, mode;
            msg.channel.fetchMessages({limit: 50}).then(msgs => {
                msgs = msgs.array();
                for (let i = 0; i < msgs.length; ++i) {
                    if (msgs[i].author.id === client.user.id && msgs[i].embeds.length === 1 && UTILS.exists(msgs[i].embeds[0].url)) {
                        if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/beatmapsets/") !== -1) return newLink(msgs[i].embeds[0].url);
                        else if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/b/") !== -1) return oldLink(msgs[i].embeds[0].url.substring(21));
                    }
                }
                reply(":x: Could not find a recent scorecard or beatmap.");
            }).catch(e => {
                console.error(e);
                reply(":x: I need the \"read message history\" permission to process this request.");
            });

            function newLink(url) {// handles https://osu.ppy.sh/beatmapsets/ type links (include URL and mod string)
                let parameter = url.substring(url.indexOfInstance("/", 4) + 1);
                if (url.indexOf(" ") != -1) url = url.substring(0, url.indexOf(" "));//more comes after the url
                beatmap_id = UTILS.arbitraryLengthInt(parameter);
                type = "s";
                if (url.indexOf("#osu") != -1) mode = 0;
                else if (url.indexOf("#taiko") != -1) mode = 1;
                else if (url.indexOf("#fruits") != -1) mode = 2;
                else if (url.indexOf("#mania") != -1) mode = 3;
                else mode = 0;
                UTILS.debug("url is: " + url);
                if (url.indexOfInstance("/", 5) != -1 && !isNaN(parseInt(url[url.indexOfInstance("/", 5) + 1]))) {//if the link is beatmap specific
                    UTILS.debug("new url: s/b");
                    beatmap_id = UTILS.arbitraryLengthInt(url.substring(url.indexOfInstance("/", 5) + 1))
                    type = "b";
                    lolapi.osuBeatmap(beatmap_id, "b", mode, CONFIG.API_MAXAGE.COMPARE.GET_BEATMAP).then(new_beatmap => {//retrieve the entire set
                        beatmap = new_beatmap[0];
                        step2();
                    }).catch(console.error);
                } else step2();
            }

            function oldLink(parameter) {
                beatmap_id = UTILS.arbitraryLengthInt(parameter);
                type = "b";
                mode = parameter.indexOf("&m=") != -1 ? parseInt(parameter[parameter.indexOf("&m=") + 3]) : 0;
                lolapi.osuBeatmap(beatmap_id, type, mode, CONFIG.API_MAXAGE.COMPARE.GET_BEATMAP).then(new_beatmap => {
                    beatmap = new_beatmap[0];
                    step2();
                }).catch(console.error);
            }

            function step2() {
                if (beatmap.approved > 0) {//has to be a leaderboarded map for this to work
                    lolapi.osuGetUserTyped(user, mode, id, CONFIG.API_MAXAGE.COMPARE.GET_USER).then(user_stats => {
                        lolapi.osuScoreUser(user_stats.user_id, true, mode, beatmap_id, CONFIG.API_MAXAGE.COMPARE.GET_SCORE_USER).then(user_scores => {
                            //UTILS.inspect("osuScoreUser", user_scores);
                            //filter by correct mods
                            user_scores.map((v, i) => {
                                v.beatmap_id = beatmap_id;
                                v.pp_valid = (i === 0);
                                return v;
                            });
                            let user_score_mod_index = 0;
                            if (ending_parameter !== "") {//the user specified mods
                                const AMN = UTILS.getModNumber(ending_parameter.substring(1)).value;//applied mod number
                                user_score_mod_index = user_scores.findIndex(v => v.enabled_mods === AMN);
                            }
                            //UTILS.inspect("osuScoreUser with mod filter", user_scores);
                            if (user_score_mod_index === -1 || user_scores.length === 0) return reply(":x: `" + user + "` doesn't have any of those scores on this beatmap.");
                            let jobs = [];
                            let jobtype = [];
                            jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.COMPARE.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
                            jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
                            //UTILS.inspect("beatmap.approved", beatmap.approved);
                            if (beatmap.approved === 1 || beatmap.approved === 2) {//ranked or approved (possible top pp change)
                                jobs.push(lolapi.osuGetUserBest(user, mode, 100, id, CONFIG.API_MAXAGE.COMPARE.GET_USER_BEST));//get user best
                                jobtype.push(CONFIG.CONSTANTS.USER_BEST);
                            }
                            if (beatmap.approved > 0) {//leaderboarded score (check beatmap leaderboards)
                                jobs.push(lolapi.osuScore(mode, beatmap_id, CONFIG.API_MAXAGE.COMPARE.GET_SCORE));
                                jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
                            }
                            Promise.all(jobs).then(jra => {//job result array
                                let user_best = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER_BEST)];
                                let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => {
                                    v.beatmap_id = beatmap_id;
                                    return v;
                                });
                                embedgenerator.recent(CONFIG, mode, user_score_mod_index, user_scores, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
                                    if (ending_parameter === "" && user_scores.length > 1) {//user doesn't specify mods and there are multiple scores on the map,
                                        let slsd = [];
                                        for (let i = 0; i < user_scores.length; ++i) {
                                            if (i !== user_score_mod_index) {
                                                slsd.push(embedgenerator.slsdRaw(CONFIG, beatmap, user_scores[i], false));
                                            }
                                        }
                                        for (let i = 0; i < Math.ceil(slsd.length / 5); ++i) {
                                            const fd = slsd.slice(i * 5, (i + 1) * 5).join("\n");
                                            UTILS.debug("field length: " + fd.length);
                                            embeds.compact.addField("Other scores on this beatmap", fd);
                                        }
                                    }
                                    replyEmbed(embeds.compact);//send compact scorecard no matter what
                                }).catch(e => {
                                    reply(":x: Failed to generate embed.");
                                    console.error(e);
                                });
                            }).catch(e => {
                                reply(":x: We're unable to retrieve score/leaderboard information for this user's most recent play.");
                                console.error(e);
                            });
                        }).catch(e => {
                            reply(":x: We're unable to retrieve this user's scores on this beatmap.")
                            console.error(e);
                        });
                    }).catch(e => {
                        reply(":x: The user `" + user + "` doesn't seem to exist.");
                        console.error(e);
                    });
                } else {
                    reply(":x: This beatmap has no leaderboard.");
                }
            }
        }, {trigger: "+", accepts_opts: CONFIG.CONSTANTS.CGU_OPTS.OPTIONAL});
    }

    if (true) {//scope limiter for beatmap links
        let id, type, mode, mod_string, beatmap;
        if (preferences.get("abi")) {
            command(["https://osu.ppy.sh/b/", "http://osu.ppy.sh/b/"], true, false, (original, index, parameter) => {//old format beatmap link
                oldLink(parameter);
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
                let url = original + parameter;
                newLink(url);
            });
        }
        command(usePrefix(["beatmapinfo", "binfo"]), true, false, (original, index, parameter) => {
            msg.channel.fetchMessages({limit: 50}).then(msgs => {
                msgs = msgs.array();
                for (let i = 0; i < msgs.length; ++i) {
                    if (msgs[i].author.id === client.user.id && msgs[i].embeds.length === 1 && UTILS.exists(msgs[i].embeds[0].url)) {
                        if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/beatmapsets/") !== -1) return newLink(msgs[i].embeds[0].url + parameter);
                        else if (msgs[i].embeds[0].url.indexOf("https://osu.ppy.sh/b/") !== -1) return oldLink(msgs[i].embeds[0].url.substring(21) + parameter);
                    }
                }
                reply(":x: Could not find a recent scorecard or beatmap.");
            }).catch(e => {
                console.error(e);
                reply(":x: I need the \"read message history\" permission to process this request.");
            });
        });

        function newLink(url) {// handles https://osu.ppy.sh/beatmapsets/ type links (include URL and mod string)
            let parameter = url.substring(url.indexOfInstance("/", 4) + 1);
            if (url.indexOf(" ") != -1) url = url.substring(0, url.indexOf(" "));//more comes after the url
            id = UTILS.arbitraryLengthInt(parameter);
            type = "s";
            mode = null;
            if (url.indexOf("#osu") != -1) mode = 0;
            else if (url.indexOf("#taiko") != -1) mode = 1;
            else if (url.indexOf("#fruits") != -1) mode = 2;
            else if (url.indexOf("#mania") != -1) mode = 3;
            UTILS.debug("nL(): mode is " + mode);
            if (parameter.indexOf(" ") != -1 && parameter.indexOf("+") != -1) {//if a mod string is specified
                mod_string = parameter.substring(parameter.indexOf(" ") + 1);//only get the string after the url
                mod_string = mod_string.substring(mod_string.indexOf("+"));//only get the string after the '+'
            }
            UTILS.debug("url is: " + url);
            if (url.indexOfInstance("/", 5) != -1 && !isNaN(parseInt(url[url.indexOfInstance("/", 5) + 1]))) {//if the link is beatmap specific
                UTILS.debug("new url: s/b");
                lolapi.osuBeatmap(UTILS.arbitraryLengthInt(url.substring(url.indexOfInstance("/", 5) + 1)), "b", mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(new_beatmap => {//set the specific beatmap
                    beatmap = new_beatmap[0];
                    step2();
                }).catch(console.error);
            } else step2();
        }

        function oldLink(parameter) {
            id = UTILS.arbitraryLengthInt(parameter);
            type = "b";
            mode = parameter.indexOf("&m=") != -1 ? parseInt(parameter[parameter.indexOf("&m=") + 3]) : null;
            mod_string = parameter.substring(parameter.indexOf(" ") + 1);//only get the string after the url
            mod_string = mod_string.substring(mod_string.indexOf("+"));//only get the string after the '+'
            lolapi.osuBeatmap(id, type, mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(new_beatmap => {//set the specific beatmap
                beatmap = new_beatmap[0];
                id = new_beatmap[0].beatmapset_id;
                type = "s";
                step2();
            }).catch(console.error);
        }

        function step2() {
            UTILS.assert(type === "s");
            lolapi.osuBeatmap(id, type, mode, CONFIG.API_MAXAGE.BEATMAP_AUTO.GET_BEATMAP).then(beatmapset => {
                lolapi.osuBeatmapFile(beatmapset[0].beatmap_id, beatmapset[0].last_update.getTime(), CONFIG.API_MAXAGE.BEATMAP_AUTO.OSU_FILE).then(osu_file => {
                    embedgenerator.beatmap(CONFIG, UTILS.exists(beatmap) ? beatmap : beatmapset[0], beatmapset, mod_string, mode).then(replyEmbed).catch(console.error);
                }).catch(console.error);
            }).catch(console.error);
        }
    }

    if (UTILS.exists(msg.guild)) {//respondable server message only
        command(usePrefix(["scm compact", "scm reduced", "scm full"]), false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
            const new_setting = index;
            preferences.set("scorecardmode", new_setting).then(() => {
                switch (new_setting) {
                    case CONFIG.CONSTANTS.SCM_COMPACT:
                        reply(":white_check_mark: Scorecards will show abridged information.");
                        break;
                    case CONFIG.CONSTANTS.SCM_REDUCED:
                        reply(":white_check_mark: Scorecards will show detailed information for 1 minute, then collapse.");
                        break;
                    case CONFIG.CONSTANTS.SCM_FULL:
                        reply(":white_check_mark: Scorecards will show detailed information.");
                        break;
                    default:
                        reply(":x: An error has occurred while setting the scorecard mode.");
                }
            }).catch(reply);
        });
        command(usePrefix(["retrycounter on", "retrycount on", "trycounter on", "trycount on", "playcounter on", "playcount on", "retrycounter off", "retrycount off", "trycounter off", "trycount off", "playcounter off", "playcount off"]), false, CONFIG.CONSTANTS.MODERATORS, (original, index) => {
            const new_setting = index < 6;
            preferences.set("replaycount", new_setting).then(() => {
                reply(":white_check_mark: " + (new_setting ? "The try counter has been turned on." : "The try counter has been turned off."));
            }).catch(reply);
        });
        /*
        command([preferences.get("prefix") + "setting force-prefix on", preferences.get("prefix") + "setting force-prefix off"], false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
            const new_setting = index === 0;
            preferences.set("force_prefix", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will require prefixes on all osu commands." : "BoatBot will not require prefixes on all osu commands."))).catch(reply);
        });*/

        /** @command setting release-notifications
         *  @description Show BoatBot release notifications in your server.
         *  @permissionlevel 3
         *  @param <on / off>
         * **/
        command(usePrefix(["setting release-notifications on", "setting release-notifications off"]), false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
            const new_setting = index === 0;
            preferences.set("release_notifications", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will show new release notifications." : "BoatBot will not show new release notifications."))).catch(reply);
        });

        /** @command setting abi
         *  @description Enables / disables automatic beatmap information.
         *  @permissionlevel 2
         *  @param <on / off>
         * **/
        command(usePrefix(["setting abi on", "setting abi off"]), false, CONFIG.CONSTANTS.MODERATORS, (original, index) => {
            const new_setting = index === 0;
            preferences.set("abi", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will show beatmap information when a beatmap link is posted." : "BoatBot will not show beatmap information when a beatmap link is posted."))).catch(reply);
        });

        /** @command setting global-feedback
         *  @description Enables / disables global feedback commands.
         *  @permissionlevel 2
         *  @param <on / off>
         * **/
        command(usePrefix(["setting global-feedback on", "setting global-feedback off"]), false, CONFIG.CONSTANTS.MODERATORS, (original, index) => {
            const new_setting = index === 0;
            preferences.set("feedback_enabled", new_setting).then(() => reply(":white_check_mark: " + (new_setting ? "BoatBot will allow the use of global feedback commands in this server." : "BoatBot will not allow the use of global feedback commands in this server."))).catch(reply);
        });

        /** @command setting comparisons
         *  @description Adjusts how comparisons work in your server.
         *  @permissionlevel 2
         *  @param <on / off / self-only / old-only>
         * **/
        command(usePrefix(["setting comparisons off", "setting comparisons self-only", "setting comparisons old-only", "setting comparisons on"]), false, CONFIG.CONSTANTS.ADMINISTRATORS, (original, index) => {
            const new_setting = index;
            preferences.set("compare_mode", new_setting).then(() => {
                let ans = ":white_check_mark: ";
                switch (new_setting) {
                    case (0):
                        ans += "Score comparisons are no longer allowed in this server.";
                        break;
                    case (1):
                        ans += "Only self comparisons (for scores) will be allowed in this server.";
                        break;
                    case (2):
                        ans += "Only self comparisons and comparisons to old scores will be allowed in this server.";
                        break;
                    case (3):
                        ans += "All score comparisons are allowed in this server.";
                        break;
                    default:
                        throw new Error(":x: invalid comparison mode specified");
                }
                reply(ans);
            }).catch(reply);
        });

        /*
        command(["boatbot settings reset all"], false, CONFIG.CONSTANTS.ADMINISTRATORS, () => reply(":warning: You are about to reset all the preferences associated with this server. To confirm this action, please send the command: `boatbot settings reset all confirm`"));
        command(["boatbot settings reset all confirm"], false, CONFIG.CONSTANTS.ADMINISTRATORS, () => {
            preferences.resetToDefault().then(() => reply(":white_check_mark: This server's settings were reset to defaults.")).catch(reply);
        });*/
        command(usePrefix(["mail "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
            const uid = parameter.substring(0, parameter.indexOf(" "))
            getUsernameFromUID(uid).then(usertag => {
                sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 5, 1, msg, null, null, usertag));
                wsapi.embedPM(uid, embedgenerator.feedback(CONFIG, 5, 0, msg, null, null, usertag));
            }).catch(console.error);
        });
        command(usePrefix(["approve "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
            const mid = parameter;
            if (!UTILS.isInt(mid)) return reply(":x: Message ID not recognizable.");
            msg.channel.fetchMessage(mid).then(approvable => {
                if (approvable.author.id != client.user.id) return reply(":x: Cannot approve messages not sent from this account.");
                const candidate = embedgenerator.reviewFeedback(CONFIG, approvable, msg.author, true);
                if (typeof (candidate) == "number") {
                    UTILS.debug(CONFIG.DISCORD_COMMAND_PREFIX + "approve error type " + candidate);
                    if (candidate == 1) return reply(":x: No embed found.");
                    else return reply(":x: This type of message is not approvable.");
                } else {//success
                    wsapi.embedPM(candidate.to_user_uid, candidate.to_user);//notify user of success
                    approvable.edit({embed: candidate.edit});//change internal feedback message
                    sendEmbedToChannel(candidate.to_public_cid, candidate.to_public);//publish to public feedback channel
                }
            }).catch(e => reply(":x: Could not find the message. Check permissions and message id."));
        });
        command(usePrefix(["deny "]), true, CONFIG.CONSTANTS.BOTOWNERS, (original, index, parameter) => {
            const mid = parameter;
            if (!UTILS.isInt(mid)) return reply(":x: Message ID not recognizable.");
            msg.channel.fetchMessage(mid).then(approvable => {
                if (approvable.author.id != client.user.id) return reply(":x: Cannot approve messages not sent from this account.");
                const candidate = embedgenerator.reviewFeedback(CONFIG, approvable, msg.author, false);
                if (typeof (candidate) == "number") {
                    UTILS.debug(CONFIG.DISCORD_COMMAND_PREFIX + "deny error type " + candidate);
                    if (candidate == 1) return reply(":x: No embed found.");
                    else return reply(":x: This type of message is not approvable.");
                } else {//success
                    //do not notify user of success
                    approvable.edit({embed: candidate.edit});//change internal feedback message
                    //do not publish to public feedback channel
                }
            }).catch(e => reply(":x: Could not find the message. Check permissions and message id."));
        });
    } else {//PM/DM only

        command(usePrefix(["say "]), true, false, (original, index, parameter) => {
            lolapi.userHistory(msg.author.id).then(uH => {
                sendEmbedToChannel(CONFIG.FEEDBACK.EXTERNAL_CID, embedgenerator.feedback(CONFIG, 0, 1, msg, uH[msg.author.id]));
                reply(":e_mail: Message delivered.");
            });
        });

    }

    /** Defines a command for discord.
     *  @function command
     *  @param trigger_array        {Array}     Array of command aliases, prefix not included.
     *  @param parameters_expected  {Boolean}   Are parameters expected?
     *  @param elevated_permissions {Boolean}   A representation of the permissions it requires. False is NORMALMEMBERs and true is BOTOWNERS. The rest of the levels are in the config.
     *  @param callback             {Function}  Optional callback.
     * **/
    function command(trigger_array, parameters_expected, elevated_permissions, callback, options = { // External call means not inside commandGuessUsername & commandGuessUsernameNumber
                                                                                                    external: true,
                                                                                                    immediatePRL: true}){

        UTILS.defaultObjectValues({external: true, immediatePRL: true}, options);

        for (let i = 0; i < trigger_array.length; ++i) {
            if (parameters_expected && msg.content.trim().toLowerCase().substring(0, trigger_array[i].length) === trigger_array[i].toLowerCase()) { // Check if the beginning of the message contains the command

                if (options.external && options.immediatePRL && !processRateLimit()) return false;

                if (elevated_permissions && !is(elevated_permissions)) {
                    return false;
                } else {

                    if (elevated_permissions === CONFIG.CONSTANTS.BOTOWNERS) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);

                    if (UTILS.exists(callback)) {
                        try {
                            callback(trigger_array[i], i, msg.content.trim().substring(trigger_array[i].length));
                        } catch (e) {
                            console.error(e);
                        }
                        return true;
                    }
                }
            } else if (!parameters_expected && msg.content.trim().toLowerCase() === trigger_array[i].toLowerCase()) {

                if (options.external && options.immediatePRL && !processRateLimit()) return false;

                if (elevated_permissions && !is(elevated_permissions)) return false;

                else {
                    if (elevated_permissions === CONFIG.CONSTANTS.BOTOWNERS) sendToChannel(CONFIG.LOG_CHANNEL_ID, msg.author.tag + " used " + msg.cleanContent);

                    if (UTILS.exists(callback)) {
                        try {
                            callback(trigger_array[i], i);
                        } catch (e) {
                            console.error(e);
                        }
                        return true;
                    }
                }
            }
        }
    }

    /** A command that tries to infer an osu username from the command executor. Refer to comments in the function to understand how this works.
     *  @function commandGuessUsername
     *  @param trigger_array        {Array}     Array of command aliases, prefix not included.
     *  @param elevated_permissions {Boolean}   A representation of the permissions it requires. False is NORMALMEMBERs and true is BOTOWNERS. The rest of the levels are in the config.
     *  @param callback             {Function}  Optional callback.
     *  @return                     {index, boolean: user_id = true / username = false, user_id or username, parameter, ending parameter}
     * **/
    function commandGuessUsername(trigger_array,//array of command aliases, prefix needs to be included
                                  elevated_permissions,//requires owner permissions
                                  callback,
                                  options = {trigger: "", accepts_opts: 0}// 0= no, 1= optional, 2= mandatory
                                  //example !compare { trigger: "+", accepts_opts: 1 }
                                  //example !whatif { trigger: "" (last param is it), accepts_opts: 2
    ) {//optional callback only if successful
        //returns (index, boolean: user_id = true / username = false, user_id or username, parameter, ending parameter)
        //this command does not validate the existance of a username on the server
        /*
        username guess method 0: username provided
        username guess method 1: shortcut provided
        username guess method 2: link
        username guess method 3: implicit discord username
        username guess method 4: explicit discord mention
        username guess method 5: recently used command
        * = watch for parameters added on to the end
        */
        UTILS.defaultObjectValues({trigger: "", accept_opts: 0}, options);
        command(trigger_array, true, elevated_permissions, (original, index, parameter) => {
            UTILS.debug("cGU p1: " + parameter);
            if (parameter.length !== 0) {//username explicitly provided
                if (parameter.length < 70 && parameter[0] === " ") {//longest query should be less than 70 characters (required trailing space after command trigger)
                    if (!processRateLimit()) return false;
                    //parameter = parameter.trim();
                    UTILS.debug("cGU p2: " + parameter);
                    if (parameter[0] === " " && msg.mentions.users.size == 1) {//explicit mention
                        lolapi.getLink(msg.mentions.users.first().id).then(result => {
                            let username = msg.mentions.users.first().username;//suppose the link doesn't exist in the database
                            if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
                            let ending_parameter = parameter.substring(parameter.indexOf(">") + 1);
                            if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.MANDATORY) {
                                ending_parameter = ending_parameter.substring(ending_parameter.indexOf(" ") + 1);//mentions can't have spaces
                            } else if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.OPTIONAL) {
                                ending_parameter = ending_parameter.substring(ending_parameter.lastIndexOf(options.trigger));
                            } else {
                                ending_parameter = "";
                            }
                            callback(index, false, username, parameter, ending_parameter.trim());
                        }).catch(console.error);
                    } else if (parameter.substring(0, 2) === " $") {//shortcut
                        lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(2)).then(result => {
                            let ending_parameter = parameter.substring(2);
                            if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.MANDATORY) {
                                ending_parameter = ending_parameter.substring(ending_parameter.indexOf(" ") + 1);//shortcuts can't have spaces
                            } else if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.OPTIONAL) {
                                ending_parameter = ending_parameter.substring(ending_parameter.lastIndexOf(options.trigger));
                            } else {
                                ending_parameter = "";
                            }
                            callback(index, false, result[parameter.toLowerCase().substring(2)], parameter, ending_parameter.trim());
                        }).catch(e => {
                            if (e) reply(":x: An error has occurred. The shortcut may not exist.");
                        });
                    } else if (parameter.substring(0, 2) === " ^") {//refers to the last command sent in the channel
                        msg.channel.fetchMessages({before: msg.id, limit: 30}).then(msgs => {
                            msgs = msgs.array();
                            let user_id;
                            for (let i = 0; i < msgs.length; ++i) {
                                if (msgs[i].author.id == client.user.id && //message was sent by bot
                                    msgs[i].embeds.length == 1 && //embedded response
                                    UTILS.exists(msgs[i].embeds[0].author) && //author present
                                    UTILS.exists(msgs[i].embeds[0].author.url)) {//url present
                                    if (msgs[i].embeds[0].author.url.substring(0, 25) === "https://osu.ppy.sh/users/") {//https://osu.ppy.sh/users/4374286
                                        const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(25));
                                        if (candidate !== "") user_id = parseInt(candidate);
                                        break;
                                    } else if (msgs[i].embeds[0].author.url.substring(0, 21) === "https://osu.ppy.sh/u/") {//https://osu.ppy.sh/u/4374286
                                        const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(21));
                                        if (candidate !== "") user_id = parseInt(candidate);
                                        break;
                                    }
                                }
                            }
                            if (!UTILS.exists(user_id)) reply(":x: Could not find a recent username queried.");
                            else {
                                let ending_parameter = parameter.substring(2);
                                if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.MANDATORY) {
                                    ending_parameter = ending_parameter.substring(2);
                                } else if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.OPTIONAL) {
                                    ending_parameter = ending_parameter.substring(ending_parameter.lastIndexOf(options.trigger));
                                } else {
                                    ending_parameter = "";
                                }
                                callback(index, true, user_id, parameter, ending_parameter.trim());
                            }
                        }).catch(e => {
                            console.error(e);
                            reply(":x: Could not find a recent username queried.");
                        });
                    } else {//explicit username specified (or just a parameter)
                        let ending_parameter = parameter;
                        let explicit_username = parameter;
                        //UTILS.inspect("parameter.lastIndexOf(\" \")", parameter.lastIndexOf(" "));
                        if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.MANDATORY) {
                            ending_parameter = parameter.substring(parameter.lastIndexOf(" ") + 1);//assume that the last word is the parameter
                            explicit_username = parameter.substring(0, parameter.lastIndexOf(" "));
                        } else if (options.accepts_opts === CONFIG.CONSTANTS.CGU_OPTS.OPTIONAL) {
                            if (parameter.lastIndexOf(options.trigger) !== -1) {
                                ending_parameter = parameter.substring(parameter.lastIndexOf(options.trigger));
                                explicit_username = parameter.substring(0, parameter.lastIndexOf(options.trigger));
                            } else {
                                ending_parameter = "";
                            }
                        } else {
                            ending_parameter = "";
                        }
                        explicit_username = explicit_username.trim();
                        if (explicit_username === "") {
                            lolapi.getLink(msg.author.id).then(result => {
                                let username = msg.author.username;//suppose the link doesn't exist in the database
                                if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
                                callback(index, false, username, parameter, ending_parameter.trim());
                            }).catch(console.error);
                        } else callback(index, false, explicit_username, parameter, ending_parameter.trim());//explicit
                    }
                    return true;
                } else return false;
            } else {//username not provided & no parameters exist
                if (!processRateLimit()) return false;
                lolapi.getLink(msg.author.id).then(result => {
                    let username = msg.author.username;//suppose the link doesn't exist in the database
                    if (UTILS.exists(result.username) && result.username != "") username = result.username;//link exists
                    callback(index, false, username, parameter, "");
                }).catch(console.error);
                return true;
            }
        }, {external: false});
    }

    /** A command that tries to infer an osu username from the command executor. The command also takes in an optional number directly after the command. Refer to comments in the function to understand how this works.
     *  @function commandGuessUsername
     *  @param trigger_array        {Array}     Array of command aliases, prefix not included.
     *  @param elevated_permissions {Boolean}   A representation of the permissions it requires. False is NORMALMEMBERs and true is BOTOWNERS. The rest of the levels are in the config.
     *  @param callback             {Function}  Optional callback.
     *  @return                     {index, boolean: user_id = true / username = false, user_id or username, number}
     * **/
    function commandGuessUsernameNumber(trigger_array,
                                        elevated_permissions,
                                        callback) {
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
            /*all cases:
            !c: valid
            !c user: valid
            !c1: valid
            !c1 user: valid
            !c123: valid
            !c123 user: valid
            */
            let number;
            const space_index = parameter.indexOf(" ");
            if (parameter === "") number = 1;//no number specified, no username specified
            else if (space_index === -1) {//there is no space
                number = UTILS.strictParseInt(parameter);//it's either "!c" or "!c123" with params "" or "123"
                parameter = "";
            } else if (space_index === 0) number = 1;//"!c user" with params " user"
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
                    } else if (parameter.substring(0, 2) == " $") {//shortcut
                        lolapi.getShortcut(msg.author.id, parameter.toLowerCase().substring(2)).then(result => {
                            callback(index, false, result[parameter.toLowerCase().substring(2)], number, 1);
                        }).catch(e => {
                            if (e) reply(":x: An error has occurred. The shortcut may not exist.");
                        });
                    } else if (parameter.substring(parameter.indexOf(" ") + 1) == "^") {//pull from recent command
                        msg.channel.fetchMessages({before: msg.id, limit: 30}).then(msgs => {
                            msgs = msgs.array();
                            let user_id;
                            for (let i = 0; i < msgs.length; ++i) {
                                if (msgs[i].author.id == client.user.id && //message was sent by bot
                                    msgs[i].embeds.length == 1 && //embedded response
                                    UTILS.exists(msgs[i].embeds[0].author) && //author present
                                    UTILS.exists(msgs[i].embeds[0].author.url)) {//url present
                                    if (msgs[i].embeds[0].author.url.substring(0, 25) === "https://osu.ppy.sh/users/") {//https://osu.ppy.sh/users/4374286
                                        const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(25));
                                        if (candidate !== "") user_id = parseInt(candidate);
                                        break;
                                    } else if (msgs[i].embeds[0].author.url.substring(0, 21) === "https://osu.ppy.sh/u/") {//https://osu.ppy.sh/u/4374286
                                        const candidate = UTILS.arbitraryLengthInt(msgs[i].embeds[0].author.url.substring(21));
                                        if (candidate !== "") user_id = parseInt(candidate);
                                        break;
                                    }
                                }
                            }
                            if (!UTILS.exists(user_id)) reply(":x: Could not find a recent username queried.");
                            else callback(index, true, user_id, number, 5);
                        }).catch(e => {
                            console.error(e);
                            reply(":x: Could not find a recent username queried.");
                        });
                    } else if (parameter[0] == " ") callback(index, false, parameter.substring(1).trim(), number, 0);//explicit (required trailing space after command trigger)
                    else return false;
                }
            } else {//username not provided
                if (!processRateLimit()) return false;
                lolapi.getLink(msg.author.id).then(result => {
                    let username = msg.author.username;//suppose the link doesn't exist in the database
                    if (UTILS.exists(result.username) && result.username != "") {
                        username = result.username;//link exists
                        callback(index, false, username, number, 2);
                    } else callback(index, false, username, number, 3);
                }).catch(console.error);
                return true;
            }
        }, {external: false});
    }

    /** Determines if a user has the given permission level.
     * @function is
     * @param PLEVEL    {number}    Permission level to check if the user has.
     * @param candidate {number}    The UserID of the user to check permission level.
     * @return          {Boolean}   Returns true if the user has the given permission level.
     **/
    function is(PLEVEL, candidate = msg.author.id, notify = true) {
        if (candidate === msg.author.id) {
            if (ACCESS_LEVEL >= PLEVEL) return true;
            else if (notify) {
                if (PLEVEL === CONFIG.CONSTANTS.BOTOWNERS) ;//do not notify when this permission fails
                else if (PLEVEL === CONFIG.CONSTANTS.SERVEROWNERS) reply(":x: Server Owner permissions required. You must be the owner of this server to use this command.");
                else if (PLEVEL === CONFIG.CONSTANTS.ADMINISTRATORS) reply(":x: Server Administrator permissions required.");
                else if (PLEVEL === CONFIG.CONSTANTS.MODERATORS) reply(":x: Server Moderator permissions required.");
                else if (PLEVEL === CONFIG.CONSTANTS.BOTCOMMANDERS) reply(":x: Bot Commander permissions required.");
                else ;//normal member permissions
            }
            return false;
        } else {//retrieve access level for a different user
            const other_ACCESS_LEVEL = UTILS.accessLevel(CONFIG, msg);
            return other_ACCESS_LEVEL >= PLEVEL;//never notifies
        }
    }

    /** Determines if a user is a bot owner.
     * @function isOwner
     * @param candidate {number}    The UserID of the user to check permission level.
     * @return          {boolean}   Returns true if the user is a bot owner level.
     **/
    function isOwner(candidate = msg.author.id, notify = true) {

        const answer = UTILS.exists(CONFIG.OWNER_DISCORD_IDS[candidate]) && CONFIG.OWNER_DISCORD_IDS[candidate].active;

        if (!answer) {
            printMessage("insufficient permissions");
            if (notify) msg.channel.send(":x: Owner permissions required. Ask for help at " + CONFIG.HELP_SERVER_INVITE_LINK + " .").catch(console.error);
        }

        return answer;

    }

    /** Sends a message to the channel the command was executed from.
     *  @function reply
     *  @param reply_text   {string, array} The text to send to the channel.
     *  @param callback     {function}      The callback to be called if the message sends successfully.
     *  @param errorCallback{function}      The callback to be called if an error occurs.
     * **/
    function reply(reply_text, callback, errorCallback) {

        if (!RL_activated && !processRateLimit()) return;

        if (Array.isArray(reply_text)) {//[{r: string, t: 0}, {}]
            printMessage("reply (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text[0].r + "\n");
            lolapi.terminate(msg, ACCESS_LEVEL, reply_text[0].r);
            msg.channel.send(reply_text[0].r, {split: true}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
                for (let i = 1; i < reply_text.length; ++i) {
                    setTimeout(() => {
                        nMsg.edit(reply_text[i].r).catch(e => UTILS.debug(e));
                    }, reply_text[i].t)
                }
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });
        } else {//just a string
            printMessage("reply (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
            lolapi.terminate(msg, ACCESS_LEVEL, reply_text);
            msg.channel.send(reply_text, {split: true}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });
        }
    }

    function replyToAuthor(reply_text, callback, errorCallback) {

        if (!RL_activated && !processRateLimit()) return;

        if (Array.isArray(reply_text)) {//[{r: string, t: 0}, {}]
            printMessage("reply to author (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text[0].r + "\n");
            lolapi.terminate(msg, ACCESS_LEVEL, reply_text[0].r);
            msg.author.send(reply_text[0].r, {split: true}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
                for (let i = 1; i < reply_text.length; ++i) {
                    setTimeout(() => {
                        nMsg.edit(reply_text[i].r).catch(e => UTILS.debug(e));
                    }, reply_text[i].t)
                }
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });

        } else {

            printMessage("reply to author (" + (new Date().getTime() - msg_receive_time) + "ms): " + reply_text + "\n");
            lolapi.terminate(msg, ACCESS_LEVEL, reply_text);

            msg.author.send(reply_text, {split: true}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });
        }
    }
    /** Sends an embed to the channel the command was executed from.
     *  @function replyEmbed
     *  @param reply_embed                  The embed to post in the channel.
     *  @param callback     {function}      The callback to be called if the message sends successfully.
     *  @param errorCallback{function}      The callback to be called if an error occurs.
     * **/
    function replyEmbed(reply_embed, callback, errorCallback) {

        if (!RL_activated && !processRateLimit()) return;

        // Make sure the bot has EMBED_LINKS permission on the channel
        if (!msg.PM && !msg.channel.permissionsFor(client.user).has(["EMBED_LINKS"])) {

            lolapi.terminate(msg, ACCESS_LEVEL, ":x: I cannot respond to your request without the \"embed links\" permission.");
            reply(":x: I cannot respond to your request without the \"embed links\" permission.");

        } else {//has permission to embed links, or is a DM/PM

            if (Array.isArray(reply_embed)) {//[{r: embed_object, t: 0, s: "string"}, {}]
                printMessage("reply embedded (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
                lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed[0].r);
                msg.channel.send(UTILS.exists(reply_embed[0].s) ? reply_embed[0].s : "", {embed: reply_embed[0].r}).then((nMsg) => {
                    if (UTILS.exists(callback)) callback(nMsg);
                    for (let i = 1; i < reply_embed.length; ++i) {
                        setTimeout(() => {
                            nMsg.edit(UTILS.exists(reply_embed[i].s) ? reply_embed[i].s : "", {embed: reply_embed[i].r}).catch(e => UTILS.debug(e));
                        }, reply_embed[i].t);
                    }
                }).catch((e) => {
                    console.error(e);
                    if (UTILS.exists(errorCallback)) errorCallback(e);
                });

            } else {
                printMessage("reply embedded (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
                lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed);
                msg.channel.send("", {embed: reply_embed}).then((nMsg) => {
                    if (UTILS.exists(callback)) callback(nMsg);
                }).catch((e) => {
                    console.error(e);
                    if (UTILS.exists(errorCallback)) errorCallback(e);
                });
            }
        }
    }

    function replyEmbedToAuthor(reply_embed, callback, errorCallback) {
        if (!RL_activated && !processRateLimit()) return;
        if (Array.isArray(reply_embed)) {
            printMessage("reply embedded to author (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
            lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed[0].r);
            msg.author.send("", {embed: reply_embed[0].r}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
                for (let i = 1; i < reply_embed.length; ++i) {
                    setTimeout(() => {
                        nMsg.edit("", {embed: reply_embed[i].r}).catch(e => UTILS.debug(e));
                    }, reply_embed[i].t);
                }
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });
        } else {
            printMessage("reply embedded to author (" + (new Date().getTime() - msg_receive_time) + "ms)\n");
            lolapi.terminate(msg, ACCESS_LEVEL, undefined, reply_embed);
            msg.author.send("", {embed: reply_embed}).then((nMsg) => {
                if (UTILS.exists(callback)) callback(nMsg);
            }).catch((e) => {
                console.error(e);
                if (UTILS.exists(errorCallback)) errorCallback(e);
            });
        }
    }

    function printMessage(x = "") {
        let answer = x + "\n";
        const MSG_LEN = 50;
        let ctt;
        if (!msg.PM) {
            ctt = [{
                content: msg.id,
                author: msg.author.id,
                P: ACCESS_LEVEL,
                channel: msg.channel.id,
                guild: msg.guild.id,
                size_region: msg.guild.memberCount
            }, {
                content: msg.cleanContent.substring(0, MSG_LEN),
                author: msg.author.tag,
                P: CONFIG.CONSTANTS.PERMISSION_LEVEL_REVERSE[ACCESS_LEVEL],
                channel: msg.channel.name,
                guild: msg.guild.name,
                size_region: msg.guild.region
            }];
        } else {
            ctt = [{
                content: msg.id,
                author: msg.author.id,
                P: ACCESS_LEVEL,
                channel: msg.channel.id
            }, {
                content: msg.cleanContent.substring(0, MSG_LEN),
                author: msg.author.tag,
                P: CONFIG.CONSTANTS.PERMISSION_LEVEL_REVERSE[ACCESS_LEVEL],
                channel: msg.channel.name
            }];
        }
        for (let i = MSG_LEN; i < msg.cleanContent.length; i += MSG_LEN) ctt.push({content: msg.cleanContent.substring(i, i + MSG_LEN)});
        answer += ctable.getTable(ctt);
        UTILS.output(answer);
    }

    function suggestLink(guess_method) {
        return guess_method === 3 ? " We tried using your discord username but could not find a player with the same name. Let us know what your osu username is using `" + CONFIG.DISCORD_COMMAND_PREFIX + "link <ign>` and we'll remember it for next time!" : "";
    }

    function forcePrefix(triggers) {
        return preferences.get("force_prefix") ? usePrefix(triggers) : triggers;
    }

    function usePrefix(triggers) {
        return triggers.map(t => CURRENT_PREFIX + t);
    }

    /** Ensures the calling user and server have not exceeded a rate limit.
     *  @return {boolean}   Returns true if a rate limit has not been exceeded.
     * **/
    function processRateLimit() {
        //return true if valid. return false if limit reached.
        if (is(CONFIG.CONSTANTS.BOTOWNERS, msg.author.id, false)) return true;//owners bypass rate limits
        if (RL_activated) return;
        RL_activated = true;
        let valid = 0;//bitwise
        if (!msg.PM) {
            if (!server_RL.check()) {
                sendToChannel(CONFIG.RATE_LIMIT.CHANNEL_ID, ":no_entry::busts_in_silhouette: Server exceeded rate limit. uID: `" + msg.author.id + "` sID: `" + msg.guild.id + "`\n" + msg.author.tag + " on " + msg.guild.name + " attempted to use: " + msg.cleanContent.substring(0, 50));
                valid += 1;//bit 0
            }
        }
        if (!user_RL.check()) {
            sendToChannel(CONFIG.RATE_LIMIT.CHANNEL_ID, ":no_entry::bust_in_silhouette: User exceeded rate limit. uID: `" + msg.author.id + "` sID: `" + (msg.PM ? "N/A" : msg.guild.id) + "`\n" + msg.author.tag + " on " + (msg.PM ? "N/A" : msg.guild.name) + " attempted to use: " + msg.cleanContent.substring(0, 50));
            valid += 2;//bit 1
        }
        if (valid === 0) {
            if (!msg.PM) server_RL.add();
            user_RL.add();
        } else if (valid === 3) {//both rate limits reached
            if (!server_RL.warned && !user_RL.warned) {
                reply(":no_entry::alarm_clock::busts_in_silhouette::bust_in_silhouette: The server and user rate limits have been exceeded. Please wait a while before trying the next command.");
            }
            server_RL.warn();
            user_RL.warn();
        } else if (valid === 2) {//user rate limit reached
            if (!user_RL.warned) reply(":no_entry::alarm_clock::bust_in_silhouette: The user rate limits have been exceeded. Please wait a while before trying the next command.");
            user_RL.warn();
        } else if (valid === 1) {//server rate limit reached
            if (!server_RL.warned) reply(":no_entry::alarm_clock::busts_in_silhouette: The server rate limits have been exceeded. Please wait a while before trying the next command.");
            server_RL.warn();
        }
        return valid === 0;
    }

    /** Gets an osu username from their discord UserID
     *  @param uid  {number}    The UserID to find the osu username for
     *  @return     {string}    The most likely username for the inputted UserID
     * **/
    function getUsernameFromUID(uid) {
        return new Promise((resolve, reject) => {
            if (UTILS.isInt(uid)) {
                client.shard.broadcastEval("let candidate_user = this.users.get(\"" + uid + "\"); candidate_user != undefined ? candidate_user.tag : null;").then(possible_usernames => {
                    for (let b in possible_usernames) if (UTILS.exists(possible_usernames[b])) return resolve(possible_usernames[b]);
                    resolve(uid);
                }).catch(reject);
            } else resolve(uid);
        });
    }

    /** Probably shuts down the bot.**/
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

    /** Probably restarts the bot.**/
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
