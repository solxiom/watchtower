# Distribution qualification inputs

`nirvanaDependencyClosure.json` is the exact bootstrap dependency manifest for
the `nira.json`-selected `1.0.0-alpha` ecosystem. It records the six-package
transitive `@nirvana/*` closure plus the normalized `renatus` support artifact,
source-component digests, packed-artifact digests, and declared registry
channels.

The reusable fixture is exported from
`src/foundation/distribution/index.ts`:

- `NirvanaClosureManifestValidator` validates the closed manifest as
  `unknown` and checks graph completeness.
- `NirvanaClosureFixture` resolves the selected ecosystem, packs every
  artifact, compares all source/artifact bytes with the accepted manifest,
  and optionally delegates to the install verifier.
- `NirvanaInstallVerifier` installs only those tarballs and the Watchtower
  tarball into a fresh global prefix, with isolated npm configuration, then
  checks installed identities/specs, link containment, CLI relocation, and the
  packaged runtime manifest/schema.
- `NirvanaCommandProcessRunner` is the injected argv-only Nirvana command
  adapter. Consumers supply explicit Node/npm executable paths and an
  allowlisted base environment when host wrappers require them.

RM-02 consumes the fixture for relocated public-schema proof. RT-03 consumes
the same manifest and artifact output for dist staging; neither should derive
a second dependency graph or fall back to a source/ecosystem link.
