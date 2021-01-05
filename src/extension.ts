'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
   context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(
      { language: "tsn" }, new TsnDocumentSymbolProvider()
   ));
}

class TsnDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
   public provideDocumentSymbols(document: vscode.TextDocument,
      token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
      return new Promise((resolve, reject) => {
         var symbols = [];

         for (var i = 0; i < document.lineCount; i++) {
            var line = document.lineAt(i);

            const pkg_re = /\bpackage\b\s+([A-Za-z_][A-Za-z_0-9]*(\.[A-Za-z_][A-Za-z_0-9]*)*);/;
            var match = line.text.match(pkg_re);
            if (match) {
               symbols.push({
                  name: match[1],
                  kind: vscode.SymbolKind.Package,
                  location: new vscode.Location(document.uri, line.range)
               });
               continue;
            }

            const enum_re = /\b([A-Za-z_][A-Za-z_0-9]*)\b\s*::=\s*enumerated/;
            match = line.text.match(enum_re);
            if (match) {
               symbols.push({
                  name: match[1],
                  kind: vscode.SymbolKind.Enum,
                  location: new vscode.Location(document.uri, line.range)
               });
               continue;
            }
         }

         resolve(symbols);
      });
   }
}
