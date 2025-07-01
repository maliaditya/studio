
"use client";

import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ArrowRight, DraftingCompass, Copy, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

function OfferSystemPageContent() {
  const { offerizationPlans } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const offersContainerRef = useRef<HTMLDivElement>(null);

  const allOffers = useMemo(() => {
    return Object.entries(offerizationPlans || {})
      .flatMap(([topic, plan]) => 
        (plan.offers || []).map(offer => ({ ...offer, topic }))
      );
  }, [offerizationPlans]);

  const renderTextAsList = (text: string) => {
    if (!text || text.trim() === '') {
      return <p className="text-sm text-muted-foreground">-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-muted-foreground">{text}</p>;
  };
  
  const handleCopyToClipboard = (offer: any) => {
    const formatForClipboard = (text: string) => {
      if (!text || text.trim() === '') return '  - Not specified';
      return text.split('\n').filter(line => line.trim()).map(item => `  - ${item.trim()}`).join('\n');
    };

    const textToCopy = `
Offer: ${offer.name}
Topic: ${offer.topic}

Outcome / Promise:
${offer.outcome || '-'}

Audience:
${offer.audience || '-'}

Core Deliverables:
${formatForClipboard(offer.deliverables)}

Value Stack:
${formatForClipboard(offer.valueStack)}

Timeline: ${offer.timeline || '-'}
Price: ${offer.price || '-'}
Format / Delivery: ${offer.format || '-'}
    `.trim().replace(/^\s+/gm, '');

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({
        title: "Copied to Clipboard!",
        description: `The details for "${offer.name}" have been copied.`,
      });
    }, (err) => {
      toast({
        title: "Copy Failed",
        description: "Could not copy text to clipboard.",
        variant: "destructive",
      });
      console.error('Could not copy text: ', err);
    });
  };

  const handleDownloadHtml = () => {
    if (!offersContainerRef.current) {
        toast({
            title: "Download Failed",
            description: "Could not find the content to download.",
            variant: "destructive",
        });
        return;
    }

    const inlineStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      body { 
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
        background-color: #f8f9fa; 
        color: #212529; 
        padding: 2rem; 
        line-height: 1.6;
      }
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
      }
      .grid { 
        display: grid; 
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); 
        gap: 1.75rem; 
      }
      .card { 
        background-color: #ffffff; 
        border: 1px solid #dee2e6; 
        border-radius: 0.75rem; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07);
        display: flex; 
        flex-direction: column; 
        overflow: hidden; 
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }
      .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      }
      .card-header { 
        padding: 1.25rem 1.5rem; 
        border-bottom: 1px solid #e9ecef; 
      }
      .card-title { 
        font-size: 1.25rem; 
        line-height: 1.2; 
        font-weight: 600; 
        display: flex; 
        align-items: center; 
        gap: 0.75rem; 
        color: #0d1b2a;
      }
      .card-description { 
        color: #6c757d; 
        font-size: 0.875rem; 
        margin-top: 0.25rem; 
      }
      .card-content { 
        padding: 1.5rem; 
        flex-grow: 1; 
      }
      .card-footer { 
        padding: 1.25rem 1.5rem; 
        border-top: 1px solid #e9ecef; 
        background-color: #f8f9fa; 
      }
      h4 { 
        font-weight: 600; 
        font-size: 0.9rem; 
        margin-bottom: 0.5rem; 
        color: #495057;
      }
      p, ul { 
        color: #495057; 
        font-size: 0.875rem; 
        margin: 0; 
      }
      ul { 
        list-style-position: inside; 
        padding-left: 0;
        list-style-type: '— ';
      }
      li { 
        margin-bottom: 0.3rem; 
        padding-left: 0.5rem;
      }
      .grid-cols-2 { 
        display: grid; 
        grid-template-columns: repeat(2, minmax(0, 1fr)); 
        gap: 1.5rem; 
        margin-top: 1rem; 
      }
      svg { 
        display: inline-block; 
        width: 1.25em; 
        height: 1.25em; 
        vertical-align: middle;
      }
    `;

    // Clone the node to avoid modifying the live DOM
    const containerClone = offersContainerRef.current.cloneNode(true) as HTMLElement;
    
    // Remove all buttons from the cloned element
    containerClone.querySelectorAll('button').forEach(btn => btn.remove());
    
    // Get the HTML of the cleaned content
    const pageHtml = containerClone.innerHTML;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LifeOS - Defined Offers</title>
        <style>
          ${inlineStyles}
        </style>
      </head>
      <body>
        <div class="container">
          <header style="text-align: center; margin-bottom: 2rem;">
            <h1 style="font-size: 2.25rem; font-weight: 700;">Defined Service Offers</h1>
            <p style="font-size: 1.125rem; color: #6b7280; margin-top: 0.5rem;">A complete overview of all your tangible service offerings.</p>
          </header>
          <div class="grid">
            ${pageHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifeos-offers.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your offers page is being downloaded as an HTML file."
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <div className="flex justify-center items-center gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-primary">
                Defined Service Offers
            </h1>
            <Button variant="outline" size="icon" onClick={handleDownloadHtml}>
                <Download className="h-5 w-5" />
                <span className="sr-only">Download as HTML</span>
            </Button>
        </div>
        <p className="mt-4 text-lg text-muted-foreground">
          A complete overview of all your tangible service offerings.
        </p>
      </div>

      {allOffers.length > 0 ? (
        <div ref={offersContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allOffers.map(offer => (
            <Card key={offer.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {offer.name}
                </CardTitle>
                <CardDescription>From topic: <span className="font-medium text-foreground">{offer.topic}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Outcome</h4>
                  {renderTextAsList(offer.outcome)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Audience</h4>
                  {renderTextAsList(offer.audience)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Core Deliverables</h4>
                  {renderTextAsList(offer.deliverables)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <h4 className="font-semibold text-sm mb-1">Timeline</h4>
                      <p className="text-sm text-muted-foreground">{offer.timeline || '-'}</p>
                    </div>
                     <div>
                      <h4 className="font-semibold text-sm mb-1">Price</h4>
                      <p className="text-sm font-bold text-foreground">{offer.price || '-'}</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 p-4">
                <Button variant="outline" className="w-full" onClick={() => handleCopyToClipboard(offer)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy to Clipboard
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/offerization')}>
                    Edit in Offerization <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
          <DraftingCompass className="h-16 w-16 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Offers Defined Yet</h3>
          <p className="mt-2 mb-4 max-w-md">
            Go to the Offerization page to turn your services into concrete, well-defined offers that you can present to clients.
          </p>
          <Button onClick={() => router.push('/offerization')}>
            Create Your First Offer <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OfferSystemPage() {
  return ( <AuthGuard> <OfferSystemPageContent /> </AuthGuard> );
}
    
