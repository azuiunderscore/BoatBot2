"use strict";
const Discord = require("discord.js");
const UTILS = new (require("../utils.js"))();
module.exports = class EmbedGenerator {
	constructor() { }
	test() {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Test");
		newEmbed.setDescription("description");
		newEmbed.addField("`j` `      ` test", "nothing");
		return newEmbed;
	}
	help(CONFIG) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Discord Commands");
		newEmbed.setDescription("Terms of Service:\n- Don't be a bot on a user account and use SupportBot.\n- Don't abuse bugs. If you find a bug, please report it to us.\n- Don't spam useless feedback\n- If you do not want to use SupportBot, let us know and we'll opt you out of our services.\n- We reserve the right to ban users and servers from using SupportBot at our discretion.\nFor additional help, please visit <" + CONFIG.HELP_SERVER_INVITE_LINK + ">\n\n<required parameter> [optional parameter]");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "help`", "Displays this information card.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "invite`", "Provides information on how to add SupportBot to a different server.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "link <region> <username>`", "If your LoL ign is different from your discord username, you can set your LoL ign using this command, and SupportBot will remember it.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "unlink`", "Aliases:\n`" + CONFIG.DISCORD_COMMAND_PREFIX + "removelink`\n\nSupportBot forgets your preferred username and region.");
		newEmbed.addField("`<region> [username]`", "Aliases:\n`<op.gg link>`\n\nDisplays summoner information.");
		newEmbed.addField("`matchhistory <region> [username]`", "Aliases:\n`mh <region> [username]`\n\nDisplays basic information about the 5 most recent games played.");
		newEmbed.addField("`matchhistory<number> <region> [username]`", "Aliases:\n`mh<number> <region> [username]`\n\nDisplays detailed information about one of your most recently played games.");
		newEmbed.addField("`livegame <region> [username]`", "Aliases:\n`lg <region> [username]`\n`currentgame <region> [username]`\n`cg <region> [username]`\n`livematch <region> [username]`\n`lm <region> [username]`\n`currentmatch <region> [username]`\n`cm <region> [username]`\n\nShows information about a game currently being played.");
		newEmbed.addField("`service status <region>`", "Aliases:\n`servicestatus <region>`\n`status <region>`\n`ss <region>`\n\nShows information on the uptime of LoL services in a region.");
		newEmbed.addField("multi <region> [comma separated list of usernames/lobby text]", "Aliases:\n`m <region> [list of usernames or lobby text]`\n\nCompares multiple summoners in a region against each other.");
		newEmbed.addField("`" + CONFIG.DISCORD_COMMAND_PREFIX + "shortcuts`", "Displays a list of nicknames you've set for friends with hard to spell names. Visit https://supportbot.tk/ for more information on this family of commands.")
		newEmbed.setFooter("SupportBot " + CONFIG.VERSION);
		return newEmbed;
	}
	notify(CONFIG, content, username, displayAvatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTitle("Important message from SupportBot staff");
		newEmbed.setURL(CONFIG.HELP_SERVER_INVITE_LINK);
		newEmbed.setAuthor(username, displayAvatarURL);
		newEmbed.setDescription(content);
		newEmbed.setTimestamp();
		newEmbed.setFooter("Message sent ");
		return newEmbed;
	}
	status(status_object) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle(status_object.name);//region
		newEmbed.setURL("http://status.leagueoflegends.com/#" + status_object.slug);
		let status_color = [0, 255, 0];//green
		for (let b in status_object.services) {
			if (status_object.services[b].status !== "online") status_color = [255, 255, 0];
			if (status_object.services[b].status === "offline") {
				status_color = [255, 0, 0];
				break;
			}
		}
		newEmbed.setColor(status_color);
		for (let b in status_object.services) {
			let service_description = "";
			if (status_object.services[b].incidents.length > 0) {
				service_description += status_object.services[b].incidents.reduce((str, incident) => {
					if (incident.updates.length > 0) return str + incident.updates.map(update => "**" + update.severity + "**: " + update.content).join("\n") + "\n";
					else return str;
				}, "");
			}
			if (service_description === "") service_description = "*No incidents to report.*";
			newEmbed.addField(status_object.services[b].name + ": " + status_object.services[b].status, service_description);
		}
		newEmbed.setTimestamp();
		newEmbed.setThumbnail("https://cdn.discordapp.com/attachments/423261885262069771/433465885420945409/cby4p-fp0aj-0.png");
		return newEmbed;
	}
	serverBan(CONFIG, server, reason, date, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		if (date == 0) {
			newEmbed.setTitle("This server (" + server.name + ") has been permanently banned from using SupportBot");
			newEmbed.setColor([1, 1, 1]);
			newEmbed.addField("Duration", "Permanent", true);
		}
		else {
			const date_date = new Date(date);
			newEmbed.setTitle("This server (" + server.name + ") has been temporarily suspended from using SupportBot");
			newEmbed.setColor([255, 0, 0]);
			newEmbed.addField("Duration", UTILS.until(date_date), true);
			newEmbed.setFooter("This suspension expires at");
			newEmbed.setTimestamp(date_date);
		}
		newEmbed.addField("While this ban is effective", "SupportBot will ignore all messages sent from this server.", true);
		newEmbed.addField("Help", "If you believe this is a mistake, please visit " + CONFIG.HELP_SERVER_INVITE_LINK, true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	userBan(CONFIG, reason, date, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		if (date == 0) {
			newEmbed.setTitle("You have been permanently banned from using SupportBot");
			newEmbed.setColor([1, 1, 1]);
			newEmbed.addField("Duration", "Permanent", true);
		}
		else {
			const date_date = new Date(date);
			newEmbed.setTitle("You have been temporarily suspended from using SupportBot");
			newEmbed.setColor([255, 0, 0]);
			newEmbed.addField("Duration", UTILS.until(date_date), true);
			newEmbed.setFooter("This suspension expires at");
			newEmbed.setTimestamp(date_date);
		}
		newEmbed.addField("While this ban is effective", "SupportBot will ignore all messages sent from your account.", true);
		newEmbed.addField("Help", "If you believe this is a mistake, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " and state your case to an admin.", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	serverWarn(CONFIG, server, reason, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This is an official warning for your server (" + server.name + ")");
		newEmbed.setTimestamp();
		newEmbed.setColor([255, 255, 0]);
		newEmbed.addField("This server can be temporarily or permanently banned from using SupportBot", "if you continue to violate our policies.", true);
		newEmbed.addField("No further action is required from anyone.", "Please ensure everyone is familiar with our Terms and Conditions, which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	userWarn(CONFIG, reason, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This is an official warning");
		newEmbed.setColor([255, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("You can be temporarily or permanently banned from using SupportBot", "if you continue to violate our policies.", true);
		newEmbed.addField("No further action is required from you.", "Please ensure you are familiar with our Terms and Conditions, which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .", true);
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		newEmbed.setDescription("The reason given was: " + reason);
		return newEmbed;
	}
	serverUnban(CONFIG, server, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("This server (" + server.name + ") has been unbanned");
		newEmbed.setColor([0, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("Please ensure you are familiar with our Terms and Conditions", "which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .");
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		return newEmbed;
	}
	userUnban(CONFIG, issuer_tag, issuer_avatarURL) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("You have been unbanned");
		newEmbed.setColor([0, 255, 0]);
		newEmbed.setTimestamp();
		newEmbed.addField("Please ensure you are familiar with our Terms and Conditions", "which you can read about by sending `" + CONFIG.DISCORD_COMMAND_PREFIX + "help`. For more assistance, please visit " + CONFIG.HELP_SERVER_INVITE_LINK + " .");
		newEmbed.setAuthor(issuer_tag, issuer_avatarURL);
		return newEmbed;
	}
	disciplinaryHistory(CONFIG, id, user, docs) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Disciplinary History");
		let active_ban = -1;
		const now = new Date().getTime();
		for (let b in docs) {
			if (docs[b].ban && docs[b].active) {
				const ban_date = new Date(docs[b].date);
				if (ban_date.getTime() == 0) {
					active_ban = 0;
					break;
				}
				else if (ban_date.getTime() > now) {
					if (ban_date.getTime() > active_ban) active_ban = ban_date.getTime();
				}
			}
		}
		let recent_warning = false;
		for (let b in docs) {
			if (!docs[b].ban && docs[b].reason.substring(0, 9) == ":warning:") {
				recent_warning = true;
				break;
			}
		}
		if (active_ban == 0) {
			newEmbed.setColor([1, 1, 1]);
			newEmbed.setDescription("This " + (user ? "user" : "server") + " has an active permanent ban.\nHere are the 10 most recent events:");
		}
		else if (active_ban == -1) {
			if (recent_warning) {
				newEmbed.setColor([255, 255, 0]);
				newEmbed.setDescription("This " + (user ? "user" : "server") + " has been warned recently.\nHere are the 10 most recent events:");
			}
			else {
				newEmbed.setColor([0, 255, 0]);
				newEmbed.setDescription("This " + (user ? "user" : "server") + " has no active bans.\nHere are the 10 most recent events:");
			}
		}
		else {
			newEmbed.setColor([255, 0, 0]);
			newEmbed.setDescription("This " + (user ? "user" : "server") + " has an active temporary ban. It expires in " + UTILS.until(new Date(active_ban)) + ".\nHere are the 10 most recent events:");
		}
		for (let i = 0; i < docs.length && i < 10; ++i) {
			newEmbed.addField("By " + CONFIG.OWNER_DISCORD_IDS[docs[i].issuer_id].name + ", " + UTILS.ago(new Date(docs[i].id_timestamp)) + (docs[i].ban && docs[i].active ? (new Date(docs[i].date).getTime() == 0 ? ", Permanent Ban" : ", Ban Expires in " + UTILS.until(new Date(docs[i].date))) : ""), docs[i].reason);
		}
		newEmbed.setAuthor(id);
		return newEmbed;
	}
	actionReport(CONFIG, id, docs) {
		let newEmbed = new Discord.RichEmbed();
		newEmbed.setTitle("Administrative Actions Report");
		newEmbed.setDescription("Showing 10 most recent events:");
		newEmbed.setAuthor(CONFIG.OWNER_DISCORD_IDS[id].name + " (" + id + ")");
		for (let i = 0; i < docs.length && i < 10; ++i) {
			let description = "To: " + docs[i].target_id + ", ";
			description += UTILS.ago(new Date(docs[i].id_timestamp)) + ", ";
			if (docs[i].ban) {
				description += new Date(docs[i].date).getTime() == 0 ? "Permanent Ban Issued" : "Temporary Ban Issued, duration " + UTILS.duration(new Date(docs[i].id_timestamp), new Date(docs[i].date));
			}
			else if (docs[i].reason.substring(0, 9) == ":warning:") description += "Warning Issued";
			else if (docs[i].reason.substring(0, 15) == ":no_entry_sign:") description += "Bans Cleared (unbanned)";
			else description += "Note Added";
			newEmbed.addField(description, docs[i].reason);
		}
		return newEmbed;
	}
}
