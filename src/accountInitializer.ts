import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import HDKey from 'hdkey';
import { PrivateKey } from '@wharfkit/antelope';
import { writeFileSync } from 'fs';
import {
  axiosInstance,
  clearLines,
  cmdGreenFont,
  cmdRedFont,
  inputWithCancel,
  keystoreExist,
  retryRequest,
  selectDirPrompt,
  updateEnvFile,
} from './utils';
import { createKeystore } from './web3';
import WIF from 'wif';
import { bytesToHex } from 'web3-utils';
import { input, select, password } from '@inquirer/prompts';
import { chargeBtcForResource, chargeForRegistry } from './btcResource';

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
): Promise<any> => {
  try {
    const response = await axiosInstance.post('/api/users/check-username', {
      username,
    });

    return response.data;
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
  updateEnvFile({ KEYSTORE_FILE: `${selectedPath}/${username}_keystore.json` });

  console.log(`\n${cmdRedFont('!!!Remember to backup this file!!!')}\n`);
  console.log(
    `\n${cmdGreenFont(
      `Saved Successed: ${selectedPath}/${username}_keystore.json`,
    )}\n`,
  );
  return `${selectedPath}/${username}_keystore.json`;
}

async function generateKeystore(username) {
  const mnemonic = generateMnemonic(wordlist);
  console.log(`Your Seed Phrase: \n`);
  console.log(`${cmdGreenFont(mnemonic)}\n`);
  await input({
    message:
      "Please confirm that you have backed up and saved the seed phrase (input 'Yes' after you have saved the seed phrase):",
    validate: (input) => {
      if (input.toLowerCase() === 'yes') return true;
      else {
        return 'Please input “yes” to continue.';
      }
    },
  });
  clearLines(5);

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
async function importAccountAndSaveKeystore(privateKey: PrivateKey) {
  return await retryRequest(async () => {
    const accountName = await input({
      message: 'Enter your account name (1-8 characters):',
    });
    const fullAccountName = accountName.endsWith('.sat')
      ? accountName
      : `${accountName}.sat`;
    const accountInfo = await checkUsernameWithBackend(fullAccountName);
    if (privateKey.toPublic().toString() === accountInfo.pubkey) {
      return { accountName, ...accountInfo };
    }
    throw new Error('Account name is not matched.');
  }, 3);
}

export const importFromMnemonic = async () => {
  let accountInfo;
  let privateKey;
  try {
    const success = await retryRequest(async () => {
      privateKey = await inputMnemonic();
      if (!privateKey) return false;
      console.log('keystore generation successful.\n');
      accountInfo = await importAccountAndSaveKeystore(privateKey);
      return true;
    }, 3);
    if (!success) return;
  } catch (error) {
    console.log('Seed Phrase not available');
  }
  const keystoreFile = await saveKeystore(privateKey, accountInfo.accountName);
  return await processAccount(accountInfo);
};
async function inputMnemonic(): Promise<any> {
  const mnemonic = await inputWithCancel(
    'Enter Your Seed Phrase (12 words,Input "q" to return):',
  );
  if (!mnemonic) return false;
  const seed = mnemonicToSeedSync(mnemonic.trim());
  const master = HDKey.fromMasterSeed(Buffer.from(seed));
  const node = master.derive("m/44'/194'/0'/0/0");

  const privateKey = PrivateKey.from(
    WIF.encode(128, node.privateKey, false).toString(),
  );
  clearLines(2);
  return privateKey;
}
export const importFromPrivateKey = async () => {
  let account;
  let privateKey;
  try {
    const success = await retryRequest(async () => {
      const privateKeyInput = await inputWithCancel(
        'Enter your private key (64 characters,Input "q" to return):',
      );
      if (!privateKeyInput) return false;
      privateKey = PrivateKey.from(privateKeyInput);
      console.log('keystore generation successful.\n');
      account = await importAccountAndSaveKeystore(privateKey);
      return true;
    }, 3);
    if (!success) return false;
  } catch (e) {
    console.log('Private key not available');
    return;
  }
  const keystoreFile = await saveKeystore(privateKey, account.accountName);
  return await processAccount(account);
};
export async function processAccount({
  accountName,
  pubkey,
  status,
  btcAddress,
  amount,
}) {
  const manageMessage = `-----------------------------------------------
   Account: ${accountName}
   Public Key: ${pubkey}
   Account Registration Status: ${status === 'initial' ? 'Unregistered. Please recharge Gas Fee (BTC) to register.' : status === 'charging' ? 'Registering, this may take a moment. Please be patient.' : ''}
  -----------------------------------------------`;
  const menus = [
    {
      name: 'Return',
      value: '99',
      description: 'Return',
    },
  ];
  if (status === 'initial') {
    menus.unshift({
      name: 'Recharge BTC',
      value: 'recharge_btc',
      description: 'Recharge BTC',
    });
  }
  const actions: { [key: string]: () => Promise<any> | void } = {
    recharge_btc: async () =>
      await chargeForRegistry(accountName, btcAddress, amount),
  };
  let action;
  do {
    action = await select({
      message: manageMessage,
      choices: menus,
    });
    if (action !== '99') {
      await (actions[action] || (() => {}))();
    }
  } while (action !== '99');
}
export const initializeAccount = async (role?) => {
  const keystoreFile = keystoreExist();
  if (keystoreFile) {
    console.log(`\nAn account has already been created in ${keystoreFile}.`);
    return;
  }
  let registryStatus;
  const username = await input({
    message:
      'Enter a username (1-8 characters, a-z, 1-5.Input "q" to return): ',
    validate: async (input) => {
      if (input === 'q') return true;
      if (!validateUsername(input)) {
        return 'Please enter a username that is 1-8 characters long, contains only a-z and 1-5.';
      }
      const response = await checkUsernameWithBackend(input);
      registryStatus = response.status;
      switch (registryStatus) {
        case 'valid':
          return true;
        case 'chain_off':
          return 'The network query failed. Please try again later or contact the administrator.';
        default:
          return 'This username is already registered. Please enter another one.';
      }
    },
  });
  if (username === 'q') return false;

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
    await chargeForRegistry(username, btcAddress, amount);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error creating account:', error.message);
    }
  }
};
