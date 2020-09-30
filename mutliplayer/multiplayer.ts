// set NODE_OPTIONS = "--max-old-space-size=6144"; // increase to 6gb
var fs = require("fs");

export interface FormatJson {
	commander_decks: Array<Commander>;
	format_cards: Array<FormatCard>;
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface MultiPlayerDeck {
	commander: String;
	top_cards: CardNames;
	metagame_percentage: String;
	instances: number;
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
	common_archetypes: Array<[String, String]>;
	cards_found_with: CardNames;
	total_instances: number;
	percentage_of_total_cards: String;
	percentage_of_total_decks: String;
}

// export type Vector = Array<number>;
// export type DeckZip = Array<[Deck, number]>;
// export type Decks = Array<Deck>;
// export type Deck = Array<Card>;
// export type Card = [number, String];
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
export type CardNames = Array<String>;

// globals
// const NUM_CLUSTERS: number = 20;
const NUM_VERS: number = 20;
const CARD_CUTOFF: number = 0.32;
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
		total_decks += 1;
		// commanders
		let commander_name: string = decks_json[i]["name"].toString();
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

	commanders.sort((a, b) => b.instances - a.instances);
	console.log(JSON.stringify(commanders));

	function getTopCards(cards: Array<MultiPlayerCard>): CardNames {
		let topCards: CardNames = [];
	}

	for (const commander of commanders) {
		commander.cards.sort((a, b) => b.quantity - a.quantity);
		let multiplayerDeck: MultiPlayerDeck = {
			commander: commander.card_name,
			top_cards: commander.cards.slice(0, 40),
			metagame_percentage:
				((commander.instances / total_decks) * 100).toFixed(2) + "%",
			instances: commander.instances,
			best_fit_deck: { main: [], sb: [] }
		};
		let max_similar: number = 0;
		for (const deck_obj of Object.values(decks_json)) {
			if (deck_obj["name"] === commander.card_name) {
				let similar: number = 0;
				for (const card of deck_obj["main"]) {
					if (commander.cards.includes(card["name"])) {
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
	}

	let format_json: FormatJson = {
		commanders: [],
		format_cards: [],
		format_versatile_cards: [],
		total_cards_parsed: total_cards,
		unique_cards_parsed: unique_cards.length,
		total_decks_parsed: decks.length
	};
});
