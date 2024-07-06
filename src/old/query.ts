import readlineSync from "readline-sync";
import {
  axiosInstance,
  cmdGreenFont,
  readSelectedPath,
  retryRequest,
} from "./utils";
import { readFileSync, readdirSync } from "fs";
import { decryptKeystore } from "../web3";

export const queryAccount = async () => {
    try {
          let encFile = "";

          const selectedPath = readSelectedPath();

          if (selectedPath) {
            const files = readdirSync(selectedPath).filter((file) =>
              file.endsWith("_keystore.json")
            );

            if (files.length > 0) {
              encFile = files[0];
            } else {
              encFile = readlineSync.question(
                "Enter the path to your keystore file: "
              );
            }
          } else {
            encFile = readlineSync.question(
              "Enter the path to your keystore file: "
            );
          }
      const keystore = readFileSync(encFile, "utf-8");
      const keystoreInfo = JSON.parse(keystore);

      console.log(
        `\nQuerying account for publicKey: ${keystoreInfo.address}\n`
      );

      const response = await retryRequest(() =>
        axiosInstance.post("/api/users/my", { publicKey: keystoreInfo.address })
      );

      const accountInfo = response.data;

      if (accountInfo.status === "success") {
        console.log(`Username: ${accountInfo.info.username}`);
        console.log(`Role: ${accountInfo.info.role}`);
        console.log(`Public Key: ${accountInfo.info.publicKey}`);
        console.log(`Status: ${accountInfo.info.status}`);
      } else {
        console.log(
          `Account not found for for publicKey: ${keystoreInfo.address}`
        );
        return;
      }

      const needPrivateKey = readlineSync.keyInYN(
        "\nDo you need to access the private key? "
      );

      if (needPrivateKey) {
        const password = readlineSync.question(
          "Enter the password to decrypt your private key: ",
          {
            hideEchoBack: true,
          }
        );

        const data = await decryptKeystore(keystore, password);

        console.log(`\nPrivate Key: ${cmdGreenFont(data)}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error querying account:", error.message);
      }
    }
};
