#!/bin/bash
sed -i 's/text-red-200/text-red-600/g' src/App.tsx
sed -i 's/border-red-900\/60/border-red-200/g' src/App.tsx
sed -i 's/border-white\/20/border-deep-green/g' src/App.tsx
sed -i 's/px-4 py-2 text-sm font-bold text-deep-green/px-4 py-2 text-sm font-bold bg-primary text-deep-green hover:bg-primary\/90/g' src/App.tsx
