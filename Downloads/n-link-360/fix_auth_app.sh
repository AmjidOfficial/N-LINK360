#!/bin/bash
sed -i 's/bg-surface-card text-white/bg-bg-primary text-deep-green/g' src/App.tsx
sed -i 's/text-slate-700/text-text-primary/g' src/components/AuthGate.tsx
sed -i 's/text-slate-600/text-text-secondary/g' src/components/AuthGate.tsx
sed -i 's/text-slate-500/text-text-muted/g' src/components/AuthGate.tsx
