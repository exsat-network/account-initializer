import { initializeAccount } from "./accountInitializer";
import { queryAccount } from "./query";
import { chargeBtcForResource } from "./btcResource"; // Import the new function
import { select } from '@inquirer/prompts';

export const showMenu = async () => {
  const choices = [
    { name: "Initialize Account", value: "1" },
    { name: "Query Account", value: "2" },
    { name: "Charging BTC for Resource", value: "3" }, // New menu item
    { name: "Exit", value: "4" },
  ];

  const choice = await select({
    message: "Select an option:",
    choices: choices.map(choice => ({ name: choice.name, value: choice.value })),
  });

  switch (choice) {
    case "1":
      await initializeAccount();
      break;
    case "2":
      await queryAccount();
      break;
    case "3":
      await chargeBtcForResource(); // Call the new function
      break;
    case "4":
      console.log("Exiting...");
      process.exit(0);
    default:
      console.log("Invalid choice. Please try again.");
      await showMenu();
      break;
  }
};
