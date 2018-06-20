"use strict";
const UTILS = new (require("../utils.js"))();
const fs = require("fs");
const REQUEST = require("request");
const agentOptions = { ca: fs.readFileSync("../data/keys/ca.crt") };
module.exports = class LOLAPI {
	constructor(INIT_CONFIG, request_id) {
		this.CONFIG = INIT_CONFIG;
		this.request_id = request_id;
		if (!UTILS.exists(this.CONFIG)) throw new Error("config.json required to access osu api.");
		else if (!UTILS.exists(this.CONFIG.OSU_API_KEY) || this.CONFIG.OSU_API_KEY === "") throw new Error("config.json OSU_API_KEY required to access osu api.");
		this.request = REQUEST;
		this.address = "https://" + this.CONFIG.API_ADDRESS;
		this.port = this.CONFIG.API_PORT;
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
						UTILS.output(url + " : " + body);
						resolve(answer);
					}
					catch (e) {
						reject(e);
					}
				}
			});
		});
	}
	getIAPI(path, options, response_expected = true) {//get internal API
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
						const answer = JSON.parse(body);
						UTILS.output("IAPI req: " + url);
						resolve(answer);
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
	terminate() {
		this.getIAPI("terminate_request/" + this.request_id, {}, false).catch();
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
	userHistory(uid, complete = false) {
		return complete ? this.getIAPI("gethistory", { id: uid, user: true }) : this.getIAPI("gethistory", { id: uid, user: true, limit: 10 });
	}
	serverHistory(sid, complete = false) {
		return complete ? this.getIAPI("gethistory", { id: sid, user: false }) : this.getIAPI("gethistory", { id: sid, user: false, limit: 10 });
	}
	getActions(uid, complete = false) {
		return complete ? this.getIAPI("getactions", { id: uid }) : this.getIAPI("getactions", { id: uid, limit: 10 });
	}
	osuGetUser(options, maxage) {
		return new Promise((resolve, reject) => { this.get("get_user", options, this.CONFIG.API_CACHETIME.GET_USER, maxage).then(resolve(result => result[0])).catch(reject); });
	}
}
