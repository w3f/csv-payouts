import { readFileSync, existsSync, writeFileSync } from "fs";
import { Record, ToExecute } from "./";

interface CacheEntry {
  to: string;
  amount: number;
  txHash: string | null;
  exec_date: string | null;
}

interface Skipped {
  record: Record;
  txHash: string;
  date: string;
}

export interface Staged {
  to_execute: Array<ToExecute>;
  skipped: Array<Skipped>;
  dangling: Array<CacheEntry>;
}

export class Cache {
  path: string;
  cache: Array<CacheEntry>;
  mem_only: boolean;

  constructor(path?: string) {
    let cache = new Array();

    if (path == undefined) {
      this.path = "";
      this.mem_only = true;
    } else {
      // If the cache file alreach exists, read from it.
      if (existsSync(path)) {
        cache = JSON.parse(readFileSync(path, "utf8"));
      }

      this.path = path;
      this.mem_only = false;
    }

    this.cache = cache;
  }
  private _findTargetIndex(record: Record): number {
    return this.cache.findIndex((cache_entry) => {
      return cache_entry.to == record.to && cache_entry.amount == record.amount;
    });
  }
  private _updateCache() {
    // Overwrites the file with new data.
    if (!this.mem_only) {
      writeFileSync(this.path, JSON.stringify(this.cache, null, 2));
    }
  }
  public stageActions(records: Array<Record>): Staged {
    let staged: Staged = {
      to_execute: new Array(),
      skipped: new Array(),
      dangling: new Array(),
    };

    records.forEach((record: Record) => {
      // Check if the record is already cached.
      const idx = this._findTargetIndex(record);

      // If the record _is_ already cached...
      if (idx != -1) {
        // and if it was already executed...
        let entry = this.cache[idx];
        if (entry.txHash) {
          let date;
          if (entry.exec_date) {
            date = entry.exec_date;
          } else {
            throw Error("Internal error. This is a bug.");
          }

          // then mark this as skipped.
          staged.skipped.push({
            record: record,
            txHash: entry.txHash,
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
        // insert it into the cache and prepare for execution.
        this.cache.push({
          to: record.to,
          amount: record.amount,
          txHash: null,
          exec_date: null,
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
          return record.to == entry.to && record.amount == entry.amount;
        });

        if (!found) {
          staged.dangling.push(entry);
        }
      });

    // Save cache to disk.
    this._updateCache();

    return staged;
  }
  public trackExecution(record: ToExecute, txHash: string) {
    const idx = this._findTargetIndex(record);

    if (idx != -1) {
      this.cache[idx].txHash = txHash;
      this.cache[idx].exec_date = new Date().toISOString();
    } else {
      throw Error("Internal error. This is a bug.");
    }

    // Save cache to disk.
    this._updateCache();
  }
}
