// Simple dev runner for ESM TypeScript using ts-node (transpile-only)
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "NodeNext",
    moduleResolution: "NodeNext",
  },
});

(async () => {
  await import("./src/index.ts");
})();
