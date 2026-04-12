import React, {useState} from "react";
function Payment(){
  const [amount, setAmount] = useState("");
  const handlePayment = ()=>{
    if(!amount){
      alert("Please enter an amount");
      return;
    }
    console.log("Proceed to payment: ", amount);
    alert(`Payment of $${amount} successful!`);
    setAmount("");

  }
  return(
    <div className="">
      <h1>Payment Page</h1>
      <input type="number" placeholder="Enter amount: " value={amount} onChange={(e)=>setAmount(e.target.value)} />
      <br /><br />
      <button onClick={handlePayment}>Pay now</button>
    </div>
  )
}
export default Payment;