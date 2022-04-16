"use strict";

// Ascii art!
console.log("                              __\r\n                     \/\\    .-\" \/\r\n                    \/  ; .\'  .\' \r\n                   :   :\/  .\'   \r\n                    \\  ;-.\'     \r\n       .--\"\"\"\"--..__\/     `.    \r\n     .\'           .\'    `o  \\   \r\n    \/                    `   ;  \r\n   :                  \\      :  \r\n .-;        -.         `.__.-\'  \r\n:  ;          \\     ,   ;       \r\n\'._:           ;   :   (        \r\n    \\\/  .__    ;    \\   `-.     \r\n    ;     \"-,\/_..--\"`-..__)    \r\n     \'\"\"--.._:");

const fs = require("fs");

const argv_options = new (require("getopts"))(process.argv.slice(2), {
	alias: { c: ["config"] },
	default: { c: "config.json5" }
});

const UTILS = new (require("../utils/utils.js"))();
const { ShardingManager } = require('discord.js');

let CONFIG;
const JSON5 = require("json5");
try {
	CONFIG = JSON5.parse(fs.readFileSync("../" + argv_options.config, "utf-8"));
}catch (e) {
	UTILS.output("something's wrong with config.json");
	console.error(e);
	process.exit(1);
}

const { Client, Intents } = require('discord.js');

const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MEMBERS);

const manager = new ShardingManager("./shard.js",
	{ token: CONFIG.DISCORD_API_KEY,
	totalShards: CONFIG.SHARD_COUNT,
	respawn: false,
	shardArgs: process.argv.slice(2) });

manager.on("launch", shard => {
	const shard_id = shard.id;
	UTILS.output("Launched shard " + shard.id);
	shard.on("death", () => {
		setTimeout(() => {
			manager.createShard(shard_id);
		}, 5000);
	});
});

manager.spawn(undefined, 2000);
UTILS.output("Sharding Manager started");
