# AGENTS.md

This repository currently has no source files detected. This guide provides
safe, generic defaults for agentic coding. Update sections once real build
tools and conventions exist.

## Quick Start

If you add a codebase later, update this document with the actual commands,
paths, and style rules.

## Build, Lint, Test

### Discovering Commands

- Check for `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`,
  `pom.xml`, `build.gradle`, `Makefile`, or `justfile`.
- Prefer repo-defined scripts over global defaults.

### Common Commands (Use if present)

Node (npm/pnpm/yarn/bun):
- Build: `npm run build` or `pnpm build` or `yarn build` or `bun run build`
- Lint: `npm run lint` or `pnpm lint` or `yarn lint` or `bun run lint`
- Test (all): `npm test` or `pnpm test` or `yarn test` or `bun test`
- Test (single):
  - Jest: `npm test -- path/to/test.spec.ts`
  - Vitest: `npm run test -- path/to/test.spec.ts`
  - Playwright: `npx playwright test path/to/test.spec.ts`

Python (venv/poetry/uv):
- Build: `python -m build` or `poetry build`
- Lint: `ruff check .` or `flake8`
- Format: `ruff format .` or `black .`
- Test (all): `pytest`
- Test (single): `pytest path/to/test_file.py::TestClass::test_name`

Go:
- Build: `go build ./...`
- Lint: `golangci-lint run`
- Test (all): `go test ./...`
- Test (single): `go test ./path -run TestName`

Rust:
- Build: `cargo build`
- Lint: `cargo clippy`
- Format: `cargo fmt`
- Test (all): `cargo test`
- Test (single): `cargo test test_name`

Java:
- Build: `mvn -q -DskipTests package` or `./gradlew build`
- Lint: `mvn -q checkstyle:check` or `./gradlew check`
- Test (all): `mvn test` or `./gradlew test`
- Test (single):
  - Maven: `mvn -Dtest=ClassName#testMethod test`
  - Gradle: `./gradlew test --tests ClassName.testMethod`

### Running a Single Test

Use the framework-native selector syntax. Add this section once the test
runner is known, and remove examples that do not apply.

## Code Style Guidelines

### General

- Match existing patterns once real files exist.
- Prefer small, focused commits and clear diffs.
- Avoid introducing new dependencies unless necessary.

### Imports

- Use absolute imports when the project supports them.
- Keep import groups ordered: standard library, third-party, local.
- Remove unused imports.

### Formatting

- Use the repo formatter if defined (Prettier, Black, gofmt, rustfmt).
- Keep lines reasonably short (around 100–120 chars) unless convention differs.
- Prefer trailing commas where supported for cleaner diffs.

### Types

- Use explicit types for public APIs and exported functions.
- Avoid `any`/`unknown` unless justified and documented.
- Keep types close to usage to aid readability.

### Naming

- Use consistent casing:
  - JS/TS: `camelCase` variables, `PascalCase` types/components
  - Python: `snake_case` functions/vars, `PascalCase` classes
  - Go: `CamelCase` exported, `camelCase` unexported
  - Rust: `snake_case` functions/vars, `CamelCase` types

### Error Handling

- Prefer explicit errors over silent failures.
- Include actionable context in error messages.
- Avoid catching broadly unless you rethrow or handle meaningfully.

### Logging

- Keep logs structured and minimal.
- Avoid logging secrets or PII.

### Testing

- Name tests descriptively around behavior.
- Keep fixtures localized and minimal.
- Prefer deterministic tests (avoid timing flakiness).

### API and Data Handling

- Validate external inputs early.
- Keep pure functions side-effect free when possible.
- Prefer immutable updates unless performance requires mutation.

### Comments and Docs

- Only add comments for non-obvious logic.
- Keep README and inline docs in sync with behavior.

### Frontend (if applicable)

- Use accessible semantics and labels.
- Avoid inline styles when a shared pattern exists.
- Keep components small and composable.

### Backend (if applicable)

- Enforce input validation at boundaries.
- Keep handlers thin; move logic into services/modules.
- Use transactions for multi-step state changes.

## Cursor / Copilot Rules

No Cursor rules (`.cursor/rules/` or `.cursorrules`) or Copilot rules
(`.github/copilot-instructions.md`) were found in this repository.

## Update Checklist (when files exist)

- Replace generic commands with real ones from the repo.
- Add exact single-test command for the test runner.
- Capture style conventions from existing code and linters.
- Add any Cursor/Copilot rules if they appear later.

