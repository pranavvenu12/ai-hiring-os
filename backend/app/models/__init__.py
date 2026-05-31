"""Models package — import all models here so Alembic can discover them."""

from app.models.company import Company  # noqa: F401
from app.models.company_profile import CompanyProfile  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.job import Job  # noqa: F401
from app.models.resume import Resume  # noqa: F401
from app.models.ai_score import AIScore  # noqa: F401
from app.models.employee import Employee  # noqa: F401
from app.models.attendance import AttendanceRecord  # noqa: F401
from app.models.performance import PerformanceReview  # noqa: F401
from app.models.interview import InterviewSession  # noqa: F401
