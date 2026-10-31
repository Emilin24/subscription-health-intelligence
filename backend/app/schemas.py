from pydantic import BaseModel, Field, EmailStr
from typing import Literal
from decimal import Decimal
from datetime import date

class StaffInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=9)
    full_name: str = Field(min_length=1, max_length=150)

class CustomerInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr | None = None
    company_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    billing_address: str | None = None

class ProductInput(BaseModel):
    name: str
    product_type: str = "subscription"
    sales_price: Decimal = Field(ge=0)
    cost_price: Decimal = Field(default=0, ge=0)
    notes: str | None = None
    is_active: bool = True

class PlanInput(BaseModel):
    name: str
    description: str | None = None
    billing_interval: Literal["daily", "weekly", "monthly", "yearly"]
    price: Decimal = Field(ge=0)
    minimum_quantity: int = Field(default=1, ge=1)
    available_from: date | None = None
    available_until: date | None = None
    auto_close: bool = False
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True
    is_active: bool = True

class TaxInput(BaseModel):
    name: str
    tax_rate: Decimal = Field(ge=0, le=100)
    is_active: bool = True

class DiscountInput(BaseModel):
    name: str
    discount_type: Literal["fixed", "percentage"]
    discount_value: Decimal = Field(ge=0)
    minimum_purchase: Decimal = Field(default=0, ge=0)
    minimum_quantity: int = Field(default=1, ge=1)
    start_date: date | None = None
    end_date: date | None = None
    usage_limit: int | None = Field(default=None, ge=0)
    applies_to: Literal["product", "subscription"] = "subscription"
    is_active: bool = True

class QuoteInput(BaseModel):
    customer_id: str
    valid_until: date | None = None
    notes: str | None = None
    items: list[dict] = Field(min_length=1)

class SubscriptionInput(BaseModel):
    customer_id: str
    plan_id: str | None = None
    start_date: date | None = None
    payment_terms: str | None = None
    items: list[dict] = Field(default_factory=list)

class PaymentInput(BaseModel):
    invoice_id: str
    amount: Decimal = Field(gt=0)
    payment_method: str = "manual"
    transaction_reference: str | None = None
    notes: str | None = None

class StatusInput(BaseModel):
    status: str
