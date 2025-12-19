import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Users, Eye, IndianRupee, Check, Info } from "lucide-react";
import { toast } from "sonner";

interface Stall {
  id: string;
  name: string;
  size: string;
  type: "premium" | "standard" | "economy";
  status: "available" | "reserved" | "premium";
  price: number;
  footfall: string;
  visibility: number;
  facilities: string[];
}

const stalls: Stall[] = [
  { id: "A1", name: "Stall A1", size: "40 sqm", type: "premium", status: "premium", price: 300000, footfall: "800-1000", visibility: 98, facilities: ["Power backup", "AC", "WiFi", "Storage", "Interview room"] },
  { id: "A2", name: "Stall A2", size: "25 sqm", type: "premium", status: "available", price: 200000, footfall: "600-800", visibility: 92, facilities: ["Power backup", "AC", "WiFi", "Storage"] },
  { id: "A3", name: "Stall A3", size: "25 sqm", type: "premium", status: "reserved", price: 200000, footfall: "600-800", visibility: 90, facilities: ["Power backup", "AC", "WiFi", "Storage"] },
  { id: "B1", name: "Stall B1", size: "15 sqm", type: "standard", status: "available", price: 120000, footfall: "400-600", visibility: 78, facilities: ["Power", "WiFi", "Table & chairs"] },
  { id: "B2", name: "Stall B2", size: "15 sqm", type: "standard", status: "available", price: 120000, footfall: "400-600", visibility: 75, facilities: ["Power", "WiFi", "Table & chairs"] },
  { id: "B3", name: "Stall B3", size: "15 sqm", type: "standard", status: "reserved", price: 120000, footfall: "400-600", visibility: 72, facilities: ["Power", "WiFi", "Table & chairs"] },
  { id: "B4", name: "Stall B4", size: "15 sqm", type: "standard", status: "available", price: 120000, footfall: "400-600", visibility: 70, facilities: ["Power", "WiFi", "Table & chairs"] },
  { id: "C1", name: "Stall C1", size: "10 sqm", type: "economy", status: "available", price: 75000, footfall: "250-400", visibility: 60, facilities: ["Power", "WiFi"] },
  { id: "C2", name: "Stall C2", size: "10 sqm", type: "economy", status: "available", price: 75000, footfall: "250-400", visibility: 58, facilities: ["Power", "WiFi"] },
  { id: "C3", name: "Stall C3", size: "10 sqm", type: "economy", status: "reserved", price: 75000, footfall: "250-400", visibility: 55, facilities: ["Power", "WiFi"] },
  { id: "C4", name: "Stall C4", size: "10 sqm", type: "economy", status: "available", price: 75000, footfall: "250-400", visibility: 52, facilities: ["Power", "WiFi"] },
  { id: "C5", name: "Stall C5", size: "10 sqm", type: "economy", status: "available", price: 75000, footfall: "250-400", visibility: 50, facilities: ["Power", "WiFi"] },
];

const events = [
  { id: "1", name: "Bangalore Tech Job Mela 2025", city: "Bangalore", date: "Jan 15-16, 2025" },
  { id: "2", name: "Hyderabad IT Campus Drive", city: "Hyderabad", date: "Feb 8-9, 2025" },
  { id: "3", name: "Chennai Software Expo", city: "Chennai", date: "Mar 1-2, 2025" },
  { id: "4", name: "Pune Startup Hiring Fest", city: "Pune", date: "Mar 22-23, 2025" },
];

