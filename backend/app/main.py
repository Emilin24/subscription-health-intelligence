from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, admin, catalogue, sales, billing, portal, health, reports

app=FastAPI(title="Brightloop Subscription Management API",version="1.0.0")
s=settings()
app.add_middleware(
    CORSMiddleware,allow_origins=s.origins,allow_credentials=True,
    allow_methods=["*"],allow_headers=["*"]
)
for router in [auth.router,admin.router,catalogue.router,sales.router,billing.router,portal.router,health.router,reports.router]:
    app.include_router(router,prefix="/api")

@app.get("/")
async def root():
    return {"name":"Brightloop Subscription Management API","docs":"/docs"}

@app.get("/api/healthcheck")
async def healthcheck():
    return {"status":"ok"}
