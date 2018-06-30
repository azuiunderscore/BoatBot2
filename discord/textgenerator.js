"use strict";
const UTILS = new (require("../utils.js"))();
module.exports = class TextGenerator {
	constructor() { }
	ping_callback(msg, nMsg) {
		nMsg.edit(nMsg.content + " " + (nMsg.createdTimestamp - msg.createdTimestamp) + "ms");
	}
	internal_ping(times) {
		return "Time to internal api: " + (times.received - times.started) + " ms. Time to return: " + (times.ended - times.received) + " ms.";
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
		return UTILS.exists(user_stats) ? "Stats for " + user_stats.username + " (" + ["Standard", "Taiko", "Catch the Beat", "Mania"][mode] + "): http://osu.ppy.sh/u/" + user_stats.user_id + "\nScore:    " + UTILS.numberWithCommas(user_stats.ranked_score) + " (#" + user_stats.pp_rank + ")\nPlays:    " + user_stats.playcount + " (lv" + parseInt(user_stats.level) + ")\nAccuracy: " + UTILS.round(user_stats.accuracy, 2) + "%" : "User not found";
	}
	where(user_stats) {
		return UTILS.exists(user_stats) ? user_stats.username + " is in " + UTILS.getCountryName(user_stats.country) : "The user is currently not online.";
	}
}
