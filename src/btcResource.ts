import { axiosInstance, readSelectedPath, retryRequest } from './utils';
import { MIN_BTC_AMOUNT } from './constants';
import qrcode from 'qrcode-terminal';
import { readFileSync, readdirSync } from 'fs';
import { input } from '@inquirer/prompts';

export const chargeBtcForResource = async (encFile?) => {
  try {
    if (!encFile) {
      const selectedPath = readSelectedPath();

      if (selectedPath) {
        const files = readdirSync(selectedPath).filter((file) =>
          file.endsWith('_keystore.json'),
        );

        if (files.length > 0) {
          encFile = files[0];
        } else {
          const filePath = await input({
            message: 'Enter the path to your keystore file: ',
          });
          encFile = filePath;
        }
      } else {
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
    console.log(btcAddress);

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
