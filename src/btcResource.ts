import readlineSync from "readline-sync";
import { axiosInstance, readSelectedPath, retryRequest } from "./utils";
import { MIN_BTC_AMOUNT } from "./constants";
import qrcode from "qrcode-terminal";
import { readFileSync, readdirSync } from "fs";

export const chargeBtcForResource = async () => {
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
      encFile = readlineSync.question("Enter the path to your keystore file: ");
    }

    const keystore = readFileSync(encFile, "utf-8");
    const keystoreInfo = JSON.parse(keystore);
    let username = "";

    const account = await retryRequest(() =>
      axiosInstance.post("/api/users/my", { publicKey: keystoreInfo.address })
    );

    const accountInfo = account.data;

    console.log(`\nusername: ${accountInfo.info.username}\n`);

    if (accountInfo.status === "success") {
      username = accountInfo.info.username;
    } else {
      console.log(
        `Account not found for for publicKey: ${keystoreInfo.address}`
      );
      return;
    }

    let amountInput = parseFloat(
      readlineSync.question(
        "Enter the amount of BTC to charge (more than 0.01 BTC): "
      )
    );

    while (isNaN(amountInput) || amountInput < MIN_BTC_AMOUNT) {
      console.log(
        `Amount must be more than ${MIN_BTC_AMOUNT} BTC. Please try again.`
      );
      amountInput = parseFloat(
        readlineSync.question(
          "Enter the amount of BTC to charge (more than 0.01 BTC): "
        )
      );
    }

    const response: any = await retryRequest(() =>
      axiosInstance.post("/api/payments/create-payment", {
        username,
        amount: amountInput,
      })
    );

    if (response.data.status != "success") {
      console.log(response.data.message);
      return;
    }

    const { btcAddress, amount } = response.data.info;

    console.log(`Please send ${amount} BTC to the following address:`);
    qrcode.generate(btcAddress, { small: true });
    console.log(btcAddress);

    const txid = readlineSync.question(
      "Enter the transaction ID after sending BTC: "
    );

    const response2 = await retryRequest(() =>
      axiosInstance.post("/api/payments/submit-payment", {
        txid,
        username,
      })
    );

    if (response2.data.status === "success") {
      console.log(response2.data.message);
    } else {
      console.log(response2.data.message);
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error processing the request:", error.message);
    }
  }
};
