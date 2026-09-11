---
name: pr
description: Run local checklist, push, create PR, and wait for CodeRabbit
agent: test-engineer
---
Load the coderabbit-workflow skill:
1. Run full local checklist (lint, typecheck, test, security check)
2. Only if all pass: stage changes, commit semantically, push branch
3. Open Pull Request on GitHub
4. Wait for CodeRabbit review comments
5. Address each comment and push fixes
6. Only merge after all checks pass and CodeRabbit approved
