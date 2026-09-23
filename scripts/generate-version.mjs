// Genera core/config/app-version.generated.ts con la version de la app antes de cada start/build.
// version  -> package.json (semver, se sube a mano al publicar algo relevante)
// commit   -> hash corto del HEAD (+ "-dirty" si hay cambios sin commitear)
// commits  -> cantidad de commits, sirve de numero de build incremental
// El archivo esta en .gitignore: no se commitea, se regenera en cada build.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

function git(cmd, fallback) {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return fallback;
  }
}

const dirty = git('status --porcelain', '') !== '';
const info = {
  version,
  commit: git('rev-parse --short HEAD', 'unknown') + (dirty ? '-dirty' : ''),
  commits: Number(git('rev-list --count HEAD', '0')),
  builtAt: new Date().toISOString(),
};

const out = resolve(root, 'projects/macrotool/src/app/core/config/app-version.generated.ts');
writeFileSync(out,
  '// Archivo generado por scripts/generate-version.mjs - no editar ni commitear.\n' +
  `export const APP_VERSION = ${JSON.stringify(info, null, 2)} as const;\n`);
console.log(`[version] ${info.version} (${info.commit}, build ${info.commits})`);
