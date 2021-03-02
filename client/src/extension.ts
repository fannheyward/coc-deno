// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import {
  commands,
  Executable,
  ExtensionContext,
  extensions,
  LanguageClient,
  LanguageClientOptions,
  Thenable,
  window,
  workspace,
} from "coc.nvim";
import * as cmds from "./commands";
import {
  EXTENSION_NS,
  EXTENSION_TS_PLUGIN,
  TS_LANGUAGE_FEATURES_EXTENSION,
} from "./constants";
import { DenoTextDocumentContentProvider } from "./content_provider";
import { Settings } from "./interfaces";

/** Assert that the condition is "truthy", otherwise throw. */
function assert(cond: unknown, msg = "Assertion failed."): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

const settingsKeys: Array<keyof Settings> = [
  "codeLens",
  "config",
  "enable",
  "importMap",
  "lint",
  "unstable",
];

// deno-lint-ignore no-explicit-any
function synchronizeConfiguration(api: any): void {
  api?.configurePlugin(EXTENSION_TS_PLUGIN, getSettings());
}

function getSettings(): Settings {
  const settings = workspace.getConfiguration(EXTENSION_NS);
  const result = Object.create(null);
  for (const key of settingsKeys) {
    const value = settings.inspect(key);
    assert(value);
    result[key] = value.workspaceValue ?? value.globalValue ??
      value.defaultValue;
  }
  return result;
}

let client: LanguageClient;

export async function activate(context: ExtensionContext): Promise<void> {
  const tsserver = extensions.all.find((e) =>
    e.id === TS_LANGUAGE_FEATURES_EXTENSION
  );
  if (tsserver) {
    await tsserver.activate();
    synchronizeConfiguration(tsserver.exports);
  }

  const command = workspace.getConfiguration(EXTENSION_NS).get("path", "deno");
  const run: Executable = {
    command,
    args: ["lsp"],
    // deno-lint-ignore no-undef
    options: { env: { ...process.env, "NO_COLOR": true } },
  };

  const docSet = new Set<string>();
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "typescriptreact" },
      { scheme: "deno", language: "javascript" },
      { scheme: "deno", language: "javascriptreact" },
      { scheme: "deno", language: "typescript" },
      { scheme: "deno", language: "typescriptreact" },
    ],
    diagnosticCollectionName: "deno",
    initializationOptions: getSettings(),
    middleware: {
      provideDefinition: async (document, position, token, next) => {
        if (docSet.has(document.uri)) return;

        docSet.add(document.uri);
        const def = await next(document, position, token);
        docSet.delete(document.uri);
        return def;
      },
    },
  };

  client = new LanguageClient(
    "deno-language-server",
    "Deno Language Server",
    run,
    clientOptions,
  );

  const statusBarItem = window.createStatusBarItem(0);
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    workspace.onDidChangeConfiguration((evt) => {
      if (evt.affectsConfiguration(EXTENSION_NS)) {
        client.sendNotification(
          "workspace/didChangeConfiguration",
          // We actually set this to empty because the language server will
          // call back and get the configuration. There can be issues with the
          // information on the event not being reliable.
          { settings: null },
        );
        if (tsserver) {
          synchronizeConfiguration(tsserver.exports);
        }
      }
    }),
    // Register a content provider for Deno resolved read-only files.
    workspace.registerTextDocumentContentProvider(
      EXTENSION_NS,
      new DenoTextDocumentContentProvider(client),
    ),
  );

  // Register any commands.
  const registerCommand = createRegisterCommand(context);
  registerCommand("cache", cmds.cache);
  registerCommand("status", cmds.status);
  registerCommand("initializeWorkspace", cmds.initializeWorkspace);
  commands.registerCommand(
    `${EXTENSION_NS}.showReferences`,
    cmds.showReferences,
    null,
    true,
  );

  context.subscriptions.push(client.start());
  await client.onReady();
  const serverVersion =
    (client.initializeResult?.serverInfo?.version ?? "").split(" ")[0];
  if (serverVersion) {
    statusBarItem.text = `Deno ${serverVersion}`;
    statusBarItem.show();
  }
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

/** Internal function factory that returns a registerCommand function that is
 * bound to the extension context. */
function createRegisterCommand(
  context: ExtensionContext,
): (name: string, factory: cmds.Factory) => void {
  return function registerCommand(
    name: string,
    factory: (
      context: ExtensionContext,
      client: LanguageClient,
    ) => cmds.Callback,
  ): void {
    const fullName = `${EXTENSION_NS}.${name}`;
    const command = factory(context, client);
    context.subscriptions.push(commands.registerCommand(fullName, command));
  };
}
