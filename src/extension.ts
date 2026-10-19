'use strict';

import * as vscode from 'vscode';
import * as Parser from './parser';
import { findTsnSymbols } from './symbol-index';

interface TsnSymbol {
   name: string;
   kind: vscode.SymbolKind;
   range: vscode.Range;
}

export function activate(context: vscode.ExtensionContext) {
   const diagnostics = vscode.languages.createDiagnosticCollection('tsn');
   const refreshDiagnostics = (document: vscode.TextDocument) => {
      if (document.languageId !== 'tsn') {
         return;
      }
      diagnostics.set(document.uri, parserDiagnostics(document));
   };

   context.subscriptions.push(
      diagnostics,
      vscode.languages.registerDocumentSymbolProvider({ language: 'tsn' }, new TsnDocumentSymbolProvider()),
      vscode.languages.registerDefinitionProvider({ language: 'tsn' }, new TsnDefinitionProvider()),
      vscode.workspace.onDidOpenTextDocument(refreshDiagnostics),
      vscode.workspace.onDidChangeTextDocument(event => refreshDiagnostics(event.document)),
      vscode.workspace.onDidCloseTextDocument(document => diagnostics.delete(document.uri))
   );

   for (const document of vscode.workspace.textDocuments) {
      refreshDiagnostics(document);
   }
}

class TsnDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
   public provideDocumentSymbols(document: vscode.TextDocument, _token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
      return Promise.resolve(buildDocumentSymbols(document));
   }
}

class TsnDefinitionProvider implements vscode.DefinitionProvider {
   public provideDefinition(
      document: vscode.TextDocument,
      position: vscode.Position,
      _token: vscode.CancellationToken
   ): Thenable<vscode.Location | vscode.Location[] | undefined> {
      const wordRange = document.getWordRangeAtPosition(position, /[_a-zA-Z][_a-zA-Z0-9]*/);
      if (!wordRange) {
         return Promise.resolve(undefined);
      }

      const name = document.getText(wordRange);
      const matches = buildSymbols(document)
         .filter(symbol => symbol.name === name)
         .map(symbol => new vscode.Location(document.uri, symbol.range));
      return Promise.resolve(matches.length === 0 ? undefined : matches);
   }
}

function parserDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
   const result = Parser.parse(document.getText());
   return (result.errs || []).map(error => {
      const start = document.positionAt(error.pos.overallPos);
      const end = start.translate(0, Math.max(1, document.getText().length > error.pos.overallPos ? 1 : 0));
      const expected = error.expmatches
         .slice(0, 6)
         .map(match => match.kind === 'EOF' ? 'end of file' : match.literal)
         .join(', ');
      return new vscode.Diagnostic(
         new vscode.Range(start, end),
         expected ? `Expected ${expected}` : 'Invalid TSN.1 syntax',
         vscode.DiagnosticSeverity.Error
      );
   });
}

function buildSymbols(document: vscode.TextDocument): TsnSymbol[] {
   const text = document.getText();
   const result = Parser.parse(text);

   // Symbol discovery must not depend on the whole file being valid.  In
   // practice TSN files commonly contain vendor XML extensions and newer
   // constructs which are not accepted by the published grammar.  Use the
   // parser tree when possible, and fall back to the lossless lexical index
   // otherwise so a single unsupported construct does not hide every symbol.
   const symbols: TsnSymbol[] = [];
   if (result.ast && result.errs.length === 0) {
      visitAst(result.ast as any, document, symbols);
   }
   if (symbols.length === 0) {
      symbols.push(...scanSymbols(text, document));
   }

   symbols.sort((left, right) => {
      const startOrder = left.range.start.compareTo(right.range.start);
      return startOrder !== 0 ? startOrder : right.range.end.compareTo(left.range.end);
   });
   return symbols;
}

function scanSymbols(text: string, document: vscode.TextDocument): TsnSymbol[] {
   return findTsnSymbols(text).map(symbol => ({
      name: symbol.name,
      kind: symbol.kind === 'definition' ? vscode.SymbolKind.Class : vscode.SymbolKind.Field,
      range: new vscode.Range(document.positionAt(symbol.start), document.positionAt(symbol.end))
   }));
}

function buildDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
   const roots: vscode.DocumentSymbol[] = [];
   const stack: Array<{ range: vscode.Range; symbol: vscode.DocumentSymbol }> = [];

   buildSymbols(document).forEach(symbol => {
      while (stack.length && !containsRange(stack[stack.length - 1].range, symbol.range)) {
         stack.pop();
      }

      const documentSymbol = new vscode.DocumentSymbol(
         symbol.name,
         '',
         symbol.kind,
         symbol.range,
         symbol.range
      );

      if (stack.length) {
         stack[stack.length - 1].symbol.children.push(documentSymbol);
      } else {
         roots.push(documentSymbol);
      }
      stack.push({ range: symbol.range, symbol: documentSymbol });
   });

   return roots;
}

function containsRange(outer: vscode.Range, inner: vscode.Range): boolean {
   return outer.start.compareTo(inner.start) <= 0 && outer.end.compareTo(inner.end) >= 0;
}

function visitAst(value: any, document: vscode.TextDocument, symbols: TsnSymbol[]) {
   if (!value) {
      return;
   }
   if (Array.isArray(value)) {
      value.forEach(item => visitAst(item, document, symbols));
      return;
   }
   if (typeof value !== 'object') {
      return;
   }

   if (typeof value.kind === 'string') {
      const symbolKind = symbolKindFor(value.kind);
      const name = symbolName(value.name);
      const range = sourceRange(value, document);
      if (symbolKind !== undefined && name && range) {
         symbols.push({ name, kind: symbolKind, range });
      }
   }

   Object.keys(value).forEach(key => {
      if (key !== 'kind' && key !== 'start' && key !== 'end') {
         visitAst(value[key], document, symbols);
      }
   });
}

function symbolKindFor(kind: string): vscode.SymbolKind | undefined {
   const base = kind.replace(/_\d+$/, '');
   switch (base) {
      case 'package_decl': return vscode.SymbolKind.Package;
      case 'import_decl': return vscode.SymbolKind.Namespace;
      case 'enum_definition': return vscode.SymbolKind.Enum;
      case 'macro_definition':
      case 'case_macro_definition': return vscode.SymbolKind.Function;
      case 'message_definition': return vscode.SymbolKind.Class;
      case 'constant_definition': return vscode.SymbolKind.Constant;
      case 'variable_decl':
      case 'argument_decl':
      case 'assignment_decl': return vscode.SymbolKind.Variable;
      case 'field_value_decl':
      case 'field_enum_reference_decl':
      case 'field_enum_inline_decl':
      case 'field_boolean_decl':
      case 'field_float_decl':
      case 'field_string_decl':
      case 'field_message_reference_decl':
      case 'field_inline_message_decl':
      case 'field_case_decl': return vscode.SymbolKind.Field;
      case 'enum_literal': return vscode.SymbolKind.EnumMember;
      default: return undefined;
   }
}

function sourceRange(node: any, document: vscode.TextDocument): vscode.Range | undefined {
   if (!node.start || typeof node.start.overallPos !== 'number') {
      return undefined;
   }
   const start = document.positionAt(node.start.overallPos);
   const endPosition = node.end && typeof node.end.overallPos === 'number'
      ? document.positionAt(node.end.overallPos)
      : start.translate(0, 1);
   return new vscode.Range(start, endPosition);
}

function symbolName(value: any): string | undefined {
   if (!value) {
      return undefined;
   }
   if (Array.isArray(value)) {
      const names = value.map(symbolName).filter(Boolean) as string[];
      return names.length ? names.join('.') : undefined;
   }
   if (typeof value !== 'object') {
      return undefined;
   }
   if (typeof value.value === 'string' && typeof value.kind === 'string' && value.kind.indexOf('identifier') === 0) {
      return value.value;
   }
   const names: string[] = [];
   Object.keys(value).forEach(key => {
      if (key !== 'kind') {
         const name = symbolName(value[key]);
         if (name) {
            names.push(name);
         }
      }
   });
   return names.length ? names.join('.') : undefined;
}
