# Dev Tools

_Like [asdf](https://asdf-vm.com) (or [nvm](https://github.com/nvm-sh/nvm) or [pyenv](https://github.com/pyenv/pyenv) but for any language) it manages dev tools like node, python, cmake, terraform, and [hundreds more](/plugins)._

::: tip
New developer? Try reading the [Beginner's Guide](https://dev.to/jdxcode/beginners-guide-to-rtx-ac4) for a gentler introduction.
:::

mise is a tool for managing programming language and tool versions. For example, use this to install
a particular version of Node.js and ruby for a project. Using `mise activate`, you can have your
shell automatically switch to the correct node and ruby versions when you `cd` into the project's
directory. Other projects on your machine can use a different set of versions.

mise is inspired by [asdf](https://asdf-vm.com) and uses asdf's vast [plugin ecosystem](https://github.com/rtx-plugins/registry)
under the hood. However, it is _much_ faster than asdf and has a more friendly user experience.
For more on how mise compares to asdf, [see below](./comparison-to-asdf).

mise can be configured in many ways. The most typical is by `.mise.toml`, but it's also compatible
with asdf `.tool-versions` files. It can also use idiomatic version files like `.node-version` and
`.ruby-version`. See [Configuration](/configuration) for more.

* Like [direnv](https://github.com/direnv/direnv) it manages [environment variables](/configuration#env---arbitrary-environment-variables) for different project directories.
* Like [make](https://www.gnu.org/software/make/manual/make.html) it manages [tasks](/tasks/) used to build and test projects.

## How it works

mise hooks into your shell (with `mise activate zsh`) and sets the `PATH`
environment variable to point your shell to the correct runtime binaries. When you `cd` into a
directory containing a `.tool-versions`/`.mise.toml` file, mise will automatically set the
appropriate tool versions in `PATH`.

::: info
mise does not modify "cd". It actually runs every time the prompt is _displayed_.
See the [FAQ](/faq#what-does-mise-activate-do).
:::

After activating, every time your prompt displays it will call `mise hook-env` to fetch new
environment variables.
This should be very fast. It exits early if the directory wasn't changed or `.tool-versions`/`.mise.toml` files haven't been modified.

Unlike asdf which uses shim files to dynamically locate runtimes when they're called, mise modifies
`PATH` ahead of time so the runtimes are called directly. This is not only faster since it avoids
any overhead, but it also makes it so commands like `which node` work as expected. This also
means there isn't any need to run `asdf reshim` after installing new runtime binaries.

You should note that mise does not directly install these tools.
Instead, it leverages plugins to install runtimes.
See [plugins](/plugins) below.

## Common commands

Here are some of the most important commands when it comes to working with dev tools.

### `mise use`

For some users, `mise use` might be the only command you need to learn. It will do the following:

- Install the tool's plugin if needed
- Install the specified version
- Set the version as active (it's in PATH)

`mise use node@20` will install the latest version of node-20 and create/update the .tool-versions/.mise.toml
config file in the local directory. Anytime you're in that directory, that version of node will be used.

`mise use -g node@20` will do the same but update the global config (~/.config/mise/config.toml) so
unless there is a config file in the local directory hierarchy, node-20 will be the default version for
the user.

### `mise install`

`mise install` will install but not activate tools—meaning it will download/build/compile the tool
into `~/.local/share/mise/installs` but you won't be able to use it without "setting" the version
in a `.tool-versions` or `.mise-toml` file.

::: tip
If you're coming from asdf, there is no need to also run `mise plugin add` to first install
the plugin, that will be done automatically if needed. Of course, you can manually install plugins
if you wish or you want to use a plugin not in the default registry.
:::

There are many ways it can be used:

* `mise install node@20.0.0` - install a specific version
* `mise install node@20` - install the latest version matching this prefix
* `mise install node` - install whatever version of node currently specified in .tool-versions/.mise.toml
* `mise install` - install all plugins and tools

### `mise local|global` <Badge type="danger" text="not recommended" />

`mise local` and `mise global` are command which only modify the `.tool-versions` or `.mise.toml` files.
These are hidden from the CLI help and remain for asdf-compatibility. The recommended approach is
to use `mise use` instead because that will do the same thing but also install the tool if it does
not already exists.

### `mise exec`|`mise x`

`mise x` can be used for one-off commands using specific tools. e.g.: if you want to run a script with python3.12:

```sh
$ mise x python@3.12 -- ./myscript.py
```

Python will be installed if it is not already. `mise x` will read local/global `.tool-versions`/`.mise-toml` files
as well, so if you don't want to use `mise activate` or shims you can use mise by just prefixing commands with
`mise x --`:

```sh
$ mise use node@20
$ mise x -- node -v
20.x.x
```

::: tip
If you use this a lot, an alias can be helpful:

```sh
$ alias x="mise x --"
```
:::

Similarly, `mise run` can be used to [execute tasks](/tasks/) which will also activate the mise environment with all of your tools.

## "command not found" handler

In major shells (bash, zsh, fish), when using `mise activate`, mise-en-place will install a "command not found" handler so that in the
event of running a command where a version is missing it will automatically install the missing version before running the command.

For example, if you have the following versions of node installed:

```sh
$ mise ls node
Plugin  Version  Config Source    Requested
node    18.19.0
node    20.10.0
node    21.5.0   ~/.tool-versions 21.5.0
```

And you enter a directory that has a `.node-version` file with `v22` inside of it, mise-en-place will automatically install node
just before running commands like `node` or `npm` because otherwise they would cause a "command not found" error.

This functionality has many caveats. It's designed as a "best-effort" solution to avoid the common problem of jumping into a new
project that defines a version you have not installed, and seamlessly fetching it just before you need it. It is not designed
to account for 100% of scenarios.

Because this is implemented as a "command not found" shell hook—this means it will not work inside of a script.

I've chosen not to implement this as a hook that runs if something is missing on `cd`. mise-en-place did have that functionality at
one point but I found it quite annoying because you might not want to even run a tool—and some of them take very long to install.

mise-en-place is designed such that you don't have to use everything in a `.tool-verisons` file or `.mise.toml` file if you
don't want to. For example, if some developers on your team manage `shfmt`, `python`, and `node` with mise-en-place, but you
simply want to have `node` managed with mise-en-place, you will be able to do that. For that reason, mise-en-place will only
install _versions of previously installed tools_. Not new tools entirely. This is also done in part because of the way it is
implemented. mise-en-place needs to know _which_ bins a tool exports and this isn't something plugins define. It is looked up
when the "command not found" handler is run. For example, if you run `npm` and it hits the handler, mise-en-place needs to know
that `npm` is part of the node plugin. It does this by looking at the inactive node versions and what they export.

Also, mise-en-place gracefully degrades to the system version of tools. This makes it seamlessly
disappear when it is not configured—not forcing you to manage everything via mise-en-place.
So, in the example above, if you don't have node-22 installed but do have a system node installed, mise-en-place will
use your system version and not hit the "command not found" handler.

The goal with all of this is not to make sure you are always running the versions specified in `.tool-versions` or `.mise.toml`.
The goal is to make mise-en-place unobtrusive but also capable of handling the common problem of entering a project
and not having run `mise install` to get the correct versions.

This functionality can be disabled with `MISE_NOT_FOUND_AUTO_INSTALL=0` or `mise settings set not_found_auto_install 0`.
