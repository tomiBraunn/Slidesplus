import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  ogImage?: string
  ogType?: string
  canonicalUrl?: string
  noindex?: boolean
}

export default function SEO({
  title = 'Slides+',
  description = 'Build stunning presentations using code, visual editor, or AI assistance. Collaborate in real-time with your team. Create, edit, and present slides effortlessly.',
  keywords = 'presentations, slides, code editor, AI presentation, collaborative editing, online presentations, visual editor, slide maker',
  ogImage = 'https://slidesplus.com/og-image.png',
  ogType = 'website',
  canonicalUrl,
  noindex = false
}: SEOProps) {
  useEffect(() => {
    // Update title
    document.title = title

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name'
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement

      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, name)
        document.head.appendChild(element)
      }

      element.setAttribute('content', content)
    }

    // Primary meta tags
    updateMetaTag('description', description)
    updateMetaTag('keywords', keywords)
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow')
    } else {
      updateMetaTag('robots', 'index, follow')
    }

    // Open Graph tags
    updateMetaTag('og:title', title, true)
    updateMetaTag('og:description', description, true)
    updateMetaTag('og:image', ogImage, true)
    updateMetaTag('og:type', ogType, true)

    // Twitter tags
    updateMetaTag('twitter:title', title, true)
    updateMetaTag('twitter:description', description, true)
    updateMetaTag('twitter:image', ogImage, true)

    // Canonical URL
    if (canonicalUrl) {
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
      }
      canonical.setAttribute('href', canonicalUrl)
    }
  }, [title, description, keywords, ogImage, ogType, canonicalUrl, noindex])

  return null
}
