import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";

export default function BrandingGuidelines() {
  const colors = [
    { name: "Primary Blue", hex: "#1C3F66", rgb: "28, 63, 102" },
    { name: "Accent Teal", hex: "#27A6B7", rgb: "39, 166, 183" },
    { name: "Dark Gray", hex: "#2C2C2C", rgb: "44, 44, 44" },
    { name: "Light Gray", hex: "#F5F5F5", rgb: "245, 245, 245" }
  ];

  const downloads = [
    { name: "Gradia Logo Pack.zip", size: "2.4 MB", type: "ZIP" },
    { name: "Brand Book.pdf", size: "5.1 MB", type: "PDF" },
    { name: "Color Palette.ase", size: "12 KB", type: "ASE" },
    { name: "Typography Guide.pdf", size: "1.8 MB", type: "PDF" }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Branding Guidelines</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to represent our brand correctly
          </p>
        </div>

        {/* Colors */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Primary Colors</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {colors.map((color) => (
              <Card key={color.hex} className="p-6">
                <div 
                  className="h-32 rounded-lg mb-4"
                  style={{ backgroundColor: color.hex }}
                />
                <h3 className="font-semibold mb-2">{color.name}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>HEX: {color.hex}</div>
                  <div>RGB: {color.rgb}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Typography</h2>
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Font Family</h3>
                <p className="text-muted-foreground">Primary: Inter</p>
                <p className="text-muted-foreground">Fallback: Arial, sans-serif</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Base Size</h3>
                <p className="text-muted-foreground">16px / 1rem</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Type Scale</h3>
                <div className="space-y-3">
                  <div className="text-4xl font-bold">Heading 1 - 36px</div>
                  <div className="text-3xl font-bold">Heading 2 - 30px</div>
                  <div className="text-2xl font-bold">Heading 3 - 24px</div>
                  <div className="text-xl font-semibold">Heading 4 - 20px</div>
                  <div className="text-base">Body Text - 16px</div>
                  <div className="text-sm">Small Text - 14px</div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Logo Usage */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Logo Usage Rules</h2>
          <Card className="p-8">
            <div className="space-y-4 text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <strong className="text-foreground">Clear Space Required:</strong> Maintain minimum clear space equal to the height of the "Q" on all sides
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <strong className="text-foreground">No Distortion:</strong> Never stretch, rotate, or skew the logo
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <strong className="text-foreground">Color Variants:</strong> Use white logo on dark backgrounds, blue logo on light backgrounds
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <strong className="text-foreground">Minimum Size:</strong> Never display logo smaller than 40px in height
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Downloads */}
        <section>
          <h2 className="text-3xl font-bold mb-8">Download Brand Assets</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {downloads.map((file) => (
              <Card key={file.name} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{file.name}</h3>
                    <p className="text-sm text-muted-foreground">{file.type} • {file.size}</p>
                  </div>
                  <Button size="icon" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
