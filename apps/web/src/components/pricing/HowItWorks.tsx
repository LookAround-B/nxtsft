type Step = { step: string; title: string; body: string };

function getSteps(forSeeker: boolean): Step[] {
  if (forSeeker) {
    return [
      {
        step: "01",
        title: "Choose a plan",
        body: "Pick a plan based on how many properties you want to enquire about. Credits are stored in your wallet.",
      },
      {
        step: "02",
        title: "Unlock a contact",
        body: 'On any property page, tap "Unlock Contact". One credit is deducted and the owner\'s phone and address are revealed instantly.',
      },
      {
        step: "03",
        title: "Call directly",
        body: "Call or WhatsApp the owner directly — zero commission, no middlemen. Mark the deal as closed in your dashboard when done.",
      },
    ];
  }
  return [
    {
      step: "01",
      title: "List your property",
      body: "Create a detailed listing with photos, amenities and pricing. Our team verifies and publishes within 24 hours.",
    },
    {
      step: "02",
      title: "Receive verified leads",
      body: "Users or buyers unlock your contact using their credits. You receive their verified details instantly via WhatsApp.",
    },
    {
      step: "03",
      title: "Close the deal",
      body: "Talk directly to qualified, verified parties. No commission, no commissions — just a one-time listing fee.",
    },
  ];
}

export function HowItWorks({ forSeeker }: { forSeeker: boolean }) {
  const steps = getSteps(forSeeker);

  return (
    <section className="bg-secondary/50 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center font-display text-2xl font-black text-navy sm:text-3xl">
          How it works
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl border border-border bg-white p-6">
              <div className="font-mono text-xs font-bold text-accent">{step}</div>
              <h3 className="mt-2 font-display text-base font-bold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
