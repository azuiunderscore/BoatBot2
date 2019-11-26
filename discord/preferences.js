"use strict";
const UTILS = new (require("../utils/utils.js"))();
const fs = require("fs");
const os = require("os");
const argv_options = new (require("getopts"))(process.argv.slice(2), {
	alias: { c: ["config"] },
	default: { c: "config.json5" }});
let cache = {};
let CONFIG;
const JSON5 = require("json5");
try {
	CONFIG = JSON5.parse(fs.readFileSync("../" + argv_options.config, "utf-8"));
}
catch (e) {
	UTILS.output("something's wrong with config.json");
	console.error(e);
	process.exit(1);
}
const preferencesFormat = {
	"id": "string",
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
	"replaycount": "boolean",
	"abi": "boolean",
	"force_prefix": "boolean",
	"feedback_enabled": "boolean",
	"compare_mode": "number",
	"score_en": "number",
	"player_en": "number",
	"beatmap_en": "number",
	"general_en": "number",
	"username_en": "number"
};
const newPreferences = {//new server defaults
	"id": "",
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
	"replaycount": true,
	"abi": true,
	"force_prefix": false,
	"feedback_enabled": true,//allow use of global feedback commands
	"compare_mode": 3,//3 means all comparisons allowed, 2 means old comparisons only, 1 means self comparisons only, 0 means all comparisons off
	"score_en": CONFIG.CONSTANTS.NORMALMEMBERS,
	"player_en": CONFIG.CONSTANTS.NORMALMEMBERS,
	"beatmap_en": CONFIG.CONSTANTS.NORMALMEMBERS,
	"general_en": CONFIG.CONSTANTS.NORMALMEMBERS,
	"username_en": CONFIG.CONSTANTS.NORMALMEMBERS
};

module.exports = class Preferences {
	constructor(lolapi, guild, callback) {
		this.lolapi = lolapi;
		if (!UTILS.exists(CONFIG)) throw new Error("config.json required.");
		this.address = "https://" + CONFIG.API_ADDRESS;
		this.port = CONFIG.API_PORT;
		this.sid = UTILS.exists(guild) ? guild.id : undefined;
		this.path = os.homedir() + "/bbs/data/public/" + this.sid + ".json";
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
						writeNew();
					}
				}
				else {//otherwise make a new one
					writeNew();
				}
				function writeNew() {
					UTILS.debug(this.sid + " preferences: preferences file not found or corrupted");
					cache[this.sid] = UTILS.copy(newPreferences);
					fs.writeFile(this.path, JSON.stringify(cache[this.sid], null, "\t"), e => {
						if (e) console.error(e);
						else UTILS.output("wrote new preferences file");
					});
				}
			}
			else UTILS.debug(this.sid + " preferences: cache hit");//exists in cache and nothing needs to be done
		}
		else this.server_message = false;//PM
		callback(this);
	}
	resetToDefault() {
		return new Promise((resolve, reject) => {
			this.lolapi.resetPreferences(this.sid).then(new_p => {
				cache[this.sid] = new_p;
				resolve();
			}).catch(e => reject(":x: Database operation failed"));
		});
	}
	get(prop) {
		if (this.server_message) {
			if (UTILS.exists(cache[this.sid][prop]) && typeof(cache[this.sid][prop]) === preferencesFormat[prop]) return cache[this.sid][prop];
			else {
				UTILS.debug("Preferences retrieval for " + this.sid + " resulted in a corrupted format. Attempting to set default for property: " + prop);
				this.set(prop, newPreferences[prop]);
				return newPreferences[prop];
			}
		}
		else return newPreferences[prop];
	}
	set(prop, val) {
		return new Promise((resolve, reject) => {
			UTILS.debug("Attempting to set preferences[\"" + this.sid + "\"][\"" + prop + "\"] = " + val + ";");
			if (!this.server_message || !UTILS.exists(preferencesFormat[prop]) || typeof(val) !== preferencesFormat[prop]) return reject();
			cache[this.sid][prop] = val;
			fs.writeFile(this.path, JSON.stringify(cache[this.sid]), e => {
				if (e) reject(e);
				else resolve();
			});
		});
	}
	clearAllCache() {
		cache = {};
	}
}
