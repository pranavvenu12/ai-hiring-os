import asyncio
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import func, select

sys.path.append(str(Path(__file__).resolve().parents[1]))

import app.models  # noqa: F401
from app.db.session import AsyncSessionLocal
from app.models.company import Company
from app.models.employee import Employee
from app.services.employee_service import _generate_employee_code


JOURNEYSYNC_EMPLOYEES = [
    {
        "full_name": "Aarav Sharma",
        "email": "aarav.sharma@journeysync.com",
        "department": "Engineering",
        "designation": "Senior Full Stack Developer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Priya Nair",
        "email": "priya.nair@journeysync.com",
        "department": "Design",
        "designation": "UI/UX Designer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Rohan Verma",
        "email": "rohan.verma@journeysync.com",
        "department": "Engineering",
        "designation": "Frontend Developer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Sneha Iyer",
        "email": "sneha.iyer@journeysync.com",
        "department": "Engineering",
        "designation": "Backend Developer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Arjun Patel",
        "email": "arjun.patel@journeysync.com",
        "department": "AI Engineering",
        "designation": "AI/ML Engineer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Kavya Reddy",
        "email": "kavya.reddy@journeysync.com",
        "department": "Product",
        "designation": "Product Manager",
        "manager_email": None,
    },
    {
        "full_name": "Rahul Gupta",
        "email": "rahul.gupta@journeysync.com",
        "department": "Quality Assurance",
        "designation": "QA Engineer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Neha Joshi",
        "email": "neha.joshi@journeysync.com",
        "department": "Platform Engineering",
        "designation": "DevOps Engineer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
    {
        "full_name": "Vikram Singh",
        "email": "vikram.singh@journeysync.com",
        "department": "Mobile Engineering",
        "designation": "Mobile App Developer",
        "manager_email": "kavya.reddy@journeysync.com",
    },
]


async def get_target_company(session):
    result = await session.execute(
        select(Company).where(func.lower(Company.name) == "journeysync")
    )
    company = result.scalar_one_or_none()
    if company:
        return company

    companies = (await session.execute(select(Company))).scalars().all()
    if len(companies) == 1:
        return companies[0]

    raise RuntimeError(
        "Could not find a JourneySync company, and there is not exactly one company to use as a fallback."
    )


async def seed_employees():
    async with AsyncSessionLocal() as session:
        company = await get_target_company(session)
        created = 0
        updated = 0

        employees_by_email = {}

        for employee_data in JOURNEYSYNC_EMPLOYEES:
            result = await session.execute(
                select(Employee).where(
                    Employee.company_id == company.id,
                    func.lower(Employee.email) == employee_data["email"].lower(),
                )
            )
            employee = result.scalar_one_or_none()

            if employee:
                employee.full_name = employee_data["full_name"]
                employee.department = employee_data["department"]
                employee.designation = employee_data["designation"]
                employee.employment_type = "full_time"
                employee.status = "active"
                employees_by_email[employee.email.lower()] = employee
                updated += 1
                continue

            employee_code = await _generate_employee_code(session, company.id)
            employee = Employee(
                company_id=company.id,
                employee_code=employee_code,
                full_name=employee_data["full_name"],
                email=employee_data["email"],
                department=employee_data["department"],
                designation=employee_data["designation"],
                joining_date=date.today(),
                employment_type="full_time",
                status="active",
            )
            session.add(employee)
            await session.flush()
            employees_by_email[employee.email.lower()] = employee
            created += 1

        for employee_data in JOURNEYSYNC_EMPLOYEES:
            employee = employees_by_email[employee_data["email"].lower()]
            manager_email = employee_data["manager_email"]
            employee.manager_id = employees_by_email[manager_email].id if manager_email else None

        await session.commit()

    print(f"Seeded JourneySync employees for {company.name}: {created} created, {updated} updated.")


if __name__ == "__main__":
    asyncio.run(seed_employees())
