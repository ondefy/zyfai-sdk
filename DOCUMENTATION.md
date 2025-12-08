# Documentation

This project uses **TypeDoc** and **Docusaurus** for comprehensive documentation.

## Documentation Structure

- **TypeDoc**: Generates API reference from TypeScript source code and JSDoc comments
- **Docusaurus**: Provides a full documentation website with guides, tutorials, and API reference

## Quick Start

### View Documentation Locally

```bash
# Generate TypeDoc API docs and start Docusaurus dev server
pnpm docs:dev
```

The documentation site will be available at `http://localhost:3000`

### Build Documentation

```bash
# Build both TypeDoc API docs and Docusaurus site
pnpm docs:build
```

Built files will be in `website/build/`

### Serve Built Documentation

```bash
# Serve the built documentation locally
pnpm docs:serve
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm docs` | Generate TypeDoc API documentation only |
| `pnpm docs:watch` | Watch mode for TypeDoc (auto-regenerates on changes) |
| `pnpm docs:dev` | Start Docusaurus development server |
| `pnpm docs:build` | Build complete documentation (TypeDoc + Docusaurus) |
| `pnpm docs:serve` | Serve the built documentation locally |

## Project Structure

```
zyfai-sdk/
├── src/                      # SDK source code
│   ├── core/                 # Core SDK classes
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── website/                  # Docusaurus documentation site
│   ├── docs/                 # Documentation pages
│   │   ├── intro.md          # Getting Started
│   │   ├── deploying-safe.md # Safe Deployment Guide
│   │   ├── session-keys.md   # Session Keys Guide
│   │   ├── examples.md       # Code Examples
│   │   └── api/              # TypeDoc-generated API reference (auto-generated)
│   ├── src/                  # Docusaurus theme customization
│   ├── static/               # Static assets (images, etc.)
│   └── docusaurus.config.ts  # Docusaurus configuration
├── typedoc.json              # TypeDoc configuration
└── .github/workflows/        # GitHub Actions workflows
    └── deploy-docs.yml       # Auto-deploy documentation to GitHub Pages
```

## Automatic Deployment

Documentation is automatically deployed to GitHub Pages when you push to the `main` branch.

### Workflow Triggers

The deployment workflow runs on:
- Push to `main` branch when files change in:
  - `src/**` (source code changes)
  - `website/**` (documentation changes)
  - `README.md`
  - `typedoc.json`
  - `.github/workflows/deploy-docs.yml`
- Manual trigger via GitHub Actions UI

### Setup GitHub Pages

1. Go to your repository settings
2. Navigate to **Pages** section
3. Under **Source**, select **GitHub Actions**

The documentation will be available at: `https://ondefy.github.io/zyfai-sdk/`

## Writing Documentation

### Adding New Documentation Pages

1. Create a new `.md` file in `website/docs/`
2. Add frontmatter with `sidebar_position`:

```markdown
---
sidebar_position: 5
---

# Your Page Title

Your content here...
```

3. The page will automatically appear in the sidebar

### Updating API Documentation

API documentation is **automatically generated** from your TypeScript source code and JSDoc comments.

To improve API docs:
1. Add/update JSDoc comments in your TypeScript files
2. Run `pnpm docs` to regenerate
3. Check the `website/docs/api/` folder (auto-generated)

Example JSDoc:

```typescript
/**
 * Deploy a Safe smart wallet for a user
 *
 * @param userAddress - User's EOA address
 * @param chainId - Target chain ID
 * @returns Deployment result with Safe address and transaction hash
 *
 * @example
 * ```typescript
 * const result = await sdk.deploySafe("0xUser...", 42161);
 * console.log("Safe deployed:", result.safeAddress);
 * ```
 */
async deploySafe(userAddress: string, chainId: number): Promise<DeploySafeResponse> {
  // Implementation
}
```

### Documentation Best Practices

1. **Keep examples up-to-date**: Test code examples to ensure they work
2. **Use TypeDoc tags**: `@param`, `@returns`, `@example`, `@throws`
3. **Add code blocks**: Use triple backticks with language identifiers
4. **Link between pages**: Use relative links like `[link](./other-page.md)`
5. **Use admonitions**: Docusaurus supports `:::info`, `:::tip`, `:::warning`, `:::danger`

Example admonition:

```markdown
:::tip
This is a helpful tip for users!
:::
```

## TypeDoc Configuration

TypeDoc is configured in `typedoc.json`:

- **Entry point**: `src/index.ts`
- **Output**: `docs/api/` (relative to website folder)
- **Plugin**: `typedoc-plugin-markdown` for Markdown output
- **Theme**: Configured for Docusaurus integration

## Docusaurus Configuration

Docusaurus is configured in `website/docusaurus.config.ts`:

- **Base URL**: `/zyfai-sdk/` (for GitHub Pages)
- **Organization**: `ondefy`
- **Project**: `zyfai-sdk`
- **TypeDoc Plugin**: Automatically integrates API docs into sidebar

## Troubleshooting

### TypeDoc not generating docs

```bash
# Clean and regenerate
rm -rf docs/api
pnpm docs
```

### Docusaurus build fails

```bash
# Clean Docusaurus cache
cd website
rm -rf .docusaurus build
pnpm build
```

### GitHub Pages not updating

1. Check the **Actions** tab for workflow status
2. Ensure GitHub Pages is configured to use GitHub Actions
3. Check that the workflow has proper permissions in `.github/workflows/deploy-docs.yml`

## Local Development Workflow

1. **Make changes** to source code or documentation
2. **Generate API docs** (if source code changed):
   ```bash
   pnpm docs
   ```
3. **Start dev server**:
   ```bash
   pnpm docs:dev
   ```
4. **Preview changes** at `http://localhost:3000`
5. **Commit and push** to deploy automatically

## Contributing to Documentation

When contributing:

1. Update relevant documentation pages when adding features
2. Add JSDoc comments to all public APIs
3. Include code examples in your JSDoc
4. Test documentation locally before pushing
5. Keep the documentation in sync with code changes

## Resources

- [TypeDoc Documentation](https://typedoc.org/)
- [Docusaurus Documentation](https://docusaurus.io/)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
