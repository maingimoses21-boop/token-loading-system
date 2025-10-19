import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginUser } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [meterNo, setMeterNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Registration modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    meter_no: '',
    phone_number: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !meterNo.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API for authentication
      const userData = await loginUser(email, meterNo);
      
      // Login successful - store user data and navigate
      login(userData);
      navigate('/dashboard');
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.name}!`,
      });
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to server';
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.name.trim() || !registerData.email.trim() || !registerData.meter_no.trim() || !registerData.phone_number.trim() ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register user');
      }

      const newUser = await response.json();
      
      toast({
        title: "Registration Successful",
        description: `User ${registerData.name} has been registered with meter ${registerData.meter_no}`,
        variant: "default",
      });

      // Reset form and close modal
      setRegisterData({ name: '', email: '', meter_no: '', phone_number: '' });
      setIsRegisterModalOpen(false);

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-black">
              IOT Smart Meter
            </CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meterNo">Meter Number</Label>
                <Input
                  id="meterNo"
                  type="text"
                  placeholder="Enter your meter number"
                  value={meterNo}
                  onChange={(e) => setMeterNo(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-black hover:bg-black/90 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>
            
            {/* Register User Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-300 text-black hover:bg-gray-50"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register New User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-black">Register New User</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Add a new user to the IOT Smart Meter system
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="registerName">Full Name</Label>
                      <Input
                        id="registerName"
                        type="text"
                        placeholder="Enter full name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={isRegistering}
                        required
                        className="bg-white border-gray-300 text-black"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email Address</Label>
                      <Input
                        id="registerEmail"
                        type="email"
                        placeholder="Enter email address"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={isRegistering}
                        required
                        className="bg-white border-gray-300 text-black"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerMeterNo">Meter Number</Label>
                      <Input
                        id="registerMeterNo"
                        type="text"
                        placeholder="Enter meter number"
                        value={registerData.meter_no}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, meter_no: e.target.value }))}
                        disabled={isRegistering}
                        required
                        className="bg-white border-gray-300 text-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registerPhonenumber">Phone number</Label>
                      <Input
                        id="registerPhonenumber"
                        type="text"
                        placeholder="Enter phone number"
                        value={registerData.phone_number}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, phone_number: e.target.value }))}
                        disabled={isRegistering}
                        required
                        className="bg-white border-gray-300 text-black"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsRegisterModalOpen(false)}
                        disabled={isRegistering}
                        className="flex-1 border-gray-300 text-black hover:bg-gray-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isRegistering}
                        className="flex-1 bg-black hover:bg-black/90 text-white"
                      >
                        {isRegistering ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Registering...
                          </>
                        ) : (
                          'Register User'
                        )}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;