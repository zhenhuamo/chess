export default function Head() {
  const title = 'Position Explorer — Free Chess Analysis Board';
  const description = 'Free data‑driven chess analysis: top moves, win rates, mini opening tree, model games, and practice queue. A fast companion to engine analysis.';
  const keywords = [
    'chess analysis','lichess analysis','chess analysis free','chess analysis board','free chess analysis','lichess analysis board','chess.com analysis','chess game analysis','chess board analysis','chess engine analysis','chess com analysis','free analysis chess','chess free analysis','analysis chess'
  ].join(', ');
  const url = '/explore';
  const image = '/og/explore.png';

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Position Explorer",
            "description": "Free data-driven chess analysis tool with opening statistics, model games, and practice features",
            "url": url,
            "applicationCategory": "GameApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Chess position analysis",
              "Opening statistics and win rates",
              "Model game database",
              "Practice queue system",
              "FEN position support"
            ]
          })
        }}
      />
    </>
  );
}

