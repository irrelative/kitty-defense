# Agent Guidelines

## Project Overview
Tower Defense with Kittens - Browser-based game using rodents as enemies and kittens as towers.

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
- Group imports: standard library → node modules → local modules
- Sort alphabetically within each group
- Avoid default imports for named exports
- Use absolute paths with `@/` alias for clarity

### Formatting
- 2-space indentation
- 100 character line length
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline structures
- No empty lines between single logical blocks

### Types (TypeScript)
- Strict mode enabled
- No `any` types unless unavoidable (document why)
- Prefer `interface` for public APIs, `type` for unions/intersections
- Use utility types (`Pick`, `Omit`, `Partial`) where appropriate
- Explicit return types on exported functions
- Type guards for discriminated unions

### Naming Conventions
- `camelCase` for variables, functions, methods
- `PascalCase` for classes, interfaces, types
- `UPPER_CASE` for constants
- Boolean vars: `is*`, `has*`, `can*`, `should*`
- Tests: describe intent, not implementation

### Error Handling
- Use try/catch for async operations
- Prefer explicit error types over generic `Error`
- Log errors with context (stack trace, inputs)
- Fail fast with clear messages
- Never swallow errors silently

### Functions
- Keep functions small (< 30 lines ideal)
- Single responsibility principle
- Avoid deep nesting (max 2 levels)
- Use early returns for guards
- Prefer pure functions where possible

### Components
- Atomic design pattern (atoms → molecules → organisms)
- Reusable with props interfaces
- Accessible by default (ARIA labels, keyboard nav)
- Styled with CSS Modules or Tailwind

### Testing
- Test behavior, not implementation
- Arrange-Act-Assert pattern
- Mock external dependencies
- Cover edge cases and error paths
- Integration tests for critical paths

### Git
- Commit messages: `type(scope): subject`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- PRs: small, focused changes
- Squash merge for feature branches

## Cursor Rules

### Context Management
- Reference file paths with `./` or `../`
- Use `@` to reference functions/classes
- Search before implementing unknown patterns

### File Operations
- Read file before editing
- Create new files in appropriate directories
- Delete unused imports and files

### Code Generation
- Match existing style and patterns
- Include type signatures
- Add minimal comments for complex logic
- Write testable, modular code

## Copilot Rules

1. Suggest whole functions, not fragments
2. Complete type signatures first
3. Fill in test cases for new functions
4. Generate JSDoc for public APIs

## General Best Practices

### Performance
- Lazy load heavy components
- Memoize expensive calculations
- Debounce/throttle user inputs
- Virtualize long lists

### Security
- Validate all user inputs
- Sanitize HTML content
- Use HTTPS for all APIs
- Never commit secrets

### Documentation
- README for project overview
- JSDoc for public APIs
- Inline comments for complex logic
- Update docs with feature changes

### Accessibility
- Semantic HTML elements
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliance

### Git Workflow
```bash
git checkout -b feature/ticket-123
git add -A
git commit -m "feat(game): add kitten tower upgrade"
git push -u origin feature/ticket-123
```

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] No console errors
- [ ] Performance impact considered
- [ ] Documentation updated
- [ ] Accessibility verified

### Useful Commands
```bash
git log --oneline          # View commit history
git diff                   # See changes
git status                 # Check file status
npm run storybook          # Component playground
```
