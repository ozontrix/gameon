import type { Metadata } from 'next';
import { ActionForm, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { Badge, Card, CardBody, CardHeader, EmptyState, Field, PageHeader, Table, Td, Th, inputClass } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { createLeagueCoupon, setLeagueCouponActive } from '@/lib/admin/actions/league-coupons';
import { couponInventory } from '@/lib/league/coupon-server';
import { couponLabel } from '@/lib/league/coupons';

export const metadata: Metadata = { title: 'League coupons' };
export const dynamic = 'force-dynamic';

export default async function LeagueCouponsPage() {
  await requireAdmin();
  const coupons = await couponInventory();
  return <>
    <PageHeader title="Multisports League coupons" description="Only admins can create offers. Discounts apply to combined entry fees across every sport." back={{ href: '/admin/multisports-league', label: 'League bookings' }} />
    <Card className="mb-6">
      <CardHeader title="Create coupon" description="Flat values are in rupees; percentage values are 1–99. Minimum entry amount is inclusive. No code is created automatically." />
      <CardBody>
        <ActionForm action={createLeagueCoupon} resetOnSuccess className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Coupon code" htmlFor="coupon-code" required><input id="coupon-code" name="code" maxLength={20} placeholder="e.g. LEAGUE15" className={inputClass} /></Field>
          <Field label="Discount type" htmlFor="coupon-type" required><select id="coupon-type" name="discount_type" className={inputClass}><option value="PERCENT">Percentage (%)</option><option value="FLAT">Flat amount (₹)</option></select></Field>
          <Field label="Discount value" htmlFor="coupon-value" required><input id="coupon-value" name="discount_value" type="number" min={1} step={1} required className={inputClass} /></Field>
          <Field label="Minimum entry amount (₹)" htmlFor="coupon-minimum" required><input id="coupon-minimum" name="min_entry_fee" type="number" min={0} step={1} defaultValue={0} className={inputClass} /></Field>
          <Field label="Total coupon allocation" htmlFor="coupon-limit" hint="Maximum paid uses plus reserved checkouts." required><input id="coupon-limit" name="usage_limit" type="number" min={1} step={1} required className={inputClass} /></Field>
          <Field label="Uses per person" htmlFor="coupon-person" hint="Matched by email OR the last 10 phone digits." required><input id="coupon-person" name="per_person_limit" type="number" min={1} step={1} defaultValue={1} className={inputClass} /></Field>
          <div className="sm:col-span-2 lg:col-span-3"><FormMessage /><SubmitButton className="mt-3 min-h-11 cursor-pointer">Create coupon</SubmitButton></div>
        </ActionForm>
      </CardBody>
    </Card>
    <Card>
      <CardHeader title="Coupon inventory" description="Paid uses count after capture. Reserved uses protect open payment orders from overselling. Deactivation blocks new checkouts; it cannot revoke an already-issued discounted order." />
      {coupons.length ? <Table><thead><tr><Th>Code / offer</Th><Th>Allocation</Th><Th>Paid uses</Th><Th>Reserved</Th><Th>Available</Th><Th>Per person</Th><Th>Status</Th><Th>Action</Th></tr></thead><tbody>
        {coupons.map(coupon => <tr key={coupon.id}>
          <Td><p className="font-mono font-semibold">{coupon.code}</p><p className="mt-1 text-xs">{couponLabel(coupon)}</p></Td>
          <Td>{coupon.usage_limit}</Td><Td>{coupon.used}</Td><Td>{coupon.reserved}</Td><Td>{coupon.remaining}</Td><Td>{coupon.per_person_limit}</Td>
          <Td><Badge tone={!coupon.active ? 'neutral' : coupon.remaining < 1 ? 'amber' : 'green'}>{!coupon.active ? 'Inactive' : coupon.used >= coupon.usage_limit ? 'Exhausted' : coupon.remaining < 1 ? 'Fully reserved' : 'Active'}</Badge></Td>
          <Td><ActionForm action={setLeagueCouponActive}><input type="hidden" name="id" value={coupon.id} /><input type="hidden" name="active" value={String(!coupon.active)} /><FormMessage /><SubmitButton variant={coupon.active ? 'danger' : 'secondary'} className="min-h-11 cursor-pointer">{coupon.active ? 'Deactivate' : 'Activate'}</SubmitButton></ActionForm></Td>
        </tr>)}
      </tbody></Table> : <EmptyState title="No coupons created" description="Create your first League coupon above. Checkout will show no offers until an admin creates one." />}
    </Card>
    <p className="mt-4 text-sm text-zinc-600">Coupon rules are fixed after creation to protect saved payments. Deactivate a code and create a new one to change its terms. Discounts leave at least ₹1 payable. Contact limits are not verified identities because checkout does not require sign-in.</p>
  </>;
}