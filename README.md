# watchtower

A Nirvana-based CLI project.

## Getting started

```sh
npm install
nvb build
nvb test
```

## Run the CLI

```sh
node build/bin/wt.js hello
```

## Development

| Command       | Description                          |
|---------------|--------------------------------------|
| `nvb build`   | Compile TypeScript source            |
| `nvb test`    | Build and run specs                  |
| `nvb clean`   | Remove build output                  |

## Project structure

```
bin/          Executable entry script
src/          TypeScript source
  cli.ts      Outer CLI host entrypoint
  run.ts      CLI runtime entrypoint
  commands/   Command modules
  contracts/  Shared type contracts
help/         Help asset fragments
spec/         Jasmine specs
```
