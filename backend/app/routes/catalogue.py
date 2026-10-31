from fastapi import APIRouter, Depends, HTTPException

from app.db import db_request
from app.schemas import (
    CustomerInput,
    PlanInput,
    ProductInput,
    ProductVariantInput,
    ProductVariantUpdate,
    TaxInput,
    DiscountInput,
)
from app.security import admin_user, current_user, internal_user

router = APIRouter(tags=["Catalogue and Customers"])


# ------------------------------
# Products
# ------------------------------

@router.get("/products")
async def products(user=Depends(current_user)):
    params = {"select": "*", "order": "created_at.desc"}

    if user["role"] == "customer":
        params["is_active"] = "eq.true"

    return await db_request("GET", "products", params)


@router.post("/products")
async def add_product(
    body: ProductInput,
    user=Depends(admin_user)
):
    return await db_request(
        "POST",
        "products",
        data=body.model_dump(mode="json")
    )


@router.patch("/products/{item_id}")
async def edit_product(
    item_id: str,
    body: dict,
    user=Depends(admin_user)
):
    allowed = {
        "name",
        "product_type",
        "sales_price",
        "cost_price",
        "notes",
        "is_active",
    }

    payload = {
        key: value
        for key, value in body.items()
        if key in allowed
    }

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No valid product fields supplied"
        )

    return await db_request(
        "PATCH",
        "products",
        {"id": f"eq.{item_id}"},
        payload
    )


# ------------------------------
# Product variants
# ------------------------------

@router.get("/product-variants")
async def product_variants(user=Depends(current_user)):
    params = {
        "select": "*",
        "order": "created_at.desc"
    }

    if user["role"] == "customer":
        params["is_active"] = "eq.true"

    return await db_request(
        "GET",
        "product_variants",
        params
    )


@router.post("/product-variants")
async def add_product_variant(
    body: ProductVariantInput,
    user=Depends(admin_user)
):
    # Confirm that the parent product exists.
    products = await db_request(
        "GET",
        "products",
        {
            "select": "id",
            "id": f"eq.{body.product_id}",
            "limit": "1"
        }
    )

    if not products:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return await db_request(
        "POST",
        "product_variants",
        data=body.model_dump(mode="json")
    )


@router.patch("/product-variants/{variant_id}")
async def edit_product_variant(
    variant_id: str,
    body: ProductVariantUpdate,
    user=Depends(admin_user)
):
    payload = body.model_dump(
        mode="json",
        exclude_unset=True
    )

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No variant fields supplied"
        )

    return await db_request(
        "PATCH",
        "product_variants",
        {"id": f"eq.{variant_id}"},
        payload
    )


# ------------------------------
# Subscription plans
# ------------------------------

@router.get("/plans")
async def plans(user=Depends(current_user)):
    params = {
        "select": "*",
        "order": "created_at.desc"
    }

    if user["role"] == "customer":
        params["is_active"] = "eq.true"

    return await db_request(
        "GET",
        "plans",
        params
    )


@router.post("/plans")
async def add_plan(
    body: PlanInput,
    user=Depends(admin_user)
):
    return await db_request(
        "POST",
        "plans",
        data=body.model_dump(mode="json")
    )


@router.patch("/plans/{item_id}")
async def edit_plan(
    item_id: str,
    body: dict,
    user=Depends(admin_user)
):
    allowed = {
        "name",
        "description",
        "billing_interval",
        "price",
        "minimum_quantity",
        "available_from",
        "available_until",
        "auto_close",
        "allow_early_close",
        "allow_pause",
        "allow_renewal",
        "is_active",
    }

    payload = {
        key: value
        for key, value in body.items()
        if key in allowed
    }

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No valid plan fields supplied"
        )

    return await db_request(
        "PATCH",
        "plans",
        {"id": f"eq.{item_id}"},
        payload
    )


# ------------------------------
# Taxes
# ------------------------------

@router.get("/taxes")
async def taxes(user=Depends(internal_user)):
    return await db_request(
        "GET",
        "taxes",
        {
            "select": "*",
            "order": "name.asc"
        }
    )


@router.post("/taxes")
async def add_tax(
    body: TaxInput,
    user=Depends(admin_user)
):
    return await db_request(
        "POST",
        "taxes",
        data=body.model_dump(mode="json")
    )


# ------------------------------
# Discounts
# ------------------------------

@router.get("/discounts")
async def discounts(user=Depends(internal_user)):
    return await db_request(
        "GET",
        "discounts",
        {
            "select": "*",
            "order": "created_at.desc"
        }
    )


@router.post("/discounts")
async def add_discount(
    body: DiscountInput,
    user=Depends(admin_user)
):
    return await db_request(
        "POST",
        "discounts",
        data=body.model_dump(mode="json")
    )


# ------------------------------
# Customers
# ------------------------------

@router.get("/customers")
async def customers(user=Depends(internal_user)):
    return await db_request(
        "GET",
        "customers",
        {
            "select": "*",
            "order": "created_at.desc"
        }
    )


@router.post("/customers")
async def add_customer(
    body: CustomerInput,
    user=Depends(internal_user)
):
    payload = body.model_dump(mode="json")

    payload["company_name"] = (
        payload.get("company_name") or payload["name"]
    )

    return await db_request(
        "POST",
        "customers",
        data=payload
    )