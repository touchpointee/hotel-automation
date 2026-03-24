const YALE_BASE = process.env.YALE_API_URL || 'http://127.0.0.1:18833/betech/api/v1/hotel/key';

export async function issueKeyCard({ room_no, begin_time, end_time }) {
  // category=2, card_type=1, issue_type=1 — confirmed working
  const params = new URLSearchParams({
    category: 2,
    card_type: 1,
    issue_type: 1,
    room_no,
    begin_time,
    end_time,
  });

  const res = await fetch(`${YALE_BASE}/issue?${params.toString()}`);
  const data = await res.json();

  if (data.code !== 0) {
    throw new Error(`Yale error ${data.code}: ${data.message}`);
  }

  return data.detail; // { guest_sn, card_no, card_id }
}
