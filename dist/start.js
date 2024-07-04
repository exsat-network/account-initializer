"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const menu_1 = require("./menu");
const main = () => {
    console.log("Welcome to exSat Account Manager");
    (0, menu_1.showMenu)();
};
main();
