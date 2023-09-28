// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/** When `vscode.WorkspaceSettings` get serialized, they keys of the
 * configuration are available.  This interface should mirror the configuration
 * contributions made by the extension.
 */
export interface Settings {
  /** Specify an explicit path to the `deno` cache instead of using DENO_DIR
   * or the OS default. */
  cache: string | null;
  /** Controls if the extension should cache the active document's dependencies on save. */
  cacheOnSave: boolean;
  /** Settings related to code lens. */
  codeLens: {
    implementations: boolean;
    references: boolean;
    referencesAllFunctions: boolean;
    test: boolean;
    testArgs: string[];
  } | null;
  /** A path to a `tsconfig.json` that should be applied. */
  config: string | null;
  /** Is the extension enabled or not. */
  enable: boolean;
  /** A path to an import map that should be applied. */
  importMap: string | null;
  /** Options related to the display of inlay hints. */
  inlayHints: {
    parameterNames: {
      /** Enable/disable inlay hints for parameter names. */
      enabled: "none" | "literals" | "all";
      /** Do not display an inlay hint when the argument name matches the parameter. */
      suppressWhenArgumentMatchesName: boolean;
    } | null;
    /** Enable/disable inlay hints for implicit parameter types. */
    parameterTypes: { enabled: boolean } | null;
    variableTypes: {
      /** Enable/disable inlay hints for implicit variable types. */
      enabled: boolean;
      /** Suppress type hints where the variable name matches the implicit type. */
      suppressWhenTypeMatchesName: boolean;
    } | null;
    /** Enable/disable inlay hints for implicit property declarations. */
    propertyDeclarationTypes: { enabled: boolean } | null;
    /** Enable/disable inlay hints for implicit function return types. */
    functionLikeReturnTypes: { enabled: boolean } | null;
    /** Enable/disable inlay hints for enum values. */
    enumMemberValues: { enabled: boolean } | null;
  } | null;
  /** A flag that enables additional internal debug information to be printed
   * to the _Deno Language Server_ output. */
  internalDebug: boolean;
  /** Determine if the extension should be providing linting diagnostics. */
  lint: boolean;
  /** Specify an explicit path to the `deno` binary. */
  path: string | null;
  suggest: {
    autoImports: boolean;
    completeFunctionCalls: boolean;
    names: boolean;
    paths: boolean;
    imports: {
      autoDiscover: boolean;
      hosts: Record<string, boolean>;
    } | null;
  } | null;
  /** Determine if the extension should be type checking against the unstable
   * APIs. */
  unstable: boolean;
}
