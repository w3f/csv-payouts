import { readFileSync, existsSync, writeFileSync } from "fs";
import { Hash } from "@polkadot/types/interfaces";
import { Record, ToExecute } from "./";

interface CacheEntry {
  to: string;
  amount: number;
  txHash?: string;
  date?: string;
}

interface Skipped {
  record: Record;
  date: string;
}

export interface Staged {
  to_execute: ToExecute[];
  skipped: Skipped[];
  dangling: CacheEntry[];
}

export class Cache {
  path: string;
  cache: CacheEntry[];

  constructor(path: string) {
    var cache = [];
    // If the cache file alreach exists, read from it.
    if (existsSync(path)) {
      cache = JSON.parse(readFileSync(path, "utf8"));
    }

    this.path = path;
    this.cache = cache;
  }
  private _findTargetIndex(record: Record): number {
    return this.cache.findIndex((cache_entry) => {
      cache_entry.to == record.to && cache_entry.amount == record.amount;
    });
  }
  private _updateCache() {
    // Overwrites the file with new data.
    console.log(this.cache);
    writeFileSync(this.path, JSON.stringify(this.cache));
  }
  public stageActions(records: Record[]): Staged {
    let staged: Staged = {
      to_execute: [],
      skipped: [],
      dangling: [],
    };

    records.forEach((record: Record) => {
      // Check if the record is already cached.
      const idx = this._findTargetIndex(record);

      // If the record _is_ already cached...
      if (idx != -1) {
        // and it was already executed...
        let entry = this.cache[idx];
        if (entry?.txHash) {
          let date;
          if (entry?.date) {
            date = entry?.date;
          } else {
            throw Error("Internal error. This is a bug.");
          }

          staged.skipped.push({
            record: record,
            date: date,
          });
        }
        // otherwise prepare it for execution.
        else {
          staged.to_execute.push(record);
        }
      }
      // and if not...
      else {
        console.log(record);
        this.cache.push({
          to: record.to,
          amount: record.amount,
          txHash: undefined,
          date: undefined,
        });

        staged.to_execute.push(record);
      }
    });

    // Find any dangling entries, i.e. entries that have been cached, but
    // not executed, and are currently not in the action file.
    this.cache
      .filter((entry) => !entry.txHash)
      .forEach((entry) => {
        let found = records.find((record) => {
          entry.to == record.to && entry.amount == record.amount;
        });

        if (!found) {
          staged.dangling.push(entry);
        }
      });

    this._updateCache();

    return staged;
  }
  public trackExecution(record: ToExecute, txHash: Hash) {
    const idx = this._findTargetIndex(record);

    if (idx != -1) {
      this.cache[idx].txHash = txHash.toString();
      this.cache[idx].date = new Date().toISOString();
    } else {
      throw Error("Internal error. This is a bug.");
    }

    this._updateCache();
  }
}
