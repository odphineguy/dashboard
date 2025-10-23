#!/bin/bash

# Setup script for Clerk MCP Server
# This script will add Clerk MCP server to your Claude Desktop configuration

echo "🔧 Clerk MCP Setup Script"
echo "=========================="
echo ""
echo "First, let's get your Clerk Secret Key:"
echo "1. Go to: https://dashboard.clerk.com"
echo "2. Select your application: 'moving-ewe-22'"
echo "3. Click 'API Keys' in the sidebar"
echo "4. Copy your Secret Key (starts with sk_test_ or sk_live_)"
echo ""
read -p "Paste your Clerk Secret Key here: " CLERK_SECRET_KEY

if [ -z "$CLERK_SECRET_KEY" ]; then
    echo "❌ Error: Secret key cannot be empty"
    exit 1
fi

# Validate secret key format
if [[ ! "$CLERK_SECRET_KEY" =~ ^sk_(test|live)_ ]]; then
    echo "⚠️  Warning: Secret key doesn't match expected format (should start with sk_test_ or sk_live_)"
    read -p "Continue anyway? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        exit 1
    fi
fi

# Path to Claude config
CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo ""
echo "📝 Updating Claude Desktop configuration..."

# Backup existing config
cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
echo "✅ Backed up existing config to: $CONFIG_PATH.backup"

# Create new config with Clerk MCP server
cat > "$CONFIG_PATH" << EOF
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/abemacmini/Desktop",
        "/Users/abemacmini/Purple Rock Vault",
        "/Users/abemacmini/Documents"
      ]
    },
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["mcp", "gateway", "run"]
    },
    "clerk": {
      "command": "npx",
      "args": [
        "-y",
        "@clerk/agent-toolkit",
        "-p=local-mcp",
        "--tools=*",
        "--secret-key=$CLERK_SECRET_KEY"
      ]
    }
  }
}
EOF

echo "✅ Configuration updated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Restart Claude Desktop for changes to take effect"
echo "2. Once restarted, I'll have access to Clerk management tools"
echo "3. I can then help you configure OAuth, webhooks, and more!"
echo ""
echo "🔒 Security Note: Your secret key is stored locally in Claude's config"
echo "   Config location: $CONFIG_PATH"
