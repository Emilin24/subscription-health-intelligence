from fastapi import APIRouter, Depends, Query
from app.core.security import require_staff
from app.services import health_service as service

router = APIRouter(prefix="/health", tags=["Subscription Health"], dependencies=[Depends(require_staff)])

@router.get("/summary")
def summary():
    return service.summary()

@router.get("/subscriptions")
def subscriptions(search: str | None = None, status: str | None = None,
                  limit: int = Query(100, ge=1, le=500)):
    return service.listing(search, status, limit)

@router.get("/subscriptions/{sid}")
def detail(sid: str):
    return service.detail(sid)

@router.post("/subscriptions/{sid}/recalculate")
def recalculate(sid: str):
    return service.calculate(sid)

@router.post("/recalculate-all")
def recalculate_all():
    return service.recalculate_all()

@router.get("/subscriptions/{sid}/history")
def history(sid: str):
    return service.history(sid)
