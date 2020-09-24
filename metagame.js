"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const skmeans = require("skmeans");
// globals
const NUM_CLUSTERS = 20;
const NUM_TOP_VERS = 15;
const FORMATS = ["modern", "legacy", "pauper"];
const IGNORE = [
    "Island",
    "Forest",
    "Mountain",
    "Swamp",
    "Plains"
];
var decks = [];
var all_cards = [];
var cards_w_ignore = [];
var unique_cards = [];
function cardNames(deck) {
    let names = [];
    for (const card in deck) {
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
// function quantityOfCard(name: String): number {
// 	let q: number = 0;
// 	console.log(JSON.stringify(unique_cards));
// 	for (const card of unique_cards) {
// 		if (card.card_name == "Lightning Bolt") {
// 			console.log("bolt");
// 		}
// 		if (card.card_name.includes(name.toString())) {
// 			q = card.quantity;
// 		}
// 	}
// 	return q;
// }
function quantityOfCard(name) {
    let q = 0;
    console.log(JSON.stringify(unique_cards));
    for (var i in unique_cards) {
        let card_name = unique_cards[i].card_name;
        if (card_name == name) {
            if (card_name.includes(name.toString())) {
                q = unique_cards[i].quantity;
            }
        }
    }
    return q;
}
function distance(x, y) {
    let d = 0.0;
    for (let [z, elem] of x.entries()) {
        d += (elem - y[z]) * (elem - y[z]);
    }
    return Math.sqrt(d);
}
// function intersect(a1, a2) {
// 	let a3 = [...a1, ...a2];
// 	// console.log(a3);
// 	return a1.filter(function (n) {
// 		return a2.indexOf(n) !== -1;
// 	});
// }
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
    // console.log(JSON.Stringify(decks_json));
    for (const i of Object.keys(decks_json)) {
        var deck_of_cards = [];
        for (const card of decks_json[i]["main"]) {
            // initialize deck dict, determine card data
            deck_of_cards.push([card["quantity"], card["name"]]);
            all_cards.push(card["name"]);
            if (!IGNORE.some(c => card["name"].includes(c))) {
                cards_w_ignore.push(card["name"]);
            }
            let idx = unique_cards.findIndex(c => c.card_name.includes(card.name));
            if (idx === -1) {
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
    var format_json = {
        archetypes: [],
        format_top_cards: [],
        format_versatile_cards: [],
        total_cards_parsed: all_cards.length,
        unique_cards_parsed: unique_cards.length
    };
    // Determine "deck vectors" - translate mtg decks to a format that can be used for KM++
    function deckToVector(input_deck) {
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
        deck_vectors.push(deckToVector(deck));
    }
    // Determine meta using K-Means++ clustering
    var kmeans = skmeans(deck_vectors, NUM_CLUSTERS, "kmpp");
    var deck_zip = zipDeck(decks, kmeans.idxs);
    // Translate K-Means data to a format that can be parsed
    var card_counts = [];
    for (var i in [...Array(NUM_CLUSTERS).keys()]) {
        card_counts.push([parseInt(i), decksByIdx(parseInt(i)).length]);
    }
    var total_instances = 0;
    card_counts.forEach(function (a, b) {
        total_instances += a[1];
    });
    function decksByIdx(idx) {
        let indexes = [];
        for (const [label, [deck, index]] of deck_zip.entries()) {
            if (index == idx) {
                indexes.push([deck, index]);
            }
        }
        return indexes;
    }
    function apparationRatio(card_name) {
        var label_count = Array(NUM_CLUSTERS).fill(0);
        for (const [label, [deck, id]] of deck_zip.entries()) {
            for (var card of deck) {
                if (card[1].includes(card_name.toString())) {
                    label_count[id] += 1;
                }
            }
        }
        let total_apps = set(label_count).length;
        let labels = [];
        for (var count of label_count) {
            labels.push(count / total_apps);
        }
        return [labels, total_apps];
    }
    // FOR EACH CLUSTER
    for (const i in [...Array(NUM_CLUSTERS).keys()]) {
        // Define cluster - Instead of taking the intersection of all the decks in a cluster, which could lead to archetype staples being excluded due to variance, this method involves taking every deck in the cluster and finding the most common cards (or archetype staples)
        var card_set = [];
        var deck_items = decksByIdx(parseInt(i));
        for (let deck_item of deck_items) {
            card_set.push(set(mostCommonCards(deck_item[0], 40)));
        }
        let card_list = Array.prototype.concat.apply([], card_set);
        let count_cards = card_list.reduce((a, b) => {
            a[b] = (a[b] || 0) + 1;
            return a;
        }, {});
        let sorted_cards = Object.keys(count_cards)
            .map(function (k) {
            return [k, count_cards[k]];
        })
            .sort(function (a, b) {
            return b[1] - a[1];
        });
        var cluster = [];
        for (var card_item of sorted_cards.slice(0, 20)) {
            cluster.push(card_item[0]);
        }
        // Calculate percentage of meta, deck name, best_fit deck
        var instances = decksByIdx(parseInt(i)).length;
        var deck_archetype = {
            archetype_name: "Unknown",
            top_cards: cluster,
            instances: deck_items.length,
            metagame_percentage: ((instances / total_instances) * 100).toFixed(2) + "%",
            best_fit_deck: { main: [], sb: [] }
        };
        let max_similar = 0;
        for (const deck_obj of Object.values(decks_json)) {
            let similar = 0;
            for (const card of deck_obj["main"]) {
                if (cluster.includes(card["name"])) {
                    similar += 1;
                }
                if (similar > max_similar) {
                    max_similar = similar;
                    deck_archetype.archetype_name = deck_obj["name"];
                    deck_archetype.best_fit_deck = {
                        main: deck_obj["main"],
                        sb: deck_obj["sb"]
                    };
                }
            }
        }
        console.log("\nCluster #" + i + " (" + deck_archetype.archetype_name + ") :");
        console.log(JSON.stringify(deck_archetype.top_cards));
        format_json.archetypes.push(deck_archetype);
    }
    function closestCards(a_card, b) {
        let a_card_app = apparationRatio(a_card)[0];
        var distances = [];
        var temp = [];
        for (var name of cards_w_ignore) {
            if (!temp.includes(name)) {
                let dist = distance(apparationRatio(name.toString())[0], a_card_app);
                temp.push(name);
                distances.push([name, dist]);
            }
        }
        distances.sort((a, b) => a[1] - b[1]);
        var closest_cards = [];
        for (const [card_name, dist] of distances.slice(0, b)) {
            if (card_name != a_card) {
                closest_cards.push(card_name);
            }
        }
        return closest_cards;
    }
    function versatileCards(k) {
        var variances = [];
        var temp = [];
        for (var name of cards_w_ignore) {
            if (!temp.includes(name)) {
                temp.push(name);
                let versatility = 0;
                for (var x of apparationRatio(name)[0]) {
                    if (x > 0) {
                        versatility += 1;
                    }
                }
                variances.push([name, versatility]);
            }
        }
        variances.sort((a, b) => b[1] - a[1]);
        var versatile_cards = [];
        for (const [card_name, versatility] of variances.slice(0, k)) {
            versatile_cards.push(card_name);
        }
        return versatile_cards;
    }
    function commonDecks(card) {
        var common_decks = [];
        let apps = apparationRatio(card);
        let i = 0;
        while (i < NUM_CLUSTERS) {
            if (apps[0][i] * 100 > 20) {
                common_decks.push(format_json["archetypes"][i]["archetype_name"]);
            }
            i += 1;
        }
        return common_decks;
    }
    //  Determine top cards in format
    unique_cards.sort((a, b) => b.quantity - a.quantity);
    for (var card_dict of unique_cards.splice(0, NUM_TOP_VERS)) {
        let card_name = card_dict.card_name.toString();
        let quantity = card_dict.quantity;
        var top_card = {
            card_name: card_name,
            common_archetypes: commonDecks(card_name),
            cards_found_with: closestCards(card_name, 8),
            total_instances: quantity,
            percentage_of_total_cards: ((quantity / cards_w_ignore.length) * 100).toFixed(2) + "%"
        };
        format_json["format_top_cards"].push(top_card);
    }
    //  Determine versatile cards in format
    for (var v_card of versatileCards(NUM_TOP_VERS)) {
        let card_name = v_card.toString();
        let quantity = quantityOfCard(card_name);
        var versatile_card = {
            card_name: v_card,
            common_archetypes: commonDecks(card_name),
            cards_found_with: closestCards(card_name, 8),
            total_instances: quantity,
            percentage_of_total_cards: ((quantity / cards_w_ignore.length) * 100).toFixed(2) + "%"
        };
        format_json["format_versatile_cards"].push(versatile_card);
    }
    // Sort JSON
    format_json["archetypes"].sort((a, b) => parseFloat(b.metagame_percentage.replace("%", "")) -
        parseFloat(a.metagame_percentage.replace("%", "")));
    format_json["format_versatile_cards"].sort((a, b) => b.total_instances - a.total_instances);
    // Write JSON Output
    fs.writeFile(FORMATS[0] + ".json", JSON.stringify(format_json, null, 4), "utf8", function (err, data) { });
});
