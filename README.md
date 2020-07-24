# YOTPO Reviews for SFRA

Yotpo reviews integration for use with the Storefront Reference Architecture

# Getting Started

1 Clone this repository.

2 Run `npm install` to install all of the local dependencies (node version 8.x or current LTS release recommended)

3 Create `dw.json` file in the root of the project:
```json
{
    "hostname": "your-sandbox-hostname.demandware.net",
    "username": "yourlogin",
    "password": "yourpwd",
    "code-version": "version_to_upload_to"
}
```

4 Run `npm run uploadCartridge` command that will upload the `int_yotpo_sfra` and `bm_yotpo` cartridges to the sandbox you specified in dw.json file.

5 Add the `int_yotpo_sfra` cartridge to your cartridge path in _Administration >  Sites >  Manage Sites > RefArch - Settings_

6 Add the `bm_yotpo` and `app_storefront_base` cartridges to the business manager cartridge in _Administration >  Sites >  Manage Sites > Business Manager - Settings_

**Note:** This cartridge assumes the SFRA `app_storefront_base` cartridge has been uploaded to the code version.

# Testing
## Running unit tests

You can run `npm test` to execute all unit tests in the cartridge.

## Running acceptance tests
Running acceptance tests requires that the SFRA base cartridge and and metadata have been installed on your sandbox, and you have a working RefArch site.

Acceptance tests are located in the `yotpo-link/test/acceptance` directory.


To run acceptance tests you can use the following command:

```
npm run test:acceptance
```

**Note:** Please note that this command will try to locate URL of your sandbox by reading `dw.json` file in the root directory of your project. If you don't have `dw.json` file, acceptance tests will fail.



