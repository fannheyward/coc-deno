#!/usr/bin/env sh

curl -sSL -o schemas/import_map.schema.json https://raw.githubusercontent.com/denoland/vscode_deno/main/schemas/import_map.schema.json
curl -sSL -o typescript-deno-plugin/src/index.ts https://raw.githubusercontent.com/denoland/vscode_deno/main/typescript-deno-plugin/src/index.ts
