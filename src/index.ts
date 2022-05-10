import { Command } from 'commander';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse';
import { ApiPromise, WsProvider } from '@polkadot/api';

type Record = {
	from: string;
	to: string;
	amount: number;
}

export const startAction = async (args: { path: string }): Promise<void> => {
	console.log("Reading from file:", args.path);

	let content = readFileSync(args.path, 'utf8');
	console.log("Content:\n" + content);

	let entries: Record[] = [];
	const parser = parse({ delimiter: "," });
	parser
		.on('readable', (data) => {
			let record;
			while ((record = parser.read()) !== null) {
				entries.push(record as Record);
			}
		});

	parser.write(content);
	parser.end();

	console.log(entries);
}

const command = new Command()
	.description('Execute the CSV payouts')
	.option('-p, --path [path]', 'Path to config file.', './config/main.csv')
	.action(startAction);

command.parse();
