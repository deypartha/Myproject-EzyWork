export const validOtp = (otpArray)=>{
    const code = otpArray.join("");
    if(code.length !== 6 || !/^\d{6}$/.test(code)){
        return{ok:false, message:"OTP must be a 6-digit number"};
    }
    return {ok:true, otp: code};
}