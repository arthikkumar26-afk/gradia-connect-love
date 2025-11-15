import { Card } from "@/components/ui/card";

export default function FeaturedClients() {
  const clients = [
    { name: "Alphacode Solutions", desc: "Leading fintech automation company", color: "bg-blue-500" },
    { name: "RapidNet Technologies", desc: "Cloud infrastructure specialists", color: "bg-purple-500" },
    { name: "SoftEdge Systems", desc: "Enterprise software development", color: "bg-green-500" },
    { name: "CloudWorks India", desc: "Multi-cloud management platform", color: "bg-orange-500" },
    { name: "HexaDigital", desc: "Digital transformation consultancy", color: "bg-pink-500" },
    { name: "FusionSphere", desc: "IoT and embedded systems", color: "bg-indigo-500" },
    { name: "ProtoApps", desc: "Mobile application development", color: "bg-red-500" },
    { name: "Nexen Labs", desc: "AI and machine learning solutions", color: "bg-teal-500" },
    { name: "StratosByte", desc: "Cybersecurity and compliance", color: "bg-yellow-500" }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Featured Clients</h1>
          <p className="text-xl text-muted-foreground">
            Trusted by leading companies across industries
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {clients.map((client) => (
            <Card key={client.name} className="p-8 hover:shadow-lg transition-shadow">
              <div className={`w-20 h-20 rounded-lg ${client.color} flex items-center justify-center mb-4`}>
                <span className="text-3xl font-bold text-white">
                  {client.name.split(' ').map(w => w[0]).join('')}
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{client.name}</h3>
              <p className="text-muted-foreground">{client.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
