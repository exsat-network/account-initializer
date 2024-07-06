import { generateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import HDKey from "hdkey";
import { PrivateKey } from "@wharfkit/antelope";
import { writeFileSync, readdirSync, readFileSync } from "fs";
import qrcode from "qrcode-terminal";
import {
    axiosInstance,
    cmdGreenFont,
    cmdRedFont,
    readSelectedPath,
    retryRequest,
    selectDirPrompt,
} from "./utils";
import { createKeystore, decryptKeystore } from "./web3";
import WIF from "wif";
import { bytesToHex } from "web3-utils";
import { UserInfo } from "./constants";
import { input, select, confirm, password } from '@inquirer/prompts';

const validateUrl = (value: string): boolean => {
    try {
        new URL(value);
        return true;
    } catch (_) {
        return false;
    }
};

const validateUserInfo = (data: any): data is UserInfo => {
    return (
        // typeof data.website === "string" &&
        // validateUrl(data.website) &&
        typeof data.logo === "string" &&
        validateUrl(data.logo) &&
        typeof data.name === "string" &&
        typeof data.profile === "string"
    );
};

const validateUsername = (username: string): boolean => {
    const regex = /^[a-z1-5]{1,7}$/;
    return regex.test(username);
};

const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

const checkUsernameWithBackend = async (username: string): Promise<boolean> => {
    try {
        const response = await axiosInstance.post("/api/users/check-username", {
            username,
        });

        return response.data.valid;
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error checking username with backend:", error.message);
        }

        return false;
    }
};

const checkUsernameRegisterOrder = async (
    username: string
): Promise<boolean> => {
    try {
        const response = await retryRequest(() =>
            axiosInstance.post("/api/users/my", { username })
        );

        const accountInfo = response.data;

        if (accountInfo.status === "success") {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error checking username with backend:", error.message);
        }

        return false;
    }
};

