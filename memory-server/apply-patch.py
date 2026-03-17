#!/usr/bin/env python3
"""Apply Nova Memory Unification patch to index.js"""

import os

BASE = '/home/alforiva/Projetto-Siliceo-main/memory-server'
INDEX = os.path.join(BASE, 'index.js')
PATCH = os.path.join(BASE, 'unification-patch.js')

with open(INDEX, 'r') as f:
    code = f.read()

with open(PATCH, 'r') as f:
    patch = f.read()

# 1. Add origin to newMemory in store endpoint
old_store = '''const newMemory = {
            id: generateId(),
            tier: memoryRequest.tier,
            content: memoryRequest.content,
            metadata: memoryRequest.metadata || {},
            timestamp: new Date().toISOString()'''
new_store = '''const newMemory = {
            id: generateId(),
            origin: memoryRequest.origin || { source: "core", importedAt: new Date().toISOString() },
            tier: memoryRequest.tier,
            content: memoryRequest.content,
            metadata: memoryRequest.metadata || {},
            timestamp: new Date().toISOString()'''
code = code.replace(old_store, new_store)

# 2. Add origin param to retrieve query destructuring
code = code.replace(
    'const { q, tier, limit = 10 } = req.query;',
    'const { q, tier, limit = 10, origin } = req.query;'
)

# 3. Add origin filter before tier filter in retrieve
code = code.replace(
    '        if (tier) {',
    '        if (origin) {\n            results = results.filter(m => (m.origin && m.origin.source) === origin);\n        }\n\n        if (tier) {'
)

# 4. Insert patch before "// Initialize Memory Daemon"
code = code.replace(
    '// Initialize Memory Daemon',
    patch + '\n\n// Initialize Memory Daemon'
)

with open(INDEX, 'w') as f:
    f.write(code)

print('Patch applied successfully!')
print(f'File size: {len(code)} bytes')
