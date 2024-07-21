import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import HDKey from 'hdkey';
import { PrivateKey } from '@wharfkit/antelope';
import { writeFileSync, readdirSync } from 'fs';
import qrcode from 'qrcode-terminal';
import {
  axiosInstance,
  cmdGreenFont,
  cmdRedFont,
  readSelectedPath,
  retryRequest,
  selectDirPrompt,
} from './utils';
import { createKeystore } from './web3';
import WIF from 'wif';
import { bytesToHex } from 'web3-utils';
import { EXSAT_RPC_URLS } from './constants';
import { input, select, password } from '@inquirer/prompts';

const validateUsername = (username: string): boolean => {
  const regex = /^[a-z1-5]{1,8}$/;
  return regex.test(username);
};

const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const checkUsernameWithBackend = async (
  username: string,
): Promise<boolean> => {
  try {
    const response = await axiosInstance.post('/api/users/check-username', {
      username,
    });

    return response.data.valid;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking username with backend:', error.message);
    }

    return false;
  }
};

export const checkUsernameRegisterOrder = async (
  username: string,
): Promise<boolean> => {
  try {
    const response = await retryRequest(() =>
      axiosInstance.post('/api/users/my', { username }),
    );

    const accountInfo = response.data;

    if (accountInfo.status === 'success') {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error checking username with backend:', error.message);
    }

    return false;
  }
};
async function saveKeystore(privateKey: PrivateKey, username: string) {
  let passwordInput = await password({
    message:
      'Account imported successfully. Set a password to encrypt the private key (at least 6 characters): ',
    mask: '*',
    validate: (input) =>
      input.length >= 6 || 'Password must be at least 6 characters.',
  });
  let passwordConfirmInput = await password({
    message: 'Confirm your password: ',
    mask: '*',
  });
  while (passwordInput !== passwordConfirmInput) {
    console.log(`\n${cmdRedFont('Password not match, please try again.')}\n`);
    passwordInput = await password({
      message: 'Enter a password to encrypt your private key(>= 6 digits): ',
      mask: '*',
      validate: (input) =>
        input.length >= 6 || 'Password must be at least 6 characters long.',
    });
    passwordConfirmInput = await password({
      message: 'Confirm your password: ',
      mask: '*',
    });
  }

  const keystore = await createKeystore(
    `${bytesToHex(WIF.decode(privateKey.toWif(), 128).privateKey)}`,
    passwordInput,
    username,
  );
  console.log(`\nKeystore created successfully.\n`);
  // console.log(keystore);

  // const decryptedPrivateKey = await decryptKeystore(keystore, passwordInput);
  // console.log(`\ndecryptedPrivateKey.${decryptedPrivateKey}\n`);

  const selectedPath = await selectDirPrompt();

  writeFileSync(
    `${selectedPath}/${username}_keystore.json`,
    JSON.stringify(keystore),
  );

  console.log(`\n${cmdRedFont('!!!Remember to backup this file!!!')}\n`);
  console.log(
    `\n${cmdGreenFont(
      `Saved Successed: ${selectedPath}/${username}_keystore.json`,
    )}\n`,
  );
}

async function generateKeystore(username) {
  const mnemonic = generateMnemonic(wordlist);
  console.log(`Your mnemonic phrase: \n`);
  console.log(`${cmdGreenFont(mnemonic)}\n`);
  await input({
    message: 'Press [Enter] button after you have saved your mnemonic phrase.',
  });

  const seed = mnemonicToSeedSync(mnemonic);
  const master = HDKey.fromMasterSeed(Buffer.from(seed));
  const node = master.derive("m/44'/194'/0'/0/0");

  const privateKey = PrivateKey.from(
    WIF.encode(128, node.privateKey, false).toString(),
  );
  const publicKey = privateKey.toPublic().toString();

  console.log('Key pair generation successful.\n');

  await saveKeystore(privateKey, username);

  return { privateKey, publicKey, username };
}
async function getAccountName(privateKey: PrivateKey) {
  const apiUrl = EXSAT_RPC_URLS[0] + `/v1/chain/get_account`;
  return await retryRequest(async () => {
    const accountName = await input({
      message: 'Enter your account name (1-8 characters):',
    });
    const fullAccountName = accountName.endsWith('.sat')
      ? accountName
      : `${accountName}.sat`;
    const response = await axiosInstance.post(apiUrl, {
      account_name: fullAccountName,
    });

    const publicKey = response.data.permissions[0].required_auth.keys[0].key;
    if (privateKey.toPublic().toLegacyString() === publicKey) {
      return accountName;
    }
    throw new Error('Account name is not matched.');
  }, 3);
}

