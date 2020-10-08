var fs = require("fs");
import {
	UniqueCard,
	FormatCard,
	Data,
	Zone,
	InputDeck,
	CardNames,
	Card,
	Utils
} from "../metagame";

export interface MultiplayerFormatJson {
	archetypes: MultiplayerDeck[];
	format_top_cards: FormatCard[];
	format_versatile_cards: CardNames;
	total_cards_parsed: number;
	unique_cards_parsed: number;
	total_decks_parsed: number;
}

export interface MultiplayerDeck {
	commander: string;
	cards: UniqueCard[];
	metagame_percentage: number;
	instances: number;
	top_cards: Data[];
	best_fit_deck: {
		main: Zone;
		sb: Zone;
	};
	deck_ids: string[];
}

// GLOBALS
const NUM_SELECTION: number = 50;
const FORMATS: string[] = ["commander", "brawl"];
const IGNORE: CardNames = ["Island", "Forest", "Mountain", "Swamp", "Plains"];

FORMATS.forEach(format => {
	var multiplayerDecks: MultiplayerDeck[] = [];
	var uniqueCards: UniqueCard[] = [];
	var total: { cards: number; decks: number; wIgnore: number } = {
		cards: 0,
		decks: 0,
		wIgnore: 0
	};

	const json = fs.readFileSync("input_json/decks-" + format + ".json", "utf8");
	const decksJson: InputDeck[] = JSON.parse(json);

	for (const deck of decksJson) {
		if (deck.name != "Unknown") {
			total.decks += 1;
			const cmdIdx = multiplayerDecks.findIndex(c =>
				c.commander.includes(deck.name)
			);

			let mutliplayerDeckCards: Array<UniqueCard> = [];
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
						} else {
							uniqueCards[i].quantity += card.quantity;
							uniqueCards[i].decks_in = uniqueCards[i].decks_in || 0 + 1;
						}
						if (cmdIdx === -1) {
							const cardIdx = mutliplayerDeckCards.findIndex(c =>
								c.card_name.includes(card.name)
							);
							if (cardIdx === -1) {
								mutliplayerDeckCards.push({
									card_name: card.name,
									quantity: card.quantity
								});
							} else {
								mutliplayerDeckCards[cardIdx].quantity += card.quantity;
							}
						} else {
							const card_idx = multiplayerDecks[cmdIdx].cards.findIndex(c =>
								c.card_name.includes(card.name)
							);
							if (card_idx === -1) {
								multiplayerDecks[cmdIdx].cards.push({
									card_name: card.name,
									quantity: card.quantity
								});
							} else {
								multiplayerDecks[cmdIdx].cards[card_idx].quantity +=
									card.quantity;
							}
						}
					}
				}
			}

			if (cmdIdx === -1) {
				let newDeck: MultiplayerDeck = {
					commander: deck.name,
					cards: mutliplayerDeckCards,
					instances: 1,
					metagame_percentage: 0,
					top_cards: [],
					best_fit_deck: { main: deck.main, sb: deck.sb },
					deck_ids: [deck.id]
				};
				multiplayerDecks.push(newDeck);
			} else {
				multiplayerDecks[cmdIdx].instances += 1;
				multiplayerDecks[cmdIdx].deck_ids.push(deck.id);
			}
		}
	}

	multiplayerDecks.sort((a, b) => b.instances - a.instances);
	console.log(JSON.stringify(multiplayerDecks));

	/**
	 * Get top cards of a particular archetype
	 * @param deck
	 */
	function getTopCards(deck: MultiplayerDeck): Data[] {
		let topCards: Data[] = [];
		for (const card of deck.cards.slice(0, NUM_SELECTION)) {
			if (card.card_name != deck.commander) {
				topCards.push({
					name: card.card_name,
					percent: Utils.round((card.quantity / deck.instances) * 100, 2),
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
		deck.metagame_percentage = Utils.round(
			(deck.instances / total.decks) * 100,
			2
		);
		let maxSimilar: number = 0;
		for (const inputDeck of decksJson) {
			if (inputDeck.name === deck.commander) {
				let similar: number = 0;
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

	/**
	 * Find how often a card appears in each archetype
	 * @param cardName
	 */
	function cardAppearanceRatio(a_card: string): [number[], number] {
		let labelCount: Array<number> = Array(multiplayerDecks.length).fill(0);
		for (let i = 0; i < multiplayerDecks.length; i++) {
			for (const card of multiplayerDecks[i].cards) {
				if (card.card_name.includes(a_card.toString())) {
					labelCount[i] = card.quantity;
				}
			}
		}
		let totalApps = labelCount.reduce((a, b) => a + b, 0);
		let labels: Array<number> = [];
		for (const count of labelCount) {
			labels.push(count / totalApps);
		}
		return [labels, totalApps];
	}

	/**
	 * Calculate and return the cards most commonly seen with a given card name.
	 * E.g. "Oko, Thief of Crowns" is often seen with "Misty Rainforest"
	 * @param cardName Name of the card to find references for
	 * @param limit The number of cards to return
	 */
	function closestCards(a_card: string, b: number): CardNames {
		const cardApp = cardAppearanceRatio(a_card)[0];
		let distances: Array<[string, number]> = [];
		for (const unique_card of uniqueCards) {
			let dist = Utils.distance(
				cardAppearanceRatio(unique_card.card_name)[0],
				cardApp
			);
			distances.push([unique_card.card_name, dist]);
		}
		distances.sort((a, b) => a[1] - b[1]);
		let closestCards: CardNames = [];
		for (const dist of distances.slice(0, b)) {
			if (dist[0] != a_card) {
				closestCards.push(dist[0]);
			}
		}
		return closestCards;
	}

	/**
	 * Get decks a card is commonly found in
	 * @param cardName
	 */
	function commonDecks(cardName: string, limit: number = 3): Data[] {
		let comDecks: Data[] = [];
		for (const deck of multiplayerDecks) {
			let i = deck.cards.findIndex(c =>
				c.card_name.includes(cardName.toString())
			);
			if (i != -1) {
				let percent: number = Utils.round(
					(deck.cards[i].quantity / deck.instances) * 2,
					100
				);
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

	/**
	 * Get "versatile" cards of format (cards that see play in a wide variety of archetypes)
	 * @param k num cards to return
	 */
	function versatileCards(k: number): CardNames {
		let versatileCards: CardNames = [];
		let cards: Array<UniqueCard> = uniqueCards.sort(
			(a, b) => (b.decks_in || 0) - (a.decks_in || 0)
		);
		for (const unique_card of cards.splice(0, k)) {
			versatileCards.push(unique_card.card_name);
		}
		return versatileCards;
	}

	/**
	 * Get data on the cards in the format
	 * @param k number of cards to include
	 */
	function formatCards(k: number): Array<FormatCard> {
		let formatCards: Array<FormatCard> = [];
		let cards: Array<UniqueCard> = uniqueCards.sort(
			(a, b) => b.quantity - a.quantity
		);
		for (const unique_card of cards.splice(0, k)) {
			formatCards.push({
				card_name: unique_card.card_name,
				common_archetypes: commonDecks(unique_card.card_name),
				cards_found_with: closestCards(unique_card.card_name, 5),
				total_instances: unique_card.quantity,
				percentage_of_total_cards: Utils.round(
					(unique_card.quantity / total.wIgnore) * 100,
					2
				),
				percentage_of_total_decks: Utils.round(
					(unique_card.quantity / total.decks) * 100,
					2
				)
			});
		}
		return formatCards;
	}

	for (const deck of multiplayerDecks) {
		deck.cards = [];
	}

	let multiplayerOutputJson: MultiplayerFormatJson = {
		archetypes: multiplayerDecks,
		format_top_cards: formatCards(NUM_SELECTION),
		format_versatile_cards: versatileCards(NUM_SELECTION),
		total_cards_parsed: total.cards,
		unique_cards_parsed: uniqueCards.length,
		total_decks_parsed: total.decks
	};

	multiplayerOutputJson.archetypes.sort((a, b) => b.instances - a.instances);
	multiplayerOutputJson.format_top_cards.sort(
		(a, b) => b.total_instances - a.total_instances
	);

	fs.writeFileSync(
		"output_json/" + format + ".json",
		JSON.stringify(multiplayerOutputJson, null, 4),
		"utf8"
	);
});
