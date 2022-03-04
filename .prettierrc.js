module.exports = {
    printWidth: 145,
    semi: false,
    trailingComma: "es5",
    tabWidth: 4,
    endOfLine: "lf",
    singleQuote: false,
    bracketSpacing: true,
    overrides: [
        {
            files: "*.vue",
            options: {
                bracketSpacing: true,
                printWidth: 145,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
                explicitTypes: "always",
                endOfLine: "lf",
                semi: false,
            },
        },
        {
            files: "*.sol",
            options: {
                bracketSpacing: true,
                printWidth: 145,
                tabWidth: 4,
                useTabs: false,
                singleQuote: false,
                explicitTypes: "always",
                endOfLine: "lf",
            },
        },
        {
            files: "*.js",
            options: {
                printWidth: 145,
                semi: false,
                trailingComma: "es5",
                tabWidth: 4,
                endOfLine: "lf",
            },
        },
        {
            files: "*.ts",
            options: {
                printWidth: 145,
                semi: false,
                trailingComma: "es5",
                tabWidth: 4,
                endOfLine: "lf",
            },
        },
        {
            files: "*.json",
            options: {
                printWidth: 145,
                semi: false,
                trailingComma: "es5",
                tabWidth: 4,
                endOfLine: "lf",
            },
        },
    ],
}
