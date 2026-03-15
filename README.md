# biome-ratchet

Ratcheting for [Biome](https://biomejs.dev/) lint results. Prevents new violations from being introduced while allowing gradual cleanup of existing ones.

## How it works

`biome-ratchet` wraps `biome lint` and tracks violation counts per file and rule in a `biome-ratchet.json` baseline file committed to your repo. On each run:

- **New or increased violations** → exits non-zero, writes `biome-ratchet-temp.json` with the new counts
- **Improvements** (violations fixed) → updates `biome-ratchet.json` automatically and exits 0
- **No changes** → exits 0

When `biome-ratchet-temp.json` is written, review it and replace `biome-ratchet.json` with it if the increase was intentional.

## Installation

```sh
yarn add --dev biome-ratchet
# or
npm install --save-dev biome-ratchet
```

Requires Node >= 22 and `@biomejs/biome` installed in your project.

## Usage

Replace `biome lint` with `biome-ratchet lint` in your scripts:

```json
{
  "scripts": {
    "lint": "biome-ratchet lint src/"
  }
}
```

Any flags are passed through to `biome lint`.

### Initial setup

On first run with no baseline, `biome-ratchet` will fail and write `biome-ratchet-temp.json` with your current violations. Promote it to your baseline and commit it:

```sh
cp biome-ratchet-temp.json biome-ratchet.json
git add biome-ratchet.json
git commit -m "chore: initialize biome-ratchet baseline"
```

From that point on, new violations will be caught automatically.

## Baseline file

`biome-ratchet.json` tracks current violation counts per file and rule:

```json
{
  "src/legacy.ts": {
    "lint/suspicious/noDoubleEquals": {
      "error": 2
    },
    "lint/style/noVar": {
      "warning": 1
    }
  }
}
```

Commit this file alongside your code. When violations are fixed, the file is updated automatically.

## Environment variables

| Variable | Effect |
|---|---|
| `RATCHET_DEFAULT_EXIT_ZERO=true` | Always exit 0 (useful for reporting without blocking) |

## Limitations (v1)

- Lint violations only — format violations are not tracked
- When linting a subset of files (e.g. staged files only), files that have been fully fixed won't be auto-removed from the baseline. Run against the full codebase to clean those up.
