"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const NUM_VERS = 20;
const CARD_CUTOFF = 0.32;
const FORMATS = ["commander", "brawl"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
var multiplayer_decks = [];
var commanders = [];
var unique_cards = [];
var total_cards = 0;
var total_decks = 0;
var total_cards_no_basics = 0;
fs.readFile("input_json/decks-" + FORMATS[0] + ".json", "utf8", function (err, json) {
    const decks_json = JSON.parse(json);
    for (const i of Object.keys(decks_json)) {
        total_decks += 1;
        let commander_name = decks_json[i]["name"].toString();
        const command_idx = commanders.findIndex(c => c.card_name.includes(commander_name));
        let multiplayer_deck_cards = [];
        for (const card of decks_json[i]["main"]) {
            if (card["name"] != null) {
                total_cards += 1;
                if (!IGNORE.some(c => card["name"].includes(c))) {
                    total_cards_no_basics += 1;
                    let idx = unique_cards.findIndex(c => c.card_name.includes(card.name));
                    if (idx === -1) {
                        unique_cards.push({
                            card_name: card["name"],
                            quantity: card["quantity"],
                            decks_in: 1
                        });
                    }
                    else {
                        unique_cards[idx].quantity += card["quantity"];
                        unique_cards[idx].decks_in += 1;
                    }
                    if (command_idx === -1) {
                        const card_idx = multiplayer_deck_cards.findIndex(c => c.card_name.includes(card.name));
                        if (card_idx === -1) {
                            multiplayer_deck_cards.push({
                                card_name: card["name"],
                                quantity: card["quantity"]
                            });
                        }
                        else {
                            multiplayer_deck_cards[card_idx].quantity += card["quantity"];
                        }
                    }
                    else {
                        const card_idx = commanders[command_idx].cards.findIndex(c => c.card_name.includes(card.name));
                        if (card_idx === -1) {
                            commanders[command_idx].cards.push({
                                card_name: card["name"],
                                quantity: card["quantity"]
                            });
                        }
                        else {
                            commanders[command_idx].cards[card_idx].quantity +=
                                card["quantity"];
                        }
                    }
                }
            }
        }
        if (command_idx === -1) {
            let commander = {
                card_name: commander_name,
                cards: multiplayer_deck_cards,
                instances: 1
            };
            commanders.push(commander);
        }
        else {
            commanders[command_idx].instances += 1;
        }
    }
    commanders.sort((a, b) => b.instances - a.instances);
    console.log(JSON.stringify(commanders));
    for (const commander of commanders) {
        commander.cards.sort((a, b) => b.quantity - a.quantity);
        let multiplayerDeck = {
            commander: commander.card_name,
            top_cards: commander.cards.slice(0, 40),
            metagame_percentage: ((commander.instances / total_decks) * 100).toFixed(2) + "%",
            instances: commander.instances,
            best_fit_deck: { main: [], sb: [] }
        };
        let max_similar = 0;
        for (const deck_obj of Object.values(decks_json)) {
            if (deck_obj["name"] === commander.card_name) {
                let similar = 0;
                for (const card of deck_obj["main"]) {
                    if (commander.cards.includes(card["name"])) {
                        similar += 1;
                    }
                    if (similar > max_similar) {
                        max_similar = similar;
                        multiplayerDeck.best_fit_deck = {
                            main: deck_obj["main"],
                            sb: deck_obj["sb"]
                        };
                    }
                }
            }
        }
    }
    let format_json = {
        commanders: [],
        format_cards: [],
        format_versatile_cards: [],
        total_cards_parsed: total_cards,
        unique_cards_parsed: unique_cards.length,
        total_decks_parsed: decks.length
    };
});
