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
         // The result containing symbols in the document
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

            const macro_re = /\b([A-Za-z_][A-Za-z_0-9]*)\b\s*\(\)\s*::=\s*macro/;
            match = line.text.match(macro_re);
            if (match) {
               symbols.push({
                  name: match[1],
                  kind: vscode.SymbolKind.Class,
                  location: new vscode.Location(document.uri, line.range)
               });
               continue;
            }

            const msg_re = /\b([A-Za-z_][A-Za-z_0-9]*)\b\s*\(\)\s*::=\s*/;
            match = line.text.match(msg_re);
            if (match) {
               symbols.push({
                  name: match[1],
                  kind: vscode.SymbolKind.Class,
                  location: new vscode.Location(document.uri, line.range)
               });
               continue;
            }
         }

         resolve(symbols);
      });
   }
}
