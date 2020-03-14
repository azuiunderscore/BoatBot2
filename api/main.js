"use strict";
const fs = require("fs");
const argv_options = new (require("getopts"))(process.argv.slice(2), {
	alias: { c: ["config"] },
	default: { c: "config.json5" }
});
let CONFIG;
const JSON5 = require("json5");
try {
	CONFIG = JSON5.parse(fs.readFileSync("../" + argv_options.config, "utf-8"));
	CONFIG.VERSION = "v2.2.0b";//b for non-release (in development)
}
catch (e) {
	console.log("something's wrong with config.json");
	console.error(e);
	process.exit(1);
}
const lolapi = new (require("../utils/lolapi.js"))(CONFIG, "0", true, rawAPIRequest);

let https = require('https');
const UTILS = new (require("../utils/utils.js"))();
let LoadAverage = require("../utils/loadaverage.js");
const response_type = ["Total", "Uncachable", "Cache hit", "Cache hit expired", "Cache miss"];
const load_average = [new LoadAverage(60), new LoadAverage(60), new LoadAverage(60), new LoadAverage(60), new LoadAverage(60)];
const dc_load_average = new LoadAverage(60);//discord command load average
const express = require("express");
const website = express();
let MultiPoller = require("../utils/multipoller.js");
let Profiler = require("../utils/timeprofiler.js");
let request = require("request");
let wsRoutes = require("./websockets.js");
let routes = require("./routes.js");
UTILS.assert(UTILS.exists(CONFIG.API_PORT), "API port does not exist in config.");
UTILS.output("Modules loaded.");
let apicache = require("mongoose");
apicache.connect(CONFIG.MONGODB_ADDRESS, { useNewUrlParser: true });//cache of summoner object name lookups
apicache.connection.on("error", function (e) { throw e; });

let tracker;
setTimeout(() => {//wait for shards to startup
		tracker = new MultiPoller("ScoreTracker", updatesDue, checkForUpdates, checkReadyForUpdate, justUpdated, stalled, {
		min_queue_length: 100,
		max_queue_length: 1500,
		slow_update_interval: 1200,
		fast_update_interval: 500,
		status_check_interval: 10000,
		soft_update_interval: 25
	});
}, 30000);
function updatesDue() {
	return new Promise((resolve, reject) => {
		UTILS.debug("call to updatesDue()");
		checkTrackedUsers().then(async (trackable) => {
			let update_order = [];
			const now = UTILS.now();
			for (let b in trackable) {//each user_id
				for (let c in trackable[b]) {//each mode
					if (trackable[b][c] === 0) continue;//nobody is tracking this usermode
					let docs = await track_stat_model.find({ user_id: b, mode: c }, null, { sort: { _id: -1 }});//sort by _id decending, not next scheduled update (for forced tracking reasons)
					if (UTILS.exists(docs) && UTILS.exists(docs[0])) {
						if (now > docs[0].next_scheduled_update.getTime()) update_order.push({
							id: b,
							mode:c,
							lateness: now - docs[0].next_scheduled_update.getTime()
						});
					}
					else {//create a blank track_stat_doc
						let new_doc = new track_stat_model({
							user_id: b,
							next_scheduled_update: new Date(),
							most_recent_score_date: new Date(0),
							mode: c,
							expireAt: new Date(now + (7 * 24 * 60 * 60 * 1000))
						});
						new_doc.save(console.error);
					}
				}
			}
			update_order.sort((b, a) => a.lateness - b.lateness);//descending
			resolve(update_order.map(v => {
				return { id: `${v.id}:${v.mode}`, options: {
					lateness: v.lateness,
					id: v.id,
					mode: v.mode
				}};
			}));
		}).catch(console.error);
	});
}

