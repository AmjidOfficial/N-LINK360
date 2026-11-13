#!/bin/bash
sed -i 's/bg-amber-500/bg-secondary/g' src/components/*.tsx
sed -i 's/text-amber-500/text-deep-teal/g' src/components/*.tsx
sed -i 's/border-amber-500/border-secondary/g' src/components/*.tsx
sed -i 's/text-amber-400/text-deep-teal/g' src/components/*.tsx
sed -i 's/bg-slate-950/bg-surface-card/g' src/components/*.tsx
sed -i 's/bg-slate-900/bg-surface-card/g' src/components/*.tsx
sed -i 's/bg-amber-400/bg-secondary\/80/g' src/components/*.tsx
