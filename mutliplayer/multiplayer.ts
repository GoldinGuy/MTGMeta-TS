var fs = require("fs");

export interface MultiPlayerFormatJson {
	commander_decks: Array<MultiPlayerDeck>;
	format_top_cards: Array<FormatCard>;
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface MultiPlayerDeck {
	commander: String;
	metagame_percentage: String;
	instances: number;
	top_cards: TopCards;
	best_fit_deck: {
		main: Array<{
			name: String;
			quantity: number;
		}>;
		sb: Array<{
			name: String;
			quantity: number;
		}>;
	};
}

export interface FormatCard {
	card_name: String;
	common_decks: Array<[String, String]>;
	cards_found_with: CardNames;
	total_instances: number;
	percentage_of_total_cards: String;
	percentage_of_total_decks: String;
}

export type Commander = {
	card_name: String;
	cards: Array<MultiPlayerCard>;
	instances: number;
};
export type MultiPlayerCard = {
	card_name: String;
	quantity: number;
};

export type UniqueCard = {
	card_name: String;
	quantity: number;
	decks_in: number;
};
export type TopCards = Array<[String, String]>;
export type CardNames = Array<String>;

// globals
const NUM_SELECTION: number = 50;
const FORMATS: Array<String> = ["commander", "brawl"];
const IGNORE: CardNames = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var multiplayer_decks: Array<MultiPlayerDeck> = [];
var commanders: Array<Commander> = [];
var unique_cards: Array<UniqueCard> = [];
var total_cards: number = 0;
var total_decks: number = 0;
var total_cards_no_basics: number = 0;

fs.readFile("input_json/decks-" + FORMATS[0] + ".json", "utf8", function (
	err: String,
	json: string
) {
	const decks_json: JSON = JSON.parse(json);
	for (const i of Object.keys(decks_json)) {
		let commander_name: string = decks_json[i]["name"].toString();
		if (commander_name != "Unknown") {
			total_decks += 1;
			// commanders
			const command_idx = commanders.findIndex(c =>
				c.card_name.includes(commander_name)
			);

			let multiplayer_deck_cards: Array<MultiPlayerCard> = [];
			for (const card of decks_json[i]["main"]) {
				if (card["name"] != null) {
					total_cards += 1;
					if (!IGNORE.some(c => card["name"].includes(c))) {
						total_cards_no_basics += 1;
						// unique cards
						let idx = unique_cards.findIndex(c =>
							c.card_name.includes(card.name)
						);
						if (idx === -1) {
							unique_cards.push({
								card_name: card["name"],
								quantity: card["quantity"],
								decks_in: 1
							});
						} else {
							unique_cards[idx].quantity += card["quantity"];
							unique_cards[idx].decks_in += 1;
						}
						//    cards by multiplayer deck
						if (command_idx === -1) {
							const card_idx = multiplayer_deck_cards.findIndex(c =>
								c.card_name.includes(card.name)
							);
							if (card_idx === -1) {
								multiplayer_deck_cards.push({
									card_name: card["name"],
									quantity: card["quantity"]
								});
							} else {
								multiplayer_deck_cards[card_idx].quantity += card["quantity"];
							}
						} else {
							const card_idx = commanders[command_idx].cards.findIndex(c =>
								c.card_name.includes(card.name)
							);
							if (card_idx === -1) {
								commanders[command_idx].cards.push({
									card_name: card["name"],
									quantity: card["quantity"]
								});
							} else {
								commanders[command_idx].cards[card_idx].quantity +=
									card["quantity"];
							}
						}
					}
				}
			}

			if (command_idx === -1) {
				let commander: Commander = {
					card_name: commander_name,
					cards: multiplayer_deck_cards,
					instances: 1
				};
				commanders.push(commander);
			} else {
				commanders[command_idx].instances += 1;
			}
		}
	}

	commanders.sort((a, b) => b.instances - a.instances);
	console.log(JSON.stringify(commanders));

	function getTopCards(commander: Commander): TopCards {
		let topCards: TopCards = [];
		for (const card of commander.cards.slice(0, NUM_SELECTION)) {
			if (card.card_name != commander.card_name) {
				topCards.push([
					card.card_name,
					((card.quantity / commander.instances) * 100).toFixed(2) +
						"%" +
						" of " +
						commander.instances +
						" decks"
				]);
			}
		}
		return topCards;
	}

	// get more detailed data on each deck
	for (const commander of commanders) {
		commander.cards.sort((a, b) => b.quantity - a.quantity);
		let multiplayerDeck: MultiPlayerDeck = {
			commander: commander.card_name,
			metagame_percentage:
				((commander.instances / total_decks) * 100).toFixed(2) + "%",
			instances: commander.instances,
			top_cards: getTopCards(commander),
			best_fit_deck: { main: [], sb: [] }
		};
		let max_similar: number = 0;
		for (const deck_obj of Object.values(decks_json)) {
			if (deck_obj["name"] === commander.card_name) {
				let similar: number = 0;
				for (const card of deck_obj["main"]) {
					if (commander.cards.some(c => c[0] === card.card_name)) {
						similar += 1;
					}
					if (similar > max_similar) {
						max_similar = similar;
						multiplayerDeck.best_fit_deck = {
							main: deck_obj["main"],
							sb: deck_obj["sb"]
						};
					}
				}
			}
		}
		multiplayer_decks.push(multiplayerDeck);
	}

	function apparationRatio(a_card: String): [Array<number>, number] {
		let label_count: Array<number> = Array(commanders.length).fill(0);
		for (let i = 0; i < commanders.length; i++) {
			for (const card of commanders[i].cards) {
				if (card.card_name.includes(a_card.toString())) {
					label_count[i] = card.quantity;
				}
			}
		}
		let total_apps = label_count.reduce((a, b) => a + b, 0);
		let labels: Array<number> = [];
		for (const count of label_count) {
			labels.push(count / total_apps);
		}
		return [labels, total_apps];
	}

	function distance(x: Array<number>, y: Array<number>): number {
		let d: number = 0.0;
		for (let [z, elem] of x.entries()) {
			d += (elem - y[z]) * (elem - y[z]);
		}
		return Math.sqrt(d);
	}

	function closestCards(a_card: String, b: number): CardNames {
		const a_card_app = apparationRatio(a_card)[0];
		let distances: Array<[String, number]> = [];
		for (const unique_card of unique_cards) {
			let dist = distance(
				apparationRatio(unique_card.card_name)[0],
				a_card_app
			);
			distances.push([unique_card.card_name, dist]);
		}
		distances.sort((a, b) => a[1] - b[1]);
		let closest_cards: CardNames = [];
		for (const dist of distances.slice(0, b)) {
			if (dist[0] != a_card) {
				closest_cards.push(dist[0]);
			}
		}
		return closest_cards;
	}

	function commonDecks(card_name: String): Array<[String, String]> {
		let common_decks: Array<[String, String]> = [];
		for (const commander of commanders) {
			let idx = commander.cards.findIndex(c =>
				c.card_name.includes(card_name.toString())
			);
			if (idx != -1) {
				let percent: number = Math.min(
					(commander.cards[idx].quantity / commander.instances) * 100,
					100
				);
				if (percent > 40 && commander.instances > 3) {
					common_decks.push([
						commander.card_name,
						percent.toFixed(2) + "% of " + commander.instances + " decks"
					]);
				}
			}
		}
		common_decks.sort(
			(a, b) =>
				parseFloat(b[1].replace("%", "")) - parseFloat(a[1].replace("%", ""))
		);
		return common_decks.slice(0, 3);
	}

	function versatileCards(k: number): CardNames {
		let versatile_cards: CardNames = [];
		let cards: Array<UniqueCard> = unique_cards.sort(
			(a, b) => b.decks_in - a.decks_in
		);
		for (const unique_card of cards.splice(0, k)) {
			versatile_cards.push(unique_card.card_name);
		}
		return versatile_cards;
	}

	function formatCards(k: number): Array<FormatCard> {
		let formatCards: Array<FormatCard> = [];
		let cards: Array<UniqueCard> = unique_cards.sort(
			(a, b) => b.quantity - a.quantity
		);
		for (const unique_card of cards.splice(0, k)) {
			formatCards.push({
				card_name: unique_card.card_name,
				common_decks: commonDecks(unique_card.card_name),
				cards_found_with: closestCards(unique_card.card_name, 5),
				total_instances: unique_card.quantity,
				percentage_of_total_cards:
					((unique_card.quantity / total_cards_no_basics) * 100).toFixed(2) +
					"%",
				percentage_of_total_decks:
					((unique_card.quantity / total_decks) * 100).toFixed(2) + "%"
			});
		}
		return formatCards;
	}

	let multiplayer_format_json: MultiPlayerFormatJson = {
		commander_decks: multiplayer_decks,
		format_top_cards: formatCards(NUM_SELECTION),
		format_versatile_cards: versatileCards(NUM_SELECTION),
		total_cards_parsed: total_cards,
		unique_cards_parsed: unique_cards.length,
		total_decks_parsed: total_decks
	};

	// Sort JSON
	multiplayer_format_json["commander_decks"].sort(
		(a, b) => b.instances - a.instances
	);
	multiplayer_format_json["format_top_cards"].sort(
		(a, b) => b.total_instances - a.total_instances
	);

	// Write JSON Output
	fs.writeFile(
		"output_json/" + FORMATS[0] + ".json",
		JSON.stringify(multiplayer_format_json, null, 4),
		"utf8",
		function (err: String, data: String) {}
	);
});
