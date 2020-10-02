var fs = require("fs");
import { KMeans } from "./K-Means-TS/kmeans";

const KMEANS: Function = require("./K-Means-TS/kmeans");

export interface FormatJson {
	archetypes: Array<Archetype>;
	format_cards: Array<FormatCard>;
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	cards_parsed_by_deck: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface Archetype {
	archetype_name: string;
	top_cards: CardNames;
	metagame_percentage: number;
	instances: number;
	best_fit_deck: {
		main: Array<{
			name: string;
			quantity: number;
		}>;
		sb: Array<{
			name: string;
			quantity: number;
		}>;
	};
}

export interface FormatCard {
	card_name: string;
	common_archetypes: CardArchetypeRef[];
	cards_found_with: CardNames;
	total_instances: number;
	percentage_of_total_cards: number;
	percentage_of_total_decks: number;
}

export interface CardArchetypeRef {
	archetype: string;
	percent: number;
	seenInDecks: number;
	decksInArchetype: number;
}

export interface UniqueCard {
	card_name: string;
	quantity: number;
	decks_in: number;
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

export type Vector = Array<number>;
export type DeckZip = Array<[Deck, number]>;
export type Decks = Array<Deck>;
export type Deck = Array<Card>;
export type Card = [number, string];
export type CardNames = Array<string>;

class Utils {
	/**
	 * Rounds value to precision digits
	 * @param value num to round
	 * @param precision decimal places
	 */
	static round(value: number, precision: number): number {
		const multiplier = Math.pow(10, precision || 0);
		return Math.round(value * multiplier) / multiplier;
	}

	/**
	 * Get card names from a specific deck
	 * @param deck
	 */
	static cardNames(deck: Deck): CardNames {
		let names: CardNames = [];
		for (const card in deck) {
			names.push(card[1]);
		}
		return names;
	}

	/**
	 * Find the number of a particular card in the format
	 * @param cardName
	 */
	static quantityOfCard(cardName: string): number {
		let q: number = 0;
		for (const i in unique_cards) {
			let card_name: string = unique_cards[i].card_name;
			if (card_name == cardName) {
				if (card_name.includes(cardName)) {
					q = unique_cards[i].quantity;
				}
			}
		}
		return q;
	}

	/**
	 * Get the distance between two values
	 * @param x
	 * @param y
	 */
	static distance(x: Array<number>, y: Array<number>): number {
		let d: number = 0.0;
		for (let [z, elem] of x.entries()) {
			d += (elem - y[z]) * (elem - y[z]);
		}
		return Math.sqrt(d);
	}

	/**
	 * Zip two arrays of decks and indexes into one array
	 * @param a1 Array of decks
	 * @param a2 Array of indexes
	 */
	static zipDeck(a1: Decks, a2: Array<number>): DeckZip {
		let deck_zip: DeckZip = [];
		for (let j = 0; j < a1.length; j++) {
			deck_zip.push([a1[j], a2[j]]);
		}
		return deck_zip;
	}

