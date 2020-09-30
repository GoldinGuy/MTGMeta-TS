"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
const NUM_VERS = 20;
const CARD_CUTOFF = 0.32;
const FORMATS = ["commander", "brawl"];
const IGNORE = ["Island", "Forest", "Mountain", "Swamp", "Plains"];
var decks = [];
var commanders = [];
var unique_cards = [];
var total_cards = 0;
fs.readFile("input_json/decks-" + FORMATS[0] + ".json", "utf8", function (err, json) {
    const decks_json = JSON.parse(json);
    for (const i of Object.keys(decks_json)) {
        let commander_name = decks_json[i]["name"].toString();
        const command_idx = commanders.findIndex(c => c.card_name.includes(commander_name));
        let commander_deck_cards = [];
        for (const card of decks_json[i]["main"]) {
            if (card["name"] != null) {
                if (!IGNORE.some(c => card["name"].includes(c))) {
                    if (command_idx === -1) {
                        const card_idx = commander_deck_cards.findIndex(c => c.card_name.includes(card.name));
                        if (card_idx === -1) {
                            commander_deck_cards.push({
                                card_name: card["name"],
                                quantity: card["quantity"]
                            });
                        }
                        else {
                            commander_deck_cards[card_idx].quantity += card["quantity"];
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
                cards: commander_deck_cards,
                quantity: 1
            };
            commanders.push(commander);
        }
        else {
            commanders[command_idx].quantity += 1;
        }
    }
    commanders.sort((a, b) => b.quantity - a.quantity);
    console.log(JSON.stringify(commanders));
});
