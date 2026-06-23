import { join } from 'path';
import * as Module from 'module';
const moduleLoader = Module as unknown as {
  _resolveFilename: (
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
    options?: unknown,
  ) => string;
};
const originalResolveFilename = moduleLoader._resolveFilename;
const runtimeRoot = __dirname;

function resolveAlias(request: string): string | null {
  if (request === '@config') {
    return join(runtimeRoot, 'config');
  }

  if (request.startsWith('@config/')) {
    return join(runtimeRoot, 'config', request.slice('@config/'.length));
  }

  if (request.startsWith('@/src/')) {
    return join(runtimeRoot, request.slice('@/src/'.length));
  }

  if (request.startsWith('src/')) {
    return join(runtimeRoot, request.slice('src/'.length));
  }

  return null;
}

moduleLoader._resolveFilename = function resolveFilename(
  request: string,
  parent: NodeModule | null,
  isMain: boolean,
  options?: unknown,
) {
  const aliasPath = resolveAlias(request);

  return originalResolveFilename.call(this, aliasPath || request, parent, isMain, options);
};