/** */
function checkForUpdates(id, options) {
	return new Promise((resolve, reject) => {
		track_stat_model.find({ user_id: options.id }, null, { sort: { _id: -1 }}, (err, docs) => {//sorty by _id descending
			UTILS.debug("checking for updates: " + id);
			const last_score_time = UTILS.exists(docs[0]) ? docs[0].most_recent_score_date.getTime() : 0;
			lolapi.osuGetUserRecent(options.id, options.mode, null, true, CONFIG.API_MAXAGE.TRACKING.GET_USER_RECENT).then(recent_plays => {
				let check_indices = [];
				for (let i = recent_plays.length - 1; i >= 0; --i) {//iterate through all recent plays, filter plausible scores
					if (recent_plays[i].date.getTime() > last_score_time && recent_plays[i].rank !== "F") check_indices.push(i);
				}
				lolapi.osuBeatmap(recent_plays[0].beatmap_id, "b", mode, CONFIG.API_MAXAGE.TRACKING.GET_BEATMAP).then(beatmap => {
					beatmap = beatmap[0];
					beatmap.mode = mode;//force assigning mode (autoconvert)
					request_profiler.end("beatmap");
					request_profiler.begin("dynamic");
					let jobs = [];
					let jobtype = [];
					jobs.push(lolapi.osuBeatmapFile(beatmap.beatmap_id, beatmap.last_update.getTime(), CONFIG.API_MAXAGE.TRACKING.OSU_FILE));//just ensures that a copy of the beatmap file is present in the cache directory
					jobtype.push(CONFIG.CONSTANTS.OSU_FILE);
					//UTILS.inspect("beatmap.approved", beatmap.approved);
					if (recent_plays[0].rank !== "F" && (beatmap.approved === 1 || beatmap.approved === 2)) {//ranked or approved (possible top pp change)
						jobs.push(lolapi.osuGetUserBest(options.id, mode, 100, true, CONFIG.API_MAXAGE.TRACKING.GET_USER_BEST));//get user best
						jobtype.push(CONFIG.CONSTANTS.USER_BEST);
					}
					if (beatmap.approved > 0) {//leaderboarded score (check beatmap leaderboards)
						jobs.push(lolapi.osuScore(mode, recent_plays[0].beatmap_id, CONFIG.API_MAXAGE.TRACKING.GET_SCORE));
						jobtype.push(CONFIG.CONSTANTS.SCORE);//leaderboard
						jobs.push(lolapi.osuScoreUser(options.id, true, mode, recent_plays[0].beatmap_id, CONFIG.API_MAXAGE.TRACKING.GET_SCORE_USER));
						jobtype.push(CONFIG.CONSTANTS.SCORE_USER);
					}
					jobs.push(lolapi.osuGetUserTyped(options.id, mode, true, CONFIG.API_MAXAGE.TRACKING.GET_USER));
					jobtype.push(CONFIG.CONSTANTS.USER);
					Promise.all(jobs).then(jra => {//job result array
						request_profiler.end("dynamic");
						UTILS.debug("\n" + ctable.getTable(request_profiler.endAllCtable()));
						let user_best = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER_BEST)];
						let leaderboard = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE)].map(v => { v.beatmap_id = beatmap.beatmap_id; return v; });
						let user_scores = jra[jobtype.indexOf(CONFIG.CONSTANTS.SCORE_USER)].map(v => { v.beatmap_id = beatmap.beatmap_id; return v; });
						let user_stats = jra[jobtype.indexOf(CONFIG.CONSTANTS.USER)];
						embedgenerator.recent(CONFIG, mode, 0, recent_plays, beatmap, leaderboard, user_scores, user_best, user_stats).then(embeds => {
							let s = `Try #${UTILS.tryCount(recent_plays, 0)}`;//try count string, let shards determine whether to send this information or not
							resolve({ full: embeds.full, compact: embeds.compact, s });
						}).catch(reject);
					}).catch(reject);
				}).catch(reject);
				//set last score date here (write new document)
				//set priority and next scheduled update
			}).catch(reject);
		});
	});
}

/**
 *
 * @param {String} id
 * @description Checks if an id (usermode) is ready to be updated
 * @returns {Promise}
 */
