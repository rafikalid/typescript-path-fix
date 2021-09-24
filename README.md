# typescript-path-fix

Fix path resolution when compiling typescript.

Due typescript @paths fails when compiling to javascript,

This package will convert typescript @paths from source code like:

```typescript
import { abc } from '@src/some/file';
```

into:

```typescript
import { abc } from '../some/file.js';
// OR
import { abc } from '../some/file/index.js';
// OR any extension: .mjs or .cjs
```
