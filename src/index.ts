import { CodeAction, CodeActionProvider, commands, ExtensionContext, extensions, languages, workspace, WorkspaceConfiguration } from 'coc.nvim';
import { CodeActionContext, Range, TextDocument } from 'vscode-languageserver-protocol';
import { denoCache, denoInfo, denoTypes } from './commands';

const typeScriptExtensionId = 'coc-tsserver';
const denoExtensionId = 'coc-deno';
const pluginId = 'typescript-deno-plugin';
const configurationSection = 'deno';

class DenoCacheActionProvider implements CodeActionProvider {
  public async provideCodeActions(document: TextDocument, _range: Range, context: CodeActionContext) {
    const actions: CodeAction[] = [];
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.message.includes('https://deno.land')) {
        actions.push({
          title: `Run 'deno cache' to fix importing error`,
          command: {
            title: `deno cache`,
            command: `deno.cache`,
            arguments: [document.uri],
          },
        });
      }
    }
    return actions;
  }
}

interface SynchronizedConfiguration {
  alwaysShowStatus?: boolean;
  autoFmtOnSave?: boolean;
  enable?: boolean;
  importmap?: string;
  tsconfig?: string;
  unstable?: boolean;
}

function withConfigValue<C, K extends Extract<keyof C, string>>(config: WorkspaceConfiguration, outConfig: C, key: K): void {
  const configSetting = config.inspect<C[K]>(key);
  if (!configSetting) {
    return;
  }

  if (typeof configSetting.globalValue === 'undefined' && typeof configSetting.workspaceValue === 'undefined') {
    return;
  }

  const value = config.get<C[K] | undefined>(key, undefined);

  if (typeof value !== 'undefined') {
    outConfig[key] = value;
  }
}

function getConfiguration(): SynchronizedConfiguration {
  const config = workspace.getConfiguration(configurationSection);
  const outConfig: SynchronizedConfiguration = {};

  withConfigValue(config, outConfig, 'enable');
  withConfigValue(config, outConfig, 'alwaysShowStatus');
  withConfigValue(config, outConfig, 'autoFmtOnSave');
  withConfigValue(config, outConfig, 'importmap');
  withConfigValue(config, outConfig, 'tsconfig');
  withConfigValue(config, outConfig, 'unstable');

  return outConfig;
}

function synchronizeConfiguration(api: any): void {
  if (!api) return;
  api.configurePlugin(pluginId, getConfiguration());
}

export async function activate(context: ExtensionContext): Promise<void> {
  const enabled = workspace.getConfiguration(configurationSection).get('enable', true);
  if (!enabled) {
    return;
  }

  const extension = extensions.getExtension(typeScriptExtensionId).extension;
  if (!extension) {
    return;
  }

  await extension.activate();
  if (!extension.exports) {
    return;
  }

  const api = extension.exports;
  if (!api) {
    return;
  }

  workspace.onDidChangeConfiguration(
    (e) => {
      if (e.affectsConfiguration(configurationSection)) {
        synchronizeConfiguration(api);
      }
    },
    null,
    context.subscriptions
  );

  synchronizeConfiguration(api);

  const outputChannel = workspace.createOutputChannel(configurationSection);
  const disposables = [outputChannel, commands.registerCommand('deno.cache', denoCache), commands.registerCommand('deno.types', denoTypes)];
  context.subscriptions.push(...disposables);

  const provider = new DenoCacheActionProvider();
  context.subscriptions.push(languages.registerCodeActionProvider(['typescript'], provider, 'deno'));

  const info = await denoInfo();
  outputChannel.appendLine(info);
}
