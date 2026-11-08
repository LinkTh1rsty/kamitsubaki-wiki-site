import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("production can never activate local identities even when a local flag is supplied", async () => {
  const source = await readFile(
    new URL("../src/lib/editorConfig.mjs", import.meta.url),
    "utf8",
  );
  for (const dev of [true, false]) {
    const compiled = source
      .replace("./centralAccountOrigins.mjs", new URL("../src/lib/centralAccountOrigins.mjs", import.meta.url).href)
      .replaceAll("import.meta.env.PUBLIC_EDITOR_ENABLED", '"true"')
      .replaceAll("import.meta.env.PUBLIC_EDITOR_LOCAL", '"true"')
      .replaceAll(
        "import.meta.env.PUBLIC_EDITOR_API_BASE",
        '"https://api.example.test"',
      )
      .replaceAll("import.meta.env.DEV", String(dev));
    const config = await import(
      "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
    );
    assert.equal(config.editorEnabled, true);
    assert.equal(config.localEditor, dev);
    assert.equal(config.editorApiBase, dev ? "" : "https://api.example.test");
  }
});

 test("isolated editor uses the registered API even with local identities", async()=>{
  const source=await readFile(new URL('../src/lib/editorConfig.mjs',import.meta.url),'utf8');
  const environment={DEV:true,PUBLIC_EDITOR_LOCAL:'true',PUBLIC_EDITOR_ENABLED:'true',PUBLIC_WORKSPACE_ISOLATED:'true',PUBLIC_WORKSPACE_API_ORIGIN:'http://127.0.0.1:18441',PUBLIC_WORKSPACE_WIKI_ORIGIN:'http://127.0.0.1:18440',PUBLIC_WORKSPACE_COMPANION_ORIGIN:'http://127.0.0.1:18444'};
  const compiled=source.replace('./centralAccountOrigins.mjs',new URL('../src/lib/centralAccountOrigins.mjs',import.meta.url).href).replace('workspaceAccountRegistry()', 'workspaceAccountRegistry(import.meta.env)').replaceAll('import.meta.env',JSON.stringify(environment));
  const config=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
  assert.equal(config.editorApiBase,environment.PUBLIC_WORKSPACE_API_ORIGIN);
 });
