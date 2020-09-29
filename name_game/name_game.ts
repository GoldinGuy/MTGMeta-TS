var fs = require("fs");
import { FormatJson } from "../metagame";
const inquirer = require("inquirer");

const FORMAT = "legacy";
const UNTITLED = [
	"Untitled",
	"Unknown",
	"Unnamed",
	"Empty",
	"W",
	"U",
	"B",
	"R",
	"G"
];

var new_archetype_names: Array<String> = [];
// console.log("Name that Archetype! The game!\n\n\n");

fs.readFile("../output_json/" + FORMAT + ".json", "utf8", async function (
	err: String,
	json: string
) {
	const format_json: FormatJson = JSON.parse(json);
	for (const archetype of format_json["archetypes"]) {
		if (UNTITLED.some(name => archetype["archetype_name"].includes(name))) {
			var name_that_archetype = [
				{
					type: "input",
					name: "\n\nName that Archetype!",
					message:
						"\n\n\nName that Archetype!\n\nPercent of Meta: " +
						archetype["metagame_percentage"] +
						"\nInstances: " +
						archetype["instances"] +
						"\n\nArchetype Defining Cards: " +
						JSON.stringify(archetype["top_cards"]) +
						"\n\nEnter name: "
				}
			];

			await inquirer.prompt(name_that_archetype).then(answer => {
				new_archetype_names.push(answer);
				archetype["archetype_name"] = answer;
			});
		}
	}
	var confirm_update_json = [
		{
			type: "input",
			name: "\n\nName that Archetype!",
			message:
				"\nYou named the Untitled archetypes the following: \n" +
				new_archetype_names +
				"\n\nType Y to Confirm update json? \n"
		}
	];
	await inquirer.prompt(confirm_update_json).then(confirm => {
		if (confirm.toUpperCase() === "Y") {
			fs.writeFile(
				"output_json/" + FORMAT + ".json",
				JSON.stringify(format_json, null, 4),
				"utf8",
				function (err: String, data: String) {}
			);
		}
	});
});
