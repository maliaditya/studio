export default function Head() {
  const site = "https://vdock.vercel.app";
  const title = "Dock | Personal Execution System";
  const description =
    "Dock is a personal execution system for planning, routines, deep work, resources, and weekly review.";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={`${site}/`} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Dock" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${site}/`} />
      <meta property="og:image" content={`${site}/favicon.ico`} />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${site}/favicon.ico`} />
    </>
  );
}
