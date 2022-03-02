// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import {
  CancellationToken,
  commands,
  Executable,
  ExtensionContext,
  extensions,
  LanguageClient,
  LanguageClientOptions,
  LocationLink,
  ProviderResult,
  TextDocumentContentProvider,
  Thenable,
  Uri,
  window,
  workspace,
} from "coc.nvim";
import * as semver from "semver";
import * as cmds from "./commands";
import { EXTENSION_NS } from "./constants";
import {
  registryState,
  RegistryStateParams,
  virtualTextDocument,
} from "./lsp_extensions";
import { Settings } from "./types";

/** Assert that the condition is "truthy", otherwise throw. */
function assert(cond: unknown, msg = "Assertion failed."): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

const SERVER_SEMVER = ">=1.9.0";
const SERVER_SEMVER_16 = ">=1.16.0";

const settingsKeys: Array<keyof Settings> = [
  "cache",
  "codeLens",
  "config",
  "enable",
  "importMap",
  "internalDebug",
  "lint",
  "suggest",
  "unstable",
];

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
let serverVersion = "";

class DenoTextDocumentContentProvider implements TextDocumentContentProvider {
  constructor(private client: LanguageClient) {}

  provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken,
  ): ProviderResult<string> {
    let res = uri.toString();
    let PATCH_8_2_3468 = false;
    if (res.startsWith("file:")) {
      PATCH_8_2_3468 = true;
      res = res.replace(`file:\/\/${process.cwd()}/`, "").replace("%3A", ":");//lgtm [js/incomplete-sanitization]
    }
    if (semver.valid(serverVersion)) {
      if (semver.satisfies(serverVersion, SERVER_SEMVER_16)) {
        res = res.replace("deno:/asset", "deno:asset");
      } else if (PATCH_8_2_3468) {
        res = res.replace("deno:/asset", "deno:/asset/");
      }
    }
    return this.client.sendRequest(
      virtualTextDocument,
      { textDocument: { uri: res } },
      token,
    );
  }
}

async function tryActivate(context: ExtensionContext): Promise<void> {
  await cmds.checkTSServer();

  const command = workspace.getConfiguration(EXTENSION_NS).get("path", "deno");
  const run: Executable = {
    command,
    args: ["lsp"],
    options: { env: { ...process.env, "NO_COLOR": true } },
  };

  const docSet = new Set<string>();
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "json" },
      { scheme: "file", language: "jsonc" },
      { scheme: "file", language: "markdown" },
      { scheme: "file", language: "javascript" },
      { scheme: "file", language: "javascriptreact" },
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "typescriptreact" },
      { scheme: "deno", language: "javascript" },
      { scheme: "deno", language: "javascriptreact" },
      { scheme: "deno", language: "typescript" },
      { scheme: "deno", language: "typescriptreact" },
    ],
    diagnosticCollectionName: EXTENSION_NS,
    initializationOptions: getSettings(),
    middleware: {
      provideDefinition: async (document, position, token, next) => {
        if (docSet.has(document.uri)) return;

        docSet.add(document.uri);
        const def = await next(document, position, token);
        docSet.delete(document.uri);
        if (semver.satisfies(serverVersion, SERVER_SEMVER_16)) {
          if (def && Array.isArray(def)) {
            def.map((d) => {
              if (LocationLink.is(d) && d.targetUri.startsWith("deno:asset")) {
                d.targetUri = d.targetUri.replace("deno:asset", "deno:/asset");
              }
            });
          }
        }
        return def;
      },
    },
  };

  client = new LanguageClient(
    EXTENSION_NS,
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
        commands.executeCommand("deno.restart");
      }
    }),
    // Register a content provider for Deno resolved read-only files.
    workspace.registerTextDocumentContentProvider(
      EXTENSION_NS,
      new DenoTextDocumentContentProvider(client),
    ),
  );

  const registerCommand = createRegisterCommand(context);
  registerCommand("cache", cmds.cache);
  registerCommand("status", cmds.status);
  registerCommand("restart", cmds.restart);
  registerCommand("reloadImportRegistries", cmds.reloadImportRegistries);
  registerCommand("initializeWorkspace", cmds.initializeWorkspace);
  commands.registerCommand(`${EXTENSION_NS}.test`, cmds.test, null, true);
  commands.registerCommand(
    `${EXTENSION_NS}.showReferences`,
    cmds.showReferences,
    null,
    true,
  );

  context.subscriptions.push(client.start());
  await client.onReady();
  client.onNotification(registryState, createRegistryStateHandler());

  serverVersion =
    (client.initializeResult?.serverInfo?.version ?? "").split(" ")[0];
  if (serverVersion) {
    statusBarItem.text = `Deno ${serverVersion}`;
    statusBarItem.show();
  }
  if (
    semver.valid(serverVersion) &&
    !semver.satisfies(serverVersion, SERVER_SEMVER)
  ) {
    window.showMessage(
      `The version of Deno ("${serverVersion}") does not meet the requirements of version ("${SERVER_SEMVER}"), please upgrade Deno.`,
      "warning",
    );
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  const enable = workspace.getConfiguration(EXTENSION_NS).get("enable", false);
  if (!enable) {
    context.subscriptions.push(
      commands.registerCommand(
        `${EXTENSION_NS}.initializeWorkspace`,
        async () => {
          await cmds.doInitialize();
          await tryActivate(context)
        },
      ),
    );
    return;
  }

  await tryActivate(context);
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

export interface NotificationHandler<P> {
  (params: P): void;
}

function createRegistryStateHandler(): NotificationHandler<
  RegistryStateParams
> {
  return async function handler(p) {
    if (p.suggestions) {
      const selection = await window.showInformationMessage(
        `The server "${p.origin}" supports completion suggestions for imports. Do you wish to enable this? (Only do this if you trust "${p.origin}") [Learn More](https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md)`,
        "No",
        "Enable",
      );
      const enable = selection === "Enable";
      const config = workspace.getConfiguration("deno.suggest.imports");
      const hosts: Record<string, boolean> = config.get("hosts", {});
      hosts[p.origin] = enable;
      config.update("hosts", hosts);
    }
  };
}
