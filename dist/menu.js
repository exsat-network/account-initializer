"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMenu = void 0;
const accountInitializer_1 = require("./accountInitializer");
const query_1 = require("./query");
const btcResource_1 = require("./btcResource"); // Import the new function
const prompts_1 = require("@inquirer/prompts");
const showMenu = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const choices = [
        { name: "Initialize Account", value: "1" },
        { name: "Query Account", value: "2" },
        { name: "Charging BTC for Resource", value: "3" },
        { name: "Generate Keystore From Mnemonic", value: "4" },
        { name: "Generate Keystore From PrivateKey", value: "5" },
        { name: "Exit", value: "99" },
    ];
    const choice = yield (0, prompts_1.select)({
        message: "Select an option:",
        choices: choices.map(choice => ({ name: choice.name, value: choice.value })),
    });
    switch (choice) {
        case "1":
            yield (0, accountInitializer_1.initializeAccount)(options === null || options === void 0 ? void 0 : options.role);
            break;
        case "2":
            yield (0, query_1.queryAccount)();
            break;
        case "3":
            yield (0, btcResource_1.chargeBtcForResource)(); // Call the new function
            break;
        case "4":
            yield (0, accountInitializer_1.importFromMnemonic)();
            break;
        case "5":
            yield (0, accountInitializer_1.importFromPrivateKey)();
            break;
        case "99":
            console.log("Exiting...");
            process.exit(0);
        default:
            console.log("Invalid choice. Please try again.");
            yield (0, exports.showMenu)();
            break;
    }
});
exports.showMenu = showMenu;
