var fs = require("fs");

fs.readFile("decks_json/decks-modern.json", "utf8", function (err, json) {
	var decks_json = JSON.parse(json);
	// console.log(JSON.stringify(decks_json));
	cluster = [
		"Stomping Ground",
		"Wooded Foothills",
		"Snow-Covered Mountain",
		"Sakura-Tribe Elder",
		"Summoner's Pact",
		"Cinder Glade",
		"Primeval Titan",
		"Valakut, the Molten Pinnacle",
		"Sheltered Thicket",
		"Search for Tomorrow",
		"Field of the Dead",
		"Farseek",
		"Snow-Covered Forest",
		"Windswept Heath",
		"Scapeshift",
		"Castle Garenbrig",
		"Misty Rainforest",
		"Verdant Catacombs",
		"Once Upon a Time",
		"Arboreal Grazer"
	];

	var cluster_name = "Unknown";
	var best_fit_deck;
	var max_similar = 0;
	for (const deck_obj of Object.values(decks_json)) {
		var similar = 0;
		for (const card of deck_obj["main"]) {
			if (cluster.includes(card["name"])) {
				similar += 1;
			}
			if (similar > max_similar) {
				max_similar = similar;
				cluster_name = decks_json[i]["name"];
				best_fit_deck = {
					main: decks_json[i]["main"],
					sb: decks_json[i]["sb"]
				};
			}
		}
	}
	console.log("\nCluster #" + i + " (" + cluster_name + ") :");
	console.log(cluster);
});
