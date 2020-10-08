var fs = require("fs");

export interface MultiplayerFormatJson {
	archetypes: Array<MultiplayerDeck>;
	format_top_cards: Array<FormatCard>;
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface MultiplayerDeck {
	commander: string;
	cards: Array<MultiPlayerCard>;
	metagame_percentage: number;
	instances: number;
	top_cards: TopCards;
	best_fit_deck: {
		main: Zone;
		sb: Zone;
		maxSimilar: number;
	};
	deck_ids: Array<string>;
}

export interface FormatCard {
	card_name: string;
	common_decks: Array<[string, string]>;
	cards_found_with: CardNames;
	total_instances: number;
	percentage_of_total_cards: string;
	percentage_of_total_decks: string;
}

export interface InputDeck {
	id: string;
	name: string;
	format: string;
	command: CardNames;
	main: Zone;
	sb: Zone;
}

export type Zone = {
	name: string;
	quantity: number;
}[];

export type MultiPlayerCard = {
	card_name: string;
	quantity: number;
};

export type UniqueCard = {
	card_name: string;
	quantity: number;
	decks_in: number;
};
export type TopCards = Array<[string, string]>;
export type CardNames = Array<string>;

// globals
const NUM_SELECTION: number = 50;
const FORMATS: Array<string> = ["commander", "brawl"];
const IGNORE: CardNames = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var multiplayerDecks: Array<MultiplayerDeck> = [];
// var commanders: Array<Commander> = [];
var uniqueCards: Array<UniqueCard> = [];
var totalCards: number = 0;
var totalDecks: number = 0;
var totalCardsNoBasics: number = 0;

const json = fs.readFileSync(
	"input_json/decks-" + FORMATS[0] + ".json",
	"utf8"
);
const decksJson: InputDeck[] = JSON.parse(json);

for (const deck of decksJson) {
	if (deck.name != "Unknown") {
		totalDecks += 1;
		const cmdIdx = multiplayerDecks.findIndex(c =>
			c.commander.includes(deck.name)
		);
		let similar: number = 0;
		let multiplayerDeckCards: Array<MultiPlayerCard> = [];
		for (const card of deck.main) {
			if (card.name != null) {
				totalCards += 1;
				if (!IGNORE.some(c => card.name.includes(c))) {
					totalCardsNoBasics += 1;
					// unique cards
					let i = uniqueCards.findIndex(c => c.card_name.includes(card.name));
					if (i === -1) {
						uniqueCards.push({
							card_name: card.name,
							quantity: card.quantity,
							decks_in: 1
						});
					} else {
						uniqueCards[i].quantity += card.quantity;
						uniqueCards[i].decks_in += 1;
					}
					//    cards by multiplayer deck
					if (cmdIdx === -1) {
						const card_idx = multiplayerDeckCards.findIndex(c =>
							c.card_name.includes(card.name)
						);
						if (card_idx === -1) {
							multiplayerDeckCards.push({
								card_name: card.name,
								quantity: card.quantity
							});
						} else {
							multiplayerDeckCards[card_idx].quantity += card.quantity;
						}
					} else {
						const card_idx = multiplayerDecks[cmdIdx].cards.findIndex(c =>
							c.card_name.includes(card.name)
						);
						if (card_idx === -1) {
							multiplayerDecks[cmdIdx].cards.push({
								card_name: card.name,
								quantity: card.quantity
							});
						} else {
							multiplayerDecks[cmdIdx].cards[card_idx].quantity +=
								card.quantity;
							similar += 1;
						}
					}
				}
			}
		}

		if (cmdIdx === -1) {
			let newDeck: MultiplayerDeck = {
				commander: deck.name,
				cards: multiplayerDeckCards,
				instances: 1,
				metagame_percentage: 0,
				top_cards: [],
				best_fit_deck: { main: deck.main, sb: deck.sb, maxSimilar: 0 },
				deck_ids: [deck.id]
			};
			multiplayerDecks.push(newDeck);
		} else {
			multiplayerDecks[cmdIdx].instances += 1;
			multiplayerDecks[cmdIdx].deck_ids.push(deck.id);

			if (similar > multiplayerDecks[cmdIdx].best_fit_deck.maxSimilar) {
				multiplayerDecks[cmdIdx].best_fit_deck = {
					main: deck.main,
					sb: deck.sb,
					maxSimilar: similar
				};
			}
		}
	}
}

multiplayerDecks.sort((a, b) => b.instances - a.instances);
console.log(JSON.stringify(multiplayerDecks));

function getTopCards(commanderDeck: MultiplayerDeck): TopCards {
	let topCards: TopCards = [];
	for (const card of commanderDeck.cards.slice(0, NUM_SELECTION)) {
		if (card.card_name != commanderDeck.commander) {
			topCards.push([
				card.card_name,
				((card.quantity / commanderDeck.instances) * 100).toFixed(2) +
					"%" +
					" of " +
					commanderDeck.instances +
					" decks"
			]);
		}
	}
	return topCards;
}

function apparationRatio(a_card: string): [Array<number>, number] {
	let labelCount: Array<number> = Array(multiplayerDecks.length).fill(0);
	for (let i = 0; i < multiplayerDecks.length; i++) {
		for (const card of multiplayerDecks[i].cards) {
			if (card.card_name.includes(a_card.toString())) {
				labelCount[i] = card.quantity;
			}
		}
	}
	let totalApps = labelCount.reduce((a, b) => a + b, 0);
	let labels: Array<number> = [];
	for (const count of labelCount) {
		labels.push(count / totalApps);
	}
	return [labels, totalApps];
}

function distance(x: Array<number>, y: Array<number>): number {
	let d: number = 0.0;
	for (let [z, elem] of x.entries()) {
		d += (elem - y[z]) * (elem - y[z]);
	}
	return Math.sqrt(d);
}

function closestCards(a_card: string, b: number): CardNames {
	const cardApp = apparationRatio(a_card)[0];
	let distances: Array<[string, number]> = [];
	for (const unique_card of uniqueCards) {
		let dist = distance(apparationRatio(unique_card.card_name)[0], cardApp);
		distances.push([unique_card.card_name, dist]);
	}
	distances.sort((a, b) => a[1] - b[1]);
	let closestCards: CardNames = [];
	for (const dist of distances.slice(0, b)) {
		if (dist[0] != a_card) {
			closestCards.push(dist[0]);
		}
	}
	return closestCards;
}

function commonDecks(card_name: string): Array<[string, string]> {
	let commonDecks: Array<[string, string]> = [];
	for (const deck of multiplayerDecks) {
		let idx = deck.cards.findIndex(c =>
			c.card_name.includes(card_name.toString())
		);
		if (idx != -1) {
			let percent: number = Math.min(
				(deck.cards[idx].quantity / deck.instances) * 100,
				100
			);
			if (percent > 40 && deck.instances > 3) {
				commonDecks.push([
					deck.commander,
					percent.toFixed(2) + "% of " + deck.instances + " decks"
				]);
			}
		}
	}
	commonDecks.sort(
		(a, b) =>
			parseFloat(b[1].replace("%", "")) - parseFloat(a[1].replace("%", ""))
	);
	return commonDecks.slice(0, 3);
}

function versatileCards(k: number): CardNames {
	let versatileCards: CardNames = [];
	let cards: Array<UniqueCard> = uniqueCards.sort(
		(a, b) => b.decks_in - a.decks_in
	);
	for (const unique_card of cards.splice(0, k)) {
		versatileCards.push(unique_card.card_name);
	}
	return versatileCards;
}

function formatCards(k: number): Array<FormatCard> {
	let formatCards: Array<FormatCard> = [];
	let cards: Array<UniqueCard> = uniqueCards.sort(
		(a, b) => b.quantity - a.quantity
	);
	for (const unique_card of cards.splice(0, k)) {
		formatCards.push({
			card_name: unique_card.card_name,
			common_decks: commonDecks(unique_card.card_name),
			cards_found_with: closestCards(unique_card.card_name, 5),
			total_instances: unique_card.quantity,
			percentage_of_total_cards:
				((unique_card.quantity / totalCardsNoBasics) * 100).toFixed(2) + "%",
			percentage_of_total_decks:
				((unique_card.quantity / totalDecks) * 100).toFixed(2) + "%"
		});
	}
	return formatCards;
}

let multiplayerOutputJson: MultiplayerFormatJson = {
	archetypes: multiplayerDecks,
	format_top_cards: formatCards(NUM_SELECTION),
	format_versatile_cards: versatileCards(NUM_SELECTION),
	total_cards_parsed: totalCards,
	unique_cards_parsed: uniqueCards.length,
	total_decks_parsed: totalDecks
};

multiplayerOutputJson.archetypes.sort((a, b) => b.instances - a.instances);
multiplayerOutputJson.format_top_cards.sort(
	(a, b) => b.total_instances - a.total_instances
);

fs.writeFileSync(
	"output_json/" + FORMATS[0] + ".json",
	JSON.stringify(multiplayerOutputJson, null, 4),
	"utf8"
);
