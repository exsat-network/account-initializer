import {
  axiosInstance,
  cmdGreenFont,
  keystoreExist,
  retryRequest,
} from './utils';
import { readFileSync } from 'fs';
import { decryptKeystore } from './web3';
import { input, confirm, password } from '@inquirer/prompts';

export const queryAccount = async () => {
  try {
    let encFile = keystoreExist();

    if (!encFile) {
      const filePath = await input({
        message: 'Enter the path to your keystore file: ',
      });
      encFile = filePath;
    }

    const keystore = readFileSync(encFile, 'utf-8');
    const keystoreInfo = JSON.parse(keystore);

    console.log(`\nQuerying account for publicKey: ${keystoreInfo.address}\n`);

    const response = await retryRequest(() =>
      axiosInstance.post('/api/users/my', { publicKey: keystoreInfo.address }),
    );

    const accountInfo = response.data;

    if (accountInfo.status === 'success') {
      console.log(`Username: ${accountInfo.info.username}`);
      console.log(`Role: ${accountInfo.info.role}`);
      console.log(`Public Key: ${accountInfo.info.publicKey}`);
      console.log(`Status: ${accountInfo.info.status}`);
    } else {
      console.log(`Account not found for publicKey: ${keystoreInfo.address}`);
      return;
    }

    const needPrivateKey = await confirm({
      message: '\nDo you need to access the private key?',
    });

    if (needPrivateKey) {
      const passwordInput = await password({
        message: 'Enter the password to decrypt your private key: ',
        mask: '*',
      });

      const data = await decryptKeystore(keystore, passwordInput);

      console.log(`\nPrivate Key: ${cmdGreenFont(data)}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error querying account: ', error.message);
    }
  }
};
