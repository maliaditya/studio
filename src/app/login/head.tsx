export default function Head() {
  const site = "https://vdock.vercel.app";
  const url = `${site}/login`;
  const title = "Login | Dock";
  const description = "Sign in to Dock to access your dashboard, planning, and execution workflows.";

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
