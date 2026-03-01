export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 1, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <p>
            Dock is a local-first productivity app. Your app data stays on your device by default, and you control
            whether cloud sync features are used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Data We Collect</h2>
          <p>Depending on features used, this may include:</p>
          <ul className="list-disc pl-5">
            <li>Account identifiers (such as username)</li>
            <li>Technical logs for reliability and troubleshooting</li>
            <li>Donation/support interaction events for aggregate metrics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How We Use Data</h2>
          <ul className="list-disc pl-5">
            <li>To provide and maintain app functionality</li>
            <li>To sync and restore data when enabled</li>
            <li>To improve product quality and performance</li>
            <li>To measure anonymous/aggregate monetization funnel metrics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Storage and Sharing</h2>
          <p>
            Dock may store data locally on your device and, when enabled, in configured cloud services. We do not
            sell personal data. Third-party services (for example hosting, authentication, payments) process data
            according to their own policies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Your Choices</h2>
          <ul className="list-disc pl-5">
            <li>You can export or delete your local data from within the app where supported.</li>
            <li>You can choose whether to use cloud sync features.</li>
            <li>You can contact us for privacy-related requests.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <p>
            For support or privacy requests, contact:{" "}
            <a href="mailto:adityamali33@gmail.com" className="text-primary underline underline-offset-4">
              adityamali33@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
