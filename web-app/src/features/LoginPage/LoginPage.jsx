import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { login, fetchMyInfo } from "../../store/userSlice";


export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const values = { email, password };
    
    try {
      setIsLoading(true);
      // dispatch login thunk
      await dispatch(login(values)).unwrap();
      // login thành công -> fetchMyInfo is now dispatched inside the login thunk.
      toast.success("Login successful!");
      navigate("/feed");
    } catch (error) {
        if (error === "Your account is not verified. Please verify your email.") {
          toast.error("Your account is not verified. Please verify your email.");
          navigate("/verify", { state: { email } });
        } else {
          const message = error?.message || (typeof error === 'string' ? error : "Login failed. Please check your credentials.");
          toast.error(message);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Threads</h1>
          <p className="text-muted-foreground">Join the conversation</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign in to Threads</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  name="email"
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  name="password"
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/register")}>
                  Sign up
                </Button>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}