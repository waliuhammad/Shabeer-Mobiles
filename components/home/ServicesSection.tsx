import { Wrench, BatteryCharging, Cpu, Sparkles } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { SectionHeading } from "@/components/shared/SectionHeading";

const SERVICES = [
  {
    Icon: Wrench,
    title: "Mobile Repairing",
    description:
      "Screen, charging port, speaker and board-level repairs by experienced technicians.",
  },
  {
    Icon: BatteryCharging,
    title: "Battery Replacement",
    description: "Original and high-quality replacement batteries fitted while you wait.",
  },
  {
    Icon: Cpu,
    title: "Software Solutions",
    description: "Flashing, unlocking, OS updates and data recovery for all major brands.",
  },
  {
    Icon: Sparkles,
    title: "Genuine Accessories",
    description:
      "Chargers, covers, protectors and earbuds - tested before they reach the shelf.",
  },
];

export function ServicesSection() {
  return (
    <Container as="section" id="services" className="scroll-mt-28 py-12 lg:py-16">
      <SectionHeading
        eyebrow="What We Do"
        title="More Than a Mobile Shop"
        description="Shabbir Mobiles is a full service lab - we sell, we service, and we stand behind both."
        align="center"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map(({ Icon, title, description }) => (
          <div
            key={title}
            className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary text-accent">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        ))}
      </div>
    </Container>
  );
}
