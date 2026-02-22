# Suarify MCP Server
![Suarify Logo](https://suarify.my/logo.png)
This is a Model Context Protocol (MCP) server for Suarify, providing tools for AI agents to interact with Suarify's voice calling and lead management platform.


Suarify is an AI voice automation platform for building and routing SIP-integrated conversational agents via programmable endpoints which allows platform to configure AI inbound and outbound calls.
## Features

- **Voice Calls**: Initiate outbound calls and configure inbound settings.
- **Lead Management**: CRUD operations for leads and bulk uploads.
- **Agent Configuration**: Manage AI voice agents and phone configurations.
- **Modern MCP Design**: Returns `structuredContent` for LLM efficiency and uses standardized naming.

## Prerequisites

- Node.js 20+
- [Suarify](https://suarify.my) API Key

## Configuration

Set the following environment variables:

- `SUARIFY_API_KEY`: (Required) Your API key for authentication. Register free account credit at https://suarify.my/register-new-user
- `SUARIFY_BASE_URL`: (Optional) Defaults to `https://suarify.my`.

## Setup in AI Clients
### Common mcp (cursor, codex, claudecode ,etc)

Add the following to your `~/.mcp/config.json` 

### Claude Desktop

Add the following to your `claude_desktop_config.json` (usually located in `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "suarify": {
      "command": "npx",
      "args": ["-y", "suarify-mcp-server"],
      "env": {
        "SUARIFY_API_KEY": "sk_suarify_xxxxx_c2U5vTQ2MEfaMm8Iwa8gwN0l"
      }
    }
  }
}
```
or

```json

{
  "mcpServers": {
   "suarify-local": {
      "command": "node",
      "args": [
        "c:/Users/Acer/OneDrive/Documents/GitHub/suarify-mcp/index.js"
      ],
      "env": {
        "SUARIFY_API_KEY": "sk_suarify_xxxxx_c2U5vTQ2MEfaMm8Iwa8gwN0l"
      }
    },
  }
}
  
```

### Cursor

1. Go to **Settings** -> **Features** -> **MCP**.
2. Click **+ Add New MCP Server**.
3. Name: `Suarify`.
4. Type: `command`.
5. Command: `npx -y suarify-mcp-server`.
6. Add environment variable `SUARIFY_API_KEY` with your key.

## Usage

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run tests:
   ```bash
   npm test
   ```
3. Start the server (stdio transport):
   ```bash
   export SUARIFY_API_KEY=your_key_here
   node index.js
   ```

### Running with Docker

1. **Build the image**:
   ```bash
   docker build -t suarify-mcp .
   ```

2. **Run the container**:
   ```bash
   docker run -e SUARIFY_API_KEY=your_key_here suarify-mcp
   ```

3. **Run the container as mcp server**:
   ```bash
{
  "mcpServers": {
    "suarify-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SUARIFY_API_KEY=your_key_here",
        "suarify-mcp"
      ]
    }
  }
}
   ```

## Tools Overview

All tools are prefixed with `suarify_` and use `snake_case`.

| Tool Name | Description |
|-----------|-------------|
| `suarify_initiate_call` | Start a simple voice call. |
| `suarify_do_outbound_call` | Detailed outbound call with validation. |
| `suarify_setup_inbound_settings` | Configure AI behavior for inbound calls. |
| `suarify_list_leads` / `suarify_create_lead` | Manage your lead database. |
| `suarify_list_user_agents` | Retrieve AI voice agents. |
| `suarify_get_outbound_call_logs` | Fetch historical call data. |

## Development

The project uses Jest for unit testing. Tool logic is extracted into a `handlers` object for easy isolation.

```bash
npm test
```
