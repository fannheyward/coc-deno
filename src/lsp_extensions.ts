// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

/** Contains extensions to the Language Server Protocol that are supported by
 * the Deno Language Server.
 *
 * The requests and notifications types should mirror the Deno's CLI
 * `cli/lsp/language_server.rs` under the method `request_else`.
 */

import {
  NotificationType,
  RequestType,
  RequestType0,
  TextDocumentIdentifier,
} from "coc.nvim";

export const reloadImportRegistries = new RequestType0<boolean, void>(
  "deno/reloadImportRegistries",
);

export interface RegistryStateParams {
  origin: string;
  suggestions: boolean;
}

export const registryState = new NotificationType<RegistryStateParams>(
  "deno/registryState",
);

export interface TaskRequestResponse {
  name: string;
  detail: string;
}

/** Requests any tasks from the language server that the language server is
 * aware of, which are defined in a Deno configuration file. */
export const task = new RequestType0<
  TaskRequestResponse[] | undefined,
  void
>(
  "deno/task",
);

export interface VirtualTextDocumentParams {
  textDocument: TextDocumentIdentifier;
}

export const virtualTextDocument = new RequestType<
  VirtualTextDocumentParams,
  string,
  void
>("deno/virtualTextDocument");
