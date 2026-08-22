# Third-Party Licenses

Second Self bundles a filtered, transformed subset of a third-party prompt library.

## AI Image Prompts (`ai-image-prompts-skill`)

```
Source:    https://github.com/YouMind-OpenLab/ai-image-prompts-skill
Retrieved: 2026-08-22 (commit 7a28b23f4267f602058fc9e1ffd7385ce443d4f5)
License:   MIT
```

The scene records in `src/kutuphane/sahneler.json` are **derived** from this
project. They have been **modified** by the Second Self authors:

- **No prompt text is redistributed verbatim.** Only structured scene fields
  (`shot`, `pose`, `outfit`, `setting`, `props`, `lighting`, `mood`) were
  extracted from the source records.
- Every identity description, real-person reference, trademarked character,
  sexualised record and age-signalling record was removed.
- The upstream `sourceMedia` image URLs were **dropped entirely**. No images
  from the upstream project are redistributed or hot-linked here — those are
  third-party creators' generated results and are not covered by the MIT grant
  over the compilation.
- Of 14,753 unique upstream records, **677** survive into this repository.

The same derivation applies to the expanded `LIGHTING` pool in `src/scenes.js`.

### Upstream license, reproduced in full

```
MIT License

Copyright (c) 2026 YouMind-OpenLab

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

A copy of this license also travels with the data itself at
`src/kutuphane/LICENSE.upstream`.
