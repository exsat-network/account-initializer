import { axiosInstance, keystoreExist, retryRequest } from './utils';
import { MIN_BTC_AMOUNT } from './constants';
import qrcode from 'qrcode-terminal';
import { readFileSync } from 'fs';
import { input } from '@inquirer/prompts';

export const chargeBtcForResource = async (encFile?) => {
  try {
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
    const keystoreInfo = JSON.parse(keystore);
    let username = '';

    const account = await retryRequest(() =>
      axiosInstance.post('/api/users/my', { publicKey: keystoreInfo.address }),
    );

    const accountInfo = account.data;

    console.log(`\nusername: ${accountInfo.info.username}\n`);

    if (accountInfo.status === 'success') {
      username = accountInfo.info.username;
    } else {
      console.log(`Account not found for publicKey: ${keystoreInfo.address}`);
      return;
    }

    const amountInput = await input({
      message: `Enter the amount of BTC to charge (more than ${MIN_BTC_AMOUNT} BTC): `,
      validate: (input) => {
        const amount = parseFloat(input);
        if (isNaN(amount) || amount < MIN_BTC_AMOUNT) {
          return `Amount must be more than ${MIN_BTC_AMOUNT} BTC. Please try again.`;
        }
        return true;
      },
    });

    const response = await retryRequest(() =>
      axiosInstance.post('/api/payments/create-payment', {
        username,
        amount: parseFloat(amountInput),
      }),
    );

    if (response.data.status != 'success') {
      console.log(response.data.message);
      return;
    }

    const { btcAddress, amount } = response.data.info;

    console.log(`Please send ${amount} BTC to the following address:`);
    qrcode.generate(btcAddress, { small: true });
    const response3 = await retryRequest(() =>
      axiosInstance.get('/api/config/exsat_config'),
    );
    console.log(
      `BTC Address：${btcAddress}\n` +
        `Network:${response3.data.info.btc_network}\n` +
        '-----------------------------------------------',
    );

    const txid = await input({
      message: 'Enter the transaction ID after sending BTC: ',
    });

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
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error processing the request:', error.message);
    }
  }
};

export async function chargeForRegistry(username, btcAddress, amount) {
  console.log(
    '-----------------------------------------------\n' +
      `· Please send 0.01 BTC to the following BTC address and send the Transaction ID to the system. \n` +
      `· Once the system receives this BTC, your exSat account ( ${username}.sat ) will be officially created on the exSat network. \n` +
      `· The BTC you send will be cross-chained to your exSat account and used for subsequent on-chain operations as Gas Fee.\n` +
      '-----------------------------------------------',
  );
  qrcode.generate(btcAddress, { small: true });
  const response3 = await retryRequest(() =>
    axiosInstance.get('/api/config/exsat_config'),
  );
  console.log(
    `BTC Address：${btcAddress}\n` +
      `Network:${response3.data.info.btc_network}\n` +
      '-----------------------------------------------',
  );
  let response;
  const txid = await input({
    message: `Enter the transaction ID after sending BTC: `,
    validate: async (input: string) => {
      if (input.length > 64) {
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
  if (txid) console.log(response.data.message);
}
