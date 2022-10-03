# coc-deno

<!-- markdownlint-disable no-inline-html -->

<a href="https://github.com/sponsors/fannheyward"><img src="https://user-images.githubusercontent.com/345274/133218454-014a4101-b36a-48c6-a1f6-342881974938.png" alt="GitHub Sponsors" /></a>
<a href="https://patreon.com/fannheyward"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /></a>
<a href="https://paypal.me/fannheyward"><img src="https://user-images.githubusercontent.com/345274/104303610-41149f00-5505-11eb-88b2-5a95c53187b4.png" alt="PayPal donate button" /></a>

Deno extension for coc.nvim, forked from
[vscode_deno](https://github.com/denoland/vscode_deno).

## Install

`:CocInstall coc-deno`

## Usage

1. make sure you have Deno v1.7+ installed `deno --version`
2. run `:CocCommand deno.initializeWorkspace` in your project

## Commands

- `deno.cache`: Cache Dependencies
- `deno.status`: Display language server status
- `deno.performance`: Display the timing averages for the internal
  instrumentation of Deno
- `deno.initializeWorkspace`: Initialize workspace configuration for Deno

## Configurations

You can configure `coc-deno` through `:CocConfig`, same configurations as
[vscode_deno](https://github.com/denoland/vscode_deno#configuration).

## License

MIT

---

> This extension is built with
> [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
