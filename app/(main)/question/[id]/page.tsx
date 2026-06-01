import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import QuestionPageClient from './QuestionPageClient'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('questions')
    .select('title, description, image_url')
    .eq('id', id)
    .single()

  if (!data) return { title: 'ภาวนา' }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pawana.app'}/question/${id}`

  return {
    title: data.title,
    description: data.description ?? 'ร่วมทายผลและลุ้นไปด้วยกันบน ภาวนา',
    openGraph: {
      title: data.title,
      description: data.description ?? 'ร่วมทายผลและลุ้นไปด้วยกันบน ภาวนา',
      url,
      siteName: 'ภาวนา',
      ...(data.image_url ? { images: [{ url: data.image_url }] } : {}),
      type: 'website',
    },
  }
}

export default function QuestionPage() {
  return <QuestionPageClient />
}
