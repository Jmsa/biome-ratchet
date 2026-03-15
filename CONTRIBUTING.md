# Contributing

## Setup

```sh
git clone https://github.com/Jmsa/biome-ratchet.git
cd biome-ratchet
yarn install
```

## Development

```sh
yarn build          # compile TypeScript
yarn test           # unit tests
yarn test:integration  # integration tests (builds first)
yarn test:all       # both
yarn lint           # biome lint
```

## Making changes

- Follow conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- Add or update tests alongside code changes
- Integration tests live in `src/cli.integration.test.ts` and run against the `example/` directory
- Run `yarn test:all` before opening a PR

## Releasing

Releases are managed with `standard-version`:

```sh
yarn release        # bumps version, updates CHANGELOG, tags
git push --follow-tags
```

Then publish to npm:

```sh
npm publish
```
