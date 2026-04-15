import axiosClient from "./axiosClient";

const authApi = {
    login(data) {
        const url = "identity/auth/token"
        return axiosClient.post(url, data)
    },

    introspect(token) {
        const url = "identity/auth/introspect"
        return axiosClient.post(url, { token })
    },

    register(data) {
        const url = "identity/users/registration";
        return axiosClient.post(url, data)
    },

    logout(token) {
        const url = "identity/auth/logout";
        return axiosClient.post(url, { token })
    },

    verify(email, code) {
        const url = `identity/users/verify?email=${email}&code=${code}`;
        return axiosClient.post(url);
    },

    resendOtp(email) {
        const url = `identity/users/resend-otp?email=${email}`;
        return axiosClient.post(url);
    },

    forgotPassword(email) {
        const url = `identity/users/forgot-password?email=${email}`;
        return axiosClient.post(url);
    },

    resetPassword(email, otp, newPassword) {
        const url = `identity/users/reset-password?email=${email}&otp=${otp}`;
        return axiosClient.post(url, { password: newPassword });
    }
}

export default authApi