"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const KMEANS = require("./kmeans/kmeans.js");
// globals
const NUM_CLUSTERS = 20;
const NUM_VERS = 20;
const CARD_CUTOFF = 0.32;
const FORMATS = ["modern", "legacy", "pauper"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
var decks = [];
var all_cards = [];
var cards_w_ignore = [];
var unique_cards = [];
fs.readFile("input_json/decks-" + FORMATS[0] + ".json", "utf8", function (err, json) {
    const decks_json = JSON.parse(json);
    for (const i of Object.keys(decks_json)) {
        let deck_of_cards = [];
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
                    quantity: card["quantity"],
                    decks_in: 1
                });
            }
            else if (!IGNORE.some(c => card.name.includes(c))) {
                unique_cards[idx].quantity += card.quantity;
                unique_cards[idx].decks_in += 1;
            }
        }
        decks.push(deck_of_cards);
    }
    let format_json = {
        archetypes: [],
        format_cards: [],
        format_versatile_cards: [],
        total_cards_parsed: all_cards.length,
        unique_cards_parsed: unique_cards.length,
        total_decks_parsed: decks.length
    };
    // Determine "deck vectors" - translate mtg decks to a format that can be used for KM++
    function deckToVector(input_deck) {
        let v = Array(all_cards.length).fill(0);
        for (const [x, name] of all_cards.entries()) {
            for (const [idx, card] of input_deck.entries()) {
                if (card[1] == name) {
                    v[x] += card[0];
                }
            }
        }
        return v;
    }
    let deck_vectors = [];
    for (const deck of decks) {
        deck_vectors.push(deckToVector(deck));
    }
    // Determine meta using K-Means++ clustering
    const kmeans = KMEANS(deck_vectors, NUM_CLUSTERS, "kmeans++");
    const deck_zip = Utils.zipDeck(decks, kmeans.indexes);
    // Translate K-Means data to a format that can be parsed
    let card_counts = [];
    for (const i in [...Array(NUM_CLUSTERS).keys()]) {
        card_counts.push([parseInt(i), decksByIdx(parseInt(i)).length]);
    }
    let total_instances = 0;
    card_counts.forEach(function (a, b) {
        total_instances += a[1];
    });
    function mostCommonCards(deck, k) {
        deck = deck.sort((a, b) => a[0] - b[0]).reverse();
        let card_names = [];
        for (const card in deck.slice(0, k)) {
            let card_name = deck[card][1];
            if (!IGNORE.includes(card_name)) {
                card_names.push(card_name);
            }
        }
        return card_names;
    }
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
        let label_count = Array(NUM_CLUSTERS).fill(0);
        for (const [label, [deck, id]] of deck_zip.entries()) {
            for (const card of deck) {
                if (card[1].includes(card_name.toString())) {
                    label_count[id] += 1;
                }
            }
        }
        let total_apps = label_count.reduce((a, b) => a + b, 0);
        let labels = [];
        for (const count of label_count) {
            labels.push(count / total_apps);
        }
        return [labels, total_apps];
    }
    // FOR EACH CLUSTER
    for (const i in [...Array(NUM_CLUSTERS).keys()]) {
        // Define cluster - Instead of taking the intersection of all the decks in a cluster, which could lead to archetype staples being excluded due to variance, this method involves taking every deck in the cluster and finding the most common cards (or archetype staples)
        let card_set = [];
        let deck_items = decksByIdx(parseInt(i));
        for (const deck_item of deck_items) {
            card_set.push(Utils.set(mostCommonCards(deck_item[0], 40)));
        }
        let card_list = Array.prototype.concat.apply([], card_set);
        let count_cards = card_list.reduce((a, b) => {
            a[b.toString()] = (a[b.toString()] || 0) + 1;
            return a;
        }, {});
        let sorted_cards = Object.keys(count_cards)
            .map(k => [k, count_cards[k]])
            .sort(function (a, b) {
            return b[1] - a[1];
        });
        let cluster = [];
        for (const card_item of sorted_cards.slice(0, 20)) {
            cluster.push(card_item[0]);
        }
        // Calculate percentage of meta, deck name, best_fit deck
        let deck_archetype = {
            archetype_name: "Unknown",
            top_cards: cluster,
            instances: deck_items.length,
            metagame_percentage: ((deck_items.length / total_instances) * 100).toFixed(2) + "%",
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
        format_json.archetypes.push(deck_archetype);
        console.log("\nCluster #" + i + " (" + deck_archetype.archetype_name + ") :");
        console.log(JSON.stringify(deck_archetype.top_cards));
    }
    function closestCards(a_card, b) {
        const a_card_app = apparationRatio(a_card)[0];
        let distances = [];
        let seen = [];
        for (const name of cards_w_ignore) {
            if (!seen.includes(name)) {
                let dist = Utils.distance(apparationRatio(name.toString())[0], a_card_app);
                seen.push(name);
                distances.push([name, dist]);
            }
        }
        distances.sort((a, b) => a[1] - b[1]);
        let closest_cards = [];
        for (const [card_name, dist] of distances.slice(0, b)) {
            if (card_name != a_card) {
                closest_cards.push(card_name);
            }
        }
        return closest_cards;
    }
    function commonDecks(card_name) {
        let common_decks = [];
        let i = 0;
        while (i < NUM_CLUSTERS) {
            let decks_w_card = 0;
            const decks = decksByIdx(i);
            for (const deck of decks) {
                if (deck[0].some(card => card[1] === card_name)) {
                    decks_w_card += 1;
                }
            }
            let percent = Math.min((decks_w_card / decks.length) * 100, 100);
            if (percent > CARD_CUTOFF * 100) {
                common_decks.push([
                    format_json["archetypes"][i]["archetype_name"],
                    percent.toFixed(2) + "%"
                ]);
            }
            i += 1;
        }
        common_decks.sort((a, b) => parseFloat(b[1].replace("%", "")) - parseFloat(a[1].replace("%", "")));
        return common_decks.slice(0, 3);
    }
    function versatileCards(k) {
        let variances = [];
        let seen = [];
        for (const name of cards_w_ignore) {
            if (!seen.includes(name)) {
                seen.push(name);
                let versatility = 0;
                for (let x of apparationRatio(name)[0]) {
                    if (x > 0) {
                        versatility += 1;
                    }
                }
                variances.push([name, versatility]);
            }
        }
        variances.sort((a, b) => b[1] - a[1]);
        let versatile_cards = [];
        for (const [card_name, versatility] of variances.slice(0, k)) {
            versatile_cards.push(card_name);
        }
        return versatile_cards;
    }
    //  Determine versatile cards in format
    format_json.format_versatile_cards = versatileCards(NUM_VERS);
    //  Determine data for cards in format
    for (const unique_card of unique_cards) {
        // only use top n % of cards to ensure accuracy
        if (unique_card.quantity >= unique_cards[0].quantity * CARD_CUTOFF) {
            let format_card = {
                card_name: unique_card.card_name,
                common_archetypes: commonDecks(unique_card.card_name),
                cards_found_with: closestCards(unique_card.card_name, 7),
                total_instances: unique_card.quantity,
                percentage_of_total_cards: ((unique_card.quantity / cards_w_ignore.length) * 100).toFixed(2) +
                    "%",
                percentage_of_total_decks: ((unique_card.decks_in / decks.length) * 100).toFixed(2) + "%"
            };
            format_json["format_cards"].push(format_card);
        }
    }
    // Sort JSON
    format_json["archetypes"].sort((a, b) => b.instances - a.instances);
    format_json["format_cards"].sort((a, b) => b.total_instances - a.total_instances);
    // Write JSON Output
    fs.writeFile("output_json/" + FORMATS[0] + ".json", JSON.stringify(format_json, null, 4), "utf8", function (err, data) { });
});
class Utils {
    static cardNames(deck) {
        let names = [];
        for (const card in deck) {
            names.push(card[1]);
        }
        return names;
    }
    static quantityOfCard(name) {
        let q = 0;
        for (const i in unique_cards) {
            let card_name = unique_cards[i].card_name;
            if (card_name == name) {
                if (card_name.includes(name.toString())) {
                    q = unique_cards[i].quantity;
                }
            }
        }
        return q;
    }
    static distance(x, y) {
        let d = 0.0;
        for (let [z, elem] of x.entries()) {
            d += (elem - y[z]) * (elem - y[z]);
        }
        return Math.sqrt(d);
    }
    static zipDeck(a1, a2) {
        let deck_zip = [];
        for (let j = 0; j < a1.length; j++) {
            deck_zip.push([a1[j], a2[j]]);
        }
        return deck_zip;
    }
    static set(arr) {
        return Object.keys(arr.reduce(function (seen, val) {
            seen[val] = true;
            return seen;
        }, {}));
    }
}