function checkReadyForUpdate(id) {
	return new Promise((resolve, reject) => {
		//
	});
}
function justUpdated(id, results, error) {

}
function stalled() {
	console.error("Score Tracking Stalled");
}
function checkTrackedUsers() {//usermodes
	return new Promise((resolve, reject) => {
		UTILS.debug("call to updatesDue()");
		sendExpectReplyBroadcast({ type: 42 }).then(values => {
			let id_map = {};
			for (let b in values) {//for each shard response
				for (let c in values[b].id_map) {//for each server id
					id_map[c] = values[b].id_map[c];//copy the channels
				}
			}
			//id_map is now populated
			let trackable = {};
			track_setting_model.find({ type: "i" }).cursor().on("data", doc => {
				if (UTILS.exists(id_map[doc.sid]) && UTILS.exists(id_map[doc.sid][doc.cid]) && id_map[doc.sid][doc.cid]) {//valid server and channel
					if (!UTILS.exists(trackable[doc.id])) {
						trackable[doc.id]["0"] = 0;
						trackable[doc.id]["1"] = 0;
						trackable[doc.id]["2"] = 0;
						trackable[doc.id]["3"] = 0;
					}
					++trackable[doc.id][doc.mode];
				}
			}).on("error", reject).on("end", () => {
				resolve(trackable);
			});
		}).catch(reject);
	});
}
function checkTrackedUsersInServer(sid) {//usermodes
	return new Promise((resolve, reject) => {
		UTILS.debug("call to updatesDue()");
		sendExpectReplyBroadcast({ type: 44, sid }).then(values => {
			let id_map = {};
			for (let b in values) {//for each shard response
				if (UTILS.exists(values[b].id_map)) {
					for (let c in values[b].id_map) {//for each server id
						id_map[c] = values[b].id_map[c];//copy the channels
					}
					break;
				}
			}
			//id_map is now populated
			let trackable = {};
			track_setting_model.find({ type: "i", id: sid }).cursor().on("data", doc => {
				if (UTILS.exists(id_map[doc.cid])) {//valid server and channel
					if (!UTILS.exists(trackable[doc.id])) {
						trackable[doc.id]["0"] = 0;
						trackable[doc.id]["1"] = 0;
						trackable[doc.id]["2"] = 0;
						trackable[doc.id]["3"] = 0;
					}
					++trackable[doc.id];
				}
			}).on("error", reject).on("end", async () => {
				resolve(trackable);
			});
		}).catch(reject);
	});
}


let api_doc = new apicache.Schema({
	url: String,
	response: String,
	expireAt: Date
});
api_doc.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
api_doc.index({ url: "hashed" });
let api_doc_model = apicache.model("api_doc_model", api_doc);

let shortcut_doc = new apicache.Schema({//basically user preferences
	uid: { type: String, required: true },
	shortcuts: { type: apicache.Schema.Types.Mixed, default: {}, required: true },
	username: { type: String, required: isString },
	verifiedAccounts: { type: apicache.Schema.Types.Mixed, default: {}, required: true }//["region:summonerid"] = expiry date ms
}, { minimize: false });
shortcut_doc.index({ uid: "hashed" });
let shortcut_doc_model = apicache.model("shortcut_doc_model", shortcut_doc);

