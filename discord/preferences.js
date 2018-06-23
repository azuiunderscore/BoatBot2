"use strict";
const UTILS = new (require("../utils.js"))();
const REQUEST = require("request");
const fs = require("fs");
const agentOptions = { ca: fs.readFileSync("../data/keys/ca.crt") };
let cache = {};
const preferencesFormat = {
	"personalizations": "boolean",
	"autoModerator": "boolean",
	"enabled": "boolean",//server BoatBot enable
	"protected": "object",//dictionary
	"warning": "object",//dictionary
	"personalizationCommands": "object",
	"maxMusicLength": "number",
	"nowPlayingString": "string",
	"originalSongRequester": "string",
	"welcome": "boolean",//welcome message enable or disable
	"locked": "object",//array of locked channels
	"closed": "object",//array of closed channels
	"modRole": "string",//admin assignable !op
	"adminRole": "string",//owner assignable !op
	"silenceRole": "string",
	"disciplinary": "object",//array of objects [{uid, sid, type, removal_time}, {uid, sid, type, removal_time}]
	"paused": "boolean",
	"nowPlayingMessage": "object",//array of music channel id, and message id
	"farewell": "boolean",
	"rptvccu": "boolean",
	"faq": "boolean",
	"slow": "number",//1 = 1m/20s, 2 = 1m/60s, 3 = 1m/180s, 4 = 1m/300s, 5 = 1m/600s
	"warned": "boolean",
	"social": "object",
	"refactored": "boolean",
	"reportChannel": "string",
	"what": "object",
	"nsc": "boolean",
	"scoreMute": "object",
	"prefix": "string",
	"occupation": "string",
	"interests": "string",
	"welcomeChannel": "string",
	"publicRank": "boolean",
	"volume": "number",
	"pro": "number",
	"ccid": "string",//cleverbot conversation id
	"atrank": "number",//auto track rank (0 = disabled)
	"attop": "number",//auto track top (0 = disabled)
	"atpp": "number",//auto track pp (0 = disabled)
	"atcid": "string",//auto track channel id
	"scorecardmode": "number",
	"replaycount": "boolean"
};
const newPreferences = {//new server defaults
	"personalizations": false,
	"autoModerator": false,
	"enabled": true,
	"protected": [],
	"warning": [],
	"personalizationCommands": {},
	"maxMusicLength": 360,
	"nowPlayingString": "",
	"originalSongRequester": "",
	"welcome": false,
	"locked": [],
	"closed": [],
	"modRole": "",
	"adminRole": "",
	"silenceRole": "",
	"disciplinary": [],
	"paused": false,
	"nowPlayingMessage": [],
	"farewell": false,
	"rptvccu": false,
	"faq": true,
	"slow": 0,
	"warned": false,
	"social": {},
	"refactored": false,
	"reportChannel": "",
	"what": ["what", "wat", "wut", "wot", "uwot", "u wot", "u wat", "wha", "what?", "wat?", "wut?", "wot?", "uwot?", "u wot?", "u wat?", "huh?", "hmm?", "wha?", "u wot m8", "u wot m8?", "say that me again", "say that me again.", "what did you just say", "what did you just say?", "what did u just say", "what did u just say?", "shh"],
	"nsc": true,
	"scoreMute": [],
	"prefix": "!",
	"occupation": "",
	"interests": "",
	"welcomeChannel": "",
	"farewellChannel": "",
	"publicRank": true,
	"volume": 0.25,
	"pro": 0,
	"ccid": "",
	"atrank": 0,//auto track rank (0 = disabled)
	"attop": 0,//auto track top (0 = disabled)
	"atpp": 0,//auto track pp (0 = disabled)
	"atcid": "",//auto track channel id
	"scorecardmode": 1,//SCM_REDUCED
	"replaycount": true
};
module.exports = class Preferences {
	constructor(INIT_CONFIG, lolapi, guild) {
		this.CONFIG = INIT_CONFIG;
		this.lolapi = lolapi;
		if (!UTILS.exists(this.CONFIG)) throw new Error("config.json required.");
		this.request = REQUEST;
		this.address = "https://" + this.CONFIG.API_ADDRESS;
		this.port = this.CONFIG.API_PORT;
		this.sid = UTILS.exists(guild) ? guild.id : undefined;
		this.path = "/home/iaace/bbs/data/public/" + this.sid + ".json";
		if (UTILS.exists(this.sid)) {//server message
			this.server_message = true;
			if (!UTILS.exists(cache[this.sid])) {//doesn't exist in cache
				UTILS.debug(this.sid + " preferences: cache miss");
				if (fs.existsSync(this.path)) {//check if db entry exists
					try {//read
						cache[this.sid] = JSON.parse(fs.readFileSync(this.path));
						UTILS.debug(this.sid + " preferences: loaded into cache");
					}
					catch (e) {
						console.error(e);
					}
				}
				else {//otherwise make a new one
					UTILS.debug(this.sid + " preferences: preferences file not found");
					console.error(new Error("Default preferences could not be written."));
				}
			}
			else UTILS.debug(this.sid + " preferences: cache hit");//exists in cache and nothing needs to be done
		}
		else this.server_message = false;//PM
	}
	resetToDefault() {
		;
	}
	get(prop) {
		return this.server_message ? cache[this.sid][prop] : newPreferences[prop];
	}
	set(prop, val) {
		UTILS.debug("Attempting to set preferences[\"" + this.sid + "\"][\"" + prop + "\"] = " + val + ";");
		if (!this.server_message || !UTILS.exists(preferencesFormat[prop]) || typeof(val) !== preferencesFormat[prop]) return false;
		cache[this.sid][prop] = val;
		fs.writeFile(this.path, JSON.stringify(cache[this.sid]), console.error);
		return true;
	}
	clearAllCache() {
		cache = {};
	}
}
