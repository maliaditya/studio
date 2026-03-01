export default function Head() {
  const site = "https://vdock.vercel.app";
  const url = `${site}/privacy`;
  const title = "Privacy Policy | Dock";
  const description = "Privacy policy for Dock web and desktop app.";

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={`${site}/favicon.ico`} />
    </>
  );
}
