import { Command } from "commander";
import { load } from "js-yaml";
import { readFileSync, createWriteStream, existsSync, WriteStream } from "fs";
import { parse } from "csv-parse";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { KeyringPair, KeyringPair$Json } from "@polkadot/keyring/types";
import { Keyring } from "@polkadot/keyring";
import { createLogger, Logger } from "@w3f/logger";
import { Cache } from "./cache";

const CACHE_PATH = ".action_cache.json";

interface Config {
  endpoint: string;
  actionFilePath: string;
  keystore: Keystore;
}

interface Keystore {
  walletFilePath: string;
  password: string;
}

export interface Record {
  to: string;
  amount: number;
}

export interface ToExecute {
  to: string;
  amount: number;
}

function abort() {
  process.exit(1);
}

function load_from_files(
  log: Logger,
  args: { config: string }
): [Array<Record>, KeyringPair, string] {
  // Parse Config
  log.debug(`Reading config from file ${args.config}`);
  const config = load(readFileSync(args.config, "utf8")) as Config;

  // Parse CSV file
  log.debug(`Reading from file ${config.actionFilePath}`);
  let content = readFileSync(config.actionFilePath, "utf8");

  let records: Record[] = [];
  const parser = parse({ delimiter: "," });
  parser.on("readable", () => {
    let record;
    while ((record = parser.read()) !== null) {
      records.push({ to: record[0], amount: record[1] });
    }
  });

  parser.write(content);
  parser.end();
  log.info(`Parsed ${records.length} CSV entries`);

  // Parse and decode provided account.
  log.debug(`Reading account key from ${config.keystore.walletFilePath}`);
  const keyring = new Keyring({ type: "sr25519" });
  const json = JSON.parse(readFileSync(config.keystore.walletFilePath, "utf8"));
  const account = keyring.addFromJson(json);
  account.decodePkcs8(config.keystore.password);

  if (account.isLocked) {
    log.error("Failed to initialize keystore, account is locked");
    abort();
  }

  return [records, account, config.endpoint];
}

const start = async (args: { config: string }): Promise<void> => {
  const log = createLogger("debug");

  let loaded;
  try {
    loaded = load_from_files(log, args);
  } catch (error) {
    log.error(
      `Failed to load files from config, please double-check: ${error}`
    );
    abort();
  }

  // Note: will never be undefined.
  const [records, account, endpoint] = loaded as [
    Array<Record>,
    KeyringPair,
    string
  ];

  // Init caching.
  let cache = new Cache(CACHE_PATH);
  const { to_execute, skipped, dangling } = cache.stageActions(records);

  // Check dangling actions.
  if (dangling.length != 0) {
    log.error(
      `There are ${dangling.length} staged actions there weren't executed yet and are no longer present in the action file`
    );

    dangling.forEach((entry) => {
      log.warn(`Dangling: ${entry.amount} to ${entry.to}`);
    });

    log.error(`Please fix the issue or reset cache.`);
    abort();
  }

  // Check skipped actions.
  for (const entry of skipped) {
    log.warn(
      `Skipping: ${entry.record.amount} to ${entry.record.to}, executed on ${entry.date}, tx hash: ${entry.txHash}`
    );
  }

  // Check actions to be executed.
  if (to_execute.length == 1) {
    log.info(`There is ${to_execute.length} action to be executed`);
  } else if (to_execute.length > 1) {
    log.info(`There are ${to_execute.length} actions to be executed`);
  } else {
    log.warn("Nothing to execute, exiting...");
    process.exit(0);
  }

  for (const entry of to_execute) {
    log.info(`To execute: ${entry.amount} to ${entry.to}`);
  }

  // Initialize RPC endpoint.
  log.debug(`Initializing websocket endpoint at ${endpoint}`);

  const wsProvider = new WsProvider(endpoint);
  const api = await ApiPromise.create({ provider: wsProvider });

  // Retrieve decimals for the chain.
  let decimals;
  const res = api.registry.chainDecimals;
  if (res.length != 1) {
    log.error(`Retreived unexpected data regarding chain decimals, exiting...`);
    abort();
  } else {
    decimals = res[0];
  }

  // For each provided entry in the CSV file, execute the balance.
  log.info("Starting transfer progress...");
  for (const entry of to_execute) {
    // Note: will never be undefined.
    const amount_unit = entry.amount * Math.pow(10, decimals as number);
    const nonce = await api.rpc.system.accountNextIndex(account.address);

    const tx_hash = await api.tx.balances
      .transfer(entry.to, amount_unit)
      .signAndSend(account, { nonce });

    log.info(
      `Sent ${entry.amount} (${amount_unit} units) to ${entry.to} with hash ${tx_hash}`
    );
    cache.trackExecution(entry, tx_hash.toString());
  }

  log.info(`Payouts completed.`);
  process.exit(0);
};

const command = new Command()
  .description("Execute the CSV payouts")
  .option("-c, --config [path]", "Path to config file.", "./config/main.csv")
  .action(start);

command.parse();
