"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const metagame_1 = require("../metagame");
const NUM_SELECTION = 50;
const FORMATS = ["commander", "brawl"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
FORMATS.forEach(format => {
    var multiplayerDecks = [];
    var uniqueCards = [];
    var total = {
        cards: 0,
        decks: 0,
        wIgnore: 0
    };
    const json = fs.readFileSync("input_json/decks-" + format + ".json", "utf8");
    const decksJson = JSON.parse(json);
    for (const deck of decksJson) {
        if (deck.name != "Unknown") {
            total.decks += 1;
            const cmdIdx = multiplayerDecks.findIndex(c => c.commander.includes(deck.name));
            let mutliplayerDeckCards = [];
            for (const card of deck.main) {
                if (card.name != null) {
                    total.cards += 1;
                    if (!IGNORE.some(c => card.name.includes(c))) {
                        total.wIgnore += 1;
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
                            uniqueCards[i].decks_in = uniqueCards[i].decks_in || 0 + 1;
                        }
                        if (cmdIdx === -1) {
                            const cardIdx = mutliplayerDeckCards.findIndex(c => c.card_name.includes(card.name));
                            if (cardIdx === -1) {
                                mutliplayerDeckCards.push({
                                    card_name: card.name,
                                    quantity: card.quantity
                                });
                            }
                            else {
                                mutliplayerDeckCards[cardIdx].quantity += card.quantity;
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
                            }
                        }
                    }
                }
            }
            if (cmdIdx === -1) {
                let newDeck = {
                    commander: deck.name,
                    cards: mutliplayerDeckCards,
                    instances: 1,
                    metagame_percentage: 0,
                    top_cards: [],
                    best_fit_deck: { main: deck.main, sb: deck.sb },
                    deck_ids: [deck.id]
                };
                multiplayerDecks.push(newDeck);
            }
            else {
                multiplayerDecks[cmdIdx].instances += 1;
                multiplayerDecks[cmdIdx].deck_ids.push(deck.id);
            }
        }
    }
    multiplayerDecks.sort((a, b) => b.instances - a.instances);
    console.log(JSON.stringify(multiplayerDecks));
    function getTopCards(deck) {
        let topCards = [];
        for (const card of deck.cards.slice(0, NUM_SELECTION)) {
            if (card.card_name != deck.commander) {
                topCards.push({
                    name: card.card_name,
                    percent: metagame_1.Utils.round((card.quantity / deck.instances) * 100, 2),
                    seenInDecks: card.quantity,
                    decksInArchetype: deck.instances
                });
            }
        }
        return topCards;
    }
    for (const deck of multiplayerDecks) {
        deck.cards.sort((a, b) => b.quantity - a.quantity);
        deck.top_cards = getTopCards(deck);
        deck.metagame_percentage = metagame_1.Utils.round((deck.instances / total.decks) * 100, 2);
        let maxSimilar = 0;
        for (const inputDeck of decksJson) {
            if (inputDeck.name === deck.commander) {
                let similar = 0;
                for (const card of inputDeck.main) {
                    if (deck.cards.some(c => c[0] === card.name)) {
                        similar += 1;
                    }
                    if (similar > maxSimilar) {
                        maxSimilar = similar;
                        deck.best_fit_deck = {
                            main: inputDeck.main,
                            sb: inputDeck.sb
                        };
                    }
                }
            }
        }
    }
    function cardAppearanceRatio(a_card) {
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
    function closestCards(a_card, b) {
        const cardApp = cardAppearanceRatio(a_card)[0];
        let distances = [];
        for (const unique_card of uniqueCards) {
            let dist = metagame_1.Utils.distance(cardAppearanceRatio(unique_card.card_name)[0], cardApp);
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
    function commonDecks(cardName, limit = 3) {
        let comDecks = [];
        for (const deck of multiplayerDecks) {
            let i = deck.cards.findIndex(c => c.card_name.includes(cardName.toString()));
            if (i != -1) {
                let percent = metagame_1.Utils.round((deck.cards[i].quantity / deck.instances) * 2, 100);
                if (percent > 40 && deck.instances > 3) {
                    comDecks.push({
                        name: deck.commander,
                        decksInArchetype: deck.instances,
                        percent: percent,
                        seenInDecks: deck.cards[i].quantity
                    });
                }
            }
        }
        comDecks.sort((a, b) => b.percent - a.percent);
        return comDecks.slice(0, limit);
    }
    function versatileCards(k) {
        let versatileCards = [];
        let cards = uniqueCards.sort((a, b) => (b.decks_in || 0) - (a.decks_in || 0));
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
                common_archetypes: commonDecks(unique_card.card_name),
                cards_found_with: closestCards(unique_card.card_name, 5),
                total_instances: unique_card.quantity,
                percentage_of_total_cards: metagame_1.Utils.round((unique_card.quantity / total.wIgnore) * 100, 2),
                percentage_of_total_decks: metagame_1.Utils.round((unique_card.quantity / total.decks) * 100, 2)
            });
        }
        return formatCards;
    }
    for (const deck of multiplayerDecks) {
        deck.cards = [];
    }
    let multiplayerOutputJson = {
        archetypes: multiplayerDecks,
        format_top_cards: formatCards(NUM_SELECTION),
        format_versatile_cards: versatileCards(NUM_SELECTION),
        total_cards_parsed: total.cards,
        unique_cards_parsed: uniqueCards.length,
        total_decks_parsed: total.decks
    };
    multiplayerOutputJson.archetypes.sort((a, b) => b.instances - a.instances);
    multiplayerOutputJson.format_top_cards.sort((a, b) => b.total_instances - a.total_instances);
    fs.writeFileSync("output_json/" + format + ".json", JSON.stringify(multiplayerOutputJson, null, 4), "utf8");
});
