"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMenu = void 0;
const readline_sync_1 = __importDefault(require("readline-sync"));
const accountInitializer_1 = require("./accountInitializer");
const query_1 = require("./query");
const btcResource_1 = require("./btcResource"); // Import the new function
const showMenu = () => {
    console.log("1. Initialize Account");
    console.log("2. Query Account");
    console.log("3. Charging BTC for Resource"); // New menu item
    console.log("4. Exit");
    const choice = readline_sync_1.default.question("Enter your choice: ");
    switch (choice) {
        case "1":
            (0, accountInitializer_1.initializeAccount)();
            break;
        case "2":
            (0, query_1.queryAccount)();
            break;
        case "3":
            (0, btcResource_1.chargeBtcForResource)(); // Call the new function
            break;
        case "4":
            console.log("Exiting...");
            process.exit(0);
        default:
            console.log("Invalid choice. Please try again.");
            (0, exports.showMenu)();
            break;
    }
};
exports.showMenu = showMenu;
