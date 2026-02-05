export const validResetPassword = (newPassword, confirmPassword) => {
    if (newPassword !== confirmPassword) {
        return { ok: false, message: "Passwords do not match" };
    }
    if(!newPassword.trim() || !confirmPassword.trim()){
        return {ok:false, message:"Password fields cannot be empty"};
    }
    if(newPassword.length < 8){
        return {ok:false, message:"Password must be at least 8 characters long"};
    }
    return { ok: true };
}