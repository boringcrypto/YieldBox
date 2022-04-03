# YieldBox

### Local development

Clone the repo and run `yarn`

To start hardhat, the sample UI and workbench:

`yarn dev`

There may be a few errors while things recompile. Be sure to add your Alchemy key to .env and it's recommended to use VSCode with the plugins suggested below.

### Setting up your .env

You can include your environment variables in a `.env` file in the root of your repo. Alternatively you can set an actual environment variable called `DOTENV_PATH` to point to a central `.env` file to be used. This way you can use the same environment settings accross multiple projects.

Some useful settings:

```
ALCHEMY_API_KEY=
COINMARKETCAP_API_KEY=
HARDHAT_NETWORK=hardhat
HARDHAT_MAX_MEMORY=4096
HARDHAT_SHOW_STACK_TRACES=true
HARDHAT_VERBOSE=true
```

### Recommended VSCode extentions

-   solidity - Juan Blanco
-   Mocha Test Explorer - Holger Benl
-   Vue Language Features (Volar) - Johnson Chu