let disciplinary_doc = new apicache.Schema({
	user: { type: Boolean, required: true },//true for user, false for server
	ban: { type: Boolean, required: true },//true for ban, false for warning/other note
	target_id: { type: String, required: true },//target id: uid or sid
	reason: { type: String, required: true },//text reason for disciplinary action
	date: { type: Date, required: true },//new Date() set to 0 if permanent, set to date values for temporary
	active: { type: Boolean, required: true },//true if active ban, false if overridden or warning
	issuer_id: { type: String, required: true }//uid for the person who issued the ban
});
disciplinary_doc.index({ target_id: "hashed" });//direct username lookups
disciplinary_doc.index({ issuer_id: "hashed" });//direct issuer lookups
//disciplinary_doc.index({ target_id: 1 });//ranged username lookups
disciplinary_doc.index({ active: 1, date: 1, user: 1, ban: 1 });//actives for broadcast to shards
let disciplinary_model = apicache.model("disciplinary_model", disciplinary_doc);
let msg_audit_doc = new apicache.Schema({
	mid: { type: String, required: true },//message id
	uid: { type: String, required: true },//user id
	tag: { type: String, required: true },//username#discriminator
	cid: { type: String, required: true },//channel id
	sid: { type: String },//server id not required
	content: { type: String },
	clean_content: { type: String },
	guild_name: { type: String },//server name, not required
	channel_name: { type: String },//channel name, not required
	calls: { type: Number, required: true },//number of API calls
	chr: { type: Number },//0-1 floating point number for cache hit ratio
	creation_time: { type: Date, required: true },//when the command was sent
	reply_time: { type: Date, required: true },//when the reply was sent
	ttr: { type: Number, required: true },//time to respond (ms)
	permission: { type: Number, required: true },//permission level number
	response: { type: String },//string reply
	embed: { type: apicache.Schema.Types.Mixed },//embed object reply
	shard: { type: Number, required: true },
	expireAt: { type: Date, required: true }
});
msg_audit_doc.index({ mid: 1 });
msg_audit_doc.index({ uid: "hashed" });
msg_audit_doc.index({ tag: "hashed" });
msg_audit_doc.index({ cid: "hashed" });
msg_audit_doc.index({ sid: "hashed" });
msg_audit_doc.index({ content: "hashed" });
msg_audit_doc.index({ clean_content: "hashed" });
msg_audit_doc.index({ guild_name: "hashed" });
msg_audit_doc.index({ channel_name: "hashed" });
msg_audit_doc.index({ calls: -1 });
msg_audit_doc.index({ chr: -1 });
msg_audit_doc.index({ creation_time: -1 });
msg_audit_doc.index({ reply_time: -1 });
msg_audit_doc.index({ ttr: -1 });
msg_audit_doc.index({ permission: "hashed" });
msg_audit_doc.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
let msg_audit_model = apicache.model("msg_audit_model", msg_audit_doc);


let track_stat_doc = new apicache.Schema({
	user_id: { type: String, required: true },
	username: { type: String, required: isString },
	next_scheduled_update: { type: Date, required: true },
	most_recent_score_date: { type: Date, required: true },
	pp: { type: Number, default: 0, required: true },
	rank: { type: Number, default: 0, required: true },
	mode: { type: Number, required: true },
	expireAt: { type: Date, required: true }
});
track_stat_doc.index({ user_id: 1 });
track_stat_doc.index({ username: "hashed" });
track_stat_doc.index({ next_scheduled_update: -1 });
track_stat_doc.index({ most_recent_score_date: -1 });
track_stat_doc.index({ mode: 1 });
track_stat_doc.index({ expireAt: 1 }, { expireAfterSeconds: 0 });//expire old docs after a week or something
let track_stat_model = apicache.model("track_stat_model", track_stat_doc);

let track_setting_doc = new apicache.Schema({
	type: { type: String, required: true },//r = role, l = link, i = include, e = exclude, c = country, v = server voluntary enabled, o = user opt in, d = server/channel default
	mode: { type: Number, required: true },//osu mode
	id: { type: String, required: isString },//r = role id, l = empty string, i = osu id, e = osu id, c = country id, v = empty string, opt-in = uid, d = sid
	cid: { type: String, required: true },//channel to report to
	sid: { type: String, required: isString },//server this setting belongs to
	pp_threshold: { type: Number, required: false },
	top_threshold: { type: Number, required: false },
	rank_threshold: { type: Number, required: false },
	c_rank: { type: Number, required: false }//minimum country rank
});
track_setting_doc.index({ type: 1 });
track_setting_doc.index({ id: "hashed" });
track_setting_doc.index({ cid: "hashed" });
track_setting_doc.index({ sid: "hashed" });
let track_setting_model = apicache.model("track_setting_model", track_setting_doc);


let server_preferences_doc = new apicache.Schema({
	id: { type: String, required: true },//id of server
	prefix: { type: String, required: isString, default: CONFIG.DISCORD_COMMAND_PREFIX },//default bot prefix
	enabled: { type: Boolean, required: true, default: true },//whether or not the bot is enabled on the server
	slow: { type: Number, required: true, default: 0 },//self slow mode
	//region: { type: String, required: true, default: "" },//default server region, LoL ("" = disabled)
	auto_opgg: { type: Boolean, required: true, default: true },//automatically embed respond to op.gg links
	force_prefix: { type: Boolean, required: true, default: false },
	release_notifications: { type: Boolean, required: true, default: true },
	feedback_enabled: { type: Boolean, required: true, default: true },
	//music

	max_music_length: { type: Number, required: true, default: 360 },//in seconds
	paused: { type: Boolean, required: true, default: false },//music paused (or not)
	connected_playback: { type: Boolean, required: true, default: false },//requiring users to be connected in order to request songs
	personalizations: { type: Boolean, required: true, default: false },//whether or not personalizations are enabled
	personalized_commands: { type: apicache.Schema.Types.Mixed, default: {}, required: true },//
	pro: { type: Number, required: true, default: 0 },//when their premium features expire (0 = disabled)
	ccid: { type: String, required: true, default: "" },//cleverbot conversation ID
	welcome_cid: { type: String, required: true, default: "" },//welcome channel ID ("" = disabled)
	farewell_cid: { type: String, required: true, default: "" },//farewell channel ID ("" = disabled)
	faq: { type: Boolean, required: true, default: true },//FAQ responses
	what: { type: [String], required: true, default: ["what", "wat", "wut", "wot", "uwot", "u wot", "u wat", "wha", "what?", "wat?", "wut?", "wot?", "uwot?", "u wot?", "u wat?", "huh?", "hmm?", "wha?", "u wot m8", "u wot m8?", "say that me again", "say that me again.", "what did you just say", "what did you just say?", "what did u just say", "what did u just say?", "shh"] },
	nsc: { type: Boolean, required: true, default: true },//"what" triggers
	scoreMute: { type: [String], required: true, default: [] },//scoremuted channels
	atrank: { type: Number, required: true, default: 0 },//autotrack rank threshold (0 = disabled)
	attop: { type: Number, required: true, default: 0 },//autotrack top threshold (0 = disabled)
	atpp: { type: Number, required: true, default: 0 },//autotrack pp threshold (0 = disabled)
	atcid: { type: String, required: true, default: "" },//autotrack channel id
	scorecardmode: { type: Number, required: true, default: CONFIG.CONSTANTS.SCM_REDUCED },//scorecard mode
	replaycount: { type: Boolean, required: true, default: true },//show replay count (or not)
	abi: { type: Boolean, required: true, default: true }//automatic beatmap information
}, { minimize: false });
server_preferences_doc.index({ id: "hashed" });
server_preferences_doc.index({ id: 1 });
let server_preferences_model = apicache.model("server_preferences_doc", server_preferences_doc);

