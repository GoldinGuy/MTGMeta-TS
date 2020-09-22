"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function cardNames(deck) {
    let names = [];
    for (var card in deck) {
        names.push(card[1]);
    }
    return names;
}
function mostCommonCards(deck, k) {
    deck = deck.sort((a, b) => a[0] - b[0]).reverse();
    let card_names = [];
    for (var card in deck.slice(0, k)) {
        let card_name = deck[card][1];
        if (!IGNORE.includes(card_name)) {
            card_names.push(card_name);
        }
    }
    return card_names;
}
function decksByIdx(idx, decks_indexes) {
    let indexes = [];
    for (const [label, [deck, index]] of decks_indexes.entries()) {
        if (index == idx) {
            indexes.push([deck, index]);
        }
    }
    return indexes;
}
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
function intersect(a1, a2) {
    let a3 = [...a1, ...a2];
    console.log(a3);
    return a1.filter(function (n) {
        return a2.indexOf(n) !== -1;
    });
}
function zipDeck(a1, a2) {
    var deck_zip = [];
    for (var j = 0; j < a1.length; j++) {
        deck_zip.push([a1[j], a2[j]]);
    }
    return deck_zip;
}
function set(arr) {
    return Object.keys(arr.reduce(function (seen, val) {
        seen[val] = true;
        return seen;
    }, {}));
}
fs.readFile("decks_json/decks-" + FORMATS[0] + ".json", "utf8", function (err, json) {
    var decks_json = JSON.parse(json);
    // console.log(JSON.stringify(decks_json));
    for (var i of Object.keys(decks_json)) {
        var deck_of_cards = [];
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
            }
            else if (!IGNORE.some(c => card.name.includes(c))) {
                unique_cards[idx].quantity += card.quantity;
            }
        }
        decks.push(deck_of_cards);
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
    var kmeans = skmeans(deck_vectors, NUM_CLUSTERS, "kmpp");
    var deck_zip = zipDeck(decks, kmeans.idxs);
    var card_counts = [];
    for (var i in [...Array(NUM_CLUSTERS).keys()]) {
        card_counts.push([parseInt(i), decksByIdx(parseInt(i), deck_zip).length]);
    }
    var total_instances = 0;
    card_counts.forEach(function (a, b) {
        total_instances += a[1];
    });
    // FOR EACH CLUSTER
    for (var i in [...Array(NUM_CLUSTERS).keys()]) {
        // Instead of simply taking the intersection of all the decks in a cluster, which could lead to archetype staples being excluded due to variance, this method involves taking every deck in the cluster, finding the most common cards (or archetype staples), and then using those to define the cluster
        var card_set = [];
        for (var deck_item of decksByIdx(parseInt(i), deck_zip)) {
            card_set.push(set(mostCommonCards(deck_item[0], 40)));
        }
        let card_list = Array.prototype.concat.apply([], card_set);
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
        // console.log(sorted_cards);
        var cluster = [];
        for (var card_item of sorted_cards.slice(0, 20)) {
            cluster.push(card_item[0]);
        }
        console.log(cluster);
        var cluster_name = "Unknown";
        var best_fit_deck = { deck: [], sb: [] };
        var max_similar_cards = 0;
    }
});
// let json = JSON.stringify(rules);
// fs.writeFile("rules.json", json, "utf8", function (err, data) {
// });