export function StallReservation() {
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [showModal, setShowModal] = useState(false);

  const getStallColor = (stall: Stall) => {
    if (stall.status === "reserved") return "bg-slate-300 cursor-not-allowed";
    if (stall.type === "premium") return "bg-gradient-to-br from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 cursor-pointer";
    if (stall.type === "standard") return "bg-gradient-to-br from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 cursor-pointer";
    return "bg-gradient-to-br from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 cursor-pointer";
  };

  const handleStallClick = (stall: Stall) => {
    if (stall.status === "reserved") {
      toast.error("This stall is already reserved");
      return;
    }
    setSelectedStall(stall);
    setShowModal(true);
  };

  const handleReserve = () => {
    if (!selectedEvent) {
      toast.error("Please select an event first");
      return;
    }
    toast.success(`Stall ${selectedStall?.name} reserved successfully!`);
    setShowModal(false);
  };

  return (
    <section id="stalls" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            Live Availability
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your Stall
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Interactive floor map with real-time availability. Select your preferred location.
          </p>
        </div>

        {/* Event Selector */}
        <div className="max-w-md mx-auto mb-12">
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="h-14 text-base">
              <SelectValue placeholder="Select Event & City" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{event.name}</span>
                    <span className="text-xs text-muted-foreground">{event.city} • {event.date}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-400 to-yellow-500" />
            <span className="text-sm text-muted-foreground">Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-teal-400 to-cyan-500" />
            <span className="text-sm text-muted-foreground">Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gradient-to-br from-slate-400 to-slate-500" />
            <span className="text-sm text-muted-foreground">Economy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-300" />
            <span className="text-sm text-muted-foreground">Reserved</span>
          </div>
        </div>

        {/* Floor Map */}
        <Card className="max-w-5xl mx-auto bg-white shadow-xl">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-5 w-5" />
              Event Floor Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Entrance */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-t-lg">
                <span className="text-sm font-medium">MAIN ENTRANCE</span>
              </div>
            </div>

            {/* Stage Area */}
            <div className="mb-8 text-center">
              <div className="inline-block px-24 py-6 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg">
                <span className="font-semibold">MAIN STAGE</span>
              </div>
            </div>

            {/* Stall Grid */}
            <div className="space-y-8">
              {/* Premium Row A */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">PREMIUM ZONE - ROW A</div>
                <div className="grid grid-cols-3 gap-4">
                  {stalls.filter(s => s.id.startsWith("A")).map((stall) => (
                    <div
                      key={stall.id}
                      onClick={() => handleStallClick(stall)}
                      className={`${getStallColor(stall)} p-4 rounded-lg text-white text-center transition-all duration-200 transform hover:scale-105`}
                    >
                      <div className="font-bold text-lg">{stall.id}</div>
                      <div className="text-xs opacity-90">{stall.size}</div>
                      {stall.status === "reserved" && (
                        <Badge variant="secondary" className="mt-1 text-xs">Reserved</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard Row B */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">STANDARD ZONE - ROW B</div>
                <div className="grid grid-cols-4 gap-3">
                  {stalls.filter(s => s.id.startsWith("B")).map((stall) => (
                    <div
                      key={stall.id}
                      onClick={() => handleStallClick(stall)}
                      className={`${getStallColor(stall)} p-3 rounded-lg text-white text-center transition-all duration-200 transform hover:scale-105`}
                    >
                      <div className="font-bold">{stall.id}</div>
                      <div className="text-xs opacity-90">{stall.size}</div>
                      {stall.status === "reserved" && (
                        <Badge variant="secondary" className="mt-1 text-xs">Reserved</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Economy Row C */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">ECONOMY ZONE - ROW C</div>
                <div className="grid grid-cols-5 gap-2">
                  {stalls.filter(s => s.id.startsWith("C")).map((stall) => (
                    <div
                      key={stall.id}
                      onClick={() => handleStallClick(stall)}
                      className={`${getStallColor(stall)} p-2 rounded-lg text-white text-center transition-all duration-200 transform hover:scale-105`}
                    >
                      <div className="font-bold text-sm">{stall.id}</div>
                      <div className="text-xs opacity-90">{stall.size}</div>
                      {stall.status === "reserved" && (
                        <Badge variant="secondary" className="mt-1 text-xs">Reserved</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Food Court */}
            <div className="mt-8 text-center">
              <div className="inline-block px-12 py-3 bg-slate-200 text-slate-600 rounded-lg">
                <span className="text-sm font-medium">FOOD COURT & NETWORKING AREA</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stall Detail Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-lg">
            {selectedStall && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${getStallColor(selectedStall)} flex items-center justify-center text-white font-bold`}>
                      {selectedStall.id}
                    </div>
                    <div>
                      <div>{selectedStall.name}</div>
                      <div className="text-sm font-normal text-muted-foreground capitalize">{selectedStall.type} • {selectedStall.size}</div>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Users className="h-5 w-5 mx-auto text-teal-500 mb-1" />
                      <div className="text-sm font-semibold">{selectedStall.footfall}</div>
                      <div className="text-xs text-muted-foreground">Est. Footfall</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <Eye className="h-5 w-5 mx-auto text-teal-500 mb-1" />
                      <div className="text-sm font-semibold">{selectedStall.visibility}%</div>
                      <div className="text-xs text-muted-foreground">Visibility Score</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <IndianRupee className="h-5 w-5 mx-auto text-teal-500 mb-1" />
                      <div className="text-sm font-semibold">₹{selectedStall.price.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Price</div>
                    </div>
                  </div>

                  {/* Facilities */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Facilities Included
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStall.facilities.map((facility, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">
                          <Check className="h-3 w-3 mr-1" />
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                      onClick={handleReserve}
                    >
                      Reserve Now
                    </Button>
                    <Button variant="outline" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
