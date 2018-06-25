"use strict";
const start_time = new Date().getTime();

const fs = require("fs");
const argv_options = new (require("getopts"))(process.argv.slice(2), {
	alias: { c: ["config"] },
	default: { c: "config.json" }});
const Discord = require("discord.js");
let discordcommands = require("./discordcommands.js");

const UTILS = new (require("../utils.js"))();

const client = new Discord.Client({ disabledEvents: ["TYPING_START"] });

let CONFIG;
try {
	CONFIG = JSON.parse(fs.readFileSync("../" + argv_options.config, "utf-8"));
	CONFIG.VERSION = "v2.0.0a";//b for non-release (in development)
	CONFIG.BANS = {};
}
catch (e) {
	console.log("something's wrong with config.json");
	console.error(e);
	process.exit(1);
}
const mode = process.env.NODE_ENV === "production" ? "PRODUCTION:warning:" : process.env.NODE_ENV;
const LOLAPI = new (require("./lolapi.js"))(CONFIG, 0);
let STATUS = {
};
const wsapi = new (require("./wsapi.js"))(CONFIG, client, STATUS);
const Preferences = require("./preferences.js");
loadAllStaticResources(() => {
	UTILS.output(process.env.NODE_ENV === "production" ? "PRODUCTION LOGIN" : "DEVELOPMENT LOGIN");
	client.login().catch(console.error);
});
let initial_start = true;
client.on("ready", function () {
	if (initial_start) UTILS.output("discord user login success");
	else UTILS.output("discord reconnected");
	if (process.env.SHARD_ID == 0) {
		client.user.setStatus("idle").catch(console.error);
		client.user.setActivity("Starting Up").catch(console.error);
	}
	if (initial_start) sendToChannel(CONFIG.LOG_CHANNEL_ID, ":repeat:`$" + process.env.SHARD_ID + "`Bot started in " + UTILS.round((new Date().getTime() - start_time) / 1000, 0) + "s: version: " + CONFIG.VERSION + " mode: " + mode + " servers: " + client.guilds.size);
	else sendToChannel(CONFIG.LOG_CHANNEL_ID, ":repeat:`$" + process.env.SHARD_ID + "`Bot reconnected");
	wsapi.getUserBans();
	wsapi.getServerBans();
	UTILS.output("default champion emojis set");
	initial_start = false;
});
client.on("disconnect", function () {
	UTILS.output("discord disconnected");
});
client.on("message", function (msg) {
	try {
		const server_preferences = new Preferences(CONFIG, LOLAPI, msg.guild);
		const ACCESS_LEVEL = UTILS.accessLevel(CONFIG, msg);
		discordcommands(CONFIG, client, msg, wsapi, sendToChannel, server_preferences, ACCESS_LEVEL);
	}
	catch (e) {
		console.error(e);
	}
});
client.on("guildCreate", function (guild) {
	UTILS.output("Server Joined: " + guild.id + " :: " + guild.name + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
	sendToChannel(CONFIG.LOG_CHANNEL_ID, ":white_check_mark:`$" + process.env.SHARD_ID + "`Server Joined: `" + guild.id + "` :: " + guild.name + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
	guild.owner.send("BoatBot has joined your server: " + guild.name + "\nUse `" + CONFIG.DISCORD_COMMAND_PREFIX + "help` for information on how to use BoatBot.\nAdd BoatBot to other servers using this link: <" + CONFIG.BOT_ADD_LINK + ">").catch(e => console.error(e));
	let candidate = UTILS.preferredTextChannel(client, guild.channels, "text", UTILS.defaultChannelNames(), ["VIEW_CHANNEL", "SEND_MESSAGES"]);
	if (UTILS.exists(candidate)) candidate.send("Use `" + CONFIG.DISCORD_COMMAND_PREFIX + "help` for information on how to use BoatBot.\nAdd BoatBot to other servers using this link: <" + CONFIG.BOT_ADD_LINK + ">").catch();
});
client.on("guildDelete", function(guild) {
	UTILS.output("Server Left: " + guild.id + " :: " + guild.name + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
	sendToChannel(CONFIG.LOG_CHANNEL_ID, ":x:`$" + process.env.SHARD_ID + "`Server Left: `" + guild.id + "` :: " + guild.name + " :: Population=" + guild.memberCount + " :: " + guild.owner.user.tag);
});
function sendToChannel(cid, text) {//duplicated in discordcommands.js
	wsapi.sendTextToChannel(cid, text);
}
function loadAllStaticResources(callback = () => {}) {
	callback();
}
setInterval(() => {//long term maintenance loop
	loadAllStaticResources();
	wsapi.getUserBans();
	wsapi.getServerBans();
	if (process.env.SHARD_ID == 0) {//stuff that only 1 shard needs to do
		setStatus();
	}
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
