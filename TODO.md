# TODO

Deferred work, not committed to a version. Newest context first.

---

## Harden the GitHub Actions supply chain

**Why:** all eight `uses:` lines in `.github/workflows/` point at mutable tags
(`actions/checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`,
`deploy-pages@v4`). Tags are mutable refs, so a compromised upstream account can
repoint them at malicious code — the demonstrated `tj-actions/changed-files`
attack (March 2025) did exactly that and swept ~23k repos opportunistically.
Meanwhile `package-lock.json` already pins npm deps by integrity hash, so the
actions — which hold a `contents: write` token — are the only unpinned link.

Not urgent: all four are first-party `actions/*`, and blast radius here is site
defacement / injected client-side JS, not credential or data theft. Cheap
insurance, do it in one pass. Source: <https://hugovk.dev/blog/2026/lock-github-actions/>

Order matters — 1 and 2 shrink blast radius, 3 keeps pins patched, 4 only makes
sense once 3 exists (a pin with no update path just freezes you on an old action).

- [ ] **1. Split `update.yml` by privilege.** Today the single job holds
      `contents: write` across `npm ci`, `npm run scrape` and `npm run build`, so
      npm postinstall scripts and scraping run with a push-capable token. Split
      into a scrape+commit job (`contents: write`) and a separate build+deploy
      job (`pages: write`, `id-token: write`) sharing `dist` via an artifact.
- [ ] **2. `persist-credentials: false`** on the `deploy.yml` checkout — nothing
      there pushes. **Do not** apply it to `update.yml`; the `git push` needs the
      credential.
- [ ] **3. Add `.github/dependabot.yml`** for `github-actions` and `npm`, with
      cooldowns. Highest value item on its own. Also fixes the fact that actions
      are currently free to rot silently.
- [ ] **4. Lock the actions.** `gh extension install github/gh-actions-lock --pin v0.4.1`,
      then `gh actions-lock` — rewrites pins to full versions (`@v4` → `@v4.x.y`)
      and writes `.github/workflows/actions.lock`. Commit both.
- [ ] **5. Verify the lockfile in CI.** Add an independent job running
      `gh actions-lock --verify` so a stale or corrupt lock fails the build.
      Independent so a scrape failure doesn't mask it.
- [ ] **6. Optional:** add `zizmor` (>= v1.32.0 for lockfile support) as a
      pre-commit hook.

**Gotchas**

- Any workflow edit needs `gh actions-lock` re-run; CI will say so.
- The verification job hard-pins the extension version by hand — that's another
  thing to bump, and the tooling is young (v0.4.1 shipped 2026-11-02, lockfile
  schema still `v0.0.3`). Fine to wait on step 4; steps 1–3 are stable and
  version-independent.
