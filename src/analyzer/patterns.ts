/**
 * Language-specific file sampling strategies for the semantic codebase analyzer.
 *
 * Each strategy defines how to discover and prioritize files for a given language
 * ecosystem: where to find entry points, which directories contain domain logic,
 * which config files to always include, and what to exclude.
 */

/** Describes how to sample files from a codebase for a specific language. */
export interface SamplingStrategy {
  /** Human-readable language name (e.g., "Python", "TypeScript"). */
  language: string;
  /** File extensions associated with this language. */
  extensions: string[];
  /** Entry-point file paths to try, in priority order. */
  entryPoints: string[];
  /** Glob patterns for directories containing core domain logic. */
  domainPatterns: string[];
  /** Config files to always include when present. */
  configPatterns: string[];
  /** Glob patterns for files/directories to never include. */
  excludePatterns: string[];
  /** Maximum number of files to select per category (entry/domain/config). */
  maxFilesPerCategory: number;
}

/** Language-keyed registry of sampling strategies. */
export const STRATEGIES: Record<string, SamplingStrategy> = {
  python: {
    language: 'Python',
    extensions: ['.py'],
    entryPoints: [
      'main.py',
      'app.py',
      'run.py',
      'cli.py',
      'server.py',
      '__main__.py',
      'src/main.py',
      'src/app.py',
      'src/__main__.py',
    ],
    domainPatterns: [
      'src/',
      'lib/',
      'app/',
      'models/',
      'pipelines/',
      'services/',
      'api/',
      'core/',
      'engine/',
    ],
    configPatterns: [
      'pyproject.toml',
      'setup.py',
      'setup.cfg',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
    ],
    excludePatterns: [
      '**/__pycache__/**',
      '**/*.pyc',
      '**/test_*',
      '**/*_test.py',
      '**/tests/**',
      '**/.venv/**',
      '**/venv/**',
      '**/dist/**',
      '**/build/**',
      '**/*.egg-info/**',
    ],
    maxFilesPerCategory: 5,
  },

  typescript: {
    language: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    entryPoints: [
      'src/index.ts',
      'src/main.ts',
      'src/app.ts',
      'index.ts',
      'src/server.ts',
      'src/cli.ts',
      'pages/index.tsx',
      'app/page.tsx',
    ],
    domainPatterns: [
      'src/lib/',
      'src/services/',
      'src/modules/',
      'src/api/',
      'src/core/',
      'src/components/',
      'src/routes/',
      'src/handlers/',
    ],
    configPatterns: ['tsconfig.json', 'package.json'],
    excludePatterns: [
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
    ],
    maxFilesPerCategory: 5,
  },

  go: {
    language: 'Go',
    extensions: ['.go'],
    entryPoints: ['main.go', 'cmd/main.go', 'cmd/server/main.go'],
    domainPatterns: ['internal/', 'pkg/', 'api/', 'handlers/', 'services/'],
    configPatterns: ['go.mod', 'go.sum'],
    excludePatterns: ['**/*_test.go', '**/vendor/**', '**/testdata/**'],
    maxFilesPerCategory: 5,
  },

  rust: {
    language: 'Rust',
    extensions: ['.rs'],
    entryPoints: ['src/main.rs', 'src/lib.rs'],
    domainPatterns: ['src/', 'crates/'],
    configPatterns: ['Cargo.toml', 'Cargo.lock'],
    excludePatterns: ['**/target/**', '**/tests/**', '**/benches/**'],
    maxFilesPerCategory: 5,
  },
};

/**
 * Look up a sampling strategy by language name (case-insensitive).
 *
 * @param language - Language identifier (e.g., "python", "TypeScript") or null.
 * @returns The matching SamplingStrategy, or null if not found.
 */
export function getStrategy(language: string | null): SamplingStrategy | null {
  if (language === null) {
    return null;
  }
  const key = language.toLowerCase();
  return STRATEGIES[key] ?? null;
}

/**
 * Returns glob patterns for files that should always be included in any sample,
 * regardless of detected language.
 *
 * @returns Array of file path patterns to always include.
 */
export function getAlwaysInclude(): string[] {
  return ['README.md', 'README.rst', '*.toml', '*.yaml', '*.yml'];
}
