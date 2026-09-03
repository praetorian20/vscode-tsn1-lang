VS Code language support for [TSN.1](http://www.protomatics.com/tsn1.html).

The syntax grammar in `src/grammar.peg` follows section 8 of `TSN1_Spec.pdf`.
It is compiled with [tsPEG](https://github.com/EoinDavey/tsPEG) into
`src/parser.ts` during `npm run compile`.

The extension uses the generated parser for:

- syntax diagnostics, including source locations;
- document symbols for packages, imports, constants, enumerations, messages,
  macros, fields, variables, parameters, and enumeration members; and
- go-to-definition for symbols declared in the current file.

The TextMate grammar remains responsible for fast editor token coloring, while
the parser provides the structural language features.

Development requires Node.js 10 or newer. Run `npm install` followed by
`npm run compile` to regenerate the parser and compile the extension.

Run `npm test` to execute parser regression tests covering representative valid
and invalid TSN.1 examples derived from the specification. The same test is
available from VS Code through **Terminal → Run Task… → test**.

The dependency versions are capped where necessary to keep the build
compatible with Node.js 10. Newer toolchain releases require newer Node.js
versions.
