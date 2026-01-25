#!/bin/bash

# Quick Start Script for Google Reviews Manager MVP
# This script helps you get started quickly

echo "🚀 Google Reviews Manager - Quick Start"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Creating from template..."
    cp .env.local.example .env.local 2>/dev/null || cat > .env.local << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/google_review_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_BUSINESS_API_KEY="your-google-business-api-key"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4-turbo"
WHATSAPP_BUSINESS_ACCOUNT_ID="your-whatsapp-business-account-id"
WHATSAPP_PHONE_NUMBER_ID="your-whatsapp-phone-number-id"
WHATSAPP_BUSINESS_TOKEN="your-whatsapp-business-token"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"
NODE_ENV="development"
EOF
    echo "ℹ️  Created .env.local - Please fill in your credentials"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "📚 Next Steps:"
echo "1. Edit .env.local with your credentials:"
echo "   - Google OAuth credentials"
echo "   - OpenAI API key"
echo "   - WhatsApp Business credentials"
echo "   - PostgreSQL connection string"
echo ""
echo "2. Setup database:"
echo "   npm run db:push"
echo ""
echo "3. Start development server:"
echo "   npm run dev"
echo ""
echo "4. Open browser to http://localhost:3000"
echo ""
echo "📖 For more info, see README.md or SETUP_COMPLETE.md"
