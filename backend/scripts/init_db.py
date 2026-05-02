import asyncio
from app.db.base import Base
from app.db.session import engine
import app.models  # Ensure models are imported

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized.")

if __name__ == "__main__":
    asyncio.run(init_db())