let region_limiters = {};
let limiter = require("bottleneck");
for (let b in CONFIG.OSU_SERVERS) region_limiters[b] = new limiter({ maxConcurrent: 1, minTime: CONFIG.API_PERIOD, highWater: 600, strategy: limiter.strategy.OVERFLOW });
let irs = {};//individual request statistics
let database_profiler = new Profiler("Database Profiler");
let server = https.createServer({
	key: fs.readFileSync("../data/keys/server.key"),
	cert: fs.readFileSync("../data/keys/server.crt"),
	ca: fs.readFileSync("../data/keys/ca.crt")
}, website).listen(CONFIG.API_PORT);
server.setTimeout(120000);
UTILS.output(CONFIG.VERSION + " IAPI " + process.env.NODE_ENV + " mode ready and listening on port " + CONFIG.API_PORT);
let websocket = require("express-ws")(website, server);
website.use(function (req, res, next) {
	res.setTimeout(120000);
	res.removeHeader("X-Powered-By");
	return next();
});
const HEARTBEAT_INTERVAL = 60000;
let shard_ws = {};
let ws_request_id = 0;
let message_handlers = {};
website.ws("/shard", (ws, req) => {
	UTILS.debug("/shard reached");
	if (!UTILS.exists(req.query.k)) return ws.close(4401);//unauthenticated
	if (req.query.k !== CONFIG.API_KEY) return ws.close(4403);//wrong key
	UTILS.debug("ws connected $" + req.query.id);
	shard_ws[req.query.id] = ws;
	//send bans
	ws.on("message", data => {
		data = JSON.parse(data);
		UTILS.debug("ws message received: $" + data.id + " type: " + data.type);
		wsRoutes(CONFIG, ws, shard_ws, data, shardBroadcast, sendToShard, getBans, sendExpectReplyBroadcast, rawAPIRequest, irs);
		if (UTILS.exists(data.request_id) && UTILS.exists(message_handlers[data.request_id])) {
			let nMsg = UTILS.copy(data);
			delete nMsg.request_id;
			message_handlers[data.request_id](nMsg);
			delete message_handlers[data.request_id];
		}
		for (let b in message_handlers) if (parseInt(b.substring(0, b.indexOf(":"))) < new Date().getTime() - (15 * 60 * 1000)) delete message_handlers[b];//cleanup old message handlers
	});
	ws.on("close", (code, reason) => {
		UTILS.output("ws $" + req.query.id + " closed: " + code + ", " + reason);
	});
	//ws.close(4200);//OK
});
function sendExpectReplyRaw(message, destination, callback) {
	let request = UTILS.copy(message);
	if (request.request_id != undefined) throw new Error("request.request_id must be undefined for send and receive");
	++ws_request_id;
	request.request_id = new Date().getTime() + ":" + ws_request_id;
	message_handlers[request.request_id] = callback;
	sendToShard(request, destination);
	UTILS.debug("request " + ws_request_id + " sent with contents" + JSON.stringify(request, null, "\t"));
}
function sendExpectReply(message, destination, timeout = 5000) {
	return new Promise((resolve, reject) => {
		sendExpectReplyRaw(message, destination, resolve);
		setTimeout(function () {
			reject(new Error("timed out waiting for response from shard"));
		}, timeout);
	});
}
function sendExpectReplyBroadcast(message, timeout = 5000) {
	let shard_numbers = [];
	for (let i = 0; i < CONFIG.SHARD_COUNT; ++i) shard_numbers.push(i);
	return Promise.all(shard_numbers.map(n => sendExpectReply(message, n, timeout)));
}

setInterval(() => {
	shardBroadcast({ type: 0 });
}, HEARTBEAT_INTERVAL);
function shardBroadcast(message, exclusions = []) {
	for (let i = 0; i < CONFIG.SHARD_COUNT; ++i) if (exclusions.indexOf(i) == -1) sendToShard(message, i);
	UTILS.debug("ws broadcast message sent: type: " + message.type);
}
function sendToShard(message, id, callback) {
	if (UTILS.exists(shard_ws[id + ""]) && shard_ws[id + ""].readyState == 1) shard_ws[id + ""].send(JSON.stringify(message), callback);
}
function getBans(user, callback) {
	disciplinary_model.find({ user, ban: true, active: true, $or: [{ date: { $eq: new Date(0) } }, { date: { $gte: new Date() } }] }, "target_id date", (err, docs) => {
		if (err) console.error(err);
		let bans = {};
		docs.forEach(ban => {
			if (!UTILS.exists(bans[ban.target_id])) bans[ban.target_id] = ban.date.getTime();
			else if (bans[ban.target_id] != 0) {//has a current temporary ban
				if (ban.date.getTime() == 0) bans[ban.target_id] = 0;//overriding permaban
				else if (ban.date.getTime() > bans[ban.target_id]) bans[ban.target_id] = ban.date.getTime();//overriding longer ban
			}
			//else;//perma'd already
		});
		callback(bans);
	});
}

