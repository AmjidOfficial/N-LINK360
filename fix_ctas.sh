#!/bin/bash
sed -i 's/bg-slate-900 text-white/bg-primary text-deep-green hover:bg-primary\/90/g' src/components/*.tsx
sed -i 's/text-slate-950/text-deep-green/g' src/components/*.tsx
sed -i 's/text-slate-900/text-text-primary/g' src/components/*.tsx
sed -i 's/bg-slate-50/bg-bg-secondary/g' src/components/*.tsx
