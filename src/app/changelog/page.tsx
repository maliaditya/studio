import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const entries = [
  {
    date: "2026-03-01",
    title: "Stage 1 Monetization + SEO Setup",
    items: [
      "Support page now includes Supporter ($5), Backer ($15), Champion ($49), and custom amount.",
      "Added monetization metrics tracking and internal summary flow.",
      "Added robots.txt and sitemap.xml routes for Google indexing.",
      "Added structured data and improved page metadata for public routes.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Changelog</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Product updates and release notes for Dock.
      </p>

      <div className="mt-6 space-y-4">
        {entries.map((entry) => (
          <Card key={entry.date}>
            <CardHeader>
              <CardTitle className="text-lg">
                {entry.title} <span className="text-sm text-muted-foreground">({entry.date})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
