export const validSignUp = (email, password, confirmPassword) => {
    if(!email.trim() || !password.trim() || !confirmPassword.trim()){
        return {ok:false, message:"All fields are required"};
    }
    if(password !== confirmPassword){
        return {ok:false, message:"Passwords do not match"};
    }   
    return {ok:true};
}