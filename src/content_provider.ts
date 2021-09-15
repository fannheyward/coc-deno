// Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.

import {
  CancellationToken,
  LanguageClient,
  ProviderResult,
  TextDocumentContentProvider,
  Uri,
} from "coc.nvim";
import { virtualTextDocument } from "./lsp_extensions";

export class DenoTextDocumentContentProvider
  implements TextDocumentContentProvider {
  constructor(private client: LanguageClient) {}

  provideTextDocumentContent(
    uri: Uri,
    token: CancellationToken,
  ): ProviderResult<string> {
    return this.client.sendRequest(
      virtualTextDocument,
      { textDocument: { uri: uri.toString() } },
      token,
    );
  }
}
