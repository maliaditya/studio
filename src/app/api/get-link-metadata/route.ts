
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required and must be a string.' }, { status: 400 });
    }

    let fullUrl = url;
    if (!fullUrl.startsWith('http')) {
      fullUrl = `https://${url}`;
    }

    const isYouTube = /(youtube\.com|youtu\.be)/.test(fullUrl);

    if (isYouTube) {
        const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(fullUrl)}`;
        const noembedResponse = await fetch(noembedUrl);
        if (!noembedResponse.ok) {
            throw new Error(`Failed to fetch from noembed. Status: ${noembedResponse.status}`);
        }
        const noembedData = await noembedResponse.json();

        if (noembedData.error) {
          // If noembed fails, fall back to the original method.
          console.warn(`noembed failed for ${fullUrl}: ${noembedData.error}. Falling back to HTML scraping.`);
        } else {
          return NextResponse.json({
            title: noembedData.title || 'YouTube Video',
            description: `By ${noembedData.author_name || 'Unknown Author'}`.trim(),
          });
        }
    }

    // Fallback for other sites or if noembed fails for a YouTube link
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL. Status: ${response.status}`);
    }

    const html = await response.text();

    // Prioritize Open Graph (og) tags as they are often better for previews
    const ogTitleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["'](.*?)["']/i);
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = (ogTitleMatch && ogTitleMatch[1]) ? ogTitleMatch[1] : (titleMatch && titleMatch[1]) ? titleMatch[1] : '';

    const ogDescriptionMatch = html.match(/<meta\s+(?:property|name)=["']og:description["']\s+content=["'](.*?)["']/i);
    const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const description = (ogDescriptionMatch && ogDescriptionMatch[1]) ? ogDescriptionMatch[1] : (descriptionMatch && descriptionMatch[1]) ? descriptionMatch[1] : '';

    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
    });

  } catch (error) {
    console.error("Metadata fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to fetch metadata: ${errorMessage}` }, { status: 500 });
  }
}
