import { useEffect, useState } from 'react';
import { get, post, patch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  PageTitle,
  Card,
  Stat,
  ErrorBox,
  Loading,
  Empty
} from '../components/UI';

const money = value =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  })}`;


// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

export function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/reports/overview')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <ErrorBox error={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageTitle
        title="Overview"
        subtitle="A snapshot of subscription operations."
      />

      <div className="stat-grid">
        <Stat
          label="Active subscriptions"
          value={data.subscriptions_active}
          detail={`${data.subscriptions_total} total`}
        />

        <Stat
          label="Payments received"
          value={money(data.revenue_received)}
        />

        <Stat
          label="Outstanding"
          value={money(data.outstanding)}
        />

        <Stat
          label="Overdue invoices"
          value={data.overdue_invoices}
        />
      </div>

      <Card>
        <h3>Operations at a glance</h3>

        <p className="muted">
          Manage products, plans, customers, subscriptions and billing
          from the workspace.
        </p>

        <div className="quick-grid">
          <div>
            <b>{data.invoices_total}</b>
            <span>Invoices created</span>
          </div>

          <div>
            <b>{data.subscriptions_active}</b>
            <span>Currently active</span>
          </div>
        </div>
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Shared data table
// -----------------------------------------------------------------------------

export function DataTable({
  rows,
  columns,
  renderActions
}) {
  if (!rows?.length) return <Empty />;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column}>
                {column.replaceAll('_', ' ')}
              </th>
            ))}

            {renderActions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map(column => {
                const value = row[column];

                return (
                  <td key={column}>
                    {
                      value === true
                        ? 'Yes'
                        : value === false
                          ? 'No'
                          : typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value ?? '—')
                    }
                  </td>
                );
              })}

              {renderActions && (
                <td>{renderActions(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// -----------------------------------------------------------------------------
// Products and plans
// -----------------------------------------------------------------------------

export function CataloguePage({ kind }) {
  if (kind === 'products') return <ProductsPage />;
  if (kind === 'plans') return <PlansPage />;

  return <SimpleCataloguePage kind={kind} />;
}


// -----------------------------------------------------------------------------
// Product management and variants
// -----------------------------------------------------------------------------

function ProductsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  const [form, setForm] = useState({
    name: '',
    product_type: 'subscription',
    sales_price: '',
    cost_price: '',
    notes: ''
  });

  const [variantForm, setVariantForm] = useState({
    product_id: '',
    variant_name: '',
    additional_price: '0'
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);


  async function refresh() {
    try {
      const [productRows, variantRows] = await Promise.all([
        get('/products'),
        get('/product-variants')
      ]);

      setProducts(productRows || []);
      setVariants(variantRows || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function createProduct(event) {
    event.preventDefault();

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await post('/products', {
        ...form,
        sales_price: Number(form.sales_price),
        cost_price: Number(form.cost_price || 0)
      });

      setForm({
        name: '',
        product_type: 'subscription',
        sales_price: '',
        cost_price: '',
        notes: ''
      });

      setMessage(
        'Product created. You can now add variants below.'
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function createVariant(event) {
    event.preventDefault();

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await post('/product-variants', {
        ...variantForm,
        additional_price: Number(
          variantForm.additional_price || 0
        )
      });

      setVariantForm({
        product_id: '',
        variant_name: '',
        additional_price: '0'
      });

      setMessage('Product variant created.');

      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function toggleProduct(product) {
    try {
      await patch(
        `/products/${product.id}`,
        { is_active: !product.is_active }
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  async function toggleVariant(variant) {
    try {
      await patch(
        `/product-variants/${variant.id}`,
        { is_active: !variant.is_active }
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  const productName = id =>
    products.find(product => product.id === id)?.name
    || 'Unknown product';


  return (
    <>
      <PageTitle
        title="Products"
        subtitle="Create products, set sales and cost prices, and manage priced variants."
      />

      <ErrorBox error={error} />

      {message && (
        <div className="success-box">{message}</div>
      )}


      {isAdmin ? (
        <div className="two-col">

          <Card>
            <h3>Add product</h3>

            <form
              className="stack-form"
              onSubmit={createProduct}
            >
              <label>
                Product name
                <input
                  required
                  maxLength="200"
                  value={form.name}
                  onChange={e =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Product type

                <select
                  required
                  value={form.product_type}
                  onChange={e =>
                    setForm({
                      ...form,
                      product_type: e.target.value
                    })
                  }
                >
                  <option value="subscription">
                    Subscription
                  </option>

                  <option value="add_on">
                    Add-on
                  </option>

                  <option value="one_time">
                    One-time
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                Sales price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.sales_price}
                  onChange={e =>
                    setForm({
                      ...form,
                      sales_price: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Cost price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price}
                  onChange={e =>
                    setForm({
                      ...form,
                      cost_price: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Notes
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={e =>
                    setForm({
                      ...form,
                      notes: e.target.value
                    })
                  }
                />
              </label>

              <button
                className="btn primary"
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Create product'}
              </button>
            </form>
          </Card>


          <Card>
            <h3>Add product variant</h3>

            <p className="muted">
              A variant adds its additional price to the
              product's base sales price.
            </p>

            <form
              className="stack-form"
              onSubmit={createVariant}
            >
              <label>
                Product

                <select
                  required
                  value={variantForm.product_id}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      product_id: e.target.value
                    })
                  }
                >
                  <option value="">Select product</option>

                  {products.map(product => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Variant name

                <input
                  required
                  maxLength="150"
                  placeholder="e.g. Odoo"
                  value={variantForm.variant_name}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      variant_name: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Additional price (₹)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={variantForm.additional_price}
                  onChange={e =>
                    setVariantForm({
                      ...variantForm,
                      additional_price: e.target.value
                    })
                  }
                />
              </label>

              <button
                className="btn primary"
                disabled={busy || products.length === 0}
              >
                {busy ? 'Saving…' : 'Add variant'}
              </button>
            </form>
          </Card>

        </div>
      ) : (
        <Card>
          <p className="muted">
            Staff can view the product catalogue and variants.
            Only administrators can create or change them.
          </p>
        </Card>
      )}


      <Card>
        <h3>Product catalogue</h3>

        <DataTable
          rows={products}
          columns={[
            'name',
            'product_type',
            'sales_price',
            'cost_price',
            'is_active'
          ]}
          renderActions={
            isAdmin
              ? product => (
                <button
                  className="btn small"
                  onClick={() => toggleProduct(product)}
                >
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )
              : null
          }
        />
      </Card>


      <Card>
        <h3>Product variants</h3>

        <DataTable
          rows={variants.map(variant => ({
            ...variant,
            product_name: productName(variant.product_id)
          }))}
          columns={[
            'product_name',
            'variant_name',
            'additional_price',
            'is_active'
          ]}
          renderActions={
            isAdmin
              ? variant => (
                <button
                  className="btn small"
                  onClick={() => toggleVariant(variant)}
                >
                  {variant.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )
              : null
          }
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Subscription plan management
// -----------------------------------------------------------------------------

function PlansPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const initialForm = {
    name: '',
    description: '',
    billing_interval: 'monthly',
    price: '',
    minimum_quantity: 1,
    available_from: '',
    available_until: '',
    auto_close: false,
    allow_early_close: true,
    allow_pause: true,
    allow_renewal: true,
    is_active: true
  };

  const [form, setForm] = useState(initialForm);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);


  async function refresh() {
    try {
      setPlans(await get('/plans') || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function createPlan(event) {
    event.preventDefault();

    setBusy(true);
    setError('');
    setMessage('');

    try {
      await post('/plans', {
        ...form,
        price: Number(form.price),
        minimum_quantity: Number(form.minimum_quantity),
        available_from: form.available_from || null,
        available_until: form.available_until || null
      });

      setForm(initialForm);
      setMessage('Subscription plan created.');

      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function togglePlan(plan) {
    try {
      await patch(
        `/plans/${plan.id}`,
        { is_active: !plan.is_active }
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title="Subscription plans"
        subtitle="Configure recurring prices, availability dates and subscription lifecycle permissions."
      />

      <ErrorBox error={error} />

      {message && (
        <div className="success-box">{message}</div>
      )}


      {isAdmin ? (
        <Card>
          <h3>Create subscription plan</h3>

          <form
            className="stack-form plan-form"
            onSubmit={createPlan}
          >
            <div className="form-grid">

              <label>
                Plan name
                <input
                  required
                  maxLength="200"
                  value={form.name}
                  onChange={e =>
                    setForm({
                      ...form,
                      name: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Price (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={e =>
                    setForm({
                      ...form,
                      price: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Billing interval

                <select
                  value={form.billing_interval}
                  onChange={e =>
                    setForm({
                      ...form,
                      billing_interval: e.target.value
                    })
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>

              <label>
                Minimum quantity
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.minimum_quantity}
                  onChange={e =>
                    setForm({
                      ...form,
                      minimum_quantity: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Available from
                <input
                  type="date"
                  value={form.available_from}
                  onChange={e =>
                    setForm({
                      ...form,
                      available_from: e.target.value
                    })
                  }
                />
              </label>

              <label>
                Available until
                <input
                  type="date"
                  min={form.available_from || undefined}
                  value={form.available_until}
                  onChange={e =>
                    setForm({
                      ...form,
                      available_until: e.target.value
                    })
                  }
                />
              </label>

            </div>


            <label>
              Description

              <textarea
                rows="3"
                value={form.description}
                onChange={e =>
                  setForm({
                    ...form,
                    description: e.target.value
                  })
                }
              />
            </label>


            <div className="permission-grid">

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.auto_close}
                  onChange={e =>
                    setForm({
                      ...form,
                      auto_close: e.target.checked
                    })
                  }
                />
                Automatically close when availability ends
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.allow_early_close}
                  onChange={e =>
                    setForm({
                      ...form,
                      allow_early_close: e.target.checked
                    })
                  }
                />
                Allow early closure
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.allow_pause}
                  onChange={e =>
                    setForm({
                      ...form,
                      allow_pause: e.target.checked
                    })
                  }
                />
                Allow subscription pause
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.allow_renewal}
                  onChange={e =>
                    setForm({
                      ...form,
                      allow_renewal: e.target.checked
                    })
                  }
                />
                Allow renewal
              </label>

              <label className="check-row">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e =>
                    setForm({
                      ...form,
                      is_active: e.target.checked
                    })
                  }
                />
                Plan is active and available
              </label>

            </div>


            <button
              className="btn primary"
              disabled={busy}
            >
              {busy ? 'Saving…' : 'Create plan'}
            </button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="muted">
            Staff can view available plans. Only administrators
            can create or change plan configuration.
          </p>
        </Card>
      )}


      <Card>
        <h3>Existing plans</h3>

        <DataTable
          rows={plans}
          columns={[
            'name',
            'billing_interval',
            'price',
            'minimum_quantity',
            'available_from',
            'available_until',
            'auto_close',
            'allow_early_close',
            'allow_pause',
            'allow_renewal',
            'is_active'
          ]}
          renderActions={
            isAdmin
              ? plan => (
                <button
                  className="btn small"
                  onClick={() => togglePlan(plan)}
                >
                  {plan.is_active ? 'Deactivate' : 'Activate'}
                </button>
              )
              : null
          }
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Other catalogue sections: customers, taxes and discounts
// -----------------------------------------------------------------------------

const simpleConfig = {
  customers: {
    title: 'Customers',
    subtitle: 'Customer records and billing details.',
    endpoint: '/customers',

    fields: [
      ['name', 'Customer name', 'text'],
      ['email', 'Email', 'email'],
      ['company_name', 'Company name', 'text'],
      ['contact_name', 'Contact name', 'text'],
      ['phone', 'Phone', 'text'],
      ['billing_address', 'Billing address', 'text']
    ],

    columns: [
      'name',
      'email',
      'company_name',
      'phone',
      'created_at'
    ],

    adminOnly: false
  },

  taxes: {
    title: 'Taxes',
    subtitle: 'Tax rates configured by administrators.',
    endpoint: '/taxes',

    fields: [
      ['name', 'Tax name', 'text'],
      ['tax_rate', 'Rate (%)', 'number']
    ],

    columns: [
      'name',
      'tax_rate',
      'is_active'
    ],

    adminOnly: true
  },

  discounts: {
    title: 'Discounts',
    subtitle: 'Promotional rules configured by administrators.',
    endpoint: '/discounts',

    fields: [
      ['name', 'Discount name', 'text'],
      ['discount_type', 'Type (fixed/percentage)', 'text'],
      ['discount_value', 'Value', 'number'],
      ['minimum_purchase', 'Minimum purchase', 'number'],
      ['minimum_quantity', 'Minimum quantity', 'number'],
      ['start_date', 'Start date', 'date'],
      ['end_date', 'End date', 'date'],
      ['usage_limit', 'Usage limit', 'number']
    ],

    columns: [
      'name',
      'discount_type',
      'discount_value',
      'minimum_purchase',
      'minimum_quantity',
      'start_date',
      'end_date',
      'usage_limit',
      'is_active'
    ],

    adminOnly: true
  }
};


function SimpleCataloguePage({ kind }) {
  const { profile } = useAuth();
  const config = simpleConfig[kind];

  const isAdmin = profile?.role === 'admin';
  const canCreate = !config.adminOnly || isAdmin;

  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');


  async function refresh() {
    try {
      setRows(await get(config.endpoint) || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, [kind]);


  async function submit(event) {
    event.preventDefault();

    try {
      const payload = { ...form };

      [
        'tax_rate',
        'discount_value',
        'minimum_purchase',
        'minimum_quantity',
        'usage_limit'
      ].forEach(key => {
        if (
          payload[key] !== undefined &&
          payload[key] !== ''
        ) {
          payload[key] = Number(payload[key]);
        }
      });

      if (kind === 'discounts') {
        payload.start_date = payload.start_date || null;
        payload.end_date = payload.end_date || null;
        payload.minimum_quantity =
          payload.minimum_quantity || 1;
        payload.minimum_purchase =
          payload.minimum_purchase || 0;
        payload.applies_to = 'subscription';
      }

      await post(config.endpoint, payload);

      setForm({});
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title={config.title}
        subtitle={config.subtitle}
      />

      <ErrorBox error={error} />

      <div className="two-col">

        {canCreate ? (
          <Card>
            <h3>Add {kind.slice(0, -1)}</h3>

            <form
              className="stack-form"
              onSubmit={submit}
            >
              {config.fields.map(([name, label, type]) => (
                <label key={name}>
                  {label}

                  {name === 'discount_type' ? (
                    <select
                      required
                      value={form[name] || 'percentage'}
                      onChange={e =>
                        setForm({
                          ...form,
                          [name]: e.target.value
                        })
                      }
                    >
                      <option value="fixed">
                        Fixed amount
                      </option>

                      <option value="percentage">
                        Percentage
                      </option>
                    </select>
                  ) : (
                    <input
                      type={type}
                      required={
                        ![
                          'company_name',
                          'contact_name',
                          'phone',
                          'billing_address',
                          'minimum_purchase',
                          'minimum_quantity',
                          'usage_limit',
                          'start_date',
                          'end_date'
                        ].includes(name)
                      }
                      step={
                        type === 'number'
                          ? '0.01'
                          : undefined
                      }
                      value={form[name] ?? ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          [name]: e.target.value
                        })
                      }
                    />
                  )}
                </label>
              ))}

              <button className="btn primary">
                Save
              </button>
            </form>
          </Card>
        ) : (
          <Card>
            <p className="muted">
              Only administrators can create or modify
              {` ${config.title.toLowerCase()}.`}
            </p>
          </Card>
        )}


        <Card>
          <h3>Existing {config.title.toLowerCase()}</h3>

          <DataTable
            rows={rows}
            columns={config.columns}
          />
        </Card>

      </div>
    </>
  );
}


// -----------------------------------------------------------------------------
// Generic table page
// -----------------------------------------------------------------------------

export function GenericTable({
  title,
  subtitle,
  endpoint,
  columns,
  action
}) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    get(endpoint)
      .then(data => setRows(data || []))
      .catch(e => setError(e.message));
  }, [endpoint]);

  return (
    <>
      <PageTitle
        title={title}
        subtitle={subtitle}
        action={action}
      />

      <ErrorBox error={error} />

      <Card>
        <DataTable
          rows={rows}
          columns={columns}
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Subscriptions
// -----------------------------------------------------------------------------

export function Subscriptions() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [plans, setPlans] = useState([]);

  const [customer, setCustomer] = useState('');
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');


  async function refresh() {
    try {
      const [a, b, c] = await Promise.all([
        get('/subscriptions'),
        get('/customers'),
        get('/plans')
      ]);

      setRows(a || []);
      setCustomers(b || []);
      setPlans(c || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function create(event) {
    event.preventDefault();

    try {
      await post('/subscriptions', {
        customer_id: customer,
        plan_id: plan || null,
        items: []
      });

      setCustomer('');
      setPlan('');

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title="Subscriptions"
        subtitle="Create and monitor customer subscription contracts."
      />

      <ErrorBox error={error} />

      <Card>
        <h3>Create subscription</h3>

        <form
          className="inline-form"
          onSubmit={create}
        >
          <select
            required
            value={customer}
            onChange={e => setCustomer(e.target.value)}
          >
            <option value="">Select customer</option>

            {customers.map(x => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>

          <select
            value={plan}
            onChange={e => setPlan(e.target.value)}
          >
            <option value="">No plan selected</option>

            {plans.map(x => (
              <option value={x.id} key={x.id}>
                {x.name} — {money(x.price)}/{x.billing_interval}
              </option>
            ))}
          </select>

          <button className="btn primary">
            Create
          </button>
        </form>
      </Card>

      <Card>
        <DataTable
          rows={rows}
          columns={[
            'subscription_number',
            'status',
            'start_date',
            'end_date',
            'next_billing_date',
            'renewal_count'
          ]}
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Invoices and payments
// -----------------------------------------------------------------------------

export function Billing() {
  const [rows, setRows] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [invoice, setInvoice] = useState('');
  const [amount, setAmount] = useState('');


  async function refresh() {
    try {
      const [a, b] = await Promise.all([
        get('/invoices'),
        get('/payments')
      ]);

      setRows(a || []);
      setPayments(b || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function runBilling() {
    setBusy(true);

    try {
      const result = await post('/billing/run', {});

      setError(
        `Billing run complete: ${result.count} invoice(s) created.`
      );

      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }


  async function recordPayment(event) {
    event.preventDefault();

    try {
      await post('/payments', {
        invoice_id: invoice,
        amount: Number(amount),
        payment_method: 'manual'
      });

      setInvoice('');
      setAmount('');

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title="Invoices & payments"
        subtitle="Generate recurring invoices and record received payments."
        action={
          <button
            className="btn primary"
            onClick={runBilling}
            disabled={busy}
          >
            {busy ? 'Running…' : 'Run billing'}
          </button>
        }
      />

      <ErrorBox error={error} />

      <Card>
        <h3>Record payment</h3>

        <form
          className="inline-form"
          onSubmit={recordPayment}
        >
          <select
            required
            value={invoice}
            onChange={e => setInvoice(e.target.value)}
          >
            <option value="">Select invoice</option>

            {rows
              .filter(x =>
                x.status !== 'paid' &&
                x.status !== 'cancelled'
              )
              .map(x => (
                <option key={x.id} value={x.id}>
                  {x.invoice_number} · {money(x.balance_due ?? x.total)}
                </option>
              ))}
          </select>

          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />

          <button className="btn">
            Record payment
          </button>
        </form>
      </Card>


      <Card>
        <h3>Invoices</h3>

        <DataTable
          rows={rows}
          columns={[
            'invoice_number',
            'status',
            'invoice_date',
            'due_date',
            'total',
            'amount_paid',
            'balance_due'
          ]}
        />
      </Card>


      <Card>
        <h3>Payments</h3>

        <DataTable
          rows={payments}
          columns={[
            'amount',
            'method',
            'status',
            'paid_at',
            'transaction_reference'
          ]}
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Quotations
// -----------------------------------------------------------------------------

export function Quotations() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState('');
  const [error, setError] = useState('');


  async function refresh() {
    try {
      const [a, b] = await Promise.all([
        get('/quotations'),
        get('/customers')
      ]);

      setRows(a || []);
      setCustomers(b || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function create(event) {
    event.preventDefault();

    try {
      await post('/quotations', {
        customer_id: customer,
        items: [
          {
            quantity: 1,
            unit_price: 0
          }
        ]
      });

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  async function convert(id) {
    try {
      await post(`/quotations/${id}/convert`, {});
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title="Quotations"
        subtitle="Prepare quotations and convert accepted quotes into subscriptions."
      />

      <ErrorBox error={error} />

      <Card>
        <form
          className="inline-form"
          onSubmit={create}
        >
          <select
            required
            value={customer}
            onChange={e => setCustomer(e.target.value)}
          >
            <option value="">Select customer</option>

            {customers.map(x => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>

          <button className="btn primary">
            Create draft quotation
          </button>
        </form>
      </Card>


      <Card>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(x => (
                <tr key={x.id}>
                  <td>{x.quotation_number}</td>
                  <td>{x.customers?.name || '—'}</td>
                  <td>{x.status}</td>
                  <td>{money(x.total_amount)}</td>
                  <td>
                    <button
                      className="btn small"
                      onClick={() => convert(x.id)}
                    >
                      Convert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Subscription health
// -----------------------------------------------------------------------------

export function Health() {
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');


  async function refresh() {
    try {
      const [a, b] = await Promise.all([
        get('/health/summary'),
        get('/health/list')
      ]);

      setSummary(a);
      setRows(b || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }


  useEffect(() => {
    refresh();
  }, []);


  async function recalculate() {
    try {
      await post('/health/recalculate', {});
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }


  return (
    <>
      <PageTitle
        title="Subscription Health"
        subtitle="Operational risk signals across payment, renewal, activity, timeliness and stability."
        action={
          <button
            className="btn primary"
            onClick={recalculate}
          >
            Recalculate scores
          </button>
        }
      />

      <ErrorBox error={error} />

      {summary && (
        <div className="stat-grid">
          <Stat
            label="Scored subscriptions"
            value={summary.total}
          />

          <Stat
            label="Average health score"
            value={`${summary.average}/100`}
          />

          {Object.entries(summary.counts || {}).map(
            ([key, value]) => (
              <Stat
                key={key}
                label={key}
                value={value}
              />
            )
          )}
        </div>
      )}

      <Card>
        <DataTable
          rows={rows}
          columns={[
            'subscription_id',
            'health_score',
            'health_status',
            'calculated_at'
          ]}
        />
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Reports
// -----------------------------------------------------------------------------

export function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/reports/overview')
      .then(setData)
      .catch(e => setError(e.message));
  }, []);


  return (
    <>
      <PageTitle
        title="Reports"
        subtitle="Revenue, subscription and receivables summary."
      />

      <ErrorBox error={error} />

      {data && (
        <div className="stat-grid">
          {Object.entries(data).map(([key, value]) => (
            <Stat
              key={key}
              label={key.replaceAll('_', ' ')}
              value={
                key === 'outstanding' || key.includes('revenue')
                  ? money(value)
                  : value
              }
            />
          ))}
        </div>
      )}

      <Card>
        <p className="muted">
          This report is a current operational snapshot.
          Date-range exports and cohort analysis can be added
          as a later reporting enhancement.
        </p>
      </Card>
    </>
  );
}


// -----------------------------------------------------------------------------
// Customer portal
// -----------------------------------------------------------------------------

export function Portal() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');


  useEffect(() => {
    Promise.all([
      get('/portal/subscriptions'),
      get('/portal/invoices'),
      get('/portal/payments')
    ])
      .then(([a, b, c]) => {
        setSubscriptions(a || []);
        setInvoices(b || []);
        setPayments(c || []);
      })
      .catch(e => setError(e.message));
  }, []);


  return (
    <>
      <PageTitle
        title="My portal"
        subtitle="Your subscriptions, invoices and payment history."
      />

      <ErrorBox error={error} />

      <Card>
        <h3>My subscriptions</h3>

        <DataTable
          rows={subscriptions}
          columns={[
            'subscription_number',
            'status',
            'start_date',
            'end_date',
            'next_billing_date'
          ]}
        />
      </Card>

      <Card>
        <h3>My invoices</h3>

        <DataTable
          rows={invoices}
          columns={[
            'invoice_number',
            'status',
            'invoice_date',
            'due_date',
            'total',
            'balance_due'
          ]}
        />
      </Card>

      <Card>
        <h3>My payments</h3>

        <DataTable
          rows={payments}
          columns={[
            'amount',
            'payment_method',
            'method',
            'status',
            'payment_date'
          ]}
        />
      </Card>
    </>
  );
}