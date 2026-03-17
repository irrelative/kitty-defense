# Codex Agent Guidelines

## Project Overview
Tower Defense with Kittens - browser-based game using rodents as enemies and kittens as towers.

## Build & Test Commands

### Development
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Testing
```bash
npm test           # Run all tests
npm test -- <file> # Run single test file
npm test -- --run  # Run tests once without watch mode
npm run test:unit  # Run unit tests only
npm run test:e2e   # Run end-to-end tests
```

### Linting & Formatting
```bash
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues automatically
npm run format     # Prettify code
npm run format:fix # Fix formatting issues
```

### CI/CD
```bash
npm run ci         # Run full CI pipeline (lint + test + build)
```

## Code Style Guidelines

### Imports
- Use ES modules (`import`/`export`)
- Group imports: standard library -> node modules -> local modules
- Sort alphabetically within each group
- Avoid default imports for named exports
- Use absolute paths with `@/` alias for clarity when the project already does so

### Formatting
- 2-space indentation
- 100 character line length
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline structures
- No empty lines between single logical blocks

### Types (TypeScript)
- Strict mode enabled
- No `any` types unless unavoidable; document the reason when used
- Prefer `interface` for public APIs and `type` for unions/intersections
- Use utility types (`Pick`, `Omit`, `Partial`) where appropriate
- Explicit return types on exported functions
- Use type guards for discriminated unions

### Naming Conventions
- `camelCase` for variables, functions, methods
- `PascalCase` for classes, interfaces, and types
- `UPPER_CASE` for constants
- Boolean variables should start with `is`, `has`, `can`, or `should`
- Tests should describe intent, not implementation details

### Error Handling
- Use `try`/`catch` for async operations when errors need local handling
- Prefer explicit error types over generic `Error` where practical
- Log errors with useful context
- Fail fast with clear messages
- Never swallow errors silently

### Functions
- Keep functions focused and reasonably small
- Prefer single responsibility
- Avoid deep nesting; use guard clauses and early returns
- Prefer pure functions where possible

### Components
- Match existing component patterns before introducing new abstractions
- Keep components reusable with clear props interfaces
- Build accessibility in by default, including keyboard and screen reader support
- Preserve the current styling approach used by the codebase

### Testing
- Test behavior, not implementation details
- Use Arrange-Act-Assert structure
- Mock external dependencies when needed
- Cover edge cases and failure paths
- Add or update tests when behavior changes

### Git
- Commit messages should follow `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep PRs small and focused
- Prefer non-interactive git commands

## Codex Workflow

### Context Gathering
- Read relevant files before editing them
- Search with `rg` or `rg --files` before falling back to slower tools
- Match existing architecture and patterns before introducing new ones
- Prefer local evidence over assumptions

### Editing Rules
- Make the smallest change that fully solves the task
- Use `apply_patch` for manual file edits
- Keep comments sparse and only where they clarify non-obvious logic
- Remove dead code and unused imports when touched by the change
- Default to ASCII unless the file already requires other characters

### Collaboration Rules
- Assume the worktree may already contain user changes
- Never revert or overwrite unrelated edits unless explicitly asked
- If unexpected conflicting changes appear, stop and ask how to proceed
- Communicate progress concisely while working
- When a task is complete and the user expects repository updates, stage the changed files and create a git commit with a conventional commit message

### Verification
- Run the narrowest useful checks first, then broader checks if needed
- Prefer targeted tests for changed files before full-suite runs
- If you cannot run verification, say so explicitly in the final summary
- Final summaries should state what changed, how it was verified, and any remaining risk

## Project Best Practices

### Performance
- Lazy load heavy components when the app structure supports it
- Memoize expensive calculations when measurement or repeated renders justify it
- Debounce or throttle noisy user inputs where appropriate
- Virtualize large lists if rendering cost becomes material

### Security
- Validate user-controlled input
- Sanitize HTML content before rendering if applicable
- Never commit secrets or credentials

### Documentation
- Update docs when behavior or workflow changes
- Add JSDoc only for public APIs or non-obvious contracts
- Prefer concise inline comments over broad narration

### Accessibility
- Use semantic HTML elements
- Ensure keyboard navigation support
- Keep screen reader output understandable
- Maintain acceptable color contrast

## Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests added or updated when behavior changed
- [ ] No new lint or type issues introduced
- [ ] Performance impact considered
- [ ] Documentation updated if needed
- [ ] Accessibility verified for UI changes

## Useful Commands
```bash
git log --oneline          # View commit history
git diff                   # See changes
git status                 # Check file status
npm run storybook          # Component playground
```
