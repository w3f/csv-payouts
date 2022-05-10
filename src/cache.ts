import { readFileSync, createWriteStream, existsSync, WriteStream } from 'fs';
import { Record } from './';

type CacheEntry = {
	to: string;
	amount: number;
	txHash?: string;
	date?: string;
}

export class Cache {
	out: WriteStream;
	cache: CacheEntry[];

	constructor(path: string) {
		var cache = [];
		if (existsSync(path)) {
			cache = JSON.parse(readFileSync(path, 'utf8'));
		}

		this.out = createWriteStream(path, 'utf8');
		this.cache = cache;
	}
	private _findTargetIndex(record: Record): number | undefined  {
		return this.cache.findIndex((cache_entry) => {
			cache_entry.to == record.to &&
			cache_entry.amount == record.amount
		});
	}
	private _stageActions(records: Record[]): Record[] {
		let to_execute: Record[] = []

		records.forEach((record) => {
			// Check if the record is already cached.
			const idx = this._findTargetIndex(record)

			// If the record _is_ already cached...
			if (idx) {
				// and it was already executed...
				if (this.cache[idx].txHash) {
					console.log(`Skipping TODO`);

					delete this.cache[idx];
				}
				// otherwise prepare it for execution.
				else {
					to_execute.push(record);
				}
			}
			// and if not...
			else {
				this.cache.push({
					to: record.to,
					amount: record.amount,
					txHash: undefined,
					date: undefined,
				});

				to_execute.push(record);
			}
		});

		return to_execute
	}
	private _trackExecution(record: Record, txHash: string) {
		const idx = this._findTargetIndex(record);

		if (idx) {
			this.cache[idx].txHash = txHash;
			// TODO
			this.cache[idx].date = "";
		} else {
			// TODO: FATAL
		}
	}
}
