import asyncio
import io
import re
from services.ai_service import AIService
from dotenv import load_dotenv

load_dotenv()

async def test():
    try:
        ai = AIService()
        ai.clear_analysis_cache()
        res = await ai.get_coach_analysis()
        with open("clean_ai_output.txt", "w", encoding="utf-8") as f:
            f.write(res)
    except Exception as e:
        with open("clean_ai_output.txt", "w", encoding="utf-8") as f:
            f.write(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
