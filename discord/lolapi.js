"use strict";
const UTILS = new (require("../utils.js"))();
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
	constructor(INIT_CONFIG, request_id) {
		this.CONFIG = INIT_CONFIG;
		this.request_id = request_id;
		if (!UTILS.exists(this.CONFIG)) throw new Error("config.json required to access osu api.");
		else if (!UTILS.exists(this.CONFIG.OSU_API_KEY) || this.CONFIG.OSU_API_KEY === "") throw new Error("config.json OSU_API_KEY required to access osu api.");
		this.request = REQUEST;
		this.address = "https://" + this.CONFIG.API_ADDRESS;
		this.port = this.CONFIG.API_PORT;
		this.created = new Date().getTime();
		this.calls = 0;
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
			//UTILS.output("IAPI req sent: " + url.replace(that.CONFIG.OSU_API_KEY, ""));
			url = this.address + ":" + this.port + "/osu/" + cachetime + "/" + maxage + "/" + this.request_id + "/?k=" + encodeURIComponent(this.CONFIG.API_KEY) +"&url=" + encodeURIComponent(url);
			this.request({ url, agentOptions }, (error, response, body) => {
				if (UTILS.exists(error)) {
					reject(error);
				}
				else {
					try {
						const answer = JSON.parse(body);
						UTILS.debug(url + " : " + body);
						resolve(answer);
					}
					catch (e) {
						reject(e);
					}
				}
			});
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
	osuBeatmap(b, m, maxage) {
		return new Promise((resolve, reject) => {
			const options = {
				b: b,
				a: 1
			};
			if (UTILS.exists(m)) options.m = m;
			this.get("get_beatmaps", options, this.CONFIG.API_CACHETIME.GET_BEATMAP, maxage).then(result => {
				if (UTILS.exists(result[0])) result = result[0]
				else return reject(result);
				result.approved = parseInt(result.approved);
				result.approved_date = new Date(result.approved_date);
				result.last_update = new Date(result.last_update);
				result.bpm = parseFloat(result.bpm);
				result.diff_size = parseFloat(result.diff_size);
				result.diff_overall = parseFloat(result.diff_overall);
				result.diff_approach = parseFloat(result.diff_approach);
				result.diff_drain = parseFloat(result.diff_drain);
				result.hit_length = parseInt(result.hit_length);
				result.mode = parseInt(result.mode);
				result.total_length = parseInt(result.total_length);
				result.favourite_count = parseInt(result.favourite_count);
				result.playcount = parseInt(result.playcount);
				result.passcount = parseInt(result.passcount);
				result.max_combo = parseInt(result.max_combo);
				resolve(result);
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
