Deno.test("razorpay UPI QR available", async () => {
  const auth = "Basic " + btoa(`${Deno.env.get("RAZORPAY_KEY_ID")}:${Deno.env.get("RAZORPAY_KEY_SECRET")}`);
  const r = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
    method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "upi_qr", name: "Gradia", usage: "single_use", fixed_amount: true, payment_amount: 100, close_by: Math.floor(Date.now() / 1000) + 600 }),
  });
  const t = await r.text();
  console.log("STATUS", r.status, t.slice(0, 300));
  if (r.ok) {
    const id = JSON.parse(t).id;
    await fetch(`https://api.razorpay.com/v1/payments/qr_codes/${id}/close`, { method: "POST", headers: { Authorization: auth } });
  }
});
