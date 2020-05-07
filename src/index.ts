import { commands, ExtensionContext, extensions, workspace, WorkspaceConfiguration } from 'coc.nvim';
import * as path from 'path';
import { denoCache, denoTypes, getVersion } from './commands';

const typeScriptExtensionId = 'coc-tsserver';
const denoExtensionId = 'coc-deno';
const pluginId = 'typescript-deno-plugin';
const configurationSection = 'deno';

interface SynchronizedConfiguration {
  alwaysShowStatus?: boolean;
  autoFmtOnSave?: boolean;
  enable?: boolean;
  dtsPath?: string;
}

function bundledDtsPath(): string {
  const extension = extensions.getExtension(denoExtensionId).extension;
  if (!extension) {
    return '';
  }
  return path.resolve(extension.extensionPath, 'node_modules', pluginId, 'lib', 'lib.deno_runtime.d.ts');
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
  withConfigValue(config, outConfig, 'dtsPath');

  if (!outConfig.dtsPath) {
    outConfig.dtsPath = bundledDtsPath();
  }

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

  const version = await getVersion();
  if (version) {
    outputChannel.appendLine(version.raw);
  }
}