	/**
	 * Remove duplicates from an array (turn it into a "Set")
	 * @param arr
	 */
	static set(arr: Array<any>): Array<any> {
		return Object.keys(
			arr.reduce(function (seen: boolean, val: any) {
				seen[val] = true;
				return seen;
			}, {})
		);
	}
}

// GLOBALS
const NUM_VERS: number = 20;
const THRESHOLD: number = 0.32; // percent / 100
const FORMATS: Array<string> = [
	"modern",
	"pioneer",
	"standard",
	"pauper",
	"legacy"
];
const IGNORE: CardNames = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var decks: Decks = [];
var deck_zip: DeckZip;
var vectored_card_names: CardNames = [];
var unique_cards: Array<UniqueCard> = [];
var total_cards: number = 0;

// TODO: reads the first format - this should be a loop or input parameter
const json = fs.readFileSync(
	"input_json/decks-" + FORMATS[0] + ".json",
	"utf8"
);

const decks_json: InputDeck[] = JSON.parse(json);
for (const deck of decks_json) {
	let deck_of_cards: Deck = [];
	for (const card of deck.main) {
		if (card.name) {
			deck_of_cards.push([card.quantity, card.name]);
			total_cards += card.quantity;
			vectored_card_names.push(card.name);
			if (!IGNORE.some(c => card.name.includes(c))) {
				let idx = unique_cards.findIndex(c => c.card_name.includes(card.name));
				if (idx === -1) {
					unique_cards.push({
						card_name: card.name,
						quantity: card.quantity,
						decks_in: 1
					});
				} else {
					unique_cards[idx].quantity += card.quantity;
					unique_cards[idx].decks_in += 1;
				}
			}
		}
	}
	decks.push(deck_of_cards);
}

/**
 * Find most common cards of a particular deck
 * @param deck
 * @param k num cards to return
 */
function mostCommonCards(deck: Deck, k: number): CardNames {
	deck = deck.sort((a, b) => a[0] - b[0]).reverse();
	let card_names: CardNames = [];
	for (const card in deck.slice(0, k)) {
		let cardName = deck[card][1];
		if (!IGNORE.includes(cardName)) {
			card_names.push(cardName);
		}
	}
	return card_names;
}

/**
 * Get decks of a particular cluster
 * @param idx Cluster index
 */
function decksByIdx(idx: number): DeckZip {
	let indexes: DeckZip = [];
	for (const deck of deck_zip.entries()) {
		if (deck[1][1] == idx) {
			indexes.push([deck[1][0], deck[1][1]]);
		}
	}
	return indexes;
}

/**
 * Find how often a card appears in each archetype
 * @param cardName
 */
function cardAppearanceRatio(cardName: string): [Array<number>, number] {
	let label_count: Array<number> = Array(NUM_CLUSTERS).fill(0);
	for (const deck of deck_zip.entries()) {
		for (const card of deck[1][0]) {
			if (card[1].includes(cardName)) {
				label_count[deck[1][1]] += 1;
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

// Determine "deck vectors" - translate MTG decks to a format that can be used for KM++
function deckToVector(input_deck: Deck): Vector {
	let v: Vector = Array(vectored_card_names.length).fill(0);
	for (const [x, cardName] of vectored_card_names.entries()) {
		for (const card of input_deck.entries()) {
			if (card[1][1] == cardName) {
				v[x] += card[0];
			}
		}
	}
	return v;
}

let deck_vectors: Array<Vector> = [];
for (const deck of decks) {
	deck_vectors.push(deckToVector(deck));
}

let NUM_CLUSTERS: number = Math.max(Math.round(unique_cards.length / 32), 1);
let it = 10;

let archetypes: Array<Archetype>;
do {
	console.log(NUM_CLUSTERS);
	// Determine meta using K-Means++ clustering
	const kmeans: KMeans = KMEANS(deck_vectors, NUM_CLUSTERS, "kmeans++");
	deck_zip = Utils.zipDeck(decks, kmeans.indexes);
	// Translate K-Means data to a format that can be parsed
	let card_counts: Array<[number, number]> = [];
	for (let i = 0; i < NUM_CLUSTERS; i++) {
		card_counts.push([i, decksByIdx(i).length]);
	}
	let total_instances: number = 0;
	for (const count of card_counts) {
		total_instances += count[1];
	}

	/* FOR EACH CLUSTER
	 Define cluster - Instead of taking the intersection of all the decks in a cluster, which could lead to archetype staples being excluded due to variance, this method involves taking every deck in the cluster and finding the most common cards (or archetype staples) */
	archetypes = [];
	for (let i = 0; i < NUM_CLUSTERS; i++) {
		let card_set: Array<CardNames> = [];
		let deck_items: DeckZip = decksByIdx(i);
		for (const deck_item of deck_items) {
			card_set.push(Utils.set(mostCommonCards(deck_item[0], 40)));
		}
		let card_list: CardNames = Array.prototype.concat.apply([], card_set);
		let count_cards = card_list.reduce((a, b) => {
			a[b] = (a[b] || 0) + 1;
			return a;
		}, {});
		let sorted_cards = Object.keys(count_cards)
			.map(k => [k, count_cards[k]])
			.sort(function (a, b) {
				return b[1] - a[1];
			});
		let cluster: CardNames = [];
		for (const card_item of sorted_cards.slice(0, 20)) {
			cluster.push(card_item[0]);
		}
		// Calculate percentage of meta, deck name, best_fit deck
		let deck_archetype: Archetype = {
			archetype_name: "Unknown",
			top_cards: cluster,
			instances: deck_items.length,
			metagame_percentage: Utils.round(
				(deck_items.length / total_instances) * 100,
				2
			),
			best_fit_deck: { main: [], sb: [] }
		};

		let max_similar: number = 0;
		for (const deck_obj of decks_json) {
			let similar: number = 0;
			for (const card of deck_obj.main) {
				if (cluster.includes(card.name)) {
					similar += 1;
				}
				if (similar > max_similar) {
					max_similar = similar;
					deck_archetype.archetype_name = deck_obj.name;
					deck_archetype.best_fit_deck = {
						main: deck_obj.main,
						sb: deck_obj.sb
					};
				}
			}
		}

		archetypes.push(deck_archetype);
		console.log(
			"\nCluster #" + i + " (" + deck_archetype.archetype_name + ") :"
		);
		console.log(JSON.stringify(deck_archetype.top_cards));
	}

	for (const archetype of archetypes) {
		let diff: number = 0;
		let same: number = 0;
		for (const arch_card of archetype.best_fit_deck.main) {
			archetype.top_cards.forEach(card => {
				if (!arch_card.name.includes(card)) {
					diff += 1;
				}
			});
		}
		NUM_CLUSTERS += Math.round(Math.pow(diff, 2) / 100);

		if (diff <= archetype.top_cards.length / 3) {
			for (let j = 0; j < archetypes.length; j++) {
				archetype.top_cards.forEach(card => {
					if (archetypes[j].top_cards.includes(card)) {
						same += 1;
					}
				});
			}
			NUM_CLUSTERS -= Math.round(Math.pow(same, 2) / 100);
		}
	}
	it++;
} while (NUM_CLUSTERS != archetypes.length && it < 10);

/**
 * Calculate and return the cards most commonly seen with a given card name.
 * E.g. "Oko, Thief of Crowns" is often seen with "Misty Rainforest"
 * @param cardName Name of the card to find references for
 * @param limit The number of cards to return
 */
function closestCards(cardName: string, limit: number): CardNames {
	const a_card_app = cardAppearanceRatio(cardName)[0];
	let distances: Array<[string, number]> = [];
	for (const unique_card of unique_cards) {
		let dist = Utils.distance(
			cardAppearanceRatio(unique_card.card_name)[0],
			a_card_app
		);
		distances.push([unique_card.card_name, dist]);
	}
	distances.sort((a, b) => a[1] - b[1]);
	let closest_cards: CardNames = [];
	for (const dist of distances.slice(0, limit)) {
		if (dist[0] != cardName) {
			closest_cards.push(dist[0]);
		}
	}
	return closest_cards;
}

/**
 * Get decks a card is commonly found in
 * @param cardName
 */
function commonDecks(cardName: string, limit: number = 3): CardArchetypeRef[] {
	const common_decks: CardArchetypeRef[] = [];
	let i: number = 0;
	while (i < NUM_CLUSTERS) {
		let decks_w_card: number = 0;
		const decks = decksByIdx(i);
		for (const deck of decks) {
			if (deck[0].some(card => card[1] === cardName)) {
				decks_w_card += 1;
			}
		}
		let percent: number = Utils.round((decks_w_card / decks.length) * 100, 2);
		if (percent > THRESHOLD * 100) {
			common_decks.push({
				archetype: outputJson.archetypes[i].archetype_name,
				decksInArchetype: decks_w_card,
				percent,
				seenInDecks: decks.length
			});
		}
		i += 1;
	}
	common_decks.sort((a, b) => b.percent - a.percent);
	return common_decks.slice(0, limit);
}

/**
 * Get "versatile" cards of format (cards that see play in a wide variety of archetypes)
 * @param k num cards to return
 */
function versatileCards(k: number): CardNames {
	const variances: Array<[string, number]> = [];
	for (const unique_card of unique_cards) {
		let versatility = 0;
		for (let x of cardAppearanceRatio(unique_card.card_name)[0]) {
			if (x > 0) {
				versatility += 1;
			}
		}
		variances.push([unique_card.card_name, versatility]);
	}
	variances.sort((a, b) => b[1] - a[1]);
	let versatile_cards: CardNames = [];
	for (const vers_card of variances.slice(0, k)) {
		versatile_cards.push(vers_card[0]);
	}
	return versatile_cards;
}

let outputJson: FormatJson = {
	archetypes: archetypes,
	format_cards: [],
	format_versatile_cards: versatileCards(NUM_VERS),
	total_cards_parsed: total_cards,
	cards_parsed_by_deck: vectored_card_names.length,
	unique_cards_parsed: unique_cards.length,
	total_decks_parsed: decks.length
};

for (const unique_card of unique_cards) {
	if (unique_card.quantity >= unique_cards[0].quantity * THRESHOLD) {
		let format_card: FormatCard = {
			card_name: unique_card.card_name,
			common_archetypes: commonDecks(unique_card.card_name),
			cards_found_with: closestCards(unique_card.card_name, 7),
			total_instances: unique_card.quantity,
			percentage_of_total_decks: Utils.round(
				(unique_card.decks_in / decks.length) * 100,
				2
			),
			percentage_of_total_cards: Utils.round(
				(unique_card.quantity / total_cards) * 100,
				2
			)
		};
		outputJson.format_cards.push(format_card);
	}
}

outputJson.archetypes.sort((a, b) => b.instances - a.instances);
outputJson.format_cards.sort((a, b) => b.total_instances - a.total_instances);

fs.writeFileSync(
	"output_json/" + FORMATS[0] + ".json",
	JSON.stringify(outputJson, null, 4),
	"utf8"
);
