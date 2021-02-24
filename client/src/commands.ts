// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/** Contains handlers for commands that are enabled in Visual Studio Code for
 * the extension. */

import {
  commands,
  ExtensionContext,
  extensions,
  LanguageClient,
  Location,
  Position,
  Uri,
  window,
  workspace,
} from "coc.nvim";
import { EXTENSION_NS, PRETTIER_EXTENSION } from "./constants";
import { cache as cacheReq, virtualTextDocument } from "./lsp_extensions";

export declare type DocumentUri = string;

// deno-lint-ignore no-explicit-any
export type Callback = (...args: any[]) => unknown;
export type Factory = (
  context: ExtensionContext,
  client: LanguageClient,
) => Callback;

/** For the current document active in the editor tell the Deno LSP to cache
 * the file and all of its dependencies in the local cache. */
export function cache(
  _context: ExtensionContext,
  client: LanguageClient,
): Callback {
  return async () => {
    const { document } = await workspace.getCurrentState();
    return window.withProgress({
      title: "caching",
      cancellable: true,
    }, () => {
      return client.sendRequest(
        cacheReq,
        {
          referrer: { uri: document.uri.toString() },
          uris: [],
          textDocument: { uri: document.uri.toString() },
        },
      );
    });
  };
}

export function initializeWorkspace(): Callback {
  return async () => {
    const title = "Initialize Deno Project";
    const linting = "Enable Deno linting?";
    const unstable = "Enable Deno unstable APIs?";
    const prettier = "Didsable coc-prettier for current project?";
    const items = [linting, unstable];
    if (extensions.all.find((e) => e.id === PRETTIER_EXTENSION)) {
      items.push(prettier);
    }
    const settings = await window.showPickerDialog(items, title);
    if (!settings) return;
    const config = workspace.getConfiguration(EXTENSION_NS);
    config.update("enable", true);
    config.update("lint", settings.includes(linting));
    config.update("unstable", settings.includes(unstable));
    if (settings.includes(prettier)) {
      const prettierConfig = workspace.getConfiguration("prettier");
      prettierConfig.update("disableLanguages", ["typescript", "javascript"]);
    }
    window.showMessage("Deno is now setup in this workspace.");
  };
}

export function showReferences(): Callback {
  return (uri: string, position: Position, locations: Location[]) => {
    if (!uri) return;
    commands.executeCommand(
      "editor.action.showReferences",
      Uri.parse(uri),
      position,
      locations,
    );
  };
}

/** Open and display the "virtual document" which provides the status of the
 * Deno Language Server. */
export function status(
  _context: ExtensionContext,
  _client: LanguageClient,
): Callback {
  return async () => {
    const content = await _client.sendRequest(virtualTextDocument, {
      textDocument: { uri: "deno:/status.md" },
    });
    window.echoLines(content.split("\n"));
  };
}

export function welcome(
  _context: ExtensionContext,
  _client: LanguageClient,
): Callback {
  return () => {
    // TODO
  };
}
