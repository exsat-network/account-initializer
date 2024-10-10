import {
  changeEmail,
  checkUsernameWithBackend,
  importFromMnemonic,
  importFromPrivateKey,
  initializeAccount,
  processAccount,
} from './accountInitializer';
import { queryAccount } from './query';
import { chargeBtcForResource } from './btcResource'; // Import the new function
import { input, select } from '@inquirer/prompts';
import { keystoreExist } from './utils';
import { readFileSync } from 'fs';

export type InitializeAccountOptions = {
  role?: 'Synchronizer' | 'Validator';
};

export const showMenu = async (options?: InitializeAccountOptions) => {
  const keystoreFile = keystoreExist();
  let choices;
  if (keystoreFile) {
    choices = [
      { name: 'Process Account', value: '6' },
      { name: 'Query Account', value: '2' },
      { name: 'Exit', value: '99' },
    ];
  } else {
    choices = [
      { name: 'Initialize Account', value: '1' },
      { name: 'Query Account', value: '2' },
      { name: 'Charging BTC for Resource', value: '3' }, // New menu item
      { name: 'Generate Keystore From Mnemonic', value: '4' },
      { name: 'Generate Keystore From PrivateKey', value: '5' },
      { name: 'change email', value: '7' },
      { name: 'Exit', value: '99' },
    ];
  }

  const choice = await select({
    message: 'Select an option: ',
    choices: choices.map((choice) => ({
      name: choice.name,
      value: choice.value,
    })),
  });

  switch (choice) {
    case '1':
      await initializeAccount(options?.role);
      break;
    case '2':
      await queryAccount();
      break;
    case '3':
      await chargeBtcForResource(); // Call the new function
      break;
    case '4':
    case '5':
      const role = await select({
        message: 'Select a role: ',
        choices: [
          { name: 'Sycnhronizer', value: 'Synchronizer' },
          { name: 'Validator', value: 'Validator' },
        ],
      });
      if (choice === '4') {
        await importFromMnemonic(role);
      } else {
        await importFromPrivateKey(role);
      }
      break;
    case '6':
      if (!keystoreFile) return;
      const keystore = readFileSync(keystoreFile, 'utf-8');
      const accountInfo = JSON.parse(keystore);
      const response = await checkUsernameWithBackend(accountInfo.username);

      if (accountInfo.address !== response.pubkey) {
        return;
      }
      if (['initial', 'charging'])
        await processAccount({
          ...response,
          accountName: accountInfo.username,
        });
      break;
    case '7':
      const username = await input({
        message: 'Input your username: ',
      });
      const email = await input({
        message: 'Input your email: ',
      });
      await changeEmail(username, email);
      break;
    case '99':
      console.log('Exiting...');
      process.exit(0);
    default:
      console.log('Invalid choice. Please try again.');
      await showMenu();
      break;
  }
};
