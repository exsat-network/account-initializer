"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMenu = void 0;
const accountInitializer_1 = require("./accountInitializer");
const query_1 = require("./query");
const btcResource_1 = require("./btcResource"); // Import the new function
const prompts_1 = require("@inquirer/prompts");
const showMenu = async (options) => {
    const choices = [
        { name: 'Initialize Account', value: '1' },
        { name: 'Query Account', value: '2' },
        { name: 'Charging BTC for Resource', value: '3' },
        { name: 'Generate Keystore From Mnemonic', value: '4' },
        { name: 'Generate Keystore From PrivateKey', value: '5' },
        { name: 'Exit', value: '99' },
    ];
    const choice = await (0, prompts_1.select)({
        message: 'Select an option:',
        choices: choices.map((choice) => ({
            name: choice.name,
            value: choice.value,
        })),
    });
    switch (choice) {
        case '1':
            await (0, accountInitializer_1.initializeAccount)(options?.role);
            break;
        case '2':
            await (0, query_1.queryAccount)();
            break;
        case '3':
            await (0, btcResource_1.chargeBtcForResource)(); // Call the new function
            break;
        case '4':
            await (0, accountInitializer_1.importFromMnemonic)();
            break;
        case '5':
            await (0, accountInitializer_1.importFromPrivateKey)();
            break;
        case '99':
            console.log('Exiting...');
            process.exit(0);
        default:
            console.log('Invalid choice. Please try again.');
            await (0, exports.showMenu)();
            break;
    }
};
exports.showMenu = showMenu;
