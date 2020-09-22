var fs = require("fs");
const skmeans = require("skmeans");

// globals
const NUM_CLUSTERS = 20;
const NUM_TOP_VERS = 15;
const FORMATS = ["modern", "legacy", "pauper"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

var decks = [];
var all_cards = [];
var cards_w_ignore = [];
var unique_cards = [];

var format_json = {
	archetypes: [],
	format_top_cards: [],
	format_versatile_cards: [],
	total_cards_parsed: 0,
	unique_cards_parsed: 0
};

function card_names(deck) {
	let names = [];
	for (var card in deck) {
		names.push(card[1]);
	}
	return names;
}

function most_common_cards(deck, k) {
	deck = deck.sort((a, b) => a[0] - b[0]).reverse();
	let cards = [];
	for (var card in deck.slice(0, k)) {
		let card_name = deck[card][1];
		if (!IGNORE.includes(card_name)) {
			cards.push(card_name);
		}
	}
	// console.log("cards\n" + cards);
	return cards;
}

function decks_by_idx(idx, decks_indexes) {
	let indexes = [];
	for (const [label, [deck, index]] of decks_indexes.entries()) {
		if (index == idx) {
			indexes.push([deck, index]);
		}
	}
	return indexes;
}

function apparition_ratio(a_card) {
	var label_count = [0] * NUM_CLUSTERS;
	for (const [deck, label] of decks_labels.entries()) {
		for (var card in decks) {
			if (card[1].includes(a_card)) {
				label_count[label] += 1;
			}
		}
	}
	let total_apps = label_count.reduce();
	let labels = [];
	for (var count in label_count) {
		labels.push([count / total_apps]);
	}
	return labels, total_apps;
}

function distance(x, y) {
	let d = 0.0;
	for (const [z, elem] of x.entries()) {
		d += (elem - y[z]) * (elem - y[z]);
	}
	return math.sqrt(d);
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

function zip() {
	var args = [].slice.call(arguments);
	var shortest =
		args.length == 0
			? []
			: args.reduce(function (a, b) {
					return a.length < b.length ? a : b;
			  });

	return shortest.map(function (_, i) {
		return args.map(function (array) {
			return array[i];
		});
	});
}

function set(arr) {
	return Object.keys(
		arr.reduce(function (seen, val) {
			seen[val] = true;
			return seen;
		}, {})
	);
}

fs.readFile("decks_json/decks-" + FORMATS[0] + ".json", "utf8", function (
	err,
	json
) {
	var decks_json = JSON.parse(json);
	// console.log(JSON.stringify(decks_json));
	for (var i of Object.keys(decks_json)) {
		var cards_in_deck = [];
		for (var card of decks_json[i].main) {
			// create deck dict
			cards_in_deck.push([card.quantity, card.name]);
			// determine card data
			all_cards.push(card.name);
			if (!IGNORE.some(c => card.name.includes(c))) {
				cards_w_ignore.push(card.name);
			}
			if (card) var idx = unique_cards.findIndex(c => c.card_name == card.name);
			if (idx == -1) {
				unique_cards.push({
					card_name: card.name,
					quantity: card.quantity
				});
			} else if (!IGNORE.some(c => card.name.includes(c))) {
				unique_cards[idx].quantity += card.quantity;
			}
		}
		decks.push(cards_in_deck);
	}

	format_json.total_cards_parsed = all_cards.length;
	format_json.unique_cards_parsed = unique_cards.length;

	function deck_to_vector(input_deck) {
		var v = Array(all_cards.length).fill(0);
		for (const [x, name] of all_cards.entries()) {
			for (const [idx, card] of input_deck.entries()) {
				if (card[1] == name) {
					v[x] += card[0];
				}
			}
		}
		return v;
	}

	var deck_vectors = [];
	for (var deck of decks) {
		deck_vectors.push(deck_to_vector(deck));
	}
	// console.log(JSON.stringify(deck_vectors));
	// var res = skmeans(deck_vectors, NUM_CLUSTERS);
	var res = skmeans(deck_vectors, NUM_CLUSTERS, "kmpp");
	var decks_indexes = zip(decks, res.idxs);
	var card_counts = [];
	for (var idx in [...Array(NUM_CLUSTERS).keys()]) {
		card_counts.push([parseInt(idx), decks_by_idx(idx, decks_indexes).length]);
	}
	var total_instances = 0;
	card_counts.forEach(function (a, b) {
		total_instances += a[1];
	});

	for (var idx in [...Array(NUM_CLUSTERS).keys()]) {
		// var card_set = set(
		// 	most_common_cards(decks_by_idx(idx, decks_indexes)[0][0], 40)
		// );
		// console.log(decks_by_idx(idx, decks_indexes)[0] + "\n");
		// console.log(card_set + "\n");
		var card_set = [];
		for (var deck of decks_by_idx(idx, decks_indexes)) {
			// card_set = intersect(card_set, set(most_common_cards(deck[0], 40)));
			card_set.push(set(most_common_cards(deck[0], 40)));
		}
		card_set = [].concat.apply([], card_set);
		let counts = card_set.reduce((a, c) => {
			a[c] = (a[c] || 0) + 1;
			return a;
		}, {});
		console.log(counts);
		// let representativeCards = Math.max(...Object.values(counts));
		let mostFrequent = counts
			.sort(function (a, b) {
				return b - a;
			})
			.slice(0, 3);
		let representativeCards = Object.keys(counts).filter(
			k => counts[k] === mostFrequent
		);
		card_set = mostFrequent;
		console.log(card_set);

		var cluster_name = "Unknown";
		var best_fit_deck = { deck: [], sb: [] };
		max_similar_cards = 0;
	}
});

// let json = JSON.stringify(rules);
// fs.writeFile("rules.json", json, "utf8", function (err, data) {
// });
