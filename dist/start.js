"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const menu_1 = require("./menu");
const main = async () => {
    console.log("Welcome to exSat Account Manager");
    await (0, menu_1.showMenu)();
};
main().then(() => { });
