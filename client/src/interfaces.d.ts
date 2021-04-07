// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/** When `vscode.WorkspaceSettings` get serialized, they keys of the
 * configuration are available.  This interface should mirror the configuration
 * contributions made by the extension.
*/
export interface Settings {
  /** Settings related to code lens. */
  codeLens: {
    implementations: boolean;
    references: boolean;
    referencesAllFunctions: boolean;
  } | null;
  /** A path to a `tsconfig.json` that should be applied. */
  config: string | null;
  /** Is the extension enabled or not. */
  enable: boolean;
  /** A path to an import map that should be applied. */
  importMap: string | null;
  /** Determine if the extension should be providing linting diagnostics. */
  lint: boolean;
  suggest: {
    autoImports: boolean;
    completeFunctionCalls: boolean;
    names: boolean;
    paths: boolean;
    imports: {
      hosts: Record<string, boolean>;
    } | null;
  } | null;
  /** Determine if the extension should be type checking against the unstable
  * APIs. */
  unstable: boolean;
}
