import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import HDKey from 'hdkey';
import { PrivateKey } from '@wharfkit/antelope';
import { writeFileSync } from 'fs';
import {
  axiosInstance,
  capitalizeFirstLetter,
  clearLines,
  cmdGreenFont,
  cmdRedFont,
  cmdYellowFont,
  inputWithCancel,
  isExsatDocker,
  keystoreExist,
  processAndUpdateString,
  retryRequest,
  selectDirPrompt,
  updateEnvFile,
} from './utils';
import { createKeystore } from './web3';
import WIF from 'wif';
import { bytesToHex } from 'web3-utils';
import { input, select, password, confirm } from '@inquirer/prompts';
import { chargeForRegistry } from './btcResource';
import { Font } from './font';

function validateUsername(username) {
  return /^[a-z1-5]{1,8}$/.test(username);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function checkUsernameWithBackend(username) {
  const response = await axiosInstance.post('/api/users/check-username', {
    username,
  });
  return response.data;
}

async function getInputRole() {
  const role = await select({
    message: 'Select a role',
    choices: [
      { name: 'Synchronizer', value: 'Synchronizer' },
      { name: 'Validator', value: 'Validator' },
    ],
  });
  return role;
}

async function saveKeystore(privateKey, username, role) {
  const getPasswordInput = async (message) => {
    return await password({
      message,
      mask: '*',
      validate: (input) => input.length >= 6 || 'Password must be at least 6 characters.',
    });
  };

  let passwordInput = await getPasswordInput('Set a password to encrypt the private key (at least 6 characters): ');
  let passwordConfirmInput = await getPasswordInput('Confirm your password: ');

  while (passwordInput !== passwordConfirmInput) {
    console.log(`\n${Font.fgYellow}${Font.bright}'Passwords not match, please try again.'${Font.reset}\n`);
    passwordInput = await getPasswordInput('Enter a password to encrypt your private key (at least 6 characters): ');
    passwordConfirmInput = await getPasswordInput('Confirm your password: ');
  }

  // Continue with the rest of the keystore saving logic
  const keystore = await createKeystore(
    `${bytesToHex(WIF.decode(privateKey.toWif(), 128).privateKey)}`,
    passwordInput,
    username,
  );
  const savePassword = await confirm({
    message: 'Do you want to save the password in the .env file?',
  });
  console.log(`\n${Font.fgCyan}${Font.bright}Keystore created successfully.${Font.reset}\n`);

  let selectedPath;
  let pathConfirm = 'yes';
  do {
    selectedPath = await selectDirPrompt();
    if (isExsatDocker()) {
      pathConfirm = await input({
        message: `Please ensure that the save path you set ( ${selectedPath} ) matches the Docker mapping path. Otherwise, your keystore file may be lost. ( Enter "yes" to continue, or "no" to go back to the previous step ):`,
        validate: (input) => ['yes', 'no'].includes(input.toLowerCase()) || 'Please input "yes" or "no".',
      });
    }
  } while (pathConfirm.toLowerCase() === 'no');

  const keystoreFilePath = `${selectedPath}/${username}_keystore.json`;
  writeFileSync(keystoreFilePath, JSON.stringify(keystore), { mode: 0o644 });

  const keystoreFileKey = `${role.toUpperCase()}_KEYSTORE_FILE`;
  const updateDatas = {
    [keystoreFileKey]: keystoreFilePath,
    [`${role.toUpperCase()}_KEYSTORE_PASSWORD`]: savePassword ? processAndUpdateString(passwordInput) : '',
  };
  updateEnvFile(updateDatas);

  console.log(`\n${cmdRedFont('!!!Remember to backup this file!!!')}`);
  console.log(`${cmdGreenFont(`Saved successfully: ${keystoreFilePath}`)}\n`);
  return keystoreFilePath;
}

async function generateKeystore(username, role) {
  const mnemonic = generateMnemonic(wordlist);
  console.log(`${cmdYellowFont(`\nYour seed phrase: \n${mnemonic}`)}\n`);
  await input({
    message:
      "Please confirm that you have backed up and saved the seed phrase (Input 'yes' after you have saved the seed phrase, and then the seed phrase will be hidden.):",
    validate: (input) => input.toLowerCase() === 'yes' || 'Please input “yes” to continue.',
  });
  clearLines(5);

  const seed = mnemonicToSeedSync(mnemonic);
  const master = HDKey.fromMasterSeed(Buffer.from(seed));
  const node = master.derive("m/44'/194'/0'/0/0");

  const privateKey = PrivateKey.from(WIF.encode(128, node.privateKey!, false).toString());
  const publicKey = privateKey.toPublic().toString();

  console.log(`\n${Font.fgCyan}${Font.bright}Key pair generation successful.${Font.reset}\n`);
  await saveKeystore(privateKey, username, role);

  return { privateKey, publicKey, username };
}

async function importAccountAndSaveKeystore(privateKey) {
  return await retryRequest(async () => {
    const accountName = await input({
      message: 'Enter your account name (1-8 characters): ',
    });
    const fullAccountName = accountName.endsWith('.sat') ? accountName : `${accountName}.sat`;
    const accountInfo = await checkUsernameWithBackend(fullAccountName);
    if (privateKey.toPublic().toString() === accountInfo.pubkey) {
      return { accountName, ...accountInfo };
    }
    throw new Error('Account name is not matched.');
  }, 3);
}

async function inputMnemonic() {
  const mnemonic = await inputWithCancel('Enter your seed phrase (12 words, Input "q" to return): ');
  if (!mnemonic) return false;
  const seed = mnemonicToSeedSync(mnemonic.trim());
  const master = HDKey.fromMasterSeed(Buffer.from(seed));
  const node = master.derive("m/44'/194'/0'/0/0");

  const privateKey = PrivateKey.from(WIF.encode(128, node.privateKey!, false).toString());
  clearLines(2);
  return privateKey;
}

export async function importFromMnemonic(role) {
  if (!role) {
    role = await getInputRole();
  }
  let accountInfo;
  let privateKey;
  try {
    privateKey = await inputMnemonic();
    if (!privateKey) return false;
    console.log(`${Font.fgCyan}${Font.bright}keystore generation successful.${Font.reset}\n`);
    accountInfo = await importAccountAndSaveKeystore(privateKey);
  } catch (error: any) {
    console.log(`${Font.fgYellow}${Font.bright}Seed Phrase not available${Font.reset}`);
    return false;
  }
  await saveKeystore(privateKey, accountInfo.accountName, role);
  return await processAccount(accountInfo);
}

export async function importFromPrivateKey(role) {
  if (!role) {
    role = await getInputRole();
  }
  let account;
  let privateKey;
  try {
    const success = await retryRequest(async () => {
      const privateKeyInput = await inputWithCancel('Enter your private key (64 characters, Input "q" to return): ');
      if (!privateKeyInput) return false;
      privateKey = PrivateKey.from(privateKeyInput);
      console.log(`${Font.fgCyan}${Font.bright}keystore generation successful.${Font.reset}\n`);
      account = await importAccountAndSaveKeystore(privateKey);
      return true;
    }, 3);
    if (!success) return false;
  } catch (e) {
    console.log(`${Font.fgYellow}${Font.bright}Private key not available${Font.fgYellow}`);
    return;
  }
  await saveKeystore(privateKey, account.accountName, role);
  return await processAccount(account);
}

export async function processAccount({ accountName, pubkey, status, btcAddress, amount }) {
  const manageMessage = `-----------------------------------------------
   Account: ${accountName}
   Public Key: ${pubkey}
   Account Registration Status: ${status === 'initial' ? 'Unregistered. Please recharge Gas Fee (BTC) to register.' : status === 'charging' ? 'Registering, this may take a moment. Please be patient.' : status === 'completed' ? 'Registered' : status}
  -----------------------------------------------`;
  const menus = [{ name: 'Return', value: 'quit', description: 'Return' }];
  if (status === 'initial') {
    menus.unshift({
      name: 'Recharge BTC',
      value: 'recharge_btc',
      description: 'Recharge BTC',
    });
  }
  const actions = {
    recharge_btc: async () => await chargeForRegistry(accountName, btcAddress, amount),
  };
  let action;
  do {
    action = await select({ message: manageMessage, choices: menus });
    if (action !== 'quit') {
      return await (actions[action] || (() => {}))();
    }
  } while (action !== 'quit');
}

async function requestVerificationCode(username, email, type) {
  try {
    const response = await axiosInstance.post('/api/users/request-code', {
      username,
      type,
      email,
    });

    if (response.data.status !== 'success') {
      throw new Error(response.data.message);
    }

    return true;
  } catch (error: any) {
    console.error('Error requesting verification code: ', error.message);
    return false;
  }
}

export async function changeEmail(username, email) {
  try {
    const requestChange = await requestVerificationCode(username, email, 'UPD');
    if (!requestChange) return false;

    console.log(
      `${Font.fgCyan}${Font.bright}A verification link has been sent to your current email(${email}). Please follow the instructions in the email to change your email.${Font.reset}`,
    );
    return true;
  } catch (error: any) {
    console.error('Error requesting email change: ', error.message);
    return false;
  }
}

async function verifyCode(username, email, type) {
  for (let attempts = 0; attempts < 3; attempts++) {
    const verificationCode = await input({
      message: 'Enter the verification code sent to your email: ',
      validate: (input) =>
        input.length >= 6 && /^\d+$/.test(input) ? true : 'Password must be at least 6 digits and contain only digits.',
    });

    try {
      const verifyCodeResponse = await axiosInstance.post('/api/users/verify-code', {
        username: `${username}.sat`,
        type,
        email,
        code: verificationCode,
      });

      if (verifyCodeResponse.data.status === 'success' && verifyCodeResponse.data.valid) {
        console.log(`${Font.fgCyan}${Font.bright}Email verification successful.${Font.reset}`);
        return true;
      } else {
        console.error('Verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error during email verification: ', error.message);
    }
  }

  console.error('Too many failed attempts. Please try again later.');
  return false;
}

export async function initializeAccount(role) {
  role = capitalizeFirstLetter(role);
  const keystoreFile = keystoreExist(role);
  if (keystoreFile) {
    console.log(`\n${Font.fgYellow}${Font.bright}An account has already been created in ${keystoreFile}.${Font.reset}`);
    return;
  }
  let registryStatus;
  const username = await input({
    message: 'Enter an account name (1-8 characters, a-z, 1-5. Input "q" to return): ',
    validate: async (input) => {
      if (input === 'q') return true;
      if (!validateUsername(input)) {
        return 'Please enter an account name that is 1-8 characters long, contains only a-z and 1-5.';
      }
      try {
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
      } catch (error: any) {
        return `Request error: ${error.message}`;
      }
    },
  });
  if (username === 'q') return false;
  console.log(cmdGreenFont(`  Your account : ${username}.sat`));

  let email = await input({
    message: 'Enter your email address(for emergency notify): ',
  });
  let confirmEmail = await input({ message: 'Confirm your email address: ' });

  while (email !== confirmEmail || !validateEmail(email)) {
    console.log(
      `${Font.fgYellow}${Font.bright}The email address does not match or is invalid. Please enter your email address again.${Font.reset}`,
    );
    email = await input({
      message: 'Enter your email address(for emergency notify): ',
    });
    confirmEmail = await input({ message: 'Confirm your email address: ' });
  }

  const requestCodeSuccess = await requestVerificationCode(username, email, 'REG');
  if (!requestCodeSuccess) return false;
  console.log(`${Font.fgCyan}${Font.bright}Please check your email(${email}) for the verification code.${Font.reset}`);

  const verificationCode = await verifyCode(username, email, 'REG');
  if (!verificationCode) return false;

  if (!role) {
    role = await getInputRole();
  }
  let rewardAddress = '';
  let commissionRate = '';
  if (role === 'Validator') {
    commissionRate = await input({
      message: 'Enter commission ratio (0.00-100.00): ',
      validate: (input) => {
        const num = parseFloat(input);
        // Check if it is a valid number and within the range
        if (!isNaN(num) && num >= 0 && num <= 100 && /^\d+(\.\d{1,2})?$/.test(input)) {
          return true;
        }
        return 'Please enter a valid number between 0.00 and 100.00';
      },
    });

    rewardAddress = await input({
      message: 'Enter reward address',
      validate: (input) => /^0x[a-fA-F0-9]{40}$/.test(input) || 'Please enter a valid reward address.',
    });
  }
  const { publicKey } = await generateKeystore(username, role);
  const infoJson = '{}';
  try {
    const response = await retryRequest(() =>
      axiosInstance.post('/api/users/create-user', {
        username,
        role,
        publicKey,
        email,
        info: infoJson,
        rewardAddress,
        commissionRate: commissionRate ? parseFloat(commissionRate) * 100 : 0,
      }),
    );
    if (response.data.status === 'error') throw new Error(response.data.message);
    const { btcAddress, amount } = response.data.info;
    await chargeForRegistry(username, btcAddress, amount);
    return username;
  } catch (error: any) {
    console.error('Error creating account: ', error.message);
  }
}
