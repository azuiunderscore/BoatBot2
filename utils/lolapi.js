"use strict";
const UTILS = new (require("./utils.js"))();
const fs = require("fs");
const REQUEST = require("request");
const XRegExp = require("xregexp");
const agentOptions = { ca: fs.readFileSync("../data/keys/ca.crt"), timeout: 120000 };
const tags = {
	match: "match",//matches, timelines
	matchhistory: "matchlist",//matchlists
	cmr: "cmr",//champions, masteries, runes
	leagues: "league",//leagues, challenger, master
	ranks: "league",//by summoner id
	summoner: "summonerid",//summoners by name or id
	account: "accountid",//summoners by account id
	cm: "championmastery",//summoner champion mastery
	spectator: "spectator",
	status: "status",
	tpv: "tpv"
};
module.exports = class LOLAPI {
	constructor(INIT_CONFIG, request_id, internal = false, customGet) {
		this.CONFIG = INIT_CONFIG;
		this.request_id = request_id;
		if (!UTILS.exists(this.CONFIG)) throw new Error("config.json required to access osu api.");
		else if (!UTILS.exists(this.CONFIG.OSU_API_KEY) || this.CONFIG.OSU_API_KEY === "") throw new Error("config.json OSU_API_KEY required to access osu api.");
		this.request = REQUEST;
		this.address = "https://" + this.CONFIG.API_ADDRESS;
		this.port = this.CONFIG.API_PORT;
		this.created = new Date().getTime();
		this.calls = 0;
		this.internal = internal;
		if (this.internal) {
			this.customGet = customGet;
		}
	}
	ping() {
		return new Promise((resolve, reject) => {
			const now = new Date().getTime();
			this.getIAPI("ping", {}).then(answer => {
				answer.started = now;
				answer.ended = new Date().getTime();
				resolve(answer);
			}).catch(reject);
		});
	}
	get(path, options, cachetime, maxage) {
		let that = this;
		return new Promise((resolve, reject) => {
			UTILS.assert(UTILS.exists(cachetime));
			UTILS.assert(UTILS.exists(maxage));
			let url = this.CONFIG.OSU_SERVERS.OSU + path + "?k=";
			for (let i in options) {
				url += "&" + i + "=" + encodeURIComponent(options[i]);
			}
			if (!this.internal) {
				//UTILS.output("IAPI req sent: " + url.replace(that.CONFIG.OSU_API_KEY, ""));
				const iurl = this.address + ":" + this.port + "/osu/" + cachetime + "/" + maxage + "/" + this.request_id + "/?k=" + encodeURIComponent(this.CONFIG.API_KEY) + "&url=" + encodeURIComponent(url);
				this.request({ iurl, agentOptions }, (error, response, body) => {
					if (UTILS.exists(error)) {
						reject(error);
					}
					else {
						try {
							const answer = JSON.parse(body);
							UTILS.debug(url + " : " + body);
							resolve(answer);
							if (typeof (options[i]) === "object") endpoint += options[i].map(e => "&" + i + "=" + encodeURIComponent(e)).join("");//array type
							else endpoint += "&" + i + "=" + encodeURIComponent(options[i]);
						}
						catch (e) {
							reject(e);
						}
					}
				});
			}
			else {
				this.customGet(region, tag, endpoint, maxage, cachetime).then(body => {
					if (parseJSON) {
						const answer = JSON.parse(body);
						if (UTILS.exists(answer.status)) UTILS.output(iurl + " : " + body);
						UTILS.assert(typeof (answer) === "object");
						resolve(answer);
					}
					else resolve(body);
				}).catch(reject);
			}
		});
	}
	getOffAPI(path, options, cachetime, maxage) {
		let that = this;
		return new Promise((resolve, reject) => {
			UTILS.assert(UTILS.exists(cachetime));
			UTILS.assert(UTILS.exists(maxage));
			let url = path;
			let paramcount = 0;
			for (let i in options) {
				if (paramcount == 0) url += "?" + i + "=" + encodeURIComponent(options[i]);
				else url += "&" + i + "=" + encodeURIComponent(options[i]);
				++paramcount;
			}
			//UTILS.debug("IAPI req sent: " + url.replace(that.CONFIG.OSU_API_KEY, ""));
			url = this.address + ":" + this.port + "/osu/" + cachetime + "/" + maxage + "/" + this.request_id + "/?k=" + encodeURIComponent(this.CONFIG.API_KEY) +"&url=" + encodeURIComponent(url);
			this.request({ url, agentOptions }, (error, response, body) => {
				if (UTILS.exists(error)) reject(error);
				else resolve(body);
			});
		});
	}
	getIAPI(path, options, response_expected = true, json_expected = true) {//get internal API
		if (this.internal) throw new Error("Can't call LOLAPI.getIAPI() in internal mode");
		let that = this;
		options.k = this.CONFIG.API_KEY;
		return new Promise((resolve, reject) => {
			let url = this.address + ":" + this.port + "/" + path;
			let paramcount = 0;
			for (let i in options) {
				if (paramcount == 0) url += "?" + i + "=" + encodeURIComponent(options[i]);
				else url += "&" + i + "=" + encodeURIComponent(options[i]);
				++paramcount;
			}
			++that.calls;
			this.request({ url , agentOptions }, (error, response, body) => {
				if (!response_expected) {
					resolve();
					return;
				}
				if (UTILS.exists(error)) {
					reject(error);
				}
				else if (response.statusCode !== 200) {
					reject(response.statusCode);
				}
				else {
					try {
						//UTILS.debug(body, true);
						if (json_expected) {
							const answer = JSON.parse(body);
							UTILS.output("IAPI req: " + url);
							resolve(answer);
						}
						else {
							resolve(body);
						}
					}
					catch (e) {
						reject(e);
					}
				}
			});
		});
	}
	clearCache() {
		const filenames = fs.readdirSync("./data/static-api-cache/");
		for (let b in filenames) {
			fs.unlinkSync("./data/static-api-cache/" + filenames[b]);
		}
	}
	createShortcut(uid, from, to) {
		return this.getIAPI("createshortcut/" + uid, { from, to });
	}
	removeShortcut(uid, from) {
		return this.getIAPI("removeshortcut/" + uid, { from });
	}
	removeAllShortcuts(uid) {
		return this.getIAPI("removeallshortcuts/" + uid);
	}
	getShortcut(uid, from) {
		return this.getIAPI("getshortcut/" + uid, { from });
	}
	getShortcuts(uid) {
		return this.getIAPI("getshortcuts/" + uid, {});
	}
	getVerifiedAccounts(uid) {
		return this.getIAPI("getverified/" + uid, {});
	}
	setVerifiedAccount(uid, puuid, region, expiry) {
		return this.getIAPI("setverified/" + uid, { from: region + ":" + puuid, to: expiry });
	}
	checkVerifiedAccount(uid, puuid, region) {
		return new Promise((resolve, reject) => {
			this.getIAPI("getverified/" + uid, {}).then(result => {
				resolve(UTILS.exists(result.verifiedAccounts[region + ":" + puuid]));
			}).catch(reject);
		});
	}
	terminate(msg, plevel, response, embed) {
		const now = new Date().getTime();
		let opts = {
			mid: msg.id,
			uid: msg.author.id,
			tag: msg.author.tag,
			cid: msg.channel.id,
			calls: this.calls,
			creation_time: msg.createdTimestamp,
			reply_time: now,
			ttr: now - this.created,
			permission: plevel,
			shard: process.env.SHARD_ID
		};
		if (!msg.PM) {
			opts.sid = msg.guild.id,
			opts.guild_name = msg.guild.name,
			opts.channel_name = msg.channel.name
		}
		if (UTILS.exists(msg.content)) {
			opts.content = msg.content;
			opts.clean_content = msg.cleanContent;
		}
		if (UTILS.exists(response)) opts.response = response;
		if (UTILS.exists(embed)) opts.embed = JSON.stringify(embed);
		this.getIAPI("terminate_request/" + this.request_id, opts, false).catch(console.error);
	}
	IAPIEval(script) {
		return this.getIAPI("eval/" + encodeURIComponent(script), {});
	}
	getLink(uid) {
		return this.getIAPI("getlink/" + uid, {});
	}
	setLink(uid, username) {
		return this.getIAPI("setlink/" + uid, { link: username });
	}
	banUser(uid, reason, date, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("ban", { id: uid, user: true, date, reason, issuer, issuer_tag, issuer_avatarURL });
	}
	banServer(sid, reason, date, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("ban", { id: sid, user: false, date, reason, issuer, issuer_tag, issuer_avatarURL });
	}
	warnUser(uid, reason, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("warn", { id: uid, user: true, reason, issuer, issuer_tag, issuer_avatarURL, notify: true });
	}
	warnServer(sid, reason, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("warn", { id: sid, user: false, reason, issuer, issuer_tag, issuer_avatarURL, notify: true });
	}
	noteUser(uid, reason, issuer) {
		return this.getIAPI("warn", { id: uid, user: true, reason, issuer, notify: false });
	}
	noteServer(sid, reason, issuer) {
		return this.getIAPI("warn", { id: sid, user: false, reason, issuer, notify: false });
	}
	unbanUser(uid, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("unban", { id: uid, user: true, issuer, issuer_tag, issuer_avatarURL });
	}
	unbanServer(sid, issuer, issuer_tag, issuer_avatarURL) {
		return this.getIAPI("unban", { id: sid, user: false, issuer, issuer_tag, issuer_avatarURL });
	}
	userHistory(uid, complete = true) {
		return complete ? this.getIAPI("gethistory", { id: uid, user: true }) : this.getIAPI("gethistory", { id: uid, user: true, limit: 10 });
	}
	serverHistory(sid, complete = true) {
		return complete ? this.getIAPI("gethistory", { id: sid, user: false }) : this.getIAPI("gethistory", { id: sid, user: false, limit: 10 });
	}
	getActions(uid, complete = false) {
		return complete ? this.getIAPI("getactions", { id: uid }) : this.getIAPI("getactions", { id: uid, limit: 10 });
	}
	osuGetUser(u, m = 0, id, maxage) {
		let that = this;
		const type = id ? "id" : "string";
		if (typeof(u) == "string") u = u.toLowerCase();
		return new Promise((resolve, reject) => { that.get("get_user", { u, m, type }, that.CONFIG.API_CACHETIME.GET_USER, maxage).then(result => resolve(result[0])).catch(reject); });
	}
	osuGetUserBest(u, m = 0, limit = 100, id, maxage) {
		const type = id ? "id" : "string";
		if (typeof(u) == "string") u = u.toLowerCase();
		return this.get("get_user_best", { u, m, limit, type }, this.CONFIG.API_CACHETIME.GET_USER_BEST, maxage);
	}
	osuGetUserRecent(u, m = 0, limit = 50, id, maxage) {
		const type = id ? "id" : "string";
		if (typeof(u) == "string") u = u.toLowerCase();
		return this.get("get_user_recent", { u, m, limit, type }, this.CONFIG.API_CACHETIME.GET_USER_RECENT, maxage);
	}
	osuMostRecentMode(u, id, timeout = false, maxage) {
		const type = id ? "id" : "string";
		if (typeof(u) == "string") u = u.toLowerCase();
		return new Promise((resolve, reject) => {
			Promise.all([this.osuGetUserRecent(u, 0, 50, id, maxage), this.osuGetUserRecent(u, 1, 50, id, maxage), this.osuGetUserRecent(u, 2, 50, id, maxage), this.osuGetUserRecent(u, 3, 50, id, maxage)]).then(values => {
				let latest = 0;
				let latest_index = -1;
				for (let b in values) {
					if (UTILS.exists(values[b][0])) {
						const candidate = new Date(new Date(values[b][0].date) - 28800000);
						if (candidate.getTime() > latest) {
							latest = candidate.getTime();
							//UTILS.debug("found higher value for latest: " + latest);
							latest_index = b;
						}
					}
				}
				if (timeout) {
					if (latest != 0 && latest_index != -1) {
						if (latest > new Date().getTime() - 90000) {
							UTILS.debug("latest play is valid");
							if (latest_index != -1) {
								resolve(latest_index);
							}
							else {
								reject();
							}
						}
						else {
							UTILS.debug("latest play is expired");
							UTILS.debug("typeof(latest) is " + typeof (latest));
							UTILS.debug("latest is " + (latest));
							UTILS.debug("latest_index is " + latest_index);
							UTILS.debug("current time is " + new Date().getTime());
							UTILS.debug("1.5 min ago was " + (new Date().getTime() - 90000));
							reject();
						}
					}
					else {
						UTILS.debug("typeof(latest) is " + typeof (latest));
						UTILS.debug("latest is " + (latest));
						UTILS.debug("latest_index is " + latest_index);
						UTILS.debug("current time is " + new Date().getTime());
						UTILS.debug("1.5 min ago was " + (new Date().getTime() - 90000));
						reject();
					}
				}
				else {
					if (latest_index != -1) {
						resolve(latest_index);
					}
					else {
						reject();
					}
				}
			}).catch(e => {
				console.error(e);
				reject(null);
			});
		});
	}
	osuPHPProfileLeader(user_id, m = 0, pp = 0, maxage) {
		return this.getOffAPI("https://osu.ppy.sh/pages/include/profile-leader.php", { u: user_id, m, pp }, this.CONFIG.API_CACHETIME.PHP_PROFILE_LEADER, maxage);
	}
	osuOldUserPage(user_id, maxage) {
		return this.getOffAPI("https://osu.ppy.sh/u/" + user_id, {}, this.CONFIG.API_CACHETIME.OLD_USER_PAGE, maxage);
	}
	osuUserPage(user_id, mode = 0, maxage) {
		mode = ["osu", "taiko", "fruits", "mania"][mode]
		return this.getOffAPI("https://osu.ppy.sh/users/" + user_id + "/" + mode, {}, this.CONFIG.API_CACHETIME.USER_PAGE, maxage);
	}
	osuPHPProfileGeneral(user_id, m = 0, maxage) {
		return this.getOffAPI("https://osu.ppy.sh/pages/include/profile-general.php", { u: user_id, m }, this.CONFIG.API_CACHETIME.PHP_PROFILE_GENERAL, maxage);
	}
	osuBeatmap(id, type, m, maxage) {//type is string: "b"/"s"
		return new Promise((resolve, reject) => {
			const options = {};
			if (type === "b") options.b = id;
			else if (type === "s") options.s = id;
			else throw new Error("invalid type: " + type);
			options.a = 1;
			if (UTILS.exists(m) && type !== "s") options.m = m;
			this.get("get_beatmaps", options, this.CONFIG.API_CACHETIME.GET_BEATMAP, maxage).then(result => {
				if (!UTILS.exists(result[0])) return reject(result);
				for (let b in result) {
					result[b].approved = parseInt(result[b].approved);
					result[b].approved_date = new Date(result[b].approved_date);
					result[b].last_updated = new Date(result[b].last_updated);
					result[b].bpm = parseFloat(result[b].bpm);
					result[b].diff_size = parseFloat(result[b].diff_size);
					result[b].diff_overall = parseFloat(result[b].diff_overall);
					result[b].diff_approach = parseFloat(result[b].diff_approach);
					result[b].diff_drain = parseFloat(result[b].diff_drain);
					result[b].difficultyrating = parseFloat(result[b].difficultyrating);
					result[b].hit_length = parseInt(result[b].hit_length);
					result[b].mode = parseInt(result[b].mode);
					result[b].total_length = parseInt(result[b].total_length);
					result[b].favourite_count = parseInt(result[b].favourite_count);
					result[b].playcount = parseInt(result[b].playcount);
					result[b].passcount = parseInt(result[b].passcount);
					result[b].max_combo = parseInt(result[b].max_combo);
				}
				resolve(result);
			}).catch(reject);
		});
	}
	osuBeatmapFile(b, last_updated, maxage) {
		let that = this;
		return new Promise((resolve, reject) => {
			that.getOffAPI("https://osu.ppy.sh/osu/" + b, {}, that.CONFIG.API_CACHETIME.OSU_FILE, maxage).then(data => {
				fs.exists(that.CONFIG.BEATMAP_CACHE_LOCATION + b + ".osu", val => {//check if beatmap is in cache folder
					if (val) {//beatmap file present in cache folder
						fs.stat(that.CONFIG.BEATMAP_CACHE_LOCATION + b + ".osu", (err, stat) => {//get stats about the cached beatmap file
							if (err) {
								console.error(err);
								overwrite();
							}
							else if (UTILS.now() - stat.mtime.getTime() > maxage * 1000) {//too old (maxage)
								UTILS.debug("beatmap file in cache folder too old; overwriting...");
								overwrite();//update it
							}
							else if (last_updated > stat.mtime.getTime()) {
								UTILS.debug("beatmap file in cache folder needs to be updated; overwriting...");
								overwrite();
							}
							else {//not too old
								UTILS.debug("beatmap file in cache folder is up to date");
								return resolve(data);
							}
						});
					}
					else {
						UTILS.debug("beatmap file in cache folder does not exist; writing...");
						overwrite();
					}
				});
				function overwrite() {
					fs.writeFile(that.CONFIG.BEATMAP_CACHE_LOCATION + b + ".osu", data, err => {
						return err ? reject(err) : resolve(data);
					});
				}
			}).catch(reject);
		});
	}
	getPreferences(sid) {
		return this.getIAPI("getpreferences", { id: sid });
	}
	checkPreferences(sid) {
		return this.getIAPI("existspreferences", { id: sid });
	}
	setPreferences(sid, prop, val, type) {
		return this.getIAPI("setpreferences", { id: sid, prop, val, type });
	}
	resetPreferences(sid) {
		return this.getIAPI("resetpreferences", { id: sid });
	}
	stats() {
		return this.getIAPI("stats", {});
	}
}
