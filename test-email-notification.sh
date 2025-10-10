#!/bin/bash

# Test Email Notification Function
# Usage: ./test-email-notification.sh [daily|critical|weekly]

TYPE=${1:-daily}

echo "Testing email notification function with type: $TYPE"
echo "================================================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Test the function
echo "📧 Invoking send-email-notifications function..."
echo ""

supabase functions invoke send-email-notifications \
  --body "{\"type\": \"$TYPE\"}"

echo ""
echo "✅ Test complete! Check the output above for results."
echo ""
echo "💡 Tips:"
echo "   - Check your email inbox (including spam folder)"
echo "   - View function logs: supabase functions logs send-email-notifications"
echo "   - To test other types, run:"
echo "     ./test-email-notification.sh daily"
echo "     ./test-email-notification.sh critical"
echo "     ./test-email-notification.sh weekly"
