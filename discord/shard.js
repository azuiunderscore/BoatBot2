"use strict";
const start_time = new Date().getTime();

const fs = require("fs");

const argv_options = new (require("getopts"))(process.argv.slice(2), {
    alias: {c: ["config"]},
    default: {c: "config.json5"}
});

const Discord = require("discord.js");
let discordcommands = require("./discordcommands.js");

const UTILS = new (require("../utils/utils.js"))();

const client = new Discord.Client({disabledEvents: ["TYPING_START"]});

let RateLimiter = require("../utils/ratelimiter.js");

let CONFIG;
const JSON5 = require("json5");
try {
    CONFIG = JSON5.parse(fs.readFileSync("../" + argv_options.config, "utf-8"));
    CONFIG.VERSION = "v2.1.2";//b for non-release (in development)
    CONFIG.BANS = {};
} catch (e) {
    console.log("something's wrong with config.json");
    console.error(e);
    process.exit(1);
}

const mode = process.env.NODE_ENV === "production" ? "PRODUCTION:warning:" : process.env.NODE_ENV;
const LOLAPI = new (require("../utils/lolapi.js"))(CONFIG, client.shard.ids[0]);
let STATUS = {};
const wsapi = new (require("./wsapi.js"))(CONFIG, client, STATUS);
const Preferences = require("./preferences.js");

process.env.SHARD_ID = client.shard.ids[0];//legacy compatibility with UTILS.output()

loadAllStaticResources(() => {
    UTILS.output(process.env.NODE_ENV === "production" ? "PRODUCTION LOGIN" : "DEVELOPMENT LOGIN");
    client.login().catch(console.error);
});

let initial_start = true;
client.on("ready", function () {
    UTILS.output(initial_start ? "discord user login success" : "discord reconnected");
    client.user.setStatus("idle").catch(console.error);
    client.user.setActivity("Starting Up").catch(console.error);
    sendToChannel(CONFIG.LOG_CHANNEL_ID, initial_start ? ":repeat:`$" + client.shard.ids[0] + "`Bot started in " + UTILS.round((new Date().getTime() - start_time) / 1000, 0) + "s: version: " + CONFIG.VERSION + " mode: " + mode + " servers: " + client.guilds.cache.size : ":repeat:`$" + client.shard.ids[0] + "`Bot reconnected");
    wsapi.getUserBans();
    wsapi.getServerBans();
    UTILS.output("default champion emojis set");
    initial_start = false;
});

client.on("shardDisconnect", function () {
    UTILS.output("discord disconnected");
});

client.on("message", function (msg) {
    msg.PM = !UTILS.exists(msg.guild);
    try {
        //const server_preferences = new Preferences(CONFIG, LOLAPI, msg.guild);
        if (!UTILS.exists(msg.guild.members.get(msg.author.id))) {
            client.fetchUser(msg.author.id).then(t_user => {
                msg.guild.fetchMember(t_user).then(() => {
                    step2();
                }).catch(console.error);
            }).catch(console.error);
        }
        else {
            step2();
        }
        function step2() {
            const ACCESS_LEVEL = UTILS.accessLevel(CONFIG, msg);
            const SERVER_RL = msg.PM ? null : getServerRateLimiter(msg.guild.id);
            if (!msg.PM) {
                for (let i = CONFIG.RATE_LIMIT.SERVERS.length - 1; i >= 0; --i) {
                    if (msg.guild.memberCount >= CONFIG.RATE_LIMIT.SERVERS[i].MEMBER_COUNT) {
                        SERVER_RL.setMode(CONFIG.RATE_LIMIT.SERVERS[i].MESSAGES, CONFIG.RATE_LIMIT.SERVERS[i].TIME_S);
                        break;
                    }
                }
            }
            new Preferences(LOLAPI, msg.guild, server_preferences => discordcommands(CONFIG, client, msg, wsapi, sendToChannel, sendEmbedToChannel, server_preferences, ACCESS_LEVEL, SERVER_RL, getUserRateLimiter(msg.author.id)));
        }
    } catch (e) {
        console.error(e);
    }
});


