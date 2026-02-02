# Releasing a New Version

## Prerequisites

- All changes merged from `staging` → `main`
- You're on the `main` branch locally

## Steps

### 1. Checkout and pull main

```bash
git checkout main
git pull origin main
```

### 2. Bump the version

Run ONE of these commands in your terminal:

```bash
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

This command does three things automatically:
- Updates `version` in `package.json`
- Creates a git commit (e.g., "v1.0.1")
- Creates a git tag (e.g., `v1.0.1`)

### 3. Push the commit and tag

```bash
git push origin main --tags
```

### 4. Create the GitHub Release

1. Go to the repo on GitHub
2. Click **Releases** (right sidebar)
3. Click **Draft a new release**
4. **Choose a tag**: Select the tag you just pushed (e.g., `v1.0.1`)
5. **Release title**: Same as tag (e.g., `v1.0.1`)
6. **Description**: Write what changed (see example below)
7. Click **Publish release**

### Example Release Notes

```markdown
## What's New

- Added support for X
- Improved performance of Y

## Bug Fixes

- Fixed issue with Z

## Breaking Changes

- None
```

> **Tip**: Click "Generate release notes" in GitHub to auto-generate a commit list, then edit it to be human-readable.

## Version Naming

| Type | When to use | Example |
|------|-------------|---------|
| **patch** | Bug fixes, minor improvements | 1.0.0 → 1.0.1 |
| **minor** | New features, backward compatible | 1.0.0 → 1.1.0 |
| **major** | Breaking changes | 1.0.0 → 2.0.0 |
