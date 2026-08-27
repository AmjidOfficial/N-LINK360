#!/bin/bash
sed -i 's/text-emerald-500/text-deep-teal/g' src/components/*.tsx
sed -i 's/text-emerald-400/text-deep-teal/g' src/components/*.tsx
sed -i 's/bg-emerald-500/bg-secondary/g' src/components/*.tsx
sed -i 's/bg-emerald-400/bg-secondary/g' src/components/*.tsx
sed -i 's/text-emerald-600/text-deep-teal/g' src/components/*.tsx
sed -i 's/bg-emerald-600/bg-deep-teal/g' src/components/*.tsx

sed -i 's/text-blue-500/text-deep-teal/g' src/components/*.tsx
sed -i 's/text-blue-600/text-deep-teal/g' src/components/*.tsx
sed -i 's/bg-blue-500/bg-secondary/g' src/components/*.tsx
sed -i 's/bg-blue-600/bg-deep-teal/g' src/components/*.tsx
