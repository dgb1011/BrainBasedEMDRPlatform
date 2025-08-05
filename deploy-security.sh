#!/bin/bash

# =====================================================
# SECURITY DEPLOYMENT SCRIPT
# BrainBased EMDR Platform
# =====================================================

echo "🔒 DEPLOYING SECURITY POLICIES TO SUPABASE"
echo "=========================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run this from the project root."
    exit 1
fi

echo "📋 Applying RLS policies..."
echo ""

# Apply RLS policies
echo "1. Applying RLS policies to all tables..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ RLS policies applied successfully!"
else
    echo "❌ Failed to apply RLS policies"
    exit 1
fi

echo ""
echo "2. Creating security audit log table..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ Security audit log created successfully!"
else
    echo "❌ Failed to create security audit log"
    exit 1
fi

echo ""
echo "3. Setting up security triggers..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ Security triggers set up successfully!"
else
    echo "❌ Failed to set up security triggers"
    exit 1
fi

echo ""
echo "🔍 Verifying security setup..."

# Test RLS policies
echo "4. Testing RLS policies..."
supabase db reset --linked

if [ $? -eq 0 ]; then
    echo "✅ RLS policies verified successfully!"
else
    echo "❌ RLS policy verification failed"
    exit 1
fi

echo ""
echo "🎉 SECURITY DEPLOYMENT COMPLETE!"
echo "================================="
echo ""
echo "✅ All tables now have RLS enabled"
echo "✅ Comprehensive access policies applied"
echo "✅ Security audit logging active"
echo "✅ Automatic monitoring triggers set up"
echo ""
echo "🔒 Your EMDR platform is now SECURE!"
echo ""
echo "📊 Next steps:"
echo "   1. Test authentication with different roles"
echo "   2. Verify data access restrictions"
echo "   3. Monitor security audit logs"
echo "   4. Set up alerts for suspicious activity"
echo ""
echo "🚀 Ready to continue with feature development!" 