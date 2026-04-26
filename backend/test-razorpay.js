import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const key = process.env.RAZORPAY_KEY_ID?.trim();
const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

console.log("Testing Razorpay credentials...");
console.log("Key ID:", key);
console.log("Key Secret:", secret);

const rz = new Razorpay({
  key_id: key,
  key_secret: secret,
});

rz.orders
  .create({
    amount: 100,
    currency: "INR",
    receipt: "test_" + Date.now(),
  })
  .then((order) => {
    console.log("✅ SUCCESS! Credentials are VALID");
    console.log("Order created:", order.id);
    process.exit(0);
  })
  .catch((err) => {
    console.log("❌ FAILED! Credentials are INVALID");
    console.log("Error:", err.error?.description || err.message);
    process.exit(1);
  });
