"""
AI Hiring OS — SQLAlchemy Declarative Base

All models inherit from this Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass
