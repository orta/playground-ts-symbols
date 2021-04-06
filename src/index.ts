import type { PlaygroundPlugin, PluginUtils } from "./vendor/playground"

const makePlugin = (utils: PluginUtils) => {
  const customPlugin: PlaygroundPlugin = {
    id: "example",
    displayName: "Symbols",
    didMount: (sandbox, container) => {
      console.log("Showing new plugin")

      // Create a design system object to handle
      // making DOM elements which fit the playground (and handle mobile/light/dark etc)
      const ds = utils.createDesignSystem(container)

      ds.title("TypeScript Symbol Registry")
      ds.p("This plugin shows you the symbols that your code has added to the type checker's global symbol table.")

      const startButton = document.createElement("input")
      startButton.type = "button"
      startButton.value = "Get symbols"
      container.appendChild(startButton)

      const results = document.createElement("div")
      container.appendChild(results)
      
      const resDS = utils.createDesignSystem(results)

      startButton.onclick = async () => {
        resDS.clear()

        const currentCode = sandbox.getText()
        sandbox.setText("// Working...")
        sandbox.editor.updateOptions({ readOnly: true })

        //  TODO: This could be more elegant, it runs twice first without any text in the main
        // file, then with the actual code included

        const tsvfs = await sandbox.setupTSVFS()
        const checker = tsvfs.program.getTypeChecker()
        const source = tsvfs.program.getSourceFiles()[0]

        // @ts-ignore
        const systemSymbols = checker.getSymbolsInScope(source, sandbox.ts.SymbolFlags.All)

        source.text = currentCode
        sandbox.setText(currentCode)

        const tsvfs2 = await sandbox.setupTSVFS()
        const checker2 = tsvfs2.program.getTypeChecker()
        const source2 = tsvfs2.program.getSourceFiles()[0]

        // @ts-ignore
        const allSymbolsPost = checker2.getSymbolsInScope(source2, sandbox.ts.SymbolFlags.All)
        const newSymbols = allSymbolsPost.slice(systemSymbols.length - 1).filter(s => s.name !== "undefined")
        sandbox.editor.updateOptions({ readOnly: false })

        resDS.p(`Found ${newSymbols.length} new symbols from the editor, with ${allSymbolsPost.length} in total from lib .d.ts. files.`)

        newSymbols.forEach(symbol => {
          const title = checker2.symbolToString(symbol)

          resDS.subtitle(checker2.symbolToString(symbol))
          symbol.declarations.forEach((d) => {
            // @ts-ignore
            resDS.createASTTree(d, {closedByDefault: true})
          })

          const flags = getEnumFlagNames(sandbox.ts.SymbolFlags, symbol.flags)
          resDS.p(`Flags: ${flags.join(", ")}`)
        });
      }
    },

    // This is called occasionally as text changes in monaco,
    // it does not directly map 1 keyup to once run of the function
    // because it is intentionally called at most once every 0.3 seconds
    // and then will always run at the end.
    modelChangedDebounce: async (_sandbox, _model) => {
      // Do some work with the new text
    },

    // Gives you a chance to remove anything set up,
    // the container itself if wiped of children after this.
    didUnmount: () => {
      console.log("De-focusing plugin")
    },
  }

  return customPlugin
}

export default makePlugin


// Thanks TS-AST-Viewer!
// The MIT License (MIT)
// Copyright (c) 2018 David Sherret

function getEnumFlagNames(enumObj: any, flags: number) {
  const allFlags = Object.keys(enumObj)
      .map(k => enumObj[k]).filter(v => typeof v === "number") as number[];
  const matchedFlags = allFlags.filter(f => (f & flags) !== 0);

  return matchedFlags
      .filter((f, i) => matchedFlags.indexOf(f) === i)
      .map(f => enumObj[f]);
}
