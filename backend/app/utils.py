from datetime import date, timedelta
from decimal import Decimal

def money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))

def next_date(d: date, interval: str):
    if interval == "daily": return d + timedelta(days=1)
    if interval == "weekly": return d + timedelta(days=7)
    if interval == "monthly":
        # Clamp to last day of next month.
        import calendar
        year = d.year + (1 if d.month == 12 else 0)
        month = 1 if d.month == 12 else d.month + 1
        return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))
    if interval == "yearly":
        try: return d.replace(year=d.year + 1)
        except ValueError: return d.replace(year=d.year + 1, day=28)
    raise ValueError("Unsupported billing interval")
