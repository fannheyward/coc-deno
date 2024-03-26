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
  State,
  Terminal,
  Uri,
  window,
  workspace,
} from "coc.nvim";
import { EXTENSION_NS } from "./constants";
import {
  task as taskReq,
  virtualTextDocument,
} from "./lsp_extensions";

let terminal: Terminal | undefined;

// deno-lint-ignore no-explicit-any
export type Callback = (...args: any[]) => unknown;
export type Factory = (
  context: ExtensionContext,
  client: LanguageClient,
) => Callback;

export async function doInitialize() {
  const title = "Initialize Deno Project";
  const linting = "Enable Deno linting?";
  const unstable = "Enable Deno unstable APIs?";
  const prettier = "Disable coc-prettier for current project?";
  const items = [linting, unstable];
  if (extensions.all.find((e) => e.id === "coc-prettier")) {
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
  window.showInformationMessage("Deno is now setup in this workspace.");
}

export function initializeWorkspace(): Callback {
  return async () => {
    await doInitialize();
    await checkTSServer();
  };
}

export function showReferences(
  uri: string,
  position: Position,
  locations: Location[],
) {
  if (!uri) return;
  commands.executeCommand(
    "editor.action.showReferences",
    Uri.parse(uri),
    position,
    locations,
  );
}

/** Open and display the "virtual document" which provides the status of the
 * Deno Language Server. */
export function status(
  _context: ExtensionContext,
  client: LanguageClient,
): Callback {
  return async () => {
    const content = await client.sendRequest(virtualTextDocument, {
      textDocument: { uri: "deno:/status.md" },
    });
    if (!content) return;

    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command(
      `edit +setl\\ buftype=nofile [Deno Language Server Status]`,
      true,
    );
    nvim.command("setl nobuflisted bufhidden=wipe", true);
    nvim.command("setl filetype=markdown", true);
    nvim.call("append", [0, content.split("\n")], true);
    nvim.command(`exe 1`, true);
    await nvim.resumeNotification();
  };
}

export function task(
  _context: ExtensionContext,
  client: LanguageClient,
): Callback {
  return async () => {
    const tasks = await client.sendRequest(taskReq);
    if (!tasks || tasks.length === 0) return;

    const items = [...tasks.map((task) => ({ text: task.detail }))];
    const idx = await window.showMenuPicker(items, {
      title: "Select a task to run",
      position: "center",
    });
    if (idx === -1) return;

    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }

    const task = tasks[idx];
    terminal = await window.createTerminal({
      name: task.name,
      cwd: workspace.root,
    });
    terminal.sendText(task.detail);
  };
}

export async function test(uri: string, name: string) {
  const config = workspace.getConfiguration(EXTENSION_NS);
  const testArgs = [...config.get<string[]>("codeLens.testArgs", [])];
  if (config.has("unstable")) {
    testArgs.push("--unstable");
  }
  if (!testArgs.includes("--import-map")) {
    const importMap = config.get<string>("importMap");
    if (importMap?.trim()) {
      testArgs.push("--import-map", importMap.trim());
    }
  }
  const env = config.has("cache")
    ? { "DENO_DIR": config.get("cache") } as Record<string, string>
    : undefined;
  const bin = config.get("path", "deno");
  const filter = new RegExp(
    "^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
  );
  const args = [
    "test",
    ...testArgs,
    "--filter",
    `"${filter}"`,
    Uri.parse(uri).fsPath,
  ];

  if (terminal) {
    terminal.dispose();
    terminal = undefined;
  }
  terminal = await window.createTerminal({ name, cwd: workspace.root, env });
  terminal.sendText(`${bin} ${args.join(" ")}`);
}

export function welcome(
  _context: ExtensionContext,
  _client: LanguageClient,
): Callback {
  return () => {
    // TODO
  };
}

export function restart(
  _context: ExtensionContext,
  client: LanguageClient,
): Callback {
  return () => {
    if (client.getPublicState() === State.Running) {
      client.restart();
    }
  };
}

// deno-lint-ignore require-await
export async function checkTSServer(): Promise<void> {
  const tsserverConfig = workspace.getConfiguration("tsserver");
  const enable = tsserverConfig.get<boolean>("enable");
  if (enable) {
    tsserverConfig.update("enable", false);
  }
}
