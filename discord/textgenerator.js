"use strict";
const child_process = require("child_process");
const UTILS = new (require("../utils/utils.js"))();
module.exports = class TextGenerator {
	constructor() { }
	ping_callback(msg, nMsg) {
		nMsg.edit(nMsg.content + " " + (nMsg.createdTimestamp - msg.createdTimestamp) + "ms");
	}
	internal_ping(times) {
		return "Time to internal api: ~" + Math.round((times.ended - times.started) / 2) + " ms. Round Trip Time: " + (times.ended - times.started) + " ms.";
	}
	ws_ping(times) {
		return "Time to internal api via websocket: ~" + Math.round((times.ended - times.started) / 2) + " ms. Round Trip Time: " + (times.ended - times.started) + " ms.";
	}
	shortcuts(CONFIG, obj) {
		const post_desc = "To add a shortcut: `" + CONFIG.DISCORD_COMMAND_PREFIX + "setshortcut $<shortcut name> <username>`\nTo remove a shortcut: `" + CONFIG.DISCORD_COMMAND_PREFIX + "removeshortcut $<shortcut name>`\nTo remove all shortcuts: `" + CONFIG.DISCORD_COMMAND_PREFIX + "removeallshortcuts`";
		if (!UTILS.exists(obj.shortcuts) || Object.keys(obj.shortcuts).length == 0) return post_desc;
		let answer = "```";
		for (let b in obj.shortcuts) answer += "\n$" + b + " -> " + obj.shortcuts[b];
		return answer + "```" + post_desc;
	}
	roll(parameter, author) {
		const step1 = parameter;
		let num;
		if (isNaN(step1)) {
			num = 100;
			return author + " rolls " + (Math.floor(Math.random() * num) + 1) + " point(s)";
		}
		else if (step1 < 0) {}
		else if (step1 == 0) return author + " rolls " + 1 + " point(s)";
		else {
			num = step1;
			return author + " rolls " + (Math.floor(Math.random() * num) + 1) + " point(s)";
		}
	}
	coin() {
		const chance = Math.random();
		if (chance < .49) return "`HEADS` the coin landed heads up";
		else if (chance < .98) return "`TAILS` the coin landed tails up";
		else return "`SIDE` the coin landed on its side";
	}
	stats(mode, user_stats) {
		return UTILS.exists(user_stats) ? "Stats for " + user_stats.username + " (" + ["Standard", "Taiko", "Catch the Beat", "Mania"][mode] + "): <http://osu.ppy.sh/u/" + user_stats.user_id + ">\nScore:    " + UTILS.numberWithCommas(user_stats.ranked_score) + " (#" + user_stats.pp_rank + ")\nPlays:    " + user_stats.playcount + " (lv" + parseInt(user_stats.level) + ")\nAccuracy: " + UTILS.round(user_stats.accuracy, 2) + "%" : "User not found";
	}
	where(user_stats) {
		return UTILS.exists(user_stats) ? user_stats.username + " is in " + UTILS.getCountryName(user_stats.country) : "The user is currently not online.";
	}
	owners(CONFIG) {
		let answer = "Here are my bot owners:\n`user id:name`";
		for (let b in CONFIG.OWNER_DISCORD_IDS) if (CONFIG.OWNER_DISCORD_IDS[b].active) answer += "\n`" + b + ":" + CONFIG.OWNER_DISCORD_IDS[b].name + "`";
		return answer;
	}
	oppai(path_to_beatmap, args = "") {
		return new Promise((resolve, reject) => {
			args = args.trim().split(" ");
			//args.unshift(path_to_beatmap);
			child_process.execFile("../oppai", [path_to_beatmap].concat(args), { timeout: 5000 }, (err, stdout, stderr) => {
				if (err) console.error(err);
				if (UTILS.exists(stderr) && stderr != "") reject(stderr);
				else resolve(stdout);
			});
		});
	}
}
