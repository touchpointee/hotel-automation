function getYaleBase() {
  const url = process.env.YALE_API_URL;
  if (!url?.trim()) {
    throw new Error('YALE_API_URL is not set in the environment.');
  }
  return url.replace(/\/$/, '');
}

export async function issueKeyCard({ room_no, begin_time, end_time }) {
  const yaleBase = getYaleBase();
  // category=2, card_type=1, issue_type=1 — confirmed working
  const params = new URLSearchParams({
    category: 2,
    card_type: 1,
    issue_type: 1,
    room_no,
    begin_time,
    end_time,
  });

  let res;
  try {
    res = await fetch(`${yaleBase}/issue?${params.toString()}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Yale bridge unreachable (${msg}). Check YALE_API_URL.`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Yale bridge returned non-JSON (HTTP ${res.status}). Check YALE_API_URL.`);
  }

  if (data.code !== 0) {
    throw new Error(`Yale error ${data.code}: ${data.message}`);
  }

  return data.detail; // { guest_sn, card_no, card_id }
}
