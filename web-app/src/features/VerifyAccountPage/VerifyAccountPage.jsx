import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";
import authApi from "../../api/authApi";

export function VerifyAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location]);

  useEffect(() => {
    let timer;
    if (isResendDisabled && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [isResendDisabled, resendTimer]);

  const handleResendOtp = async () => {
    if (!email) {
      toast.error("Email is missing.");
      return;
    }

    try {
      setIsResendDisabled(true);
      setResendTimer(60);

      const res = await authApi.resendOtp(email);

      if (res?.code === 1000) {
        toast.success("Verification code resent successfully!");
      } else {
        toast.error(res?.message || "Failed to resend code.");
      }
    } catch (error) {
      toast.error(error.message || "An error occurred while resending code.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      const res = await authApi.verify(email, code);
      console.log("Verify response:", res);

      if (res?.code === 1000) {
        toast.success("Account verified successfully! Please log in.");
        navigate("/login");
      } else if (res?.code === 1018) {
        toast.error("Invalid verification code. Please check and try again.");
        setCode(""); 
      } else if (res?.code === 1019) {
        toast.error("Code expired. Please request a new one.");
        setCode("");
      } else if (res?.code === 1020) {
        toast.error("Too many failed attempts. Please request a new code.");
        setCode("");
      } else {
        toast.error(res?.message || "Verification failed. Please check your code.");
      }
    } catch (error) {
      toast.error(error.message || "An error occurred during verification.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Threads</h1>
          <p className="text-muted-foreground">Verify your account</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              We sent a code to <strong>{email}</strong>. Enter it below to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={!!location.state?.email}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify Account"}
              </Button>

              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">Didn't receive a code? </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={handleResendOtp}
                  disabled={isResendDisabled || isLoading}
                >
                  {isResendDisabled ? `Resend in ${resendTimer}s` : "Resend"}
                </Button>
              </div>

              <div className="mt-2 text-center">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}