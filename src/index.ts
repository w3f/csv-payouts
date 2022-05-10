import { Command } from 'commander';

export const startAction = async (cmd: { config: string }): Promise<void> =>{}

new Command()
  .description('Execute the CSV payouts')
  .option('-c, --config [path]', 'Path to config file.', './config/main.csv')
  .action(startAction);