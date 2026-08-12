# Dependency security review

Reviewed: 2026-08-12

## Method

The complete pre-upgrade lockfile was checked with
[`deno audit`](https://docs.deno.com/runtime/reference/cli/audit/). The command
reported **38 advisories**: 7 high, 28 moderate, 3 low, and 0 critical, across
95 resolved npm packages. The two resolved JSR packages had no reported
advisories.

The advisory links below are the GitHub Advisory Database records emitted by
Deno's audit:

- `@hono/node-server` (2):
  [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m),
  [GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9)
- `body-parser` (1):
  [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6)
- `fast-uri` (5):
  [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6),
  [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7),
  [GHSA-q3j6-qgpj-74h6](https://github.com/advisories/GHSA-q3j6-qgpj-74h6),
  [GHSA-v39h-62p7-jpjc](https://github.com/advisories/GHSA-v39h-62p7-jpjc),
  [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx)
- `hono` (27):
  [GHSA-26pp-8wgv-hjvm](https://github.com/advisories/GHSA-26pp-8wgv-hjvm),
  [GHSA-r5rp-j6wh-rvv4](https://github.com/advisories/GHSA-r5rp-j6wh-rvv4),
  [GHSA-wmmm-f939-6g9c](https://github.com/advisories/GHSA-wmmm-f939-6g9c),
  [GHSA-xpcf-pg52-r92g](https://github.com/advisories/GHSA-xpcf-pg52-r92g),
  [GHSA-458j-xx4x-4375](https://github.com/advisories/GHSA-458j-xx4x-4375),
  [GHSA-9vqf-7f2p-gf9v](https://github.com/advisories/GHSA-9vqf-7f2p-gf9v),
  [GHSA-69xw-7hcm-h432](https://github.com/advisories/GHSA-69xw-7hcm-h432),
  [GHSA-qp7p-654g-cw7p](https://github.com/advisories/GHSA-qp7p-654g-cw7p),
  [GHSA-hm8q-7f3q-5f36](https://github.com/advisories/GHSA-hm8q-7f3q-5f36),
  [GHSA-p77w-8qqv-26rm](https://github.com/advisories/GHSA-p77w-8qqv-26rm),
  [GHSA-xrhx-7g5j-rcj5](https://github.com/advisories/GHSA-xrhx-7g5j-rcj5),
  [GHSA-3hrh-pfw6-9m5x](https://github.com/advisories/GHSA-3hrh-pfw6-9m5x),
  [GHSA-f577-qrjj-4474](https://github.com/advisories/GHSA-f577-qrjj-4474),
  [GHSA-2gcr-mfcq-wcc3](https://github.com/advisories/GHSA-2gcr-mfcq-wcc3),
  [GHSA-rv63-4mwf-qqc2](https://github.com/advisories/GHSA-rv63-4mwf-qqc2),
  [GHSA-wgpf-jwqj-8h8p](https://github.com/advisories/GHSA-wgpf-jwqj-8h8p),
  [GHSA-88fw-hqm2-52qc](https://github.com/advisories/GHSA-88fw-hqm2-52qc),
  [GHSA-wwfh-h76j-fc44](https://github.com/advisories/GHSA-wwfh-h76j-fc44),
  [GHSA-j6c9-x7qj-28xf](https://github.com/advisories/GHSA-j6c9-x7qj-28xf),
  [GHSA-8j4g-w8fx-2239](https://github.com/advisories/GHSA-8j4g-w8fx-2239),
  [GHSA-f23p-vx2j-j53r](https://github.com/advisories/GHSA-f23p-vx2j-j53r),
  [GHSA-w62v-xxxg-mg59](https://github.com/advisories/GHSA-w62v-xxxg-mg59),
  [GHSA-xf4j-xp2r-rqqx](https://github.com/advisories/GHSA-xf4j-xp2r-rqqx),
  [GHSA-hvrm-45r6-mjfj](https://github.com/advisories/GHSA-hvrm-45r6-mjfj),
  [GHSA-54fx-42gc-7vw4](https://github.com/advisories/GHSA-54fx-42gc-7vw4),
  [GHSA-xgm2-5f3f-mvvc](https://github.com/advisories/GHSA-xgm2-5f3f-mvvc),
  [GHSA-79qm-7rj5-m7r9](https://github.com/advisories/GHSA-79qm-7rj5-m7r9)
- `ip-address` (2):
  [GHSA-v2v4-37r5-5v8g](https://github.com/advisories/GHSA-v2v4-37r5-5v8g),
  [GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr)
- `qs` (1):
  [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26)

## Remediation

The direct upgrades and security pins are recorded in `deno.json`,
`package.json`, and `deno.lock`:

| Package                     | Initial |  Final | Audit affected range            | Remediation                                            |
| --------------------------- | ------: | -----: | ------------------------------- | ------------------------------------------------------ |
| `@modelcontextprotocol/sdk` |  1.29.0 | 1.30.0 | —                               | Latest direct release                                  |
| `jmap-jam`                  |  0.13.1 | 0.13.3 | —                               | Latest compatible release                              |
| `jmap-rfc-types`            |   0.1.2 |  0.2.0 | —                               | Latest release; major update type-checked successfully |
| `zod`                       |   4.3.6 |  4.4.3 | —                               | Latest direct release                                  |
| `@hono/node-server`         | 1.19.12 |  2.1.0 | `<1.19.13`, `<2.0.5`            | Explicit override to a fixed release                   |
| `hono`                      | 4.12.10 | 4.13.1 | ranges ending before `<4.12.34` | Explicit override to a fixed release                   |
| `body-parser`               |   2.2.2 |  2.3.0 | `>=2.0.0 <2.3.0`                | Explicit override to a fixed release                   |
| `fast-uri`                  |   3.1.0 |  3.1.5 | ranges ending before `<3.1.5`   | Explicit override to a fixed release                   |
| `ip-address`                |  10.1.0 | 10.5.0 | `<=10.3.0`                      | Explicit override to a fixed release                   |
| `path-to-regexp`            |   8.4.2 |  8.4.0 | `>=8.0.0 <8.4.0`                | Pin prevents a vulnerable resolver downgrade           |
| `qs`                        |  6.15.0 | 6.15.3 | `>=6.11.1 <=6.15.1`             | Explicit override to a fixed release                   |

The compatible update briefly resolved `path-to-regexp` to 8.3.0, which
introduced two additional moderate advisories; the explicit override keeps it at
8.4.0. `package.json` contains the transitive overrides, while
`nodeModulesDir: "none"` preserves the project's Deno-cache workflow without
requiring a checked-in `node_modules` tree.

## Verification

The final locked graph reports:

```text
$ deno audit
No known vulnerabilities found
```

The final registry audit and `deno audit --socket` both exited 0 with no known
vulnerabilities. Type-checking, formatting, linting, the full test suite, and
`deno publish --dry-run --allow-dirty` also passed.
