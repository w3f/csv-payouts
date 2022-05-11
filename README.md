# CSV Payouts

## About

This script reads a list of recipients and the corresonding amounts to be
sent and executes each entry as a transaction.

## Bulding

```console
yarn
yarn start -c config.yaml
```

## Config

See [`config/](./config/) for some examples.

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
automatically to `4000000000000` units.

### Wallet File

The account that should be used to execute the transaction. It expects a json
file exported from polkadot.js.org which is decrypted with the associated
`password`.
