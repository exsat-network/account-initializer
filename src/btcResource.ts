import { axiosInstance, inputWithCancel, isValidTxid, keystoreExist, retryRequest } from './utils';
import { MIN_BTC_AMOUNT } from './constants';
import qrcode from 'qrcode-terminal';
import { readFileSync } from 'fs';
import { input } from '@inquirer/prompts';
import { Font } from './font';

const getKeystore = async (encFile?) => {
  if (!encFile) {
    encFile = keystoreExist();
    if (!encFile) {
      const filePath = await input({
        message: 'Enter the path to your keystore file: ',
      });
      encFile = filePath;
    }
  }

  const keystore = readFileSync(encFile, 'utf-8');
  return JSON.parse(keystore);
};

const getAccountInfo = async (publicKey) => {
  const account = await retryRequest(() => axiosInstance.post('/api/users/my', { publicKey }));

  if (account.data.status === 'success') {
    console.log(
      `\n${Font.fgCyan}${Font.bright}Account: ${Font.reset}${Font.bright} ${account.data.info.username}${Font.reset}\n`,
    );
    return account.data.info.username;
  } else {
    console.log(`${Font.fgYellow}${Font.bright}Account not found for publicKey: ${publicKey}${Font.reset}`);
    return null;
  }
};

const getBtcAmount = async () => {
  return await inputWithCancel(
    `Enter the amount of BTC to bridge (at least ${MIN_BTC_AMOUNT} BTC, Input "q" to return.): `,
    (input) => {
      const amount = parseFloat(input);
      if (isNaN(amount) || amount < MIN_BTC_AMOUNT) {
        return `Amount must be at least ${MIN_BTC_AMOUNT} BTC. Please try again.`;
      }
      return true;
    },
  );
};

const createPayment = async (username, amount) => {
  const response = await retryRequest(() =>
    axiosInstance.post('/api/payments/create-payment', {
      username,
      amount: parseFloat(amount),
    }),
  );

  if (response.data.status !== 'success') {
    console.log(response.data.message);
    return null;
  }

  return response.data.info;
};

const submitPayment = async (txid, username) => {
  const response2 = await retryRequest(() =>
    axiosInstance.post('/api/payments/submit-payment', {
      txid,
      username,
    }),
  );

  if (response2.data.status === 'success') {
    console.log(response2.data.message);
  } else {
    console.log(response2.data.message);
  }
};

const displayQrCode = (btcAddress, network) => {
  console.log(
    `${Font.fgCyan}${Font.bright}-----------------------------------------------\nPlease send BTC to the following address: ${Font.reset}`,
  );
  qrcode.generate(btcAddress, { small: true });
  console.log(
    `${Font.bright}${Font.fgCyan}BTC Address: ${Font.reset}${Font.bright}${btcAddress}\n` +
      `${Font.fgCyan}Network: ${Font.reset}${Font.bright}${network}\n` +
      `${Font.fgCyan}-----------------------------------------------${Font.reset}`,
  );
};

export const chargeBtcForResource = async (encFile?) => {
  try {
    const keystoreInfo = await getKeystore(encFile);
    const username = await getAccountInfo(keystoreInfo.address);

    if (!username) return;

    const amountInput = await getBtcAmount();
    if (!amountInput) return false;
    const paymentInfo = await createPayment(username, amountInput);

    if (!paymentInfo) return false;

    const { btcAddress, amount } = paymentInfo;

    const networkResponse = await retryRequest(() => axiosInstance.get('/api/config/exsat_config'));

    displayQrCode(btcAddress, networkResponse.data.info.btc_network);

    const txid = await input({
      message: 'Enter the transaction ID after sending BTC: ',
    });

    await submitPayment(txid, username);
    return true;
  } catch (error: any) {
    console.error('Error processing the request: ', error.message);
    return false;
  }
};

export async function chargeForRegistry(username, btcAddress, amount) {
  console.log(
    `${Font.fgCyan}${Font.bright}-----------------------------------------------\n` +
      `· Please send 0.01 BTC to the following BTC address and send the Transaction ID to the system. \n` +
      `· Once the system receives this BTC, your exSat account (${Font.reset}${Font.bright} ${username.endsWith('.sat') ? username : `${username}.sat`} ${Font.fgCyan}) will be officially created on the exSat network. \n` +
      `· The BTC you send will be cross-chained to your exSat account and used for subsequent on-chain operations as Gas Fee.\n` +
      `-----------------------------------------------${Font.reset}`,
  );

  qrcode.generate(btcAddress, { small: true });

  const networkResponse = await retryRequest(() => axiosInstance.get('/api/config/exsat_config'));

  console.log(
    `${Font.fgCyan}${Font.bright}BTC Address: ${Font.reset}${Font.bright}${btcAddress}\n` +
      `${Font.fgCyan}Network: ${Font.reset}${Font.bright}${networkResponse.data.info.btc_network}\n` +
      `${Font.fgCyan}-----------------------------------------------${Font.reset}`,
  );

  let response;
  const txid = await input({
    message: `Enter the transaction ID after sending BTC: `,
    validate: async (input) => {
      if (!isValidTxid(input)) {
        return 'Invalid transaction ID.';
      }

      try {
        response = await axiosInstance.post('/api/users/submit-payment', {
          txid: input,
          amount,
          username,
        });
        if (response.data.status === 'success') {
          return true;
        }
        return response.data.message;
      } catch (error: any) {
        if (error.response && error.response.status === 409) {
          return 'Transaction already submitted.';
        }
        return error.message;
      }
    },
  });

  return username;
}
