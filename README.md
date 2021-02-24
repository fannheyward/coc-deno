# coc-deno

Deno extension for coc.nvim, forked from
[vscode_deno](https://github.com/denoland/vscode_deno).

## Install

`:CocInstall coc-deno`

## Usage

1. make sure you have Deno v1.7+ installed `deno --version`
2. run `:CocCommmand deno.initializeWorkspace` in your project

## Commands

- `deno.cache`: Cache Dependencies
- `deno.status`: Display language server status
- `deno.initializeWorkspace`: Initialize workspace configuration for Deno

## Configurations

You can configure `coc-deno` through `:CocConfig`, same configurations as
[vscode_deno](https://github.com/denoland/vscode_deno#configuration).

## License

MIT

---

> This extension is built with
> [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
