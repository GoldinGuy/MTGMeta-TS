"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
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
var new_archetype_names = [];
fs.readFile("../output_json/" + FORMAT + ".json", "utf8", function (err, json) {
    return __awaiter(this, void 0, void 0, function* () {
        const format_json = JSON.parse(json);
        for (const archetype of format_json["archetypes"]) {
            if (UNTITLED.some(name => archetype["archetype_name"].includes(name))) {
                var name_that_archetype = [
                    {
                        type: "input",
                        name: "\n\nName that Archetype!",
                        message: "\n\n\nName that Archetype!\n\nPercent of Meta: " +
                            archetype["metagame_percentage"] +
                            "\nInstances: " +
                            archetype["instances"] +
                            "\n\nArchetype Defining Cards: " +
                            JSON.stringify(archetype["top_cards"]) +
                            "\n\nEnter name: "
                    }
                ];
                yield inquirer.prompt(name_that_archetype).then(answer => {
                    new_archetype_names.push(answer);
                    archetype["archetype_name"] = answer;
                });
            }
        }
        var confirm_update_json = [
            {
                type: "input",
                name: "\n\nName that Archetype!",
                message: "\nYou named the Untitled archetypes the following: \n" +
                    new_archetype_names +
                    "\n\nType Y to Confirm update json? \n"
            }
        ];
        yield inquirer.prompt(confirm_update_json).then(confirm => {
            if (confirm.toString().toUpperCase() === "Y") {
                fs.writeFile("output_json/" + FORMAT + ".json", JSON.stringify(format_json, null, 4), "utf8", function (err, data) { });
            }
        });
    });
});
