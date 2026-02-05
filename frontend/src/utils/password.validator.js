export const validPassword = (password)=>{
    if(password.length < 8){
        return {ok:false, message:"Password must be at least 8 characters long"};
    }
    if(!/[A-Z]/.test(password)){
        return {ok:false, message:"Password must contain at least one uppercase letter"};
    }
    if(!/[a-z]/.test(password)){
        return {ok:false, message:"Password must contain at least one lowercase letter"};
    }
    if(!/\d/.test(password)){
        return {ok:false, message:"Password must contain at least one number"};
    }
    if(!/[!@#$%^&*(),.?":{}|<>]/.test(password)){
        return {ok:false, message:"Password must contain at least one special character"};
    }
    return {ok:true};
}