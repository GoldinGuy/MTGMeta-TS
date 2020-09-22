var fs = require("fs");
const skmeans = require("skmeans");

export interface Kmeans {
	it: number;
	k: number;
	idxs: Array<number>;
	centroids: Array<number>;
}

export interface FormatJson {
	archetypes: Array<Archetype>;
	format_top_cards: Array<TopCard>;
	format_versatile_cards: Array<VersatileCard>;
	total_cards_parsed: number;
	unique_cards_parsed: number;
}

export interface Archetype {
	archetype_name: String;
	top_cards: Array<String>;
	metagame_percentage: String;
	best_fit_deck: {
		main: JSON;
		sb: JSON;
	};
}

export interface TopCard {
	card_name: String;
	common_archetypes: Array<String>;
	cards_found_with: Array<String>;
	total_instances: number;
	percentage_of_total_cards: String;
}

export interface VersatileCard {
	card_name: String;
	common_archetypes: Array<String>;
	cards_found_with: Array<String>;
	total_instances: number;
	percentage_of_total_cards: String;
}

export type Deck = Array<Card>;
export type Card = [number, string];

export type NUM_CLUSTERS = number;
export type NUM_TOP_VERS = number;
export type FORMATS = Array<String>;
export type IGNORE = Array<String>;

// globals
const NUM_CLUSTERS = 20;
const NUM_TOP_VERS = 15;
const FORMATS = ["modern", "legacy", "pauper"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var decks: Array<Deck> = [];
var all_cards: Array<String> = [];
var cards_w_ignore: Array<String> = [];
var unique_cards: Array<{
	card_name: String;
	quantity: number;
}> = [];

var format_json: FormatJson = {
	archetypes: [],
	format_top_cards: [],
	format_versatile_cards: [],
	total_cards_parsed: 0,
	unique_cards_parsed: 0
};

function card_names(deck: Deck): Array<String> {
	let names: Array<String> = [];
	for (var card in deck) {
		names.push(card[1]);
	}
	return names;
}

function most_common_cards(deck: Deck, k: number): Array<String> {
	deck = deck.sort((a, b) => a[0] - b[0]).reverse();
	let card_names: Array<string> = [];
	for (var card in deck.slice(0, k)) {
		let card_name = deck[card][1];
		if (!IGNORE.includes(card_name)) {
			card_names.push(card_name);
		}
	}
	return card_names;
}

function decks_by_idx(
	idx: number,
	decks_indexes: Array<[Deck, number]>
): Array<[Deck, number]> {
	let indexes: Array<[Deck, number]> = [];
	for (const [label, [deck, index]] of decks_indexes.entries()) {
		if (index == idx) {
			indexes.push([deck, index]);
		}
	}
	return indexes;
}

// function decks_by_idx(
// 	idx: number,
// 	decks_indexes: Map<number, [Deck, number]>
// ): Array<[Deck, number]> {
// 	let indexes: Array<[Deck, number]> = [];
// 	for (const [label, [deck, index]] of decks_indexes.entries()) {
// 		if (index == idx) {
// 			indexes.push([deck, index]);
// 		}
// 	}
// 	return indexes;
// }

// function apparition_ratio(card_name: String, decks_labels) {
// 	var label_count = Array(NUM_CLUSTERS).fill(0);
// 	for (const [deck, label] of decks_labels.entries()) {
// 		for (var card in decks) {
// 			if (card[1].includes(card_name)) {
// 				label_count[label] += 1;
// 			}
// 		}
// 	}
// 	let total_apps = label_count.reduce();
// 	let labels = [];
// 	for (var count in label_count) {
// 		labels.push([count / total_apps]);
// 	}
// 	return [labels, total_apps];
// }

function distance(x, y) {
	let d = 0.0;
	for (const [z, elem] of x.entries()) {
		d += (elem - y[z]) * (elem - y[z]);
	}
	return Math.sqrt(d);
}

// function intersection(arr1, arr2) {
// 	return arr1.filter(value => arr2.includes(value));
// }

function intersect(a1, a2) {
	let a3 = [...a1, ...a2];
	console.log(a3);
	return a1.filter(function (n) {
		return a2.indexOf(n) !== -1;
	});
}

// function zip(a1, a2) {
// 	var args = [].slice.call(a1, a2);
// 	var shortest =
// 		args.length == 0
// 			? []
// 			: args.reduce(function (a, b) {
// 					return a.length < b.length ? a : b;
// 			  });

// 	return shortest.map(function (_, i) {
// 		return args.map(function (array) {
// 			return array[i];
// 		});
// 	});
// }

function set(arr): Array<string> {
	return Object.keys(
		arr.reduce(function (seen, val) {
			seen[val] = true;
			return seen;
		}, {})
	);
}

fs.readFile("decks_json/decks-" + FORMATS[0] + ".json", "utf8", function (
	err: string,
	json: string
) {
	var decks_json: JSON = JSON.parse(json);
	// console.log(JSON.stringify(decks_json));
	for (var i of Object.keys(decks_json)) {
		var deck_of_cards: Deck = [];
		for (var card of decks_json[i]["main"]) {
			// create deck dict
			deck_of_cards.push([card["quantity"], card["name"]]);
			// determine card data
			all_cards.push(card["name"]);
			if (!IGNORE.some(c => card["name"].includes(c))) {
				cards_w_ignore.push(card["name"]);
			}
			var idx = unique_cards.findIndex(c => c.card_name == card.name);
			if (idx == -1) {
				unique_cards.push({
					card_name: card["name"],
					quantity: card["quantity"]
				});
			} else if (!IGNORE.some(c => card.name.includes(c))) {
				unique_cards[idx].quantity += card.quantity;
			}
		}
		decks.push(deck_of_cards);
	}

	format_json.total_cards_parsed = all_cards.length;
	format_json.unique_cards_parsed = unique_cards.length;

	function deck_to_vector(input_deck: Deck): Array<number> {
		var v: Array<number> = Array(all_cards.length).fill(0);
		for (const [x, name] of all_cards.entries()) {
			for (const [idx, card] of input_deck.entries()) {
				if (card[1] == name) {
					v[x] += card[0];
				}
			}
		}
		return v;
	}

	var deck_vectors: Array<Array<number>> = [];
	for (var deck of decks) {
		deck_vectors.push(deck_to_vector(deck));
	}
	// console.log(JSON.stringify(deck_vectors));
	// var res = skmeans(deck_vectors, NUM_CLUSTERS);
	var kmeans: Kmeans = skmeans(deck_vectors, NUM_CLUSTERS, "kmpp");
	// var deck_zip: Map<number, [Deck, number]> = ((decks: Array<Deck>, idxs: Array<number>) => decks.map((k, i) => [k, idxs[i]]));

	var deck_zip: Array<[Deck, number]> = [];
	for (var j = 0; j < decks.length; j++) {
		deck_zip.push([decks[j], kmeans.idxs[j]]);
	}

	var card_counts: Array<[number, number]> = [];
	for (var i in [...Array(NUM_CLUSTERS).keys()]) {
		card_counts.push([parseInt(i), decks_by_idx(parseInt(i), deck_zip).length]);
	}

	var total_instances: number = 0;
	card_counts.forEach(function (a, b) {
		total_instances += a[1];
	});

	// FOR EACH CLUSTER
	for (var i in [...Array(NUM_CLUSTERS).keys()]) {
		// Instead of simply taking the intersection of all the decks in a cluster, which could lead to archetype staples being excluded due to variance, this method involves taking every deck in the cluster, finding the most common cards (or archetype staples), and then using those to define the cluster
		var card_set: Array<Array<string>> = [];
		for (var deck_item of decks_by_idx(parseInt(i), deck_zip)) {
			card_set.push(set(most_common_cards(deck_item[0], 40)));
		}
		let card_list: Array<string> = Array.prototype.concat.apply([], card_set);
		// console.log(card_set);
		// var card_list = set(card_set);
		// let card_list = card_set[0];
		// var count_cards = {};

		// for (var j = 0; j < card_list.length; j++) {
		// 	var num = card_list[j];
		// 	count_cards[num] = count_cards[num] ? count_cards[num] + 1 : 1;
		// }

		let count_cards = card_list.reduce((a, b) => {
			a[b] = (a[b] || 0) + 1;
			return a;
		}, {});

		var sorted_cards = Object.keys(count_cards)
			.map(function (k) {
				return [k, count_cards[k]];
			})
			.sort(function (a, b) {
				return b[1] - a[1];
			});
		console.log(sorted_cards);

		// var cluster = [];
		// for (var card_item of sorted_cards.slice(0, 20)) {
		// 	cluster.push(card_item[0]);
		// }
		// console.log(cluster);

		var cluster_name = "Unknown";
		var best_fit_deck = { deck: [], sb: [] };
		var max_similar_cards = 0;
	}
});

// let json = JSON.stringify(rules);
// fs.writeFile("rules.json", json, "utf8", function (err, data) {
// });
