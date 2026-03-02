
# Add Google Tag Manager to index.html

## Scope
Only `index.html` is modified. No other files touched.

## Current State
The file has no existing GA4 script (the lines mentioned for removal are not present), so only the GTM addition is needed.

## Changes

### 1. Add GTM script as the first thing inside `<head>` (after `<head>` tag, before `<meta charset>`)

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-57S8DH38');</script>
<!-- End Google Tag Manager -->
```

### 2. Add GTM noscript as the first thing inside `<body>` (after `<body>` tag, before `<div id="root">`)

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-57S8DH38"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

No other changes. No component files touched.
