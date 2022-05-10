import { Command } from 'commander';
import { load } from 'js-yaml';
import { readFileSync, createWriteStream, existsSync, WriteStream } from 'fs';
import { parse } from 'csv-parse';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import {Keyring} from '@polkadot/keyring';
import { Cache } from './cache';

const CACHE_PATH = '.action_cache.json';

type Config = {
	end_point: string;
	actionFilePath: string;
	keystore: Keystore;
}

type Keystore = {
  walletFilePath: string;
  password: string;
}

export type Record = {
	to: string;
	amount: number;
}

const start = async (args: { config: string }): Promise<void> => {
	// Parse Config
	console.log("Reading config from file", args.config);
	const config = load(readFileSync(args.config, "utf8")) as Config;

	// Parse CSV file
	console.log("Reading from file", config.actionFilePath);
	let content = readFileSync(config.actionFilePath, 'utf8');

	let records: Record[] = [];
	const parser = parse({ delimiter: "," });
	parser
		.on('readable', (data) => {
			let record;
			while ((record = parser.read()) !== null) {
				records.push(record as Record);
			}
		});

	parser.write(content);
	parser.end();

	console.log(`Parsed ${records.length} CSV entries`);

	// Parse and decode provided account.
	console.log("Reading account key from", config.keystore.walletFilePath);
	const keyring = new Keyring({ type: 'sr25519' });
	const json = JSON.parse(readFileSync(config.keystore.walletFilePath, 'utf8'));
	const account = keyring.addFromJson(json);
	account.decodePkcs8(config.keystore.password);

	if (account.isLocked) {
		// TODO: Error
	}

	// Init caching.
	let cache = new Cache(CACHE_PATH);

	// Initialize RPC endpoint.
	const wsProvider = new WsProvider(config.end_point);
	const api = await ApiPromise.create({ provider: wsProvider });

	// For each provided entry in the CSV file, execute the balance.
	for (const record of records) {
		const txHash = await api.tx.balances
			.transfer(record.to, record.amount)
			.signAndSend(account);

			console.log(`Sent ${record.amount} to ${account} with hash ${txHash}`);

	}
}

const command = new Command()
	.description('Execute the CSV payouts')
	.option('-c, --config [path]', 'Path to config file.', './config/main.csv')
	.action(start);

command.parse();
