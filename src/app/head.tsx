export default function Head() {
  const site = "https://dockflow.life";
  const title = "Dock Platform | Dock your thoughts. Let action flow from clarity.";
  const description =
    "Dock connects your botherings, tasks, schedules, routines, learning plans, resources, and AI review loop into one system so daily action compounds.";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={`${site}/`} />
      <meta name="application-name" content="Dock Platform" />
      <meta name="apple-mobile-web-app-title" content="Dock Platform" />
      <meta name="theme-color" content="#0b1220" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/favicon.ico" />
      <link rel="manifest" href="/site.webmanifest" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Dock" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${site}/`} />
      <meta property="og:image" content={`${site}/favicon.ico`} />
      <meta property="og:image:alt" content="Dock Platform icon" />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${site}/favicon.ico`} />
      <meta name="twitter:image:alt" content="Dock Platform icon" />
    </>
  );
}
