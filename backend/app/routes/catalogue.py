from fastapi import APIRouter, Depends
from app.security import current_user, admin_user, internal_user
from app.db import db_request
from app.schemas import ProductInput, PlanInput, TaxInput, DiscountInput, CustomerInput

router = APIRouter(tags=["Catalogue and Customers"])

@router.get("/products")
async def products(user=Depends(current_user)):
    p={"select":"*","order":"created_at.desc"}
    if user["role"]=="customer": p["is_active"]="eq.true"
    return await db_request("GET","products",p)

@router.post("/products")
async def add_product(body: ProductInput, user=Depends(admin_user)):
    return await db_request("POST","products",data=body.model_dump(mode="json"))

@router.patch("/products/{item_id}")
async def edit_product(item_id: str, body: dict, user=Depends(admin_user)):
    return await db_request("PATCH","products",{"id":f"eq.{item_id}"},body)

@router.get("/plans")
async def plans(user=Depends(current_user)):
    p={"select":"*","order":"created_at.desc"}
    if user["role"]=="customer": p["is_active"]="eq.true"
    return await db_request("GET","plans",p)

@router.post("/plans")
async def add_plan(body: PlanInput, user=Depends(admin_user)):
    return await db_request("POST","plans",data=body.model_dump(mode="json"))

@router.patch("/plans/{item_id}")
async def edit_plan(item_id: str, body: dict, user=Depends(admin_user)):
    return await db_request("PATCH","plans",{"id":f"eq.{item_id}"},body)

@router.get("/taxes")
async def taxes(user=Depends(internal_user)):
    return await db_request("GET","taxes",{"select":"*","order":"name.asc"})

@router.post("/taxes")
async def add_tax(body: TaxInput, user=Depends(admin_user)):
    return await db_request("POST","taxes",data=body.model_dump(mode="json"))

@router.get("/discounts")
async def discounts(user=Depends(internal_user)):
    return await db_request("GET","discounts",{"select":"*","order":"created_at.desc"})

@router.post("/discounts")
async def add_discount(body: DiscountInput, user=Depends(admin_user)):
    return await db_request("POST","discounts",data=body.model_dump(mode="json"))

@router.get("/customers")
async def customers(user=Depends(internal_user)):
    return await db_request("GET","customers",{"select":"*","order":"created_at.desc"})

@router.post("/customers")
async def add_customer(body: CustomerInput, user=Depends(internal_user)):
    d=body.model_dump(mode="json")
    d["company_name"]=d.get("company_name") or d["name"]
    return await db_request("POST","customers",data=d)
