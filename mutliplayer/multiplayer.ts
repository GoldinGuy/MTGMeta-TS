// set NODE_OPTIONS = "--max-old-space-size=6144"; // increase to 6gb
var fs = require("fs");

export interface FormatJson {
	commanders: Array<Commander>;
	format_cards: Array<FormatCard>;
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface CommanderDeck {
	archetype_name: String;
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

export type Vector = Array<number>;
export type DeckZip = Array<[Deck, number]>;
export type Decks = Array<Deck>;
export type Deck = Array<Card>;
export type Card = [number, String];
export type CardNames = Array<String>;
export type UniqueCard = {
	card_name: String;
	quantity: number;
	decks_in?: number;
};
export type Commander = {
	card_name: String;
	cards: Array<UniqueCard>;
	quantity: number;
};

// globals
// const NUM_CLUSTERS: number = 20;
const NUM_VERS: number = 20;
const CARD_CUTOFF: number = 0.32;
const FORMATS: Array<String> = ["commander", "brawl"];
const IGNORE: CardNames = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var decks: Decks = [];
var commanders: Array<Commander> = [];
var unique_cards: Array<UniqueCard> = [];
var total_cards: number = 0;

fs.readFile("input_json/decks-" + FORMATS[0] + ".json", "utf8", function (
	err: String,
	json: string
) {
	const decks_json: JSON = JSON.parse(json);
	for (const i of Object.keys(decks_json)) {
		let commander_name: string = decks_json[i]["name"].toString();
		const command_idx = commanders.findIndex(c =>
			c.card_name.includes(commander_name)
		);

		let commander_deck_cards: Array<UniqueCard> = [];
		for (const card of decks_json[i]["main"]) {
			if (card["name"] != null) {
				if (!IGNORE.some(c => card["name"].includes(c))) {
					if (command_idx === -1) {
						const card_idx = commander_deck_cards.findIndex(c =>
							c.card_name.includes(card.name)
						);
						if (card_idx === -1) {
							commander_deck_cards.push({
								card_name: card["name"],
								quantity: card["quantity"]
							});
						} else {
							commander_deck_cards[card_idx].quantity += card["quantity"];
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
				cards: commander_deck_cards,
				quantity: 1
			};
			commanders.push(commander);
		} else {
			commanders[command_idx].quantity += 1;
		}
	}

	commanders.sort((a, b) => b.quantity - a.quantity);
	console.log(JSON.stringify(commanders));
});