export const initializeAccount = async () => {
    const savedPath = readSelectedPath();

    if (
        savedPath &&
        readdirSync(savedPath).some((file) => file.endsWith("_keystore.json"))
    ) {
        console.log(`\nAn account has already been created in ${savedPath}.`);
        return;
    }

    let username = await input({
        message: "\nEnter a username (1-7 characters, a-z): ",
    });

    if (await checkUsernameRegisterOrder(username)) {
        console.log(
            "Username is registering . Please wait for the email or change other username."
        );
        return;
    }

    while (
        !validateUsername(username) ||
        !(await checkUsernameWithBackend(username))
        ) {
        console.log(
            "Invalid or already taken username. Please enter a username that is 1-7 characters long, contains only a-z and 1-5, and is not already taken."
        );
        username = await input({
            message: "Enter a username (1-7 characters, a-z, 1-5): ",
        });
    }

    let email = await input({
        message: "\nEnter your email address(for emergency notify): ",
    });
    let confirmEmail = await input({
        message: "Confirm your email address: ",
    });

    while (email !== confirmEmail || !validateEmail(email)) {
        console.log(
            "Email addresses do not match or are invalid. Please enter your email address again."
        );
        email = await input({
            message: "Enter your email address(for emergency notify): ",
        });
        confirmEmail = await input({
            message: "Confirm your email address: ",
        });
    }

    const addInfo = await confirm({
        message: "Do you want to add more information for promotion? : ",
    });

    let infoJson: string;

    if (addInfo) {
        const inputMethod = await confirm({
            message: "\n* Manually enter the information [y]\n* Import it from a JSON file from profile.html [n]:\n ",
        });
        if (inputMethod) {
            // let website = await input({ message: "Enter your website URL: " });
            // while (!validateUrl(website)) {
            //   console.log("Invalid URL. Please enter a valid website URL.");
            //   website = await input({ message: "Enter your website URL: " });
            // }
            const name = await input({ message: "Enter your group or company name: " });
            const profile = await input({
                message: "Enter your profile (supports markdown): ",
            });

            let logo = await input({
                message: "Enter your logo link URL(256x256px or 1024x1024px): ",
            });
            while (!validateUrl(logo)) {
                console.log("Invalid URL. Please enter a valid logo link URL.");
                logo = await input({
                    message: "Enter your logo link URL(256x256px or 1024x1024px): ",
                });
            }

            // const pub_email = await input({ message: "Enter your public Email: " });

            infoJson = JSON.stringify({
                // website,
                logo,
                name,
                profile,
                // email: pub_email,
            });
        } else {
            const filePath = await input({
                message: "Enter the path to your JSON file: ",
            });
            try {
                const data = JSON.parse(readFileSync(filePath, "utf-8"));
                console.log(data);
                if (validateUserInfo(data)) {
                    infoJson = JSON.stringify(data);
                } else {
                    console.log(
                        "Invalid JSON format. Please check the file and try again."
                    );
                    return;
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error("Error reading JSON file:", error.message);
                }

                return;
            }
        }
    }

    const roleOptions = [
        { name: "Pool (Synchronizer)", value: "Pool" },
        { name: "Validator", value: "Validator" },
        { name: "Custodian SP", value: "Custodian SP" },
    ];

    const role = await select({
        message: "Select a role:",
        choices: roleOptions,
    });

    const mnemonic = generateMnemonic(wordlist);
    console.log(`Your mnemonic phrase: \n`);
    console.log(`${cmdGreenFont(mnemonic)}\n`);
    await input({
        message: "Press [Enter] button after you have saved your mnemonic phrase.",
    });

    const seed = mnemonicToSeedSync(mnemonic);
    const master = HDKey.fromMasterSeed(Buffer.from(seed));
    const node = master.derive("m/44'/194'/0'/0/0");

    const privateKey = PrivateKey.from(
        WIF.encode(128, node.privateKey, false).toString()
    );

    const publicKey = privateKey.toPublic().toString();

    console.log(`\nPrivate Key: ${cmdGreenFont(privateKey.toString())}`);
    console.log(`Public Key: ${cmdGreenFont(publicKey)}\n`);
    console.log("Key pair generation successful.\n");

    const passwordInput = await password({
        message: "Enter a password to encrypt your private key(>= 6 digits): ",
        mask: '*',
        validate: (input) => input.length >= 6 || "Password must be at least 6 characters long."
    });

    const keystore = await createKeystore(
        `${bytesToHex(node.privateKey)}`,
        passwordInput,
        username
    );
    console.log(`\nKeystore created successfully.\n`);
    // console.log(keystore);

    // const decryptedPrivateKey = await decryptKeystore(keystore, passwordInput);
    // console.log(`\ndecryptedPrivateKey.${decryptedPrivateKey}\n`);

    const selectedPath = await selectDirPrompt();

    writeFileSync(
        `${selectedPath}/${username}_keystore.json`,
        JSON.stringify(keystore)
    );

    console.log(`\n${cmdRedFont("!!!Remember to backup this file!!!")}\n`);
    console.log(
        `\n${cmdGreenFont(
            `Saved Successed: ${selectedPath}/${username}_keystore.json`
        )}\n`
    );

    try {
        const response = await retryRequest(() =>
            axiosInstance.post("/api/users/create-user", {
                username,
                role,
                publicKey,
                email,
                info: infoJson,
            })
        );
        const { btcAddress, amount } = response.data.info;

        console.log(`Please send ${amount} BTC to the following address:`);
        qrcode.generate(btcAddress, { small: true });
        console.log(btcAddress);

        const txid = await input({
            message: "Enter the transaction ID after sending BTC: ",
        });

        const response2 = await retryRequest(() =>
            axiosInstance.post("/api/users/submit-payment", {
                txid,
                amount,
                username,
            })
        );

        if (response2.data.status === "success") {
            console.log(response2.data.message);
        } else {
            console.log("Payment not confirmed.");
            return;
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error creating account:", error.message);
        }
    }
};
