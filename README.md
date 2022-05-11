# CSV Payouts

## About

This script reads a list of recipients and the corresonding amounts to be
sent and executes each entry as a transaction.

## Config

See [config/](./config/) for some examples.

### Main

```yaml
endpoint: wss://rpc.polkadot.io
actionFilePath: config/sample.actions.csv
keystore:
  walletFilePath: config/sample.key.json
  password: "p4ssw0rd"
```

### Action File

The action file contains a list of `<RECIPIENT>,<AMOUNT>` pairs that dictate
what transactions should be executed. For example;

```csv
1YgA2g4yVkKcDVktHrgEMT7n6YrU3tebH9Tu3hfpaiMCJJS,4
1PGsXH1HqkBMsQGcyHJscE9VxUnS9XSBHKFmkB8r4Vc7YFW,3.5
16VQH2rDYVGitsifyoNhwQyDQ5xFbR44i6vaQEayEqZ3nnn5,10
```

This script handles the conversion to the chains base units, e.g. if you specify
`4` on Polkadot (implying 4 DOTs to be sent) that the script will convert it
automatically to `4000000000` units.

### Wallet File

The account that should be used to execute the transaction. It expects a json
file exported from polkadot.js.org which is decrypted with the associated
`password`.

## Execution

```console
$ yarn
$ yarn start -c config.yaml
```

Here's an example on the Westend network:

```console
2022-05-11 22:14:25 debug: Reading config from file config.yaml
2022-05-11 22:14:25 debug: Reading from file actions.csv
2022-05-11 22:14:25 info: Parsed 2 CSV entries
2022-05-11 22:14:25 debug: Reading account key from westend_tester.json
2022-05-11 22:14:26 info: There are 2 actions to be executed
2022-05-11 22:14:26 info: To execute: 0.2 to 5G6v76Rc59TLKpUcQPrgaC8iPSVsLSDRNDnmNsGggV6HFwkB
2022-05-11 22:14:26 info: To execute: 0.3 to 5D2jJMny94255JRtHpuyDAddFmPrrUXj1s1ZeUzFg6EeH76Q
2022-05-11 22:14:26 debug: Initializing websocket endpoint at wss://westend-rpc.polkadot.io
2022-05-11 22:14:26 info: Starting transfer progress...
2022-05-11 22:14:27 info: Sent 0.2 (200000000000 units) to 5G6v76Rc59TLKpUcQPrgaC8iPSVsLSDRNDnmNsGggV6HFwkB with hash 0x4587ffa38e47766350014529ae0d2b5834a7ded573210b8a9c7f1f4fa8dda19f
2022-05-11 22:14:27 info: Sent 0.3 (300000000000 units) to 5D2jJMny94255JRtHpuyDAddFmPrrUXj1s1ZeUzFg6EeH76Q with hash 0xc44b33afa5b3f1a69ec59dec4794253b2e0bd95b54a818bb66f6de2773e9583d
2022-05-11 22:14:27 info: Payouts completed.
Done in 1.67s.
```
