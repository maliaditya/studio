const scenarioRows: Array<{
  scenario: string;
  codes: string;
  notes: string;
}> = [
  {
    scenario: "Installation cancelled by user",
    codes: "1223, 2",
    notes: "User cancelled setup.",
  },
  {
    scenario: "Application already exists",
    codes: "1638",
    notes: "Another version of the app is already installed.",
  },
  {
    scenario: "Installation already in progress",
    codes: "1618",
    notes: "Another installer transaction is active.",
  },
  {
    scenario: "Disk space is full",
    codes: "112",
    notes: "Insufficient disk space on target drive.",
  },
  {
    scenario: "Reboot required",
    codes: "3010, 1641",
    notes: "Install completed but restart is required (or initiated).",
  },
  {
    scenario: "Network failure",
    codes: "12007, 12029, 12030",
    notes: "Network/DNS/connectivity error during install flow.",
  },
  {
    scenario: "Package rejected during installation",
    codes: "1625",
    notes: "Installation blocked by system policy.",
  },
  {
    scenario: "Installation successful",
    codes: "0",
    notes: "Install completed successfully.",
  },
];

const miscFailureRows: Array<{ code: string; meaning: string }> = [
  { code: "1", meaning: "Generic installer failure." },
  { code: "1603", meaning: "Fatal installation error." },
  { code: "1619", meaning: "Installer package could not be opened." },
  { code: "1620", meaning: "Installer package is invalid." },
];

export default function InstallerHandlingPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Installer Handling</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: March 1, 2026</p>

      <div className="mt-6 space-y-6 text-sm leading-6 text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Product</h2>
          <p>Dock desktop installer (EXE, NSIS-based).</p>
          <p>Silent install switch: <code>/S</code></p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Standard Install Scenarios</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-semibold">Scenario</th>
                  <th className="px-3 py-2 font-semibold">EXE Return Code(s)</th>
                  <th className="px-3 py-2 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map((row) => (
                  <tr key={row.scenario} className="border-t">
                    <td className="px-3 py-2">{row.scenario}</td>
                    <td className="px-3 py-2 font-mono">{row.codes}</td>
                    <td className="px-3 py-2">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Miscellaneous Install Failure Scenarios</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {miscFailureRows.map((row) => (
                  <tr key={row.code} className="border-t">
                    <td className="px-3 py-2 font-mono">{row.code}</td>
                    <td className="px-3 py-2">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
