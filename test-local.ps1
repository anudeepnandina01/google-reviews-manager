#!/usr/bin/env powershell

# Local Testing Verification Script (Windows)
# Run this after setting up your local environment

Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "  LOCAL TESTING VERIFICATION SCRIPT" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host ""

$passCount = 0
$failCount = 0

# Function to test command
function Test-Command {
    param (
        [string]$name,
        [string]$command
    )
    
    Write-Host -NoNewline "Testing $name... "
    
    try {
        Invoke-Expression $command -ErrorAction Stop | Out-Null
        Write-Host "[PASS]" -ForegroundColor Green
        $script:passCount++
    }
    catch {
        Write-Host "[FAIL]" -ForegroundColor Red
        $script:failCount++
    }
}

# Function to test file existence
function Test-FileExists {
    param (
        [string]$name,
        [string]$filepath
    )
    
    Write-Host -NoNewline "Checking $name... "
    
    if (Test-Path $filepath) {
        Write-Host "[EXISTS]" -ForegroundColor Green
        $script:passCount++
    }
    else {
        Write-Host "[MISSING]" -ForegroundColor Red
        $script:failCount++
    }
}

# === PHASE 1: Environment ===
Write-Host "[PHASE 1: ENVIRONMENT]" -ForegroundColor Cyan
Test-Command "Node.js" "node --version"
Test-Command "npm" "npm --version"
Test-FileExists "package.json" "./package.json"
Test-FileExists ".env.local" "./.env.local"
Write-Host ""

# === PHASE 2: Dependencies ===
Write-Host "[PHASE 2: DEPENDENCIES]" -ForegroundColor Cyan
Test-FileExists "node_modules" "./node_modules"
Test-Command "Next.js" "npm list next"
Test-Command "Prisma" "npm list @prisma/client"
Test-Command "NextAuth" "npm list next-auth"
Write-Host ""

# === PHASE 3: Database ===
Write-Host "[PHASE 3: DATABASE]" -ForegroundColor Cyan
Test-FileExists "Prisma schema" "./prisma/schema.prisma"
Test-FileExists "SQLite database" "./prisma/dev.db"
Test-FileExists "Prisma client" "./node_modules/@prisma/client"
Write-Host ""

# === PHASE 4: Configuration ===
Write-Host "[PHASE 4: CONFIGURATION FILES]" -ForegroundColor Cyan
Test-FileExists "tsconfig.json" "./tsconfig.json"
Test-FileExists "next.config.ts" "./next.config.ts"
Test-FileExists "tailwind.config.js" "./tailwind.config.js"
Test-FileExists ".eslintrc.json" "./.eslintrc.json"
Write-Host ""

# === PHASE 5: Source Code ===
Write-Host "[PHASE 5: SOURCE CODE]" -ForegroundColor Cyan
Test-FileExists "app/page.tsx" "./src/app/page.tsx"
Test-FileExists "app/layout.tsx" "./src/app/layout.tsx"
Test-FileExists "api/businesses" "./src/app/api/businesses/route.ts"
Test-FileExists "services" "./src/services"
Test-FileExists "lib/auth" "./src/lib/auth.ts"
Test-FileExists "lib/prisma" "./src/lib/prisma.ts"
Write-Host ""

# === SUMMARY ===
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "  SUMMARY" -ForegroundColor Yellow
Write-Host "===============================================" -ForegroundColor Yellow
Write-Host "Tests Passed: $passCount" -ForegroundColor Green
Write-Host "Tests Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "All systems ready! You can now:" -ForegroundColor Green
    Write-Host "  1. npm run dev            (start dev server)" -ForegroundColor Green
    Write-Host "  2. Open http://localhost:3000" -ForegroundColor Green
}
else {
    Write-Host "Some issues found. Please fix before testing." -ForegroundColor Red
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  - Missing node_modules? Run: npm install" -ForegroundColor Yellow
    Write-Host "  - Missing .env.local? Create with DATABASE_URL and NEXTAUTH_SECRET" -ForegroundColor Yellow
    Write-Host "  - Missing database? Run: npm run db:push" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Yellow
