import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle2, Loader2, Briefcase, User, ArrowLeft } from "lucide-react";

const BookSlot = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  // Multi-slot booking: single date + 3 preferred timings (for Demo and HR stages)
  const isDemoStage = stageName.toLowerCase().includes("demo");
  const isHrStage = stageName.toLowerCase().includes("hr");
  const isMultiSlotStage = isDemoStage || isHrStage;
  const [preferredSlots, setPreferredSlots] = useState<{ date: string; time: string }[]>([]);
  const [demoDate, setDemoDate] = useState("");
  const [demoTime1, setDemoTime1] = useState("");
  const [demoTime2, setDemoTime2] = useState("");
  const [demoTime3, setDemoTime3] = useState("");
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

  // Generate available dates (today + next 7 days, including all days)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const value = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
      dates.push({ value, label: i === 0 ? `Today - ${label}` : label });
    }
    return dates;
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getNext10MinTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    // Round up to nearest 30-min slot
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    if (roundedMinutes === 0) now.setHours(now.getHours() + 1);
    now.setMinutes(roundedMinutes);
    
    const hour = now.getHours();
    const minute = now.getMinutes().toString().padStart(2, "0");
    
    // Check if within valid range (9 AM - 5:30 PM)
    if (hour < 9 || hour > 17 || (hour === 17 && parseInt(minute) > 0)) {
      return "09:00"; // Default to 9 AM if outside range
    }
    
    return `${hour.toString().padStart(2, "0")}:${minute}`;
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
    // For multi-slot stages (demo/HR), build preferred slots from single date + 3 times
    let demoSlots: { date: string; time: string }[] = [];
    if (isMultiSlotStage) {
      const times = [demoTime1, demoTime2, demoTime3].filter(Boolean);
      const uniqueTimes = [...new Set(times)];
      if (!demoDate || uniqueTimes.length < 3) {
        toast.error("Please select a date and 3 different timings");
        return;
      }
      demoSlots = uniqueTimes.map(t => ({ date: demoDate, time: t }));
      setPreferredSlots(demoSlots);
    } else {
      if (!selectedDate || !selectedTime) {
        toast.error("Please select both date and time");
        return;
      }
    }
    if (!candidateId) {
      toast.error("Invalid booking link - missing candidate information");
      return;
    }

    setIsBooking(true);
    try {
      // Create slot booking record
      const { data: interviewCandidate } = await supabase
        .from("interview_candidates")
        .select("candidate_id")
        .eq("id", candidateId)
        .single();

      // Determine booking type based on stage name
      const isWrittenTestSlotBooking = stageName.toLowerCase().includes("written");
      const isHrSlotBooking = stageName.toLowerCase().includes("hr");

      const bookingType = isDemoStage ? "demo_round" 
        : isHrSlotBooking ? "hr_round" 
        : isWrittenTestSlotBooking ? "written_test" 
        : "technical_assessment";

      if (interviewCandidate?.candidate_id) {
        if (isMultiSlotStage) {
          const { error: insertError } = await supabase.from("slot_bookings").insert({
            candidate_id: interviewCandidate.candidate_id,
            booking_date: demoSlots[0].date,
            booking_time: demoSlots[0].time,
            booking_type: bookingType,
            status: "pending",
            subject: stageName,
            preferred_slots: demoSlots as any,
          });
          if (insertError) {
            console.error("Error inserting slot booking:", insertError);
            toast.error("Failed to save booking. Please try again.");
            setIsBooking(false);
            return;
          }
        } else {
          const { error: insertError } = await supabase.from("slot_bookings").insert({
            candidate_id: interviewCandidate.candidate_id,
            booking_date: selectedDate,
            booking_time: selectedTime,
            booking_type: bookingType,
            status: "confirmed",
            subject: stageName,
          });
          if (insertError) {
            console.error("Error inserting slot booking:", insertError);
            toast.error("Failed to save booking. Please try again.");
            setIsBooking(false);
            return;
          }
        }
      }

      if (isMultiSlotStage) {
        try {
          await supabase.functions.invoke("send-demo-slot-confirmation", {
            body: {
              interviewCandidateId: candidateId,
              preferredSlots: demoSlots,
            },
          });
        } catch (emailErr) {
          console.error("Error sending slot confirmation email:", emailErr);
        }
      } else {
        const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
        // Send interview invitation with the scheduled time
        const { error: inviteError } = await supabase.functions.invoke("send-interview-invitation", {
          body: {
            interviewCandidateId: candidateId,
            stageName,
            scheduledDate: scheduledDateTime,
          },
        });

        if (inviteError) {
          console.error("Error sending invitation:", inviteError);
        }
      }

      // Auto-advance to Written Test and send invitation when Written Test slot is booked
      if (isWrittenTestSlotBooking) {
        try {
          await supabase.functions.invoke("process-interview-stage", {
            body: {
              interviewCandidateId: candidateId,
              action: "advance",
              feedback: "Written Test slot booked by candidate, auto-advancing to Written Test",
            },
          });
        } catch (advanceErr) {
          console.error("Error auto-advancing to Written Test:", advanceErr);
        }
      }

      // For Demo: DON'T auto-advance, employer will select timing and send link
      // Just mark booking as pending for employer review

      // Auto-advance to HR Round and send dual emails
      if (isHrSlotBooking) {
        try {
          await supabase.functions.invoke("process-interview-stage", {
            body: {
              interviewCandidateId: candidateId,
              action: "advance",
              feedback: "Slot booked by candidate, auto-advancing to HR Round",
            },
          });
          await supabase.functions.invoke("send-hr-round-emails", {
            body: { interviewCandidateId: candidateId },
          });
        } catch (advanceErr) {
          console.error("Error auto-advancing to HR Round:", advanceErr);
        }
      }

      setIsBooked(true);
      if (isMultiSlotStage) {
        toast.success("Preferred timings submitted! The employer will confirm your slot.");
      } else {
        toast.success("Slot booked successfully! Check your email for details.");
      }
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
          <div className="p-4 pb-0">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/candidate/dashboard?tab=pipeline")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Interview Pipeline
            </Button>
          </div>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            {isMultiSlotStage ? (
              <>
                <h2 className="text-xl font-bold text-foreground">Preferred Timings Submitted! 🎉</h2>
                <p className="text-muted-foreground">
                  You have submitted <strong>3</strong> preferred timings for <strong>{stageName}</strong>.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {demoDate ? new Date(demoDate).toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""}
                    </span>
                  </div>
                  {preferredSlots.map((slot, i) => (
                    <div key={i} className="flex items-center justify-center gap-2 text-blue-700">
                      <Badge variant="outline" className="text-xs">Option {i + 1}</Badge>
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {getTimeSlots().find((s) => s.value === slot.time)?.label || slot.time}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  📧 The employer will review your preferred timings and confirm one. You'll receive an email once confirmed.
                </p>
              </>
            ) : (
              <>
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
                {stageName.toLowerCase().includes("hr") ? (
                  <p className="text-sm text-muted-foreground">
                    📧 You will receive an HR Round invitation email with instructions shortly. Please check your inbox.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    📧 An interview invitation email with the link has been sent to your registered email address. Please check your inbox.
                  </p>
                )}
              </>
            )}
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
        <div className="p-3 pb-0">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/candidate/dashboard?tab=pipeline")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Interview Pipeline
          </Button>
        </div>
        <CardHeader className="text-center pb-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Book Your {stageName} Slot
          </CardTitle>
          <p className="text-blue-100 text-sm mt-1">{stageName} for {candidateInfo?.jobTitle}</p>
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

          {isDemoStage ? (
            <>
              {/* Demo: Single Date + 3 Preferred Timings */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800 font-medium">
                  📋 Select a date and choose 3 preferred timings. The employer will confirm one and send you the meeting link.
                </p>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  Select Date *
                </label>
                <Select value={demoDate} onValueChange={setDemoDate}>
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

              {/* 3 Time Selections */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-600" />
                  Select 3 Preferred Timings *
                </label>

                {[
                  { label: "Option 1", value: demoTime1, setter: setDemoTime1 },
                  { label: "Option 2", value: demoTime2, setter: setDemoTime2 },
                  { label: "Option 3", value: demoTime3, setter: setDemoTime3 },
                ].map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 shrink-0 text-xs">
                      {slot.label}
                    </Badge>
                    <Select value={slot.value} onValueChange={slot.setter}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={`Choose time ${i + 1}`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {getTimeSlots().map((ts) => (
                          <SelectItem key={ts.value} value={ts.value}>
                            {ts.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {/* Duplicate warning */}
                {demoTime1 && demoTime2 && demoTime3 && new Set([demoTime1, demoTime2, demoTime3]).size < 3 && (
                  <p className="text-xs text-red-500">⚠️ Please choose 3 different timings</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleBookSlot}
                disabled={isBooking || !demoDate || !demoTime1 || !demoTime2 || !demoTime3 || new Set([demoTime1, demoTime2, demoTime3]).size < 3}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-5 w-5 mr-2" />
                    Submit 3 Preferred Timings
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Quick Action Buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-sm font-semibold border-2 border-orange-400 text-orange-700 hover:bg-orange-100 bg-orange-50"
                  onClick={() => {
                    const today = getTodayDate();
                    setSelectedDate(today);
                    const now = new Date();
                    const minutes = now.getMinutes();
                    const roundedMinutes = minutes < 30 ? 30 : 0;
                    const hour = roundedMinutes === 0 ? now.getHours() + 1 : now.getHours();
                    const minute = roundedMinutes.toString().padStart(2, "0");
                    const validHour = hour < 9 ? 9 : hour > 17 ? 9 : hour;
                    setSelectedTime(`${validHour.toString().padStart(2, "0")}:${minute}`);
                  }}
                >
                  🚀 Start Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-sm font-semibold border-2 border-green-400 text-green-700 hover:bg-green-100 bg-green-50"
                  onClick={() => {
                    const nextTime = getNext10MinTime();
                    setSelectedTime(nextTime);
                    if (!selectedDate && getTodayDate()) {
                      setSelectedDate(getTodayDate()!);
                    }
                  }}
                >
                  ⏰ Next 10 mins
                </Button>
              </div>

              {/* Today's Current Time Info */}
              {selectedDate === getTodayDate() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="text-xs text-blue-700">
                    <strong>Current time:</strong>{" "}
                    {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                    {" • "}
                    <strong>Next available slot:</strong>{" "}
                    {getTimeSlots().find((s) => s.value === getNext10MinTime())?.label || getNext10MinTime()}
                  </p>
                </div>
              )}

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

              {/* Info Note - only show for Written Test/Technical stages */}
              {!stageName.toLowerCase().includes("hr") && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Once booked, you'll receive an email with your interview link. 
                    The assessment consists of 10 MCQ questions with 90 seconds per question. 
                    Ensure you have a stable internet connection.
                  </p>
                </div>
              )}

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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookSlot;
