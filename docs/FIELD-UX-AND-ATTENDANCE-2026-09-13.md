# N-LINK 360 Field UX and Attendance Standard

## Goal
N-LINK 360 is a field/market application first. A field user must be able to work with one hand, on a small phone, with very few taps and little typing.

## Field navigation
Keep the field experience to five primary destinations:

1. Home
2. Attendance
3. Customers
4. Orders
5. More

Office/admin functions may remain detailed, but they must not dominate the mobile field workflow.

## Daily field flow
Open app → Check In → Select customer → Order or Recovery → Next customer → Check Out.

The app must not force a field user through reports, admin settings, master-data screens, or long forms before doing market work.

## Mobile UI rules
- Mobile-first responsive layout.
- Large touch targets, minimum 44px where practical.
- Short labels and familiar icons.
- One primary action per screen.
- Search before long customer lists.
- SKU search/filter before showing a large catalogue.
- Sticky save/submit action on long forms.
- Clear online/offline status.
- Never lose a completed field action because the network is unavailable.
- Avoid horizontal scrolling on phone screens.
- Use compact cards instead of dense tables on phones.
- Tables may be used on tablet/desktop for office users.
- Preserve premium light-green/light-sea N-LINK branding, but prioritize readability and speed over decoration.

## Attendance
Attendance is authoritative in `public.field_attendance`. The existing table supports one attendance record per employee per day, GPS coordinates, GPS accuracy, check-in, check-out, town and status.

Field attendance must provide:

- Check In
- Check Out
- Current time
- GPS/location capture
- Town/area
- GPS accuracy when available
- Duty duration
- Today's activity summary
- Attendance history

## Today's activity details
Show a short timeline using real application activity. Do not create fake activity rows.

Possible real activity types:

- Customer visit
- Sales order
- Invoice
- Recovery
- Other approved field activity

Each activity should show only useful detail, for example:

09:35 AM • Customer visit • ABC Electric
10:10 AM • Sales order • SO-1045 • Rs. 85,000
12:05 PM • Recovery • Rs. 80,000

## Monthly attendance
Provide a simple monthly view with:

- Present days
- Attendance records
- Check-in time
- Check-out time
- Duty duration
- Town/area
- Activity count

Where real data is available, summarize monthly:

- Customer visits
- Orders
- Recoveries
- Invoices
- Sales value
- Recovery value

Do not invent absent/leave records. If HR leave/absence data is not available, label those values as unavailable instead of guessing.

## Data rules
- Supabase remains the transactional source of truth.
- Browser localStorage is only a temporary field-device cache/offline layer.
- Google Sheets remains the master-data control plane.
- Financial totals must never be edited directly from the client.
- A failed protected transaction RPC must never fall back to an unrestricted direct table update.
- Attendance must remain linked to the authenticated employee.
- GPS data must only be collected with the required browser/device permission.

## Acceptance criteria
A field user should be able to understand the home screen without training.

A normal daily sequence should require only a few taps:

Check In → Customer → Order/Recovery → Save → Next → Check Out.

The same application must remain usable at phone, tablet and desktop widths.

No dummy customer, product, attendance, order, invoice or recovery data may be presented as live production data.
