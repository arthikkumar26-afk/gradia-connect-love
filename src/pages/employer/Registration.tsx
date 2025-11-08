import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Building2, ArrowRight } from 'lucide-react';
import { mockRegister } from '@/utils/mockApi';
import { useToast } from '@/hooks/use-toast';

export default function Registration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyCategory: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    country: '',
    timezone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName) newErrors.companyName = 'Company name is required';
    if (!formData.companyCategory) newErrors.companyCategory = 'Company category is required';
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.phone) newErrors.phone = 'Phone is required';
    if (!formData.country) newErrors.country = 'Country is required';
    if (!formData.timezone) newErrors.timezone = 'Timezone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await mockRegister(formData);
      if (result.success) {
        sessionStorage.setItem('registrationUserId', result.userId);
        toast({ title: 'Registration successful!', description: 'Please review our agreement.' });
        navigate('/employer/agreement');
      } else {
        toast({ title: 'Registration failed', description: result.message, variant: 'destructive' });
        if (result.message?.includes('already exists')) {
          setTimeout(() => navigate('/employer/login'), 2000);
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-3xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Employer Registration</h1>
          <p className="text-muted-foreground mt-2">Create your company account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={errors.companyName ? 'border-destructive' : ''}
              />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyCategory">Company Category *</Label>
              <Select value={formData.companyCategory} onValueChange={(value) => setFormData({ ...formData, companyCategory: value })}>
                <SelectTrigger className={errors.companyCategory ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.companyCategory && <p className="text-sm text-destructive">{errors.companyCategory}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Admin Full Name *</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={errors.confirmPassword ? 'border-destructive' : ''}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                <SelectTrigger className={errors.country ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usa">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="canada">Canada</SelectItem>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="australia">Australia</SelectItem>
                </SelectContent>
              </Select>
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone *</Label>
              <Select value={formData.timezone} onValueChange={(value) => setFormData({ ...formData, timezone: value })}>
                <SelectTrigger className={errors.timezone ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">EST (UTC-5)</SelectItem>
                  <SelectItem value="pst">PST (UTC-8)</SelectItem>
                  <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                  <SelectItem value="aest">AEST (UTC+10)</SelectItem>
                </SelectContent>
              </Select>
              {errors.timezone && <p className="text-sm text-destructive">{errors.timezone}</p>}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/employer/login')} className="flex-1">
              Already have an account?
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registering...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