serveWebRequest("/osu/:cachetime/:maxage/:request_id/", function (req, res, next) {
	if (!UTILS.exists(irs[req.params.request_id])) irs[req.params.request_id] = [0, 0, 0, 0, 0, new Date().getTime()];
	++irs[req.params.request_id][0];
	get("OSU", req.query.url, parseInt(req.params.cachetime), parseInt(req.params.maxage), req.params.request_id).then(result => res.send(result)).catch(e => {
		console.error(e);
		res.status(500);
	});
}, true);

serveWebRequest("/terminate_request/:request_id", function (req, res, next) {
	res.status(200).end()
	dc_load_average.add();
	for (let b in irs) if (new Date().getTime() - irs[b][5] > 1000 * 60 * 10) delete irs[b];//cleanup old requests
	let newaudit = {
		mid: req.query.mid,
		uid: req.query.uid,
		tag: req.query.tag,
		cid: req.query.cid,
		calls: req.query.calls,
		creation_time: new Date(parseInt(req.query.creation_time)),
		reply_time: new Date(parseInt(req.query.reply_time)),
		ttr: parseInt(req.query.ttr),
		permission: parseInt(req.query.permission),
		shard: parseInt(req.query.shard),
		expireAt: new Date(new Date().getTime() + (CONFIG.AUDIT_TTL * 1000))
	};
	if (UTILS.exists(req.query.sid)) newaudit.sid = req.query.sid;
	if (UTILS.exists(req.query.guild_name)) newaudit.guild_name = req.query.guild_name;
	if (UTILS.exists(req.query.channel_name)) newaudit.channel_name = req.query.channel_name;
	if (UTILS.exists(req.query.content)) newaudit.content = req.query.content;
	if (UTILS.exists(req.query.clean_content)) newaudit.clean_content = req.query.clean_content;
	if (UTILS.exists(req.query.response)) newaudit.response = req.query.response;
	if (UTILS.exists(req.query.embed)) newaudit.embed = JSON.parse(req.query.embed);
	if (UTILS.exists(irs[req.params.request_id])) {//request handler exists
		let description = [];
		irs[req.params.request_id][4] = irs[req.params.request_id][0] - irs[req.params.request_id][1] - irs[req.params.request_id][2] - irs[req.params.request_id][3];
		for (let i = 0; i < 5; ++i) description.push(response_type[i] + " (" + irs[req.params.request_id][i] + "): " + UTILS.round(100 * irs[req.params.request_id][i] / irs[req.params.request_id][0], 0) + "%");
		description = description.join(", ");
		UTILS.output("IAPI: request #" + req.params.request_id + " (" + (new Date().getTime() - irs[req.params.request_id][5]) + "ms): " + description);
		console.log("");
		newaudit.chr = irs[req.params.request_id][2] / irs[req.params.request_id][0];
		delete irs[req.params.request_id];
		UTILS.debug(database_profiler.endAll(), false);
	}
	let new_document = new msg_audit_model(newaudit);
	new_document.save((e, doc) => {
		if (e) console.error(e);
	})
}, true);

