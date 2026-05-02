"""
AI Hiring OS — Security Utilities

JWT verification, password hashing helpers, and role definitions.
"""

from __future__ import annotations

import enum


class Role(str, enum.Enum):
    """Application-level roles for RBAC."""

    ADMIN = "admin"
    HR = "hr"
    MANAGER = "manager"
    EMPLOYEE = "employee"


# Hierarchical permission level — higher number = more privileges.
ROLE_HIERARCHY: dict[Role, int] = {
    Role.EMPLOYEE: 1,
    Role.MANAGER: 2,
    Role.HR: 3,
    Role.ADMIN: 4,
}
