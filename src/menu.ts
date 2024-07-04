import readlineSync from "readline-sync";
import { initializeAccount } from "./accountInitializer";
import { queryAccount } from "./query";
import { chargeBtcForResource } from "./btcResource"; // Import the new function

export const showMenu = () => {
  console.log("1. Initialize Account");
  console.log("2. Query Account");
  console.log("3. Charging BTC for Resource"); // New menu item
  console.log("4. Exit");

  const choice = readlineSync.question("Enter your choice: ");

  switch (choice) {
    case "1":
      initializeAccount();
      break;
    case "2":
      queryAccount();
      break;
    case "3":
      chargeBtcForResource(); // Call the new function
      break;
    case "4":
      console.log("Exiting...");
      process.exit(0);
    default:
      console.log("Invalid choice. Please try again.");
      showMenu();
      break;
  }
};
