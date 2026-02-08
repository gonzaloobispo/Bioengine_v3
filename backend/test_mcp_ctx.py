import asyncio
import json
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from services.mcp.mcp_client import MCPClient

async def test():
    client = MCPClient()
    ctx = await client.get_full_coach_context()
    # Masking large content for output
    safe_ctx = {}
    for k, v in ctx.items():
        if isinstance(v, str):
            safe_ctx[k] = (v[:100] + "...") if len(v) > 100 else v
        else:
            safe_ctx[k] = v
    print(json.dumps(safe_ctx, indent=2))

if __name__ == "__main__":
    asyncio.run(test())