serveWebRequest("/eval/:script", function (req, res, next) {
	let result = {};
	try {
		result.string = eval(req.params.script);
	}
	catch (e) {
		result.string = e;
	}
	res.json(result).end();
}, true);
routes(CONFIG, apicache, serveWebRequest, response_type, load_average, disciplinary_model, shortcut_doc_model, getBans, shardBroadcast, sendExpectReply, sendExpectReplyBroadcast, sendToShard, server_preferences_model, dc_load_average, track_stat_model, track_setting_model);
function serveWebRequest(branch, callback, validate = false) {
	if (typeof (branch) == "string") {
		website.get(branch, function (req, res, next) {
			UTILS.debug("\trequest received: " + req.originalUrl);
			if (validate && !UTILS.exists(req.query.k)) return res.status(401).end();//no key
			if (validate && req.query.k !== CONFIG.API_KEY) return res.status(403).end();//wrong key
			load_average[0].add();
			callback(req, res, next);
		});
	}
	else {
		for (let b in branch) {
			website.get(branch[b], function (req, res, next) {
				UTILS.debug("\trequest received: " + req.originalUrl);
				if (validate && !UTILS.exists(req.query.k)) return res.status(401).end();//no key
				if (validate && req.query.k !== CONFIG.API_KEY) return res.status(403).end();//wrong key
				load_average[0].add();
				callback(req, res, next);
			});
		}
	}
}
function rawAPIRequest(region, tag, endpoint, maxage, cachetime) {
	return new Promise((resolve, reject) => {
		riotRequest.request(region, tag, endpoint, { maxage, cachetime }, (err, data) => {
			if (err) {
				if (!err.riotInternal || !UTILS.exists(err.response)) {//real error
					reject(500);
				}
				else {
					const oldFormat = endpointToURL(region, endpoint);
					if (cachetime != 0) addCache(oldFormat.url, err.response.res.text, cachetime);
					reject(err);
				}
			}
			else resolve(data);
		});
	});
}
function checkCache(url, maxage, request_id) {
	return new Promise((resolve, reject) => {
		database_profiler.begin(url + " cache check");
		api_doc_model.findOne({ url }, (err, doc) => {
			database_profiler.end(url + " cache check");
			if (err) return reject(err);
			if (UTILS.exists(doc)) {
				if (UTILS.exists(maxage) && apicache.Types.ObjectId(doc.id).getTimestamp().getTime() < new Date().getTime() - (maxage * 1000)) {//if expired
					//UTILS.output("\tmaxage expired url: " + url);
					load_average[3].add();
					if (UTILS.exists(irs[request_id]))++irs[request_id][3];
					doc.remove(() => { });
					reject(null);
				}
				else resolve(doc.toObject().response);
			}
			else {
				load_average[4].add();
				if (UTILS.exists(irs[request_id]))++irs[request_id][4];
				reject(null);
			}
		});
	});
}
function addCache(url, response, cachetime) {
	//UTILS.debug("CACHE ADD: " + url + " is " + JSON.parse(response).status);
	let new_document = new api_doc_model({ url: url, response: response, expireAt: new Date(new Date().getTime() + (cachetime * 1000)) });
	new_document.save((e, doc) => {
		if (e) console.error(e);
	});
}
function get(region, url, cachetime, maxage, request_id) {
	//cachetime in seconds, if cachetime is 0, do not cache
	//maxage in seconds, if maxage is 0, force refresh
	let that = this;
	return new Promise((resolve, reject) => {
		const url_with_key = url.replace("?k=", "?k=" + CONFIG.OSU_API_KEY);
		if (maxage != 0) {//don't force refresh
			checkCache(url, maxage, request_id).then((cached_result) => {
				//UTILS.output("\tcache hit: " + url);
				load_average[2].add();
				if (UTILS.exists(irs[request_id]))++irs[request_id][2];
				resolve(cached_result);
			}).catch((e) => {
				if (UTILS.exists(e)) console.error(e);
				region_limiters[region].submit((no_use, cb) => {
					cb();
					request(url_with_key, (error, response, body) => {
						if (UTILS.exists(error)) reject(error);
						else {
							//UTILS.output("\tcache miss: " + url);
							if (cachetime != 0) addCache(url, body, cachetime);
							resolve(body);
						}
					});
				}, null, () => { });
			});
		}
		else {//force refresh maxage == 0
			region_limiters[region].submit((no_use, cb) => {
				cb();
				request(url_with_key, (error, response, body) => {
					if (UTILS.exists(error)) reject(error);
					else {
						//UTILS.output("\tuncached: " + url);
						load_average[1].add();
						if (UTILS.exists(irs[request_id]))++irs[request_id][1];
						if (cachetime != 0) addCache(url, body, cachetime);
						resolve(body);
					}
				});
			}, null, () => { });
		}
	});
}
function isString(s) {
	return typeof (s) === "string";
}