client.on("guildCreate", function (guild) {
    LOLAPI.checkPreferences(guild.id).then(ans => {
        if (false) {
            UTILS.output("Server Joined: " + guild.id + " :: " + guild.name + " :: " + guild.region + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":white_check_mark:`$" + client.shard.ids[0] + "`Server Joined: `" + guild.id + "` :: " + guild.region + " :: " + guild.name + " :: :busts_in_silhouette:" + guild.memberCount + " :: " + guild.owner.user.tag);
            guild.owner.send("BoatBot has joined your server: " + guild.name + "\nUse `" + CONFIG.DISCORD_COMMAND_PREFIX + "help` for information on how to use BoatBot.\nAdd BoatBot to other servers using this link: <" + CONFIG.BOT_ADD_LINK + ">\nBoatBot is a work in progress! Help us improve BoatBot by sending us your feedback at " + CONFIG.HELP_SERVER_INVITE_LINK + "\nBoatBot is made free and possible by the work of many. See `" + CONFIG.DISCORD_COMMAND_PREFIX + "credits` for special acknowledgements.").catch(e => console.error(e));
            let candidate = UTILS.preferredTextChannel(client, guild.channels, "text", UTILS.defaultChannelNames(), ["VIEW_CHANNEL", "SEND_MESSAGES"]);
            if (UTILS.exists(candidate)) candidate.send("Use `" + CONFIG.DISCORD_COMMAND_PREFIX + "help` for information on how to use BoatBot.\nAdd BoatBot to other servers using this link: <" + CONFIG.BOT_ADD_LINK + ">\nBoatBot is a work in progress! Help us improve BoatBot by sending us your feedback at " + CONFIG.HELP_SERVER_INVITE_LINK + "\nBoatBot is made free and possible by the work of many. See `" + CONFIG.DISCORD_COMMAND_PREFIX + "credits` for special acknowledgements.").catch();
        } else {
            UTILS.output("Server Rejoined: " + guild.id + " :: " + guild.name + " :: " + guild.region + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
            sendToChannel(CONFIG.LOG_CHANNEL_ID, ":white_check_mark::repeat:`$" + client.shard.ids[0] + "`Server Rejoined: `" + guild.id + "` :: " + guild.region + " :: " + guild.name + " :: :busts_in_silhouette:" + guild.memberCount + " :: " + guild.owner.user.tag);
        }
    }).catch(console.error);

});

// Send log message when the bot is removed from a guild
client.on("guildDelete", function (guild) {
    UTILS.output("Server Left: " + guild.id + " :: " + guild.region + " :: " + guild.name + " :: Population=" + guild.memberCount);
    sendToChannel(CONFIG.LOG_CHANNEL_ID, ":x:`$" + client.shard.ids[0] + "`Server Left: `" + guild.id + "` :: " + guild.region + " :: " + guild.name + " :: :busts_in_silhouette:" + guild.memberCount);
});

let server_rate_limiters = {};
let user_rate_limiters = {};

function getServerRateLimiter(sid) {
    if (!UTILS.exists(server_rate_limiters[sid])) server_rate_limiters[sid] = new RateLimiter(CONFIG.RATE_LIMIT.SERVER_MESSAGES, CONFIG.RATE_LIMIT.SERVER_TIME_S);
    return server_rate_limiters[sid];
}

function getUserRateLimiter(uid) {
    if (!UTILS.exists(user_rate_limiters[uid])) user_rate_limiters[uid] = new RateLimiter(CONFIG.RATE_LIMIT.USER_MESSAGES, CONFIG.RATE_LIMIT.USER_TIME_S);
    return user_rate_limiters[uid];
}

function sendToChannel(cid, text) {//duplicated in discordcommands.js
    wsapi.sendTextToChannel(cid, text);
}

function sendEmbedToChannel(cid, embed, approvable = false) {
    wsapi.sendEmbedToChannel(cid, embed, approvable);
}

function loadAllStaticResources(callback = () => {
}) {
    callback();
}

setInterval(() => {//long term maintenance loop
    loadAllStaticResources();
    wsapi.getUserBans();
    wsapi.getServerBans();
    setStatus();
}, 60000 * 15);

function setStatus() {
    client.user.setStatus("online").catch(console.error);
    client.user.setActivity("osu!").catch(console.error);
    /*
    if (STATUS.CHAMPION_EMOJIS) {
        client.user.setStatus("online").catch(console.error);
        client.user.setActivity("League of Legends").catch(console.error);
    }
    else {
        for (let b in STATUS) UTILS.output("Service Degraded, check status: " + b);
        client.user.setStatus("idle").catch(console.error);
        client.user.setActivity("Service Degraded").catch(console.error);
    }*/
}