export const importFromMnemonic = async () => {
  try {
    await retryRequest(async () => {
      const mnemonic = await input({
        message: 'Enter your mnemonic phrase (12 words):',
      });

      const seed = mnemonicToSeedSync(mnemonic.trim());
      const master = HDKey.fromMasterSeed(Buffer.from(seed));
      const node = master.derive("m/44'/194'/0'/0/0");

      const privateKey = PrivateKey.from(
        WIF.encode(128, node.privateKey, false).toString(),
      );

      console.log('keystore generation successful.\n');
      const username = await getAccountName(privateKey);
      await saveKeystore(privateKey, username);
    }, 3);
  } catch (error) {
    console.log('Mnemonic phrase not available');
  }
};
export const importFromPrivateKey = async () => {
  try {
    await retryRequest(async () => {
      const privateKeyInput = await input({
        message: 'Enter your private key (64 characters):',
      });
      const privateKey = PrivateKey.from(privateKeyInput);
      console.log('keystore generation successful.\n');
      const username = await getAccountName(privateKey);
      await saveKeystore(privateKey, username);
    }, 3);
  } catch (e) {
    console.log('Private key not available');
  }
};

export const initializeAccount = async (role?) => {
  const savedPath = readSelectedPath();
  if (
    savedPath &&
    readdirSync(savedPath).some((file) => file.endsWith('_keystore.json'))
  ) {
    console.log(`\nAn account has already been created in ${savedPath}.`);
    return;
  }

  let username = await input({
    message: '\nEnter a username (1-8 characters, a-z): ',
  });

  if (await checkUsernameRegisterOrder(username)) {
    console.log(
      'Username is registering . Please wait for the email or change other username.',
    );
    return;
  }

  while (
    !validateUsername(username) ||
    !(await checkUsernameWithBackend(username))
  ) {
    console.log(
      'Invalid or already taken username. Please enter a username that is 1-8 characters long, contains only a-z and 1-5, and is not already taken.',
    );
    username = await input({
      message: 'Enter a username (1-8 characters, a-z, 1-5): ',
    });
  }

  let email = await input({
    message: '\nEnter your email address(for emergency notify): ',
  });
  let confirmEmail = await input({
    message: 'Confirm your email address: ',
  });

  while (email !== confirmEmail || !validateEmail(email)) {
    console.log(
      'Email addresses do not match or are invalid. Please enter your email address again.',
    );
    email = await input({
      message: 'Enter your email address(for emergency notify): ',
    });
    confirmEmail = await input({
      message: 'Confirm your email address: ',
    });
  }

  const roleOptions = [
    { name: 'Synchronizer', value: 'Synchronizer' },
    { name: 'Validator', value: 'Validator' },
  ];

  if (!role) {
    role = await select({
      message: 'Select a role:',
      choices: roleOptions,
    });
  }
  let rewardAddress = '';
  let commissionRate = '';
  if (role === 'Validator') {
    commissionRate = await input({
      message: 'Enter commission rate (0-10000)',
      validate: (input) => {
        const number = Number(input);
        if (!Number.isInteger(number) || number < 0 || number > 10000) {
          return 'Please enter a valid integer between 0 and 10000.';
        }
        return true;
      },
    });

    rewardAddress = await input({
      message: 'Enter Reward Address',
      validate: (input: string) => {
        if (!/^0x[a-fA-F0-9]{40}$/.test(input)) {
          return 'Please enter a valid account name.';
        }
        return true;
      },
    });
  }
  const { publicKey } = await generateKeystore(username);
  const infoJson: string = '{}';
  //infoJson = await addMoreInformation();
  try {
    const response = await retryRequest(() =>
      axiosInstance.post('/api/users/create-user', {
        username,
        role,
        publicKey,
        email,
        info: infoJson,
        rewardAddress,
        commissionRate: commissionRate ? Number(commissionRate) : 0,
      }),
    );
    const { btcAddress, amount } = response.data.info;

    console.log(`Please send ${amount} BTC to the following address:`);
    qrcode.generate(btcAddress, { small: true });
    console.log(btcAddress);

    const response3 = await retryRequest(() =>
      axiosInstance.get('/api/config/exsat_config'),
    );
    console.log(`\nNetwork:${response3.data.info.btc_network}`);
    const txid = await input({
      message: `Enter the transaction ID after sending BTC: `,
      validate: (input: string) => {
        if (input.length > 64) {
          return 'Invalid transaction ID.';
        }
        return true;
      },
    });

    const response2 = await retryRequest(() =>
      axiosInstance.post('/api/users/submit-payment', {
        txid,
        amount,
        username,
      }),
    );

    if (response2.data.status === 'success') {
      console.log(response2.data.message);
    } else {
      console.log('Payment not confirmed.');
      return;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error creating account:', error.message);
    }
  }
};
