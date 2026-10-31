from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from app.core.config import get_settings
from app.api.routes.health import router
from app.services.health_service import recalculate_all

settings = get_settings()
scheduler = BackgroundScheduler(timezone="UTC")

@asynccontextmanager
async def lifespan(app):
    if settings.enable_scheduler:
        scheduler.add_job(recalculate_all, "cron", hour=settings.scheduler_hour_utc,
                          id="daily-health-recalculation", replace_existing=True)
        scheduler.start()
    yield
    if scheduler.running:
        scheduler.shutdown()

app = FastAPI(title="Subscription Health Intelligence API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"service": "Subscription Health Intelligence API", "docs": "/docs"}

@app.get("/healthz")
def healthz():
    return {"status": "ok"}
