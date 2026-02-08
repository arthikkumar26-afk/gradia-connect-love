import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle2, Loader2, Briefcase, User } from "lucide-react";

const BookSlot = () => {
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("candidateId");
  const stageId = searchParams.get("stageId");
  const stageName = searchParams.get("stageName") || "Technical Assessment";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [candidateInfo, setCandidateInfo] = useState<{
    name: string;
    email: string;
    jobTitle: string;
    companyName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!candidateId) {
        setError("Invalid booking link. Missing candidate information.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("interview_candidates")
          .select(`
            *,
            candidate:profiles(full_name, email),
            job:jobs(job_title, employer:profiles!jobs_employer_id_fkey(company_name))
          `)
          .eq("id", candidateId)
          .single();

        if (fetchError || !data) {
          setError("Could not find your interview details. Please contact support.");
          setLoading(false);
          return;
        }

        setCandidateInfo({
          name: (data.candidate as any)?.full_name || "Candidate",
          email: (data.candidate as any)?.email || "",
          jobTitle: (data.job as any)?.job_title || "Position",
          companyName: (data.job as any)?.employer?.company_name || "Company",
        });
      } catch (err) {
        setError("Something went wrong. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [candidateId]);

  // Generate available dates (next 7 days, excluding Sundays)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();
    let count = 0;
    let daysChecked = 0;
    
    while (count < 7 && daysChecked < 14) {
      const date = new Date(today);
      date.setDate(today.getDate() + daysChecked + 1);
      daysChecked++;
      
      // Skip Sundays
      if (date.getDay() === 0) continue;
      
      const value = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      dates.push({ value, label });
      count++;
    }
    return dates;
  };

  // Generate time slots (9 AM to 6 PM, 30-min intervals)
  const getTimeSlots = () => {
    const slots: { value: string; label: string }[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (const minute of ["00", "30"]) {
        if (hour === 17 && minute === "30") continue;
        const time = `${hour.toString().padStart(2, "0")}:${minute}`;
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? "AM" : "PM";
        slots.push({
          value: time,
          label: `${displayHour}:${minute} ${ampm}`,
        });
      }
    }
    return slots;
  };

  const handleBookSlot = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select both date and time");
      return;
    }
    if (!candidateId || !stageId) {
      toast.error("Invalid booking link");
      return;
    }

    setIsBooking(true);
    try {
      const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      // Create slot booking record
      const { data: interviewCandidate } = await supabase
        .from("interview_candidates")
        .select("candidate_id")
        .eq("id", candidateId)
        .single();

      if (interviewCandidate?.candidate_id) {
        await supabase.from("slot_bookings").insert({
          candidate_id: interviewCandidate.candidate_id,
          booking_date: selectedDate,
          booking_time: selectedTime,
          booking_type: "technical_assessment",
          status: "confirmed",
          subject: stageName,
        });
      }

      // Send interview invitation with the scheduled time
      const { error: inviteError } = await supabase.functions.invoke("send-interview-invitation", {
        body: {
          interviewCandidateId: candidateId,
          stageName,
          scheduledDate: scheduledDateTime,
        },
      });

      if (inviteError) throw inviteError;

      setIsBooked(true);
      toast.success("Slot booked successfully! Check your email for the interview link.");
    } catch (err) {
      console.error("Error booking slot:", err);
      toast.error("Failed to book slot. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Slot Booked Successfully! 🎉</h2>
            <p className="text-muted-foreground">
              Your <strong>{stageName}</strong> has been scheduled for:
            </p>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">
                  {new Date(selectedDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {getTimeSlots().find((s) => s.value === selectedTime)?.label || selectedTime} IST
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              📧 An interview invitation email with the link has been sent to your registered email address. Please check your inbox.
            </p>
            <div className="pt-2">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {candidateInfo?.jobTitle} at {candidateInfo?.companyName}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-xl">
        <CardHeader className="text-center pb-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Your Interview Slot
          </CardTitle>
          <p className="text-blue-100 text-sm mt-1">{stageName} Round</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Candidate Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{candidateInfo?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {candidateInfo?.jobTitle} at {candidateInfo?.companyName}
              </span>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Select Date *
            </label>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a date" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableDates().map((date) => (
                  <SelectItem key={date.value} value={date.value}>
                    {date.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Select Time *
            </label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {getTimeSlots().map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Once booked, you'll receive an email with your interview link. 
              The assessment consists of 10 MCQ questions with 90 seconds per question. 
              Ensure you have a stable internet connection.
            </p>
          </div>

          {/* Book Button */}
          <Button
            onClick={handleBookSlot}
            disabled={isBooking || !selectedDate || !selectedTime}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
          >
            {isBooking ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                Confirm Booking
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookSlot;
