"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const NUM_SELECTION = 50;
const FORMATS = ["commander", "brawl"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
var multiplayerDecks = [];
var uniqueCards = [];
var totalCards = 0;
var totalDecks = 0;
var totalCardsNoBasics = 0;
const json = fs.readFileSync("input_json/decks-" + FORMATS[0] + ".json", "utf8");
const decksJson = JSON.parse(json);
for (const deck of decksJson) {
    if (deck.name != "Unknown") {
        totalDecks += 1;
        const cmdIdx = multiplayerDecks.findIndex(c => c.commander.includes(deck.name));
        let similar = 0;
        let multiplayerDeckCards = [];
        for (const card of deck.main) {
            if (card.name != null) {
                totalCards += 1;
                if (!IGNORE.some(c => card.name.includes(c))) {
                    totalCardsNoBasics += 1;
                    let i = uniqueCards.findIndex(c => c.card_name.includes(card.name));
                    if (i === -1) {
                        uniqueCards.push({
                            card_name: card.name,
                            quantity: card.quantity,
                            decks_in: 1
                        });
                    }
                    else {
                        uniqueCards[i].quantity += card.quantity;
                        uniqueCards[i].decks_in += 1;
                    }
                    if (cmdIdx === -1) {
                        const card_idx = multiplayerDeckCards.findIndex(c => c.card_name.includes(card.name));
                        if (card_idx === -1) {
                            multiplayerDeckCards.push({
                                card_name: card.name,
                                quantity: card.quantity
                            });
                        }
                        else {
                            multiplayerDeckCards[card_idx].quantity += card.quantity;
                        }
                    }
                    else {
                        const card_idx = multiplayerDecks[cmdIdx].cards.findIndex(c => c.card_name.includes(card.name));
                        if (card_idx === -1) {
                            multiplayerDecks[cmdIdx].cards.push({
                                card_name: card.name,
                                quantity: card.quantity
                            });
                        }
                        else {
                            multiplayerDecks[cmdIdx].cards[card_idx].quantity +=
                                card.quantity;
                            similar += 1;
                        }
                    }
                }
            }
        }
        if (cmdIdx === -1) {
            let newDeck = {
                commander: deck.name,
                cards: multiplayerDeckCards,
                instances: 1,
                metagame_percentage: 0,
                top_cards: [],
                best_fit_deck: { main: deck.main, sb: deck.sb, maxSimilar: 0 },
                deck_ids: [deck.id]
            };
            multiplayerDecks.push(newDeck);
        }
        else {
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
function getTopCards(commanderDeck) {
    let topCards = [];
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
function apparationRatio(a_card) {
    let labelCount = Array(multiplayerDecks.length).fill(0);
    for (let i = 0; i < multiplayerDecks.length; i++) {
        for (const card of multiplayerDecks[i].cards) {
            if (card.card_name.includes(a_card.toString())) {
                labelCount[i] = card.quantity;
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
function distance(x, y) {
    let d = 0.0;
    for (let [z, elem] of x.entries()) {
        d += (elem - y[z]) * (elem - y[z]);
    }
    return Math.sqrt(d);
}
function closestCards(a_card, b) {
    const cardApp = apparationRatio(a_card)[0];
    let distances = [];
    for (const unique_card of uniqueCards) {
        let dist = distance(apparationRatio(unique_card.card_name)[0], cardApp);
        distances.push([unique_card.card_name, dist]);
    }
    distances.sort((a, b) => a[1] - b[1]);
    let closestCards = [];
    for (const dist of distances.slice(0, b)) {
        if (dist[0] != a_card) {
            closestCards.push(dist[0]);
        }
    }
    return closestCards;
}
function commonDecks(card_name) {
    let commonDecks = [];
    for (const deck of multiplayerDecks) {
        let idx = deck.cards.findIndex(c => c.card_name.includes(card_name.toString()));
        if (idx != -1) {
            let percent = Math.min((deck.cards[idx].quantity / deck.instances) * 100, 100);
            if (percent > 40 && deck.instances > 3) {
                commonDecks.push([
                    deck.commander,
                    percent.toFixed(2) + "% of " + deck.instances + " decks"
                ]);
            }
        }
    }
    commonDecks.sort((a, b) => parseFloat(b[1].replace("%", "")) - parseFloat(a[1].replace("%", "")));
    return commonDecks.slice(0, 3);
}
function versatileCards(k) {
    let versatileCards = [];
    let cards = uniqueCards.sort((a, b) => b.decks_in - a.decks_in);
    for (const unique_card of cards.splice(0, k)) {
        versatileCards.push(unique_card.card_name);
    }
    return versatileCards;
}
function formatCards(k) {
    let formatCards = [];
    let cards = uniqueCards.sort((a, b) => b.quantity - a.quantity);
    for (const unique_card of cards.splice(0, k)) {
        formatCards.push({
            card_name: unique_card.card_name,
            common_decks: commonDecks(unique_card.card_name),
            cards_found_with: closestCards(unique_card.card_name, 5),
            total_instances: unique_card.quantity,
            percentage_of_total_cards: ((unique_card.quantity / totalCardsNoBasics) * 100).toFixed(2) + "%",
            percentage_of_total_decks: ((unique_card.quantity / totalDecks) * 100).toFixed(2) + "%"
        });
    }
    return formatCards;
}
let multiplayerOutputJson = {
    archetypes: multiplayerDecks,
    format_top_cards: formatCards(NUM_SELECTION),
    format_versatile_cards: versatileCards(NUM_SELECTION),
    total_cards_parsed: totalCards,
    unique_cards_parsed: uniqueCards.length,
    total_decks_parsed: totalDecks
};
multiplayerOutputJson.archetypes.sort((a, b) => b.instances - a.instances);
multiplayerOutputJson.format_top_cards.sort((a, b) => b.total_instances - a.total_instances);
fs.writeFileSync("output_json/" + FORMATS[0] + ".json", JSON.stringify(multiplayerOutputJson, null, 4), "utf8");
