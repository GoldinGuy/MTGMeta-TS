"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const KMEANS = require("./K-Means-TS/kmeans");
class Utils {
    static round(value, precision) {
        const multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }
    static cardNames(deck) {
        let names = [];
        for (const card in deck) {
            names.push(card[1]);
        }
        return names;
    }
    static quantityOfCard(cardName) {
        let q = 0;
        for (const i in uniqueCards) {
            let card_name = uniqueCards[i].card_name;
            if (card_name == cardName) {
                if (card_name.includes(cardName)) {
                    q = uniqueCards[i].quantity;
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
const NUM_VERS = 20;
const THRESHOLD = 0.32;
const FORMATS = [
    "modern",
    "pioneer",
    "standard",
    "pauper",
    "legacy"
];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
var decks = [];
var deckZip;
var vectoredCardNames = [];
var uniqueCards = [];
var totalCards = 0;
const json = fs.readFileSync("input_json/decks-" + FORMATS[0] + ".json", "utf8");
const decks_json = JSON.parse(json);
for (const deck of decks_json) {
    let deckOfCards = [];
    for (const card of deck.main) {
        if (card.name) {
            deckOfCards.push([card.quantity, card.name]);
            totalCards += card.quantity;
            vectoredCardNames.push(card.name);
            if (!IGNORE.some(c => card.name.includes(c))) {
                let idx = uniqueCards.findIndex(c => c.card_name.includes(card.name));
                if (idx === -1) {
                    uniqueCards.push({
                        card_name: card.name,
                        quantity: card.quantity,
                        decks_in: 1
                    });
                }
                else {
                    uniqueCards[idx].quantity += card.quantity;
                    uniqueCards[idx].decks_in += 1;
                }
            }
        }
    }
    decks.push({ id: deck.id, cards: deckOfCards });
}
function mostCommonCards(deck, k) {
    deck.cards = deck.cards.sort((a, b) => a[0] - b[0]).reverse();
    let card_names = [];
    for (const card in deck.cards.slice(0, k)) {
        let cardName = deck[card][1];
        if (!IGNORE.includes(cardName)) {
            card_names.push(cardName);
        }
    }
    return card_names;
}
function decksByIdx(idx) {
    let indexes = [];
    for (const deck of deckZip.entries()) {
        if (deck[1][1] == idx) {
            indexes.push([deck[1][0], deck[1][1]]);
        }
    }
    return indexes;
}
function cardAppearanceRatio(cardName) {
    let labelCount = Array(NUM_CLUSTERS).fill(0);
    for (const deck of deckZip.entries()) {
        for (const card of deck[1][0].cards) {
            if (card[1].includes(cardName)) {
                labelCount[deck[1][1]] += 1;
            }
        }
    }
    let totalApps = labelCount.reduce((a, b) => a + b, 0);
    let labels = [];
    for (const count of labelCount) {
        labels.push(count / totalApps);
    }
    return [labels, totalApps];
}
function deckToVector(inputDeck) {
    let v = Array(vectoredCardNames.length).fill(0);
    for (const [x, cardName] of vectoredCardNames.entries()) {
        for (const card of inputDeck.cards.entries()) {
            if (card[1][1] == cardName) {
                v[x] += card[0];
            }
        }
    }
    return v;
}
let deckVectors = [];
for (const deck of decks) {
    deckVectors.push(deckToVector(deck));
}
let NUM_CLUSTERS = Math.max(Math.round(uniqueCards.length / 32), 1);
let it = 10;
let archetypes;
do {
    console.log(NUM_CLUSTERS);
    const kmeans = KMEANS(deckVectors, NUM_CLUSTERS, "kmeans++");
    deckZip = Utils.zipDeck(decks, kmeans.indexes);
    let cardCounts = [];
    for (let i = 0; i < NUM_CLUSTERS; i++) {
        cardCounts.push([i, decksByIdx(i).length]);
    }
    let totalInstances = 0;
    for (const count of cardCounts) {
        totalInstances += count[1];
    }
    archetypes = [];
    for (let i = 0; i < NUM_CLUSTERS; i++) {
        let cardSet = [];
        let deckItems = decksByIdx(i);
        for (const deckItem of deckItems) {
            cardSet.push(Utils.set(mostCommonCards(deckItem[0], 40)));
        }
        let cardList = Array.prototype.concat.apply([], cardSet);
        let countCards = cardList.reduce((a, b) => {
            a[b] = (a[b] || 0) + 1;
            return a;
        }, {});
        let sorted_cards = Object.keys(countCards)
            .map(k => [k, countCards[k]])
            .sort(function (a, b) {
            return b[1] - a[1];
        });
        let cluster = [];
        for (const cardItem of sorted_cards.slice(0, 20)) {
            cluster.push(cardItem[0]);
        }
        let deckArchetype = {
            archetype_name: "Unknown",
            top_cards: cluster,
            instances: deckItems.length,
            metagame_percentage: Utils.round((deckItems.length / totalInstances) * 100, 2),
            best_fit_deck: { main: [], sb: [] }
        };
        let maxSimilar = 0;
        for (const deck_obj of decks_json) {
            let similar = 0;
            for (const card of deck_obj.main) {
                if (cluster.includes(card.name)) {
                    similar += 1;
                }
                if (similar > maxSimilar) {
                    maxSimilar = similar;
                    deckArchetype.archetype_name = deck_obj.name;
                    deckArchetype.best_fit_deck = {
                        main: deck_obj.main,
                        sb: deck_obj.sb
                    };
                }
            }
        }
        archetypes.push(deckArchetype);
        console.log("\nCluster #" + i + " (" + deckArchetype.archetype_name + ") :");
        console.log(JSON.stringify(deckArchetype.top_cards));
    }
    for (const archetype of archetypes) {
        let diff = 0;
        let same = 0;
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
function closestCards(cardName, limit) {
    const cardApp = cardAppearanceRatio(cardName)[0];
    let distances = [];
    for (const unique_card of uniqueCards) {
        let dist = Utils.distance(cardAppearanceRatio(unique_card.card_name)[0], cardApp);
        distances.push([unique_card.card_name, dist]);
    }
    distances.sort((a, b) => a[1] - b[1]);
    let closestCards = [];
    for (const dist of distances.slice(0, limit)) {
        if (dist[0] != cardName) {
            closestCards.push(dist[0]);
        }
    }
    return closestCards;
}
function commonDecks(cardName, limit = 3) {
    const common_decks = [];
    let i = 0;
    while (i < NUM_CLUSTERS) {
        let decks_w_card = 0;
        const decksCluster = decksByIdx(i);
        for (const deck of decksCluster) {
            if (deck[0].cards.some(card => card[1] === cardName)) {
                decks_w_card += 1;
            }
        }
        let percent = Utils.round((decks_w_card / decks.length) * 100, 2);
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
function versatileCards(k) {
    const variances = [];
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
    let versatile_cards = [];
    for (const vers_card of variances.slice(0, k)) {
        versatile_cards.push(vers_card[0]);
    }
    return versatile_cards;
}
let outputJson = {
    archetypes: archetypes,
    format_cards: [],
    format_versatile_cards: versatileCards(NUM_VERS),
    total_cards_parsed: totalCards,
    cards_parsed_by_deck: vectoredCardNames.length,
    unique_cards_parsed: uniqueCards.length,
    total_decks_parsed: decks.length
};
for (const unique_card of uniqueCards) {
    if (unique_card.quantity >= uniqueCards[0].quantity * THRESHOLD) {
        let format_card = {
            card_name: unique_card.card_name,
            common_archetypes: commonDecks(unique_card.card_name),
            cards_found_with: closestCards(unique_card.card_name, 7),
            total_instances: unique_card.quantity,
            percentage_of_total_decks: Utils.round((unique_card.decks_in / decks.length) * 100, 2),
            percentage_of_total_cards: Utils.round((unique_card.quantity / totalCards) * 100, 2)
        };
        outputJson.format_cards.push(format_card);
    }
}
outputJson.archetypes.sort((a, b) => b.instances - a.instances);
outputJson.format_cards.sort((a, b) => b.total_instances - a.total_instances);
fs.writeFileSync("output_json/" + FORMATS[0] + ".json", JSON.stringify(outputJson, null, 4), "utf8");
