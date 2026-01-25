#!/bin/bash

# Local Testing Verification Script
# Run this after setting up your local environment

echo "==============================================="
echo "  LOCAL TESTING VERIFICATION SCRIPT"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Function to test command
test_command() {
  local name=$1
  local command=$2
  
  echo -n "Testing $name... "
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASS_COUNT++))
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL_COUNT++))
  fi
}

# Function to test file existence
test_file() {
  local name=$1
  local filepath=$2
  
  echo -n "Checking $name... "
  if [ -f "$filepath" ] || [ -d "$filepath" ]; then
    echo -e "${GREEN}✓ EXISTS${NC}"
    ((PASS_COUNT++))
  else
    echo -e "${RED}✗ MISSING${NC}"
    ((FAIL_COUNT++))
  fi
}

# === PHASE 1: Environment ===
echo -e "${YELLOW}[PHASE 1: ENVIRONMENT]${NC}"
test_command "Node.js" "node --version"
test_command "npm" "npm --version"
test_file "package.json" "./package.json"
test_file ".env.local" "./.env.local"
echo ""

# === PHASE 2: Dependencies ===
echo -e "${YELLOW}[PHASE 2: DEPENDENCIES]${NC}"
test_file "node_modules" "./node_modules"
test_command "Next.js" "npm list next > /dev/null 2>&1"
test_command "Prisma" "npm list @prisma/client > /dev/null 2>&1"
test_command "NextAuth" "npm list next-auth > /dev/null 2>&1"
echo ""

# === PHASE 3: Build ===
echo -e "${YELLOW}[PHASE 3: BUILD VERIFICATION]${NC}"
echo "Running: npm run lint"
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Lint passed${NC}"
  ((PASS_COUNT++))
else
  echo -e "${RED}✗ Lint failed (see errors above)${NC}"
  ((FAIL_COUNT++))
fi

echo "Running: npm run build"
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Build passed${NC}"
  ((PASS_COUNT++))
  test_file ".next folder" "./.next"
else
  echo -e "${RED}✗ Build failed (see errors above)${NC}"
  ((FAIL_COUNT++))
fi
echo ""

# === PHASE 4: Database ===
echo -e "${YELLOW}[PHASE 4: DATABASE]${NC}"
test_file "Prisma schema" "./prisma/schema.prisma"
test_file "Prisma client" "./node_modules/@prisma/client"
echo ""

# === PHASE 5: Configuration ===
echo -e "${YELLOW}[PHASE 5: CONFIGURATION FILES]${NC}"
test_file "tsconfig.json" "./tsconfig.json"
test_file "next.config.ts" "./next.config.ts"
test_file "tailwind.config.js" "./tailwind.config.js"
test_file ".eslintrc.json" "./.eslintrc.json"
echo ""

# === PHASE 6: Source Code ===
echo -e "${YELLOW}[PHASE 6: SOURCE CODE]${NC}"
test_file "app/page.tsx" "./src/app/page.tsx"
test_file "app/layout.tsx" "./src/app/layout.tsx"
test_file "app/api/businesses" "./src/app/api/businesses/route.ts"
test_file "services" "./src/services"
test_file "lib/auth" "./src/lib/auth.ts"
test_file "lib/prisma" "./src/lib/prisma.ts"
echo ""

# === SUMMARY ===
echo "==============================================="
echo -e "${YELLOW}  SUMMARY${NC}"
echo "==============================================="
echo -e "Tests Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Tests Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All systems ready! You can now:${NC}"
  echo "  1. npm run db:push        (sync database)"
  echo "  2. npm run dev            (start dev server)"
  echo "  3. Open http://localhost:3000"
else
  echo -e "${RED}✗ Some issues found. Please fix before testing.${NC}"
  echo "Common fixes:"
  echo "  • Missing node_modules? → npm install"
  echo "  • Missing .env.local? → Create with DATABASE_URL and NEXTAUTH_SECRET"
  echo "  • Build errors? → Check TypeScript errors in 'npm run lint'"
fi

echo ""
echo "==============================================="
