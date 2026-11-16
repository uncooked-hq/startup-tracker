'use client'

// Throwaway preview route for the file at /TESTHTML.txt — not linked from
// anywhere, won't ship to prod unless deliberately referenced.
import { AtomsAmbitionLandingPageWithImages } from './_component'

export default function PreviewPage() {
  return <AtomsAmbitionLandingPageWithImages />
}
