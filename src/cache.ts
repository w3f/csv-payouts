import { readFileSync, existsSync, writeFileSync } from 'fs';
import { Hash } from '@polkadot/types/interfaces';
import { Record, ToExecute } from './';

type CacheEntry = {
	to: string;
	amount: number;
	txHash?: string;
	date?: string;
}

export class Cache {
	path: string;
	cache: CacheEntry[];

	constructor(path: string) {
		var cache = [];
		// If the cache file alreach exists, read from it.
		if (existsSync(path)) {
			cache = JSON.parse(readFileSync(path, 'utf8'));
		}

		this.path = path;
		this.cache = cache;
	}
	private _findTargetIndex(record: Record): number | undefined {
		return this.cache.findIndex((cache_entry) => {
			cache_entry.to == record.to &&
				cache_entry.amount == record.amount
		});
	}
	private _updateCache() {
		// Overwrites the file with new data.
		writeFileSync(this.path, JSON.stringify(this.cache));
	}
	public stageActions(records: Record[]): [ToExecute[], CacheEntry[]] {
		let to_execute: ToExecute[] = []

		records.forEach((record) => {
			// Check if the record is already cached.
			const idx = this._findTargetIndex(record)

			// If the record _is_ already cached...
			if (idx) {
				// and it was already executed...
				let entry = this.cache[idx];
				if (entry.txHash) {
					console.log(
						`Skipping sending ${record.amount} \
						to ${record.to}, already executed on ${entry.date},\
						hash tx: ${entry.txHash}`
					);
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

		// Find any dangling entries, i.e. entries that have been cached, but
		// not executed, and are currently not in the action file.
		let dangling: CacheEntry[] = [];
		this.cache
			.filter((entry) => !entry.txHash)
			.forEach((entry) => {
				let found = records.find((record) => {
					entry.to == record.to &&
						entry.amount == record.amount
				});

				if (!found) {
					dangling.push(entry);
				}
			});

		this._updateCache();

		return [to_execute, dangling]
	}
	public trackExecution(record: ToExecute, txHash: Hash) {
		const idx = this._findTargetIndex(record);

		if (idx) {
			this.cache[idx].txHash = txHash.toString();
			// TODO
			this.cache[idx].date = "";
		} else {
			// TODO: FATAL
		}

		this._updateCache();
	}
}
