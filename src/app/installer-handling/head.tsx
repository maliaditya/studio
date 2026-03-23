export default function Head() {
  const site = "https://dockflow.life";
  const url = `${site}/installer-handling`;
  const title = "Installer Handling | Dock";
  const description = "Installer return code documentation for Dock desktop EXE submission.";

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
