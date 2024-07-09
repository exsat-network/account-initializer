import "dotenv/config";
import { showMenu } from "./menu";

const main = async () => {
  console.log("Welcome to exSat Account Manager");
  await showMenu();
};

main().then(() =>{} );