import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, GraduationCap, Users, Upload, Loader2, CheckCircle2, Sparkles, IndianRupee, Search } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Education designations only
const educationDesignations = ["Teacher", "Vice Principal", "Principal"];

// India states and districts data
const locationData: Record<string, Record<string, string[]>> = {
  "Telangana": {
    "Hyderabad": ["Secunderabad", "Gachibowli", "Kukatpally", "Madhapur", "Ameerpet", "Dilsukhnagar", "LB Nagar", "Banjara Hills", "Jubilee Hills", "Begumpet", "Himayat Nagar", "Kondapur"],
    "Rangareddy": ["Shamshabad", "Mehdipatnam", "Rajendranagar", "Chevella", "Ibrahimpatnam", "Vikarabad"],
    "Medchal-Malkajgiri": ["Kompally", "Alwal", "Bowenpally", "Quthbullapur", "Medchal"],
    "Warangal": ["Hanamkonda", "Kazipet", "Warangal City"],
    "Nizamabad": ["Nizamabad City", "Armoor", "Bodhan"],
    "Karimnagar": ["Karimnagar City", "Ramagundam", "Peddapalli"]
  },
  "Andhra Pradesh": {
    "Visakhapatnam": ["Visakhapatnam City", "Gajuwaka", "Madhurawada", "Seethammadhara", "MVP Colony"],
    "Vijayawada": ["Vijayawada City", "Benz Circle", "Labbipet", "Governorpet"],
    "Guntur": ["Guntur City", "Narasaraopet", "Tenali"],
    "Tirupati": ["Tirupati City", "Tirumala", "Renigunta"],
    "Nellore": ["Nellore City", "Kavali"],
    "Kurnool": ["Kurnool City", "Nandyal"]
  },
  "Karnataka": {
    "Bengaluru Urban": ["Whitefield", "Koramangala", "HSR Layout", "Marathahalli", "Electronic City", "Indiranagar", "Jayanagar", "BTM Layout", "Hebbal"],
    "Bengaluru Rural": ["Devanahalli", "Hoskote", "Nelamangala"],
    "Mysuru": ["Mysuru City", "Gokulam", "Vijayanagar"],
    "Mangaluru": ["Mangaluru City", "Surathkal", "Kankanady"],
    "Hubli-Dharwad": ["Hubli", "Dharwad"]
  },
  "Tamil Nadu": {
    "Chennai": ["T Nagar", "Adyar", "Anna Nagar", "Velachery", "Porur", "Nungambakkam", "Mylapore", "Guindy"],
    "Coimbatore": ["Coimbatore City", "RS Puram", "Gandhipuram", "Peelamedu"],
    "Madurai": ["Madurai City", "Anna Nagar", "KK Nagar"],
    "Tiruchirappalli": ["Trichy City", "Srirangam", "Thillai Nagar"],
    "Salem": ["Salem City", "Fairlands"]
  },
  "Maharashtra": {
    "Mumbai": ["Andheri", "Bandra", "Powai", "Dadar", "Worli", "Malad", "Goregaon", "Borivali"],
    "Pune": ["Kothrud", "Hinjewadi", "Koregaon Park", "Viman Nagar", "Hadapsar", "Baner"],
    "Nagpur": ["Nagpur City", "Dharampeth", "Civil Lines"],
    "Nashik": ["Nashik City", "College Road"],
    "Aurangabad": ["Aurangabad City", "CIDCO"]
  }
};

const QuickRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsed, setResumeParsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearch2, setLocationSearch2] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showLocationSuggestions2, setShowLocationSuggestions2] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    // Location 1 fields
    state: "",
    district: "",
    city: "",
    // Location 2 fields
    state2: "",
    district2: "",
    city2: "",
    // Category
    category: "",
    currentSalary: "",
    expectedSalary: "",
    dateOfJoining: "",
    experienceLevel: ""
  });

  // Get AI-powered location suggestions based on search
  const getLocationSuggestions = (searchText: string) => {
    if (!searchText.trim()) return [];
    
    const search = searchText.toLowerCase();
    const suggestions: { state: string; district: string; city: string; display: string }[] = [];
    
    Object.entries(locationData).forEach(([state, districts]) => {
      Object.entries(districts).forEach(([district, cities]) => {
        cities.forEach(city => {
          const fullLocation = `${city}, ${district}, ${state}`;
          if (
            city.toLowerCase().includes(search) ||
            district.toLowerCase().includes(search) ||
            state.toLowerCase().includes(search) ||
            fullLocation.toLowerCase().includes(search)
          ) {
            suggestions.push({
              state,
              district,
              city,
              display: fullLocation
            });
          }
        });
      });
    });
    
    return suggestions.slice(0, 8);
  };

  const handleLocationSelect = (suggestion: { state: string; district: string; city: string; display: string }) => {
    setFormData(prev => ({
      ...prev,
      state: suggestion.state,
      district: suggestion.district,
      city: suggestion.city
    }));
    setLocationSearch(suggestion.display);
    setShowLocationSuggestions(false);
  };

  const handleLocationSelect2 = (suggestion: { state: string; district: string; city: string; display: string }) => {
    setFormData(prev => ({
      ...prev,
      state2: suggestion.state,
      district2: suggestion.district,
      city2: suggestion.city
    }));
    setLocationSearch2(suggestion.display);
    setShowLocationSuggestions2(false);
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF, Word document, or image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setResumeFile(file);
    setIsParsingResume(true);
    setResumeParsed(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: 'POST',
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to parse resume: ${response.status}`);
      }

      const parsedData = await response.json();
      console.log("Parsed resume data:", parsedData);

      // Auto-fill form fields from parsed data
      setFormData(prev => ({
        ...prev,
        fullName: parsedData.full_name || prev.fullName,
        email: parsedData.email || prev.email,
        mobile: parsedData.phone || prev.mobile,
        experienceLevel: parsedData.years_of_experience || prev.experienceLevel
      }));

      setResumeParsed(true);
      toast({
        title: "Resume Parsed Successfully",
        description: "Your details have been auto-filled. Please verify and complete the remaining fields.",
      });
    } catch (error: any) {
      console.error("Resume parsing error:", error);
      toast({
        title: "Parsing Failed",
        description: error.message || "Could not parse resume. Please fill in your details manually.",
        variant: "destructive"
      });
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.state || !formData.district || !formData.city) {
      toast({
        title: "Location Required",
        description: "Please select your preferred location.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Category Required",
        description: "Please select a category.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Store registration data (can be extended to save to database when user creates account later)
      const registrationData = {
        segment: "Education",
        category: formData.category,
        preferred_state: formData.state,
        preferred_district: formData.district,
        preferred_state_2: formData.state2 || null,
        preferred_district_2: formData.district2 || null,
        location: `${formData.city}, ${formData.district}, ${formData.state}${formData.city2 ? ` | ${formData.city2}, ${formData.district2}, ${formData.state2}` : ''}`,
        experience_level: formData.experienceLevel,
        current_salary: formData.currentSalary ? parseFloat(formData.currentSalary) : null,
        expected_salary: formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
        available_from: formData.dateOfJoining || null
      };

      // Save to localStorage for later use during full registration
      localStorage.setItem('quickRegistrationData', JSON.stringify(registrationData));

      toast({
        title: "Registration Saved!",
        description: "Your preferences have been saved. Complete your profile to apply for jobs.",
      });

      // Navigate to full signup with pre-filled data
      navigate("/candidate/signup");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const locationSuggestions = getLocationSuggestions(locationSearch);
  const locationSuggestions2 = getLocationSuggestions(locationSearch2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
        
        <div className="relative z-10 container mx-auto px-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-center mb-3">
            <img 
              src={gradiaLogo} 
              alt="Gradia" 
              className="h-14 w-auto object-contain bg-white/10 rounded-lg p-2"
            />
          </div>
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Quick Registration
            </h1>
            <p className="text-sm text-primary-foreground/90">
              Fill in your details to get started with Gradia
            </p>
          </div>
        </div>
      </section>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Registration Form</CardTitle>
            <CardDescription>
              Complete your profile to find the best education job opportunities
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Resume Upload Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Fill with Resume (Optional)
                </h3>
                
                <div 
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/5 ${
                    resumeParsed ? 'border-green-500 bg-green-50/50' : 'border-muted-foreground/25'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleResumeUpload}
                    className="hidden"
                  />
                  
                  {isParsingResume ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">AI is parsing your resume...</p>
                    </div>
                  ) : resumeParsed ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700">Resume Parsed Successfully!</p>
                        <p className="text-sm text-muted-foreground">{resumeFile?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Click to upload a different resume</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Upload your resume to auto-fill details</p>
                        <p className="text-sm text-muted-foreground">PDF, Word, or Image (max 10MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Basic Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience</Label>
                  <Input
                    id="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                    placeholder="e.g., 3 years"
                    className={resumeParsed && formData.experienceLevel ? "border-green-300 bg-green-50/30" : ""}
                  />
                </div>
              </div>

              {/* Preferred Locations - AI Search */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Preferred Locations *
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location 1 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Location 1 *</Label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={locationSearch}
                          onChange={(e) => {
                            setLocationSearch(e.target.value);
                            setShowLocationSuggestions(true);
                          }}
                          onFocus={() => setShowLocationSuggestions(true)}
                          placeholder="Search area..."
                          className="pl-10"
                        />
                      </div>
                      
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                              onClick={() => handleLocationSelect(suggestion)}
                            >
                              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{suggestion.city}</p>
                                <p className="text-xs text-muted-foreground">{suggestion.district}, {suggestion.state}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {formData.state && (
                      <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-xs font-medium text-primary">Selected:</span>
                        <span className="text-xs">{formData.city}, {formData.district}, {formData.state}</span>
                      </div>
                    )}
                  </div>

                  {/* Location 2 */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Location 2 (Optional)</Label>
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={locationSearch2}
                          onChange={(e) => {
                            setLocationSearch2(e.target.value);
                            setShowLocationSuggestions2(true);
                          }}
                          onFocus={() => setShowLocationSuggestions2(true)}
                          placeholder="Search area..."
                          className="pl-10"
                        />
                      </div>
                      
                      {showLocationSuggestions2 && locationSuggestions2.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {locationSuggestions2.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                              onClick={() => handleLocationSelect2(suggestion)}
                            >
                              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                              <div>
                                <p className="font-medium text-sm">{suggestion.city}</p>
                                <p className="text-xs text-muted-foreground">{suggestion.district}, {suggestion.state}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {formData.state2 && (
                      <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="text-xs font-medium text-primary">Selected:</span>
                        <span className="text-xs">{formData.city2}, {formData.district2}, {formData.state2}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Category *
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {["Academic", "Non-Academic"].map((cat) => (
                    <Button
                      key={cat}
                      type="button"
                      variant={formData.category === cat ? "default" : "outline"}
                      className={`h-auto py-4 flex flex-col items-center gap-1 ${formData.category === cat ? "" : "hover:bg-accent/10"}`}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    >
                      <GraduationCap className="h-5 w-5" />
                      <span className="text-sm">{cat}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Salary & Joining */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
                  Salary & Date of Joining
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentSalary">Current Salary (₹)</Label>
                    <Input
                      id="currentSalary"
                      type="number"
                      value={formData.currentSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentSalary: e.target.value }))}
                      placeholder="e.g., 500000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expectedSalary">Expected Salary (₹)</Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      value={formData.expectedSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedSalary: e.target.value }))}
                      placeholder="e.g., 700000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">
                      <Calendar className="inline h-3.5 w-3.5 mr-1" />
                      Date of Joining
                    </Label>
                    <Input
                      id="dateOfJoining"
                      type="date"
                      value={formData.dateOfJoining}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfJoining: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !formData.category || !formData.state}
                >
                  {isSubmitting ? "Registering..." : "Complete Registration"}
                </Button>
                
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link to="/candidate/login" className="text-accent hover:underline font-medium">
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickRegister;
