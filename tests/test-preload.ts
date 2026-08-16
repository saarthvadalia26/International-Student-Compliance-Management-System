// Stub server-only package so node test runner can test backend services in TSX
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
    path: "",
    children: [],
    paths: []
  } as unknown as NodeJS.Module;
} catch {
  // Ignored if server-only is not present
}
