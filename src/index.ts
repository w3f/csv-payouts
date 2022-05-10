import { Command } from 'commander';
import { load } from 'js-yaml';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { KeyringPair, KeyringPair$Json } from '@polkadot/keyring/types';
import {Keyring} from '@polkadot/keyring';

type Config = {
	end_point: string;
	actionFilePath: string;
	keystore: Keystore;
}

type Keystore = {
  walletFilePath: string;
  password: string;
}

type Record = {
	to: string;
	amount: number;
}

export const startAction = async (args: { config: string }): Promise<void> => {
	console.log("Reading config from file", args.config);
	const config = load(readFileSync(args.config, "utf8")) as Config;

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

	const keyring = new Keyring({ type: 'sr25519' });
	const json = JSON.parse(readFileSync(config.keystore.walletFilePath, 'utf8'));
	const keystore = keyring.addFromJson(json);
	keystore.decodePkcs8(config.keystore.password);
}

const command = new Command()
	.description('Execute the CSV payouts')
	.option('-c, --config [path]', 'Path to config file.', './config/main.csv')
	.action(startAction);

command.parse();
