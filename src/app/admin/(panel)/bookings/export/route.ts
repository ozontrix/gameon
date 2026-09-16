import { NextResponse } from 'next/server';

import { exportBookings, readBookingFilters } from '@/lib/admin/queries/bookings';
import { getStaffSession } from '@/lib/admin/session';

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Neutralise spreadsheet formulas in customer-entered text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of the bookings matching the same filters as the bookings list. */
export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const bookings = await exportBookings(readBookingFilters(params));

  const header = [
    'Booking ID',
    'Date',
    'Start',
    'End',
    'Venue',
    'Court',
    'Sport',
    'Customer',
    'Phone',
    'Players',
    'Amount (INR)',
    'Status',
    'Payment status',
    'Payment method',
    'Source',
    'Checked in',
    'Razorpay payment ID',
    'Cancel reason',
    'Refund reference',
    'Created at',
  ];

  const rows = bookings.map((b) => [
    b.id,
    b.booking_date,
    b.start_time.slice(0, 5),
    b.end_time.slice(0, 5),
    b.facilities.venues?.name,
    b.facilities.name,
    b.facilities.sports?.name,
    b.contact_name,
    b.contact_phone,
    b.players,
    b.amount_paid,
    b.status,
    b.payment_status,
    b.payment_method,
    b.source,
    b.is_scanned ? 'Yes' : 'No',
    b.razorpay_payment_id,
    b.cancel_reason,
    b.refund_reference,
    b.created_at,
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);

  // BOM so Excel reads the file as UTF-8 (customer names are not always ASCII).
  return new NextResponse(`﻿${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gameon-bookings-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
