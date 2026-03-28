import { NextResponse } from "next/server";
import { readDesktopAccessState, hasDesktopDownloadAccess, resolveDesktopAccessUser } from '@/lib/desktopAccessServer';
import { readConfiguredDesktopDownloadUrl } from '@/lib/appConfigServer';

export const dynamic = "force-dynamic";

const OWNER = "maliaditya";
const REPO = "studio";

type GitHubAsset = {
  name?: string;
  browser_download_url?: string;
};

type GitHubRelease = {
  tag_name?: string;
  assets?: GitHubAsset[];
};

export async function GET(request: Request) {
  const sessionUser = resolveDesktopAccessUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }

  const access = await readDesktopAccessState(request, sessionUser);
  if (!hasDesktopDownloadAccess(access)) {
    return NextResponse.json(
      { error: 'Desktop access is locked for this account. Complete payment first.' },
      { status: 402 }
    );
  }

  try {
    const configuredUrl = await readConfiguredDesktopDownloadUrl();
    if (configuredUrl) {
      return NextResponse.json({
        url: configuredUrl,
        assetName: null,
        tag: null,
        source: 'config',
      });
    }

    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch latest release" }, { status: res.status });
    }

    const data = (await res.json()) as GitHubRelease;
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const exeAssets = assets.filter((a) => typeof a.name === "string" && a.name.toLowerCase().endsWith(".exe"));
    const preferred =
      exeAssets.find((a) => a.name?.toLowerCase().includes("setup")) ||
      exeAssets.find((a) => a.name?.toLowerCase().includes("studio")) ||
      exeAssets[0];

    if (!preferred?.browser_download_url) {
      return NextResponse.json({ error: "No Windows executable found in latest release" }, { status: 404 });
    }

    return NextResponse.json({
      url: preferred.browser_download_url,
      assetName: preferred.name || null,
      tag: data.tag_name || null,
      source: 'github-release',
    });
  } catch (error) {
    console.error("GET /api/latest-windows-release error:", error);
    return NextResponse.json({ error: "Unexpected error while fetching latest release" }, { status: 500 });
  }
}
